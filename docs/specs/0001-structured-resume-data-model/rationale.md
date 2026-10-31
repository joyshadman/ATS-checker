# 0001. Rationale: structured resume data model

Decision record for [index.md](index.md). `/develop` does not need this file.

## Context

Today a resume is one row in `Resume` with the uploaded file's text in `originalText` and an optional AI rewrite in `improvedText`. Every AI feature (analysis, job match, whole resume improve, interview prep) reads `originalText` directly and refuses to run when it is null. Analysis and interview prep also return the latest cached result per resume instead of calling the AI again.

The next five scoped features (section editor, AI section writing, import, PDF export, and the usage limit around them) all need a resume as typed sections: contact, summary, experience, education, skills, plus optional projects, certifications, and languages. Entries are reordered within a section, edited one at a time, rewritten by AI one section at a time, and rendered to a single column PDF. They are always read and written as a whole document by one owner; nothing searches inside them.

Forces: the change must not break any existing upload, analysis, or interview row; import must keep the original upload intact on the same resume; the AI client has a 2048 token output cap and free tier latency; the team is small, there is no test runner, and Prisma `db push` is the migration tool. If this is not decided first, each later feature would invent its own shape and the PDF, editor, and AI writer would drift apart.

## Options considered

### Option 1: JSONB `content` column on Resume, versioned Zod schema (chosen)
One nullable JSON column holds the whole document; Zod validates and upgrades it on every read and write; a rendered `contentText` column feeds the AI.

**Pros**: one atomic write per save; reorder is just array order; adding a section is a schema version bump with no migration; existing columns untouched.
**Cons**: no database level typing or constraints on the inside of the document; relies on discipline that every write goes through the parser.

### Option 2: Normalized tables per entry type
`ResumeExperience`, `ResumeEducation`, `ResumeSkillGroup`, and so on, each with `resumeId` and a `position` column.

**Pros**: the database enforces types and foreign keys; easy to query across users (for example, analytics on job titles).
**Cons**: every save becomes a multi table diff or delete and reinsert in a transaction; reorder rewrites positions; every new section or field is a migration; the PDF and AI need a join of seven tables to rebuild the same document anyway.

### Option 3: Separate 1:1 `ResumeContent` table holding the JSON
Same document as Option 1, in its own table keyed by `resumeId`.

**Pros**: keeps `Resume` rows lean for list queries.
**Cons**: an extra row lifecycle to create and delete, a join on every editor load, and the lean list benefit is already achieved with an explicit `select`.

## Rationale

The document is always loaded and saved whole by its single owner and never queried inside, which is the case where a JSON document beats relational tables. Option 2 pays the cost of seven tables and transactional diffs to get query power nobody needs, and turns every later section tweak into a migration on a team without a test runner. Option 3 adds a join for a benefit an explicit `select` on the list already gives.

Option 1's weakness (no database typing) is addressed by funneling every write through one `parseResumeContent` function and storing a `schemaVersion`, so a shape change upgrades on read instead of needing a backfill. The plain text rendering in `contentText` is a deliberate stored derived value: it lets four existing AI actions keep their current prompts with a one line change, keeps the import case honest (the upload in `originalText` stays as the record while analysis follows the edited sections), and is safe because it is always written in the same update as `content`.

For improve, asking the model for only rewritten summary and bullets keyed by entry id (at most 40 bullets per call) keeps the output under the 2048 token cap and makes it structurally impossible for the model to drop an entry or corrupt an id; storing the result as a draft that any save clears, and writing it only if `contentUpdatedAt` is unchanged, means a user's own edits can never be overwritten by a stale AI suggestion. `contentUpdatedAt` exists because `updatedAt` also moves when `atsScore` is written after an analysis. Stamping it onto each `Analysis` and `Interview` as `sourceContentAt` and comparing for equality (rather than comparing timestamps) closes the race where an analysis started before a save finishes after it, and avoids any app clock versus database clock skew.

A read only cross check on a second model found 16 gaps in the first draft (two races, the detail page not showing sectioned resumes, raw Zod error messages, empty form strings, unsafe URL protocols, empty resumes reaching the AI, the token cap, and the missing `getInterviews` ownership check); all were applied.

Calls made during writing (not asked): fallback `fullName` is the part of the email before `@` when `User.name` is null (runner up: an empty string, rejected because the schema requires a name); `improveResume` keeps its return type and returns the rendered draft as text, and the detail page reads a rendered `improvedContentText` from `getResume`, so the current page keeps working for both kinds of resume (runner up: a separate `improveResumeContent` action, more surface for the same behavior); `getResumes` gets an explicit `select` so the list never ships the JSON (runner up: leave it, cheap now but grows with every resume).

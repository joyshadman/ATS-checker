# 0009. Editor live preview: rationale

## Context

Spec 0007 gave every built resume an A4 sheet on its detail page, in one of three ATS friendly templates. The editor (spec 0002) is still a plain form: to see how a change looks you must Save, click "View resume", look, and come back. Spec 0007 named this gap and deferred it ("Consider showing the template picker in the editor once the editor has a live preview").

Forces at play. The editor holds unsaved state in React Hook Form and saves with an optimistic version check (`expectedUpdatedAt`), so anything that writes `contentUpdatedAt` from the editor risks a "changed elsewhere" conflict with its own Save. Form values are often invalid for a moment while someone types (a half typed link, dates in the wrong order), and the strict schema parse rejects them. The editor already uses `max-w-4xl` with the app sidebar beside it, so a side by side layout needs more width than a laptop at 1024 px comfortably gives. Server actions from one page run one after another, so a picker save can queue behind a long AI request (up to about 95 s, spec 0003 and 0006).

The sheet itself is cheap to reuse: `ResumeSheet` renders from a `ResumeContent` object, paginates client side, and scales whole pages to any width. Its formatters already show unparseable dates and links as typed.

Not deciding means people keep bouncing between two pages to judge layout and length, and the over 2 pages warning reaches them only after they save.

## Options considered

### Option 1: Client side preview fed by the editor's own form state

Render `ResumeSheet` inside the editor from debounced form values. Valid values go through the schema parse; invalid ones go through a lenient mapper. Pickers reuse the detail page's optimistic hook and `setResumeAppearance`.

**Pros**:
- Instant feedback with no network round trip; works offline while typing.
- No new server action, no migration; reuses spec 0007's components wholesale.
- The preview can never drift from the form, because it is derived from it.

**Cons**:
- Pagination runs in the browser on each debounced change, which costs some work on slow phones.
- A second, lenient content mapping must be kept in step with the schema's normalization.

### Option 2: Preview of the saved version only

Show the sheet of the last saved content in the editor, refreshing after each Save.

**Pros**:
- One content path (the stored, validated document); no lenient mapper.
- No per keystroke rendering cost.

**Cons**:
- Not a live preview: you still Save to see a change, which is the problem this spec exists to fix.
- Encourages saving half finished work just to look at it, which also churns `contentUpdatedAt` and marks analyses out of date.

### Option 3: Server rendered preview (draft endpoint)

Send the form state to a server action that validates and returns rendered HTML, or saves a draft row the preview reads.

**Pros**:
- One rendering path shared with any future server side PDF (spec 0008 follow up).

**Cons**:
- A round trip per pause in typing, queued behind other server actions on the page (an AI request can block it for over a minute).
- A draft row or endpoint is new state to secure, clean up, and reason about, for no gain the client cannot already give.

### Option 4: Pickers held until Save

Same as Option 1, but template and link choices join the form and save with the sections.

**Pros**:
- One Save covers everything on the page.

**Cons**:
- Mixes appearance into the content save, so a pure look change bumps `contentUpdatedAt` and marks analyses and interview questions out of date, which spec 0007 AC-5 exists to prevent.
- Behaves differently from the same picker on the detail page.

## Rationale

Option 1 is the only one that delivers what was asked (the sheet follows unsaved edits as you type) without new server surface. The editor's version check is the load bearing constraint: anything that writes content from the preview would fight the editor's own Save, so the preview must be read only over the form state, and the pickers must write only the appearance columns, which `setResumeAppearance` already does without touching `contentUpdatedAt`. That is also why Option 4 loses: holding the picks for Save would turn a look change into a content change.

Showing invalid input as typed (rather than freezing on the last valid version) was the engineer's call and it fits the forces: values are invalid for seconds at a time while typing, a frozen preview would feel broken exactly when people look at it, and the form already shows the field errors. The cost is the lenient mapper; keeping it next to `toContent` in `lib/resume/form.ts`, the one file that maps form paths to schema paths, keeps the drift risk in one place.

The 1280 px breakpoint follows from the width budget: with the sidebar and page padding, 1280 px leaves two columns of roughly 460 px each, enough for the form and a sheet at about 55% scale. At 1024 px both columns would be cramped, so narrower screens get the Edit / Preview switch, which keeps the form full width and the sheet as large as the screen allows. Leaving out placeholder highlights, the PDF button, and the draft sheet keeps the preview focused: the PDF must come from the saved resume (spec 0008), and the draft already has its Accept and Discard home on the detail page.

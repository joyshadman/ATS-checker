# Verify: AI section writing · spec 0003 · updated 2026-10-31
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open `/resumes/<id>/edit` on a built resume with an empty summary and one experience entry → Summary shows "Write with AI"; type a summary → label becomes "Rewrite with AI" → AC-1
- [ ] Press Rewrite with AI → panel shows "Writing...", then "Yours" and "Suggested"; Accept → summary field holds the suggestion, status reads "Unsaved changes"; reload without saving → old summary is back; Accept again and Save, then reload → new summary stored → AC-1
- [ ] Experience entry with only title and company → "Write bullets with AI" gives 3 to 5 bullets; Accept → only that entry's bullets change (title, company, dates unchanged) → AC-2
- [ ] Entry with bullets → label "Rewrite bullets with AI"; same check on an education and a project entry → AC-2
- [ ] Skills group "Tools: React", experience text naming React and Postgres → Suggest skills shows Postgres, not React; Accept → Postgres appended to Tools, no other group touched or reordered → AC-3
- [ ] Fill the target role box with a job title → suggestions lean toward it; reload → the box is empty again → AC-4
- [ ] Watch the `writeResumeSection` request payload in devtools → `context` has no name, email, phone, location, or links, and leaves out the target itself → AC-4
- [ ] Write bullets from nothing → any missing metric shows as a highlighted `[X%]` style placeholder, no made up numbers → AC-5
- [ ] New resume with only contact filled → Write with AI on Summary is unavailable with hint "Add an entry, skills, or a few words first."; empty experience entry → its button shows "Add a job title or company first."; no experience or project → Suggest skills shows "Add an experience or project first." → AC-6
- [ ] With summary text, open a suggestion → four chips shown; press Shorter → chip `aria-pressed`, new text; Try again right after → reads "Try again in 3s/2s/1s" and is unavailable until it ends; Try again again → a different suggestion; keyboard focus stays on the pressed control while loading → AC-7
- [ ] Skills panel and an empty target panel → only Try again, no chips → AC-7
- [ ] While the summary is loading → every other AI button, chip, and Save is unavailable → AC-8
- [ ] Start a request on bullets after a summary suggestion is open → summary panel closes without applying → AC-8, AC-10
- [ ] Unset `OPENROUTER_API_KEY` (or stop the network) and press an AI button → panel shows the error with Try again and Discard; form unchanged → AC-9
- [ ] Suggest skills when every skill in the experience is already listed → "No new skills found." with Try again and Discard → AC-9
- [ ] Open a bullets suggestion, move the entry up, Accept → the moved entry gets the bullets → AC-10
- [ ] Open a bullets suggestion, remove that entry → panel closes, focus goes to the section heading, nothing changes → AC-10
- [ ] German summary and bullets → German suggestions → AC-11
- [ ] Accept text with placeholders and Save → warning "N placeholders still to fill" (N matches the saved placeholders); dismiss it; fill them and Save → warning gone; a failed save leaves it as it was → AC-12
- [ ] Phone width (375px) → "Yours" and "Suggested" stack, no horizontal scroll; Tab reaches Accept, Try again, Discard; after Accept or Discard, focus returns to the AI button → AC-1, AC-2, AC-3, AC-7

## Commands
- [ ] As a second user, call `writeResumeSection` with the first user's resume id → "Unauthorized" or "Resume not found", no AI call in the server log → AC-13
- [ ] Call it with an uploaded resume id (no sections) → "This resume has no sections", no AI call → AC-13
- [ ] Two calls within 3 seconds → the second returns "Please wait a moment before trying again" with no AI call → AC-13
- [ ] Scratch script over `cleanSectionSuggestion` and `mergeSkillSuggestions` (20 bullets, empties, a 900 character bullet with a placeholder near 500, array answer, "C, C++" plus a duplicate, a full group) → 12 kept, empties dropped, cut at a word boundary with the placeholder intact, array is an error, skills split and deduped, cap reports skipped → AC-14
- [ ] `npx tsc --noEmit`, `npm run lint`, `npm run build` → all pass → AC-1 to AC-14

## Value sourcing
- [ ] Label: empty summary or no bullets shows Write, otherwise Rewrite (check both states per target)
- [ ] Request target and context come from unsaved values: edit a bullet without saving, press Rewrite → the payload holds the edited text
- [ ] `targetRole` is omitted from the payload when the box is blank or only spaces
- [ ] `style`: a chip sends it, Try again resends the last style, skills never send one
- [ ] `nonce` is a new UUID on every press (compare two payloads)
- [ ] "Yours" shows the target as it was when sent: edit the field while loading → "Yours" still shows the old text
- [ ] Only the active answer shows: remove the entry while loading → a late answer never appears
- [ ] Cooldown countdown matches the server: press Try again the moment the countdown ends → no "Please wait" error
- [ ] Skills additions exclude items already present in any case ("react" vs "React")
- [ ] Placeholder warning N is counted from the saved content, not the form

## Acceptance-criteria coverage
- AC-1 UI 1, 2, phone check · AC-2 UI 3, 4 · AC-3 UI 5 · AC-4 UI 6, 7 · AC-5 UI 8 · AC-6 UI 9 · AC-7 UI 10, 11 · AC-8 UI 12, 13 · AC-9 UI 14, 15 · AC-10 UI 13, 16, 17 · AC-11 UI 18 · AC-12 UI 19 · AC-13 Commands 1 to 3 · AC-14 Commands 4

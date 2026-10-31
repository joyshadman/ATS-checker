# Verify: Import an existing resume into the editor · spec 0006 · updated 2026-10-31
_Steps derived from spec 0006 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open an uploaded resume with text at `/resumes/<id>` → "Open in editor" shows where built resumes show "Edit resume" → AC-1
- [ ] Open `/resumes/<upload id>/edit` → the notice says "Open this upload in the editor. The AI splits it into sections you can edit." and shows the same button → AC-1
- [ ] On `/resumes`, an uploaded row shows "Open in editor" and it goes to `/resumes/<id>/edit` → AC-1
- [ ] Upload with blank text (or set `originalText` to spaces in Prisma Studio) → the button has `aria-disabled` and the hint "This upload has no text to import" → AC-1
- [ ] Press the button with 3 free uses left → dialog says "Uses 1 AI use. You have 3 free AI uses left." → AC-2
- [ ] Press it with only credits left → "Uses 1 AI use. You have 5 credits." (or your count) → AC-2
- [ ] Press it with 0 uses → only "Uses 1 AI use." plus "No AI uses left. See pricing" (link to `/pricing`), Import is `aria-disabled` → AC-2
- [ ] Make `getAiBalanceForUser` fail (for example stop the DB briefly) → only "Uses 1 AI use." and Import stays available → AC-2
- [ ] Import a real PDF resume → land on `/resumes/<new id>/edit`, title is `<upload title> (editable)`, sections filled word for word, edit and Save works → AC-3, AC-4
- [ ] After import, check the upload row in Prisma Studio: `title`, `originalText`, `improvedText`, `atsScore`, `updatedAt` unchanged; its analyses and interviews unchanged → AC-3
- [ ] Copy row in Prisma Studio: `importedFromId` = upload id, `importNotice` set, `contentText` and `contentUpdatedAt` set → AC-3
- [ ] Upload with "2019" dates, an award, a volunteer role, 15 bullets under one job, and a `javascript:` link → volunteer role in Experience, award in Certifications, 12 bullets kept, no bad link, and the notice lists the dates, the 3 extra bullets, and the link → AC-4, AC-6, AC-8
- [ ] Upload where two jobs share an identical bullet → the bullet appears under both jobs → AC-4
- [ ] Upload with no name in the text → contact name is the account name (or the email part before `@`); upload with no email → the account email → AC-5
- [ ] Upload with a phone, location, and links → those come from the text, never from the account → AC-5
- [ ] Upload of about 20000 characters → the notice shows "Your upload was longer than the import can read, so the end may be missing." → AC-7
- [ ] Imported copy's editor → notice above the sections with "Imported from <upload title>." (link to the upload), "Check each section against your original.", and a "Not imported" list with a Copy button per item; Copy puts the text on the clipboard → AC-8
- [ ] Reload and Save keep the notice; Dismiss hides it; reload confirms it is gone → AC-8
- [ ] Make an unsaved edit, press Dismiss, then Save → the save succeeds with no "changed elsewhere" conflict → AC-8
- [ ] Open the import dialog on an upload that already has a copy → "You already imported this resume." with "Open the imported copy" (main, no balance change) and "Import again" → AC-9
- [ ] Press "Import again" → one more AI use, a second copy, and "Open the imported copy" now opens the newest one → AC-9, AC-10
- [ ] While importing, the dialog shows the spinner and "Reading your resume. This can take up to a minute."; Escape, clicking outside, and the header close button do nothing (the close button is hidden) → AC-11
- [ ] Slow AI (for example set `AI_TIMEOUT_MS` style delay, or a very long resume on a free model): after 100 s the dialog says "This is taking too long. If it finishes, the copy will appear in your Resumes list." with Close; Close refreshes the page and, once the copy exists, the dialog offers "Open the imported copy" → AC-11, AC-9
- [ ] Set `OPENROUTER_MODEL` to an invalid model → the dialog shows the AI error with "Try again", no copy is created → AC-12
- [ ] Upload of plain unrelated text (no resume content) → "The AI could not find resume sections in this text. Try again." → AC-12
- [ ] With 0 uses, force the call (remove `aria-disabled` in devtools) → the limit message with "See pricing" and Close, no AI call → AC-12, AC-10
- [ ] Second user calls `importResume` and `dismissImportNotice` with the first user's resume ids → "Resume not found" or "Unauthorized", no ledger row, nothing written → AC-13
- [ ] Call `importResume` on a built resume → "This resume already has sections" → AC-13
- [ ] Import twice in two tabs a few seconds apart (after the first finishes) → the second gets "An import of this resume just finished. Open it from your Resumes list." with no AI call and no charge → AC-13, AC-10
- [ ] Press import twice within 3 s → "Please wait a moment before trying again" → AC-13
- [ ] Detail page of a copy shows "Imported from <upload title>" linking to the upload → AC-14
- [ ] Delete the upload → the copy stays, its `importedFromId` is null, the "Imported from" line is gone, and the notice says "Imported from an upload." → AC-14, AC-15
- [ ] Delete a copy → the upload is unchanged → AC-15
- [ ] Run ATS analysis and AI section writing after the change → both behave as before (2048 max tokens, the usual timeout and retries) → AC-16

## Value sourcing checks
- [ ] Text sent to the AI is the upload's trimmed `originalText`, first 15000 characters: a 20000 character upload never shows text past character 15000 in the copy → upload text sent
- [ ] `truncated` follows the trimmed length: an upload of exactly 15000 characters plus trailing spaces shows no truncated line → truncated
- [ ] Sections come only from the cleaned AI answer: no section text appears that is not in the upload → sections of the copy
- [ ] Entry and link ids are UUIDs, all different, never the AI's own → ids
- [ ] Name fallback: an account with no name and email `sam@x.io`, upload with no name → contact name "sam" → `contact.fullName` fallback
- [ ] Email fallback: upload with an invalid email → the account email, and the bad email is in the notice → `contact.email` fallback
- [ ] Title: an upload with a 200 character title → the copy title is at most 200 characters and ends with " (editable)" → copy title
- [ ] "Just finished" uses the newest copy's `createdAt` and the server clock: a second import 121 s after the first goes through → whether an import just finished
- [ ] `contentText` equals `renderResumeText(content)` and `contentUpdatedAt` is the server time of the create → `contentText`, `contentUpdatedAt`
- [ ] `importedFromId` is the upload id passed in, after the owner check → `importedFromId`
- [ ] Leftover holds the cleaner notes plus the AI's `unplaced` text (for example a "Hobbies" line) → leftover
- [ ] Ledger: one `IMPORT` use with `resumeId` = the upload id per copy; a failed import adds a `REFUND` for it → the charge
- [ ] The returned balance matches the balance after the reserve → `balance` returned
- [ ] The copy's `userId` is the signed in user → `userId`
- [ ] Dialog balance line matches `/pricing`'s balance card wording → dialog balance line
- [ ] Dialog "already imported" state follows `latestImport` on both the detail page and the edit page → whether a copy exists
- [ ] Edit page blank text state follows `hasUploadText`; detail page follows `originalText` → whether the upload has text
- [ ] Each press of Import or Try again uses a new nonce (two quick imports never return the same copy from cache) → nonce
- [ ] Editor notice title and link follow `importedFrom`; a notice row that fails the schema in the DB shows no notice and logs `[Import]` → editor notice
- [ ] Resume list "Open in editor" shows only where `contentUpdatedAt` is null → whether a row is an upload

## Commands
- [ ] `npm run lint` → no errors → all
- [ ] `npm run build` → succeeds → all
- [ ] Server log after each import shows `[Import] ok|timeout|too_long|invalid|empty|failed duration=… input=…` → AC-10, AC-11

## Acceptance-criteria coverage
- AC-1 … the first four UI steps · AC-2 … the four balance steps · AC-3 … the real PDF step and both Prisma Studio steps · AC-4 … cleanup and repeated bullet steps · AC-5 … the two contact steps · AC-6 … the cleanup step · AC-7 … the 20000 character step · AC-8 … notice, reload, and Dismiss steps · AC-9 … the two "already imported" steps and the slow AI step · AC-10 … Import again, limit, two tab, and ledger steps · AC-11 … running and slow AI steps · AC-12 … invalid model, unrelated text, and forced limit steps · AC-13 … the four permission and guard steps · AC-14 … copy header and delete steps · AC-15 … the two delete steps · AC-16 … the regression step

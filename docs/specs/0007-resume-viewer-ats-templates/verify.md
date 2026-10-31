# Verify: Resume viewer & ATS templates · spec 0007 · updated 2026-10-31
_Steps derived from spec 0007 acceptance criteria and its Value sourcing table. `/check verify` runs these; `/test` locks the durable ones._

## UI / manual
- [ ] Open a built resume at `/resumes/[id]` → A4 pages in Classic replace the "Original Resume" text box; every filled section shows in the order Contact, Summary, Experience, Education, Skills, Projects, Certifications, Languages; empty sections are hidden → AC-1, AC-2
- [ ] Open an uploaded resume → the text box and the "Open in editor" button are unchanged → AC-1
- [ ] Compare Classic with Figma node `9:2`, Compact with node `11:2`, Modern with node `10:2` (font, name and contact placement, headings, entry headers, spacing). Modern was built from the spec text because the Figma rate limit blocked reading its frame, so check it closely → AC-2
- [ ] Select text across the sheet → it is real selectable text in section order → AC-2
- [ ] Switch to Modern, then Compact; reload → the last pick stays selected and shows → AC-3
- [ ] Create a new resume from New resume, and import an upload → both start on Classic and Visible URL → AC-3, AC-4
- [ ] Switch through Visible URL, Label only, Label and URL → each option shows its tradeoff line; contact links read `linkedin.com/in/jane`, `LinkedIn`, `LinkedIn: linkedin.com/in/jane`; the project URL and a certification URL follow the same style; links open in a new tab → AC-4
- [ ] In Prisma Studio note `contentUpdatedAt`, switch template → it is unchanged and the latest analysis is not "Out of date" → AC-5
- [ ] Open the editor in a second tab, switch template in the first, then Save in the editor → it saves with no "changed elsewhere" conflict → AC-5
- [ ] Entries with start and current, start and end, only start, only end, none, plus a certification date → `Mar 2021 – Present`, `Jan 2018 – Feb 2021`, one date, nothing, `Dec 2022`; repeat with the browser language set to German → same text → AC-6
- [ ] An imported copy with `[Company]` and a bullet with `[X%]` → both have a soft amber background, text unchanged → AC-7
- [ ] Run Improve on a built resume → the draft shows as a second sheet below, full width, with Accept and Discard above it; switching template changes both sheets; Accept and Discard still work → AC-8
- [ ] Toggle dark mode → the page around changes, the sheet stays white with dark ink and the Modern headings stay navy → AC-9
- [ ] At 360 px wide → pages scale down as a whole with the same breaks as desktop, "Page N of M" under each, no sideways page scroll → AC-10
- [ ] In devtools go offline, switch template → it reverts with "Could not save the template. Try again."; same for link style with its own message → AC-11
- [ ] Back online, switch template three times quickly → reload shows the last pick → AC-11
- [ ] Set `templateId` to `retro` and `linkStyle` to `fancy` in Prisma Studio → the page renders Classic and Visible URL, both pickers show them selected, the server logs `[Viewer] unknown ...` warnings → AC-13
- [ ] Set `content` to `{}` in Prisma Studio → the text box shows with "This resume's sections could not be read, so it is shown as plain text." → AC-14
- [ ] A new resume with no summary and no entries → one page with the contact block only, and the hint "This resume has no sections yet." linking to the editor → AC-15
- [ ] A short resume → exactly one page labelled "Page 1 of 1" → AC-16
- [ ] A resume slightly longer than a page → flows onto page 2; no section heading or entry header sits alone at the bottom of page 1; no bullet is split; font size is unchanged → AC-16, AC-18
- [ ] A long resume → page 3 appears with "Your resume runs past 2 pages. Most recruiters expect 1 to 2."; switching to Compact brings it to 2 pages and the warning goes away → AC-17, AC-19
- [ ] Cold load with cache disabled → the final breaks match those after a reload with fonts cached → AC-19
- [ ] A draft longer than 2 pages → the draft sheet gets its own page count and warning → AC-19

## Commands
- [ ] As a second user, call `setResumeAppearance({ resumeId: <first user's id>, templateId: "modern" })` → "Unauthorized" or "Resume not found", nothing written → AC-12
- [ ] Call it on an upload → "This resume has no sections" → AC-12
- [ ] Call it with `templateId: "fancy"` → a validation message (`templateId: Unknown template`), nothing written → AC-12
- [ ] `npm run lint` and `npm run build` → both pass → AC-1 to AC-19

## Value sourcing
- [ ] Template and link style come from `Resume.templateId` and `Resume.linkStyle` through the resolvers: change them in Prisma Studio and reload → the sheet follows
- [ ] Dates come from the stored `YYYY-MM` values only, never the browser locale: change the locale → no change
- [ ] Page breaks come from measured block heights at the A4 width: change the window width → breaks stay the same; switch fonts by template → breaks are measured again
- [ ] The draft sheet uses the same shown template and link style as the saved sheet

## Acceptance-criteria coverage
- AC-1 to AC-2: UI steps 1 to 4 · AC-3: steps 5, 6 · AC-4: steps 6, 7 · AC-5: steps 8, 9 · AC-6: step 10 · AC-7: step 11 · AC-8: step 12 · AC-9: step 13 · AC-10: step 14 · AC-11: steps 15, 16 · AC-12: command steps 1 to 3 · AC-13: step 17 · AC-14: step 18 · AC-15: step 19 · AC-16: steps 20, 21 · AC-17: step 22 · AC-18: step 21 · AC-19: steps 22 to 24

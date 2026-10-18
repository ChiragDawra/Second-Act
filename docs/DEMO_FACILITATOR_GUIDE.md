# Second Act — Demo Facilitator Guide

Four independent Supabase Auth accounts take part in one Harpreet career-transition journey in the same Expo app, against one persistent database.

## What is real, synthetic, simulated or planned

| Item | Status |
|---|---|
| Sign-in (Supabase Auth), database, row-level security, API authorization | **Live** |
| Adjacency Engine `fit-v1`, skill extraction `extraction-rules-v1`, mentor matching | **Live** (deterministic code, no LLM) |
| Harpreet, Priya, mentors, Northwind/Contoso employers | **Synthetic** |
| Job openings | **Simulated** (no vacancy feed) |
| Assessment | **Demo assessment** (fixed rubric, auto-graded, not a credential) |
| SAP SuccessFactors / Joule | **Planned** — not connected |

## One-time setup (about 15 minutes)

1. Create a **separate** Supabase project for the demo.
2. Copy `apps/api/.env.example` to `apps/api/.env` and fill in these values (Dashboard → Project Settings):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_DB_URL` (Session pooler string, `postgres` user)
   - `SUPABASE_SERVICE_ROLE_KEY` (used only by the seed script)
   - Optionally `DEMO_PASSWORD_*` for memorable passwords.
3. From the repo root:
   ```bash
   npm run install:all
   npm run db:migrate     # applies db/migrations
   npm run demo:seed      # creates the 4 identities; writes demo-credentials.local.md (gitignored)
   npm run demo:check     # verifies env, migrations, RLS role switching, accounts
   ```
4. Start the API: `npm run api:dev`. It prints LAN URLs for phones.
5. Rehearse against the real stack: `npm run demo:smoke`. This signs in all four accounts, runs the journey including forbidden checks, then resets.
6. Copy `apps/mobile/.env.example` to `apps/mobile/.env`.
   - Set the Supabase URL and the anon key.
   - Set `EXPO_PUBLIC_API_URL`: `http://localhost:4000` for a browser on this laptop, or `http://<LAN IP>:4000` for phones.
7. Start the app: `npm run mobile:start`. Press `w` for web, or scan the QR code with Expo Go.

Never commit `.env` files or `demo-credentials.local.*`. The app bundle contains no passwords.

## Accounts

Emails use `DEMO_EMAIL_DOMAIN` (default `demo.secondact.test`). Passwords are in `demo-credentials.local.md`.

| Role | Email | Sees |
|---|---|---|
| Worker | `harpreet.worker@…` | Own profile, skills, roles, assessment, sharing, activity |
| Mentor | `meera.mentor@…` | Only requests addressed to Meera, and only the fields Harpreet approved |
| Recruiter | `rohan.recruiter@…` | Only candidates who shared with Northwind Fintech |
| Admin | `demo.admin@…` | Health, dataset versions, synthetic counts, audit, reset — never profiles |

## Device options

- **Four browser tabs (recommended on one laptop):** each tab keeps its own session, so open four tabs and sign in a different account in each.
- **Phones:** use Expo Go on the same Wi-Fi, with `EXPO_PUBLIC_API_URL` set to the laptop LAN IP.
- **One device:** sign out and sign in as the next role. Cached data is cleared on every account change.

## Run of show (about 8 minutes)

1. **Admin:** *System → Reset demo scenario → Confirm.* Show the LIVE / SYNTHETIC / SIMULATED / PLANNED labels.
2. **Worker → Skills:**
   - Every claim is *Inferred · needs review* and shows its source sentence.
   - Tap **Reject** on *Programming fundamentals*, which was inferred from the word "scripts".
   - **Correct level** on *Test case design* to 4, then **Confirm all**.
   - The banner shows the recomputed top roles.
3. **Worker → Roles:**
   - Top three: UAT Lead, Release Coordinator, API Test Analyst.
   - QA Automation Engineer sits under *Stretch roles*, blocked by mandatory *Test automation scripting* (level 1 vs 2).
   - Open it to show the score breakdown, the mandatory gate, and that unknowns are not counted as missing.
4. **Worker → Prove:**
   - Take the assessment. Correct answers are B, C, A, D, B.
   - The result shows only *Test automation scripting* changed (Inferred → Verified, level 2).
   - QA Automation moves from Stretch to Eligible and into the top three.
5. **Worker → Connect → Mentor:**
   - Target role: QA Automation. Meera Iyer ranks first and shows a *Has demo login* badge.
   - Keep the default fields, tick the approval box, then **Send**.
   - Optional: try sending without approval to show the button stays disabled. The API also rejects it (tested).
6. **Mentor tab:**
   - The request appears within about 8 seconds.
   - Open it: the shared fields are listed, and work history plus evidence appear under *Not shared with you*.
   - **Accept**, then add **Feedback (shared)** and a **Progress (private)** note.
7. **Worker → Connect:** the mentor's feedback is visible; the private note is not. Then switch to *Recruiter sharing*: choose Northwind, approve, and share.
8. **Recruiter tab:** Harpreet appears.
   - The candidate view shows fit for Northwind's **simulated** openings, a verified scripting skill, and no salary information.
9. **Worker → Activity:** shows that the mentor and the recruiter viewed the shared data.
10. **Admin → Audit:**
    - Show the full trail, including refused requests, with no resume text or notes.
    - Optionally revoke the recruiter share from the worker; the candidate disappears from the recruiter list.
11. Reset again for the next run.

## Optional segment: Delhi-NCR resume pilot (about 3 minutes)

Uses the same worker account. The API must be running. Nothing is stored: the resume is read in memory and discarded.

| Item | Status |
|---|---|
| Roles and requirements | **Team-drafted, unreviewed** hypotheses |
| Listings and "demand" | **Simulated** sample only; no vacancy feed, no market claim |
| Resume reading | **Live** rule-based extractor (`ncr-rules-0.2`), no LLM |

1. As the worker, call `POST /api/v1/ncr/resume/extract` with a resume file (PDF, DOCX or text) as the request body.
   Use a synthetic resume from `data/delhi_ncr/v1/eval/`, never a real person's.
2. Point out the mention types. Skills under "learning goals" come back as **future goal** and "no practical experience"
   as **no experience**. Neither can be accepted as a skill.
3. Send the accepted skills with levels to `POST /api/v1/ncr/recommend`. Roles appear with estimated skill fit, resume
   evidence, gaps, blockers, unknowns, and a separate "simulated" demand note.
4. Show that a client cannot make a skill verified: add `"status":"verified"` to a skill and it is ignored.

The full method, measured results and limitations are in `docs/DELHI_NCR_SKILL_EXTRACTOR_PLAN.md`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| App shows "Setup needed" | Fill `apps/mobile/.env`, then restart Expo |
| "Cannot reach the Second Act API" on a phone | Use the LAN IP, not `localhost`. Phone and laptop must share Wi-Fi |
| "This account has no Second Act role" | Run `npm run demo:seed` |
| `demo:check` cannot switch roles | Use the `postgres` user connection string |
| Stale state on screen | Pull to refresh (native) or press **Refresh** (web) |

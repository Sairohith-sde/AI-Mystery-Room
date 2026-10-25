# SPEC.md — AI Mystery Room

> **Status:** v1.0 · **Deadline:** 2 Nov, 11:59 PM · **Audience:** a developer or AI coding assistant (Codex, Claude Code, etc.) who must build this without further clarification.
>
> **How to use this file with an AI coding tool:** paste this whole file first, then ask it to implement **one build step at a time** (see §12). After each step, run the checks listed for that step before moving on.

---

## 1. Project Overview

### 1.1 What it is
AI Mystery Room is a web app where a player types a mystery premise, picks a difficulty, and Gemini generates a complete, self-contained whodunit: a story, suspects, discoverable clues, and progressive hints. The player investigates, uncovers clues, optionally spends hints, and accuses one suspect. The server then reveals the verdict, culprit, explanation, and a score.

### 1.2 Problem statement
Static mystery games are replayable only once. LLMs can generate unlimited cases, but naive generation has three failure modes this project must handle:

1. **Leaking the answer**: the solution reaches the browser before the player accuses.
2. **Unsolvable or inconsistent mysteries**: the model's culprit isn't actually supported by the clues.
3. **Malformed output**: invalid JSON, wrong counts, dangling references.

The engineering goal is a **trustworthy** AI game: the backend owns the truth, validates every AI output, and computes the score.

### 1.3 Target users
Casual players who enjoy puzzles and detective fiction (age 13+), on desktop or mobile, with no account required.

### 1.4 Core principles
- **Server is the source of truth.** The client only renders what the server explicitly sends.
- **Allowlist, never denylist.** Public responses are built from an explicit mapper, never by deleting fields from a DB document.
- **Never trust AI output.** Parse, validate, and check logical consistency before saving.
- **Fail gracefully.** Every failure shows a clear message and a retry path.

### 1.5 Scope

| Tier | Meaning |
|---|---|
| **P0 (must ship)** | Everything in §2–§11 marked required. This is the submission. |
| **P1 (should ship)** | Solvability verifier (§6.5), rate limiting, backend tests. |
| **P2 (stretch)** | See §14. Only after P0 is deployed and tested. |

### 1.6 Out of scope
User accounts/auth, payments, multiplayer, leaderboards, image generation, voice, localisation.

### 1.7 Deliverables
1. GitHub repo with source, this `SPEC.md`, and a `README.md`.
2. Live frontend URL (Vercel) connected to a live backend and MongoDB Atlas.
3. One mystery created and solved on the live site.

---

## 2. Technology Stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | React + Vite, Tailwind CSS, React Router, Axios | Tailwind must be installed (see §9.1). |
| Backend | Node.js (≥ 20), Express | ES modules (`"type": "module"`). |
| Database | MongoDB Atlas + Mongoose | |
| AI | Gemini via `@google/genai` | Model name read from env `GEMINI_MODEL`. **Verify the current model name in Google's docs before building**; do not hardcode. |
| Validation | `zod` | Request validation **and** AI output validation. |
| Security | `helmet`, `cors`, `express-rate-limit` | |
| Testing | `vitest` + `supertest` (backend), manual E2E script | |
| Hosting | Vercel (frontend), Render or Railway (backend), Atlas (DB) | |

---

## 3. User Flow

1. User opens the site → **Home**.
2. Clicks **Start Investigation** → **Create Mystery**.
3. Enters a premise (10–300 chars) and selects **Easy / Medium / Hard**.
4. Submits → loading screen while Gemini generates (typically 10–40 s).
5. Backend generates, validates, shuffles, and saves the case; returns the **public** view.
6. User lands in the **Investigation Room**: reads the story, views suspects, opens clues (each costs nothing but is recorded), optionally requests hints (each costs points).
7. User clicks **Make Accusation** → selects a suspect → confirms (irreversible).
8. Backend verifies, scores, locks the case, and returns the result.
9. **Results** page shows verdict, culprit, explanation, key clues, and score breakdown.
10. User clicks **New Mystery** → back to Create Mystery.

**Resume:** the case ID is stored in the URL (`/case/:id`), so refreshing or sharing the tab restores progress. A completed case redirects to its results.

---

## 4. UI & Page Specifications

Design tokens: dark, noir-inspired theme (near-black background, warm amber accent, serif for story text, sans-serif for UI). Stitch AI may be used to generate an initial design; each Stitch screen must map to a page below.

### 4.1 Routes

| Route | Page |
|---|---|
| `/` | Home |
| `/create` | Create Mystery |
| `/case/:id` | Investigation Room |
| `/case/:id/accuse` | Accusation |
| `/case/:id/result` | Results |
| `*` | Not Found |

### 4.2 Home (`/`)
- **Purpose:** introduce the game and start it.
- **Elements:** title, one-line pitch, 3-step "how it works", scoring summary, **Start Investigation** button → `/create`.

### 4.3 Create Mystery (`/create`)
- **Elements:** premise textarea (with live character counter, 10–300), 3 difficulty cards (Easy / Medium / Hard, each showing suspects/clues/hints counts and max points), 3–4 clickable **example premises** that fill the textarea, **Generate Mystery** button.
- **Validation (client, mirrors server):** premise length; difficulty selected. Button disabled while invalid or submitting.
- **Loading state:** full-page overlay with rotating status text ("Gathering suspects…", "Planting clues…", "Checking the alibis…"), elapsed-time indicator, and a **Cancel** button (aborts the request).
- **Error state:** inline banner with the server's message and a **Try again** button; premise text is preserved.

### 4.4 Investigation Room (`/case/:id`)
- **Layout:** story header (title, difficulty badge), then sections: **Story**, **Suspects**, **Clues**, **Hints**, and a sticky **progress bar** (e.g. "Clues 3/7 · Hints 1/3 · Current score preview").
- **Suspect cards:** name, role, description, stated alibi. No selection here (accusation happens on its own page).
- **Clue board:** every clue appears as a card showing only its `label` (e.g. "The torn letter in the study") with a **Examine** button. On click → `POST …/discover`; the card flips/expands to show `text`. Already-discovered clues stay expanded. Discovering is idempotent.
- **Hints panel:** shows revealed hints in order; **Request Hint** button shows the cost ("−10 points") and remaining count; disabled when exhausted.
- **Footer CTA:** **Make Accusation** (always enabled; shows a gentle warning if 0 clues discovered).
- **Loading:** per-action spinners (clue card, hint button), not full-page.
- **Errors:** toast for failed actions; full-page error with retry if the case can't load; "Case not found" page for 404.

### 4.5 Accusation (`/case/:id/accuse`)
- **Elements:** radio-card list of suspects, a summary of discovered clues for reference, **Submit Accusation** button, **Back to investigation** link.
- **Confirmation modal:** "This is final. Accuse {name}?" with Confirm/Cancel.
- **States:** submitting (button spinner, controls disabled), error (toast; allow retry), already-completed (redirect to results).

### 4.6 Results (`/case/:id/result`)
- **Elements:** verdict banner (**Case Solved** / **Wrong Suspect**), the player's accused suspect, the actual culprit (highlighted), full explanation, **key clues** that proved it, **score breakdown** table (base, clues, hints, total), difficulty, and **New Mystery** button.
- **Guard:** if the case isn't completed, redirect to `/case/:id`.

### 4.7 Cross-cutting UI requirements
- **Responsive:** mobile-first; single column < 768 px; suspect/clue grids go 2–3 columns above.
- **Accessibility:** semantic headings, labelled form controls, visible focus, `aria-live` for loading/error text, colour contrast ≥ 4.5:1, keyboard-operable modals.
- **Navigation:** persistent minimal header (logo → Home). No dead ends: every error has a way back.
- **Empty/edge states:** zero clues discovered, hints exhausted, network offline.

---

## 5. Backend & Database Design

### 5.1 Folder structure

```
/
├── SPEC.md
├── README.md
├── client/
│   ├── src/
│   │   ├── api/           # axios instance + case API functions
│   │   ├── components/    # SuspectCard, ClueCard, HintPanel, ScoreBreakdown, ...
│   │   ├── pages/         # Home, Create, Investigation, Accuse, Result, NotFound
│   │   ├── hooks/         # useCase, etc.
│   │   └── main.jsx
│   ├── vercel.json        # SPA rewrite
│   └── .env.example       # VITE_API_URL
└── server/
    ├── src/
    │   ├── index.js            # bootstrap + DB connect + listen
    │   ├── app.js              # express app (exported for tests)
    │   ├── config/env.js       # zod-validated env
    │   ├── models/Case.js
    │   ├── routes/cases.js
    │   ├── controllers/cases.js
    │   ├── services/
    │   │   ├── gemini.js       # API call + retry
    │   │   ├── generator.js    # prompt, orchestration
    │   │   ├── validator.js    # zod schema + consistency checks
    │   │   ├── scoring.js      # pure functions
    │   │   └── publicView.js   # allowlist mapper (DB doc → public JSON)
    │   ├── middleware/         # errorHandler, rateLimit, validate
    │   └── utils/              # shuffle, ids, AppError
    ├── tests/
    └── .env.example
```

### 5.2 Environment variables

`server/.env`
```
PORT=5000
MONGODB_URI=
GEMINI_API_KEY=
GEMINI_MODEL=
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```
`client/.env`
```
VITE_API_URL=http://localhost:5000
```
The server must **fail fast on startup** if a required variable is missing (zod-validated). `.env` is git-ignored; commit `.env.example` only.

### 5.3 Database model — `Case`

```js
{
  _id: ObjectId,
  publicId: String,            // crypto.randomUUID(), unique index; used in URLs
  title: String,
  story: String,
  premise: String,             // user input, stored sanitised
  difficulty: "easy" | "medium" | "hard",
  status: "active" | "completed",

  suspects: [{ id: String, name, role, description, alibi }],     // public

  clues: [{
    id: String,
    label: String,             // public (visible before discovery)
    text: String,              // public only after discovery
    // PRIVATE metadata:
    kind: "incriminating" | "exculpatory" | "red_herring" | "neutral",
    implicates: [String],      // suspect ids
    clears: [String]           // suspect ids
  }],

  hints: [{ level: Number, text: String }],                       // text private until released

  solution: {                  // PRIVATE: select: false, never in public view
    culpritId: String,
    explanation: String,
    keyClueIds: [String]
  },

  progress: {
    discoveredClueIds: [String],
    hintsUsed: Number          // hints with level <= hintsUsed are public
  },

  accusation: { suspectId: String, submittedAt: Date } | null,
  result: {
    correct: Boolean,
    score: { base: Number, clueBonus: Number, hintPenalty: Number, total: Number }
  } | null,

  createdAt, updatedAt
}
```

**Rules**
- `solution` uses `select: false`. Controllers must opt in explicitly (`.select("+solution")`) and only in `accuse` and `result` handlers.
- **All outgoing JSON goes through `publicView.js`**, which builds responses from an explicit allowlist. Never `res.json(doc)`.
- Indexes: `publicId` (unique), `createdAt` (optional TTL of 30 days to keep Atlas free-tier small).

### 5.4 API conventions
- Base path `/api`. JSON only. Body limit 10 kb.
- All request bodies/params validated with zod; invalid → `400 VALIDATION_ERROR`.
- Error shape (every error, no exceptions):
```json
{ "error": { "code": "CASE_NOT_FOUND", "message": "Case not found.", "details": null } }
```
- Never return stack traces or raw AI/DB errors to clients; log them server-side.
- `GET /api/health` → `{ "ok": true }` (for the host's health check and uptime pings).

### 5.5 Public case shape (`PublicCase`)

```json
{
  "id": "uuid",
  "title": "The Last Toast",
  "story": "…",
  "difficulty": "medium",
  "status": "active",
  "suspects": [{ "id": "s1", "name": "…", "role": "…", "description": "…", "alibi": "…" }],
  "clues": [
    { "id": "c1", "label": "The torn letter in the study", "discovered": false },
    { "id": "c2", "label": "Muddy boots by the door", "discovered": true, "text": "…" }
  ],
  "hints": { "used": 1, "total": 3, "revealed": [{ "level": 1, "text": "…" }] },
  "progress": { "cluesDiscovered": 1, "cluesTotal": 7 },
  "createdAt": "ISO-8601"
}
```
**Never present:** `solution`, clue `kind/implicates/clears`, unreleased hints, undiscovered clue `text`.

### 5.6 Endpoints

#### `POST /api/cases` — generate a mystery
- **Body:** `{ "premise": string (10–300 chars, trimmed), "difficulty": "easy"|"medium"|"hard" }`
- **Behaviour:** sanitise premise → call generator (§6) → validate → shuffle suspect order → save → return public view.
- **201:** `{ "case": PublicCase }`
- **Errors:** `400 VALIDATION_ERROR`, `429 RATE_LIMITED`, `502 GENERATION_FAILED` (all retries produced invalid output), `503 AI_UNAVAILABLE` (Gemini down/quota).

#### `GET /api/cases/:id` — fetch an active case
- **200:** `{ "case": PublicCase }`
- **Errors:** `404 CASE_NOT_FOUND`.
- Works for completed cases too (returns `status: "completed"`, still no solution; solution comes only from `/result`).

#### `POST /api/cases/:id/clues/:clueId/discover`
- **Behaviour:** if case is `active`, add clueId to `discoveredClueIds` (idempotent: using `$addToSet`), return the clue.
- **200:** `{ "clue": { "id", "label", "text" }, "progress": { "cluesDiscovered", "cluesTotal" } }`
- **Errors:** `404 CASE_NOT_FOUND`, `404 CLUE_NOT_FOUND`, `409 CASE_ALREADY_COMPLETED`.

#### `POST /api/cases/:id/hints`
- **Behaviour:** if `hintsUsed < hints.length`, atomically increment `hintsUsed` (`findOneAndUpdate` with condition to prevent races) and return the newly released hint.
- **200:** `{ "hint": { "level": 2, "text": "…" }, "hints": { "used": 2, "total": 3 } }`
- **Errors:** `404 CASE_NOT_FOUND`, `409 HINTS_EXHAUSTED`, `409 CASE_ALREADY_COMPLETED`.

#### `POST /api/cases/:id/accuse`
- **Body:** `{ "suspectId": string }`
- **Behaviour:** reject if already completed; verify `suspectId` exists; compare to `solution.culpritId`; compute score (§7); save `accusation`, `result`, set `status: "completed"` — in **one atomic update conditioned on `status: "active"`** so double-submits can't score twice.
- **200:** `{ "correct": boolean, "score": { "total": number }, "resultUrl": "/case/:id/result" }`
- **Errors:** `400 VALIDATION_ERROR` (unknown suspect), `404 CASE_NOT_FOUND`, `409 CASE_ALREADY_COMPLETED`.

#### `GET /api/cases/:id/result`
- **Behaviour:** only for completed cases. Loads `solution` and returns it.
- **200:**
```json
{
  "result": {
    "correct": true,
    "accusedSuspectId": "s2",
    "culprit": { "id": "s3", "name": "…" },
    "explanation": "…",
    "keyClues": [{ "id": "c4", "label": "…", "text": "…" }],
    "score": { "base": 150, "clueBonus": 35, "hintPenalty": 10, "total": 175 },
    "difficulty": "medium"
  }
}
```
- **Errors:** `404 CASE_NOT_FOUND`, `403 RESULT_NOT_AVAILABLE` (case still active).

### 5.7 Error code reference

| Code | HTTP |
|---|---|
| VALIDATION_ERROR | 400 |
| RESULT_NOT_AVAILABLE | 403 |
| CASE_NOT_FOUND / CLUE_NOT_FOUND | 404 |
| HINTS_EXHAUSTED / CASE_ALREADY_COMPLETED | 409 |
| RATE_LIMITED | 429 |
| INTERNAL_ERROR | 500 |
| GENERATION_FAILED | 502 |
| AI_UNAVAILABLE | 503 |

### 5.8 Security & abuse controls
- **Rate limit:** `POST /api/cases` ≤ 5/hour/IP (it costs money and time); other routes ≤ 120/min/IP.
- **CORS:** allow only `CLIENT_URL` (plus Vercel preview URL if needed).
- `helmet()` enabled; `x-powered-by` disabled.
- **Prompt-injection hygiene:** the premise is untrusted. It goes in a clearly delimited block in the prompt; the system instruction states that text inside it is *story inspiration only* and must never alter the output format or rules. Output is schema-validated regardless.
- **Content safety:** prompt forbids real people, graphic violence/gore, sexual content, and hate. Mysteries should be PG-13 (off-screen crime, no gratuitous detail). If Gemini blocks a request, return `422 PREMISE_REJECTED` with a friendly message.
- **ID safety:** `publicId` is a UUID (unguessable). Do not expose Mongo `_id`.
- No secrets in client code, logs, or git history.

---

## 6. AI Behaviour

### 6.1 Difficulty matrix (exact counts, enforced by validator)

| Difficulty | Suspects | Clues | Hints | Min. incriminating clues for culprit | Min. red herrings |
|---|---|---|---|---|---|
| Easy | 3 | 5 | 2 | 2 | 0 |
| Medium | 4 | 7 | 3 | 3 | 1 |
| Hard | 5 | 9 | 3 | 3 | 2 |

Difficulty also shapes *style* (put in the prompt): Easy = direct clues, one obvious motive gap; Medium = at least one misleading clue, overlapping motives; Hard = subtle clues that only combine meaningfully, multiple plausible suspects, a timeline contradiction.

### 6.2 Generation contract
Gemini must return **JSON only** (use structured output: `responseMimeType: "application/json"` plus a response schema). Expected shape (internal, never sent to the client as-is):

```json
{
  "title": "string",
  "story": "string (150–400 words, sets the scene, does NOT name the culprit)",
  "suspects": [
    { "id": "s1", "name": "string", "role": "string", "description": "string", "alibi": "string" }
  ],
  "clues": [
    {
      "id": "c1",
      "label": "string (≤ 60 chars, a location/object, no conclusions)",
      "text": "string (what the player learns when examining it)",
      "kind": "incriminating | exculpatory | red_herring | neutral",
      "implicates": ["s2"],
      "clears": ["s1"]
    }
  ],
  "hints": [
    { "level": 1, "text": "string (gentle nudge)" },
    { "level": 2, "text": "string (stronger nudge)" }
  ],
  "solution": {
    "culpritId": "s3",
    "explanation": "string (step-by-step deduction referencing clue ids' content)",
    "keyClueIds": ["c2", "c4", "c5"]
  }
}
```

### 6.3 Prompt requirements
The generator prompt must:
1. State the exact counts for the chosen difficulty.
2. Require the culprit to be **deducible from the clues alone** (no outside knowledge, no unstated facts).
3. Require every innocent suspect to have a believable motive or suspicious detail, so the answer isn't obvious by elimination of "boring" characters.
4. Forbid clue `label`s and `story` from revealing or hinting at the culprit.
5. Require hints to be **progressive** (level 1 vague → last level points to the decisive clue) and to **never name the culprit**.
6. Ask the model to vary which suspect is the culprit, but do **not** rely on it: the server shuffles suspect order anyway (see 6.4).
7. Wrap the premise in delimiters and mark it as untrusted inspiration.

### 6.4 Validation pipeline (every generation, in order)
1. **Parse** JSON (strip code fences defensively).
2. **Schema (zod):** types, string length bounds, enums.
3. **Counts:** suspects/clues/hints equal the matrix for the difficulty.
4. **Uniqueness:** suspect ids unique; clue ids unique; hint levels are 1..N.
5. **Referential integrity:** `culpritId` ∈ suspects; every `keyClueIds` ∈ clues; every `implicates`/`clears` id ∈ suspects.
6. **Consistency rules:**
   - Culprit is in ≥ *min incriminating* clues' `implicates`, and those clues are in `keyClueIds`.
   - `keyClueIds` has ≥ 2 entries and includes **only** clues that implicate the culprit.
   - A clue never both implicates and clears the same suspect.
   - Red-herring count ≥ matrix minimum.
   - Every suspect is mentioned in at least one clue (`implicates` or `clears`).
7. **Leak check:** culprit's name must not appear in any clue `label` or in the hints in a way that directly accuses (simple substring check on "culprit/killer/murderer/guilty" + name co-occurrence is acceptable for P0).
8. **Retry policy:** on any failure, retry up to **2 more times**, appending the specific validation errors to the next prompt. After 3 failed attempts → `502 GENERATION_FAILED`. Also retry (with backoff) on transient Gemini errors (429/5xx). Request timeout: 45 s.
9. **Post-processing (server side, after validation):**
   - **Shuffle suspect order** (and clue order) with a cryptographically-seeded Fisher–Yates so the culprit's position carries no information.
   - Reassign display ids if desired, keeping all internal references consistent.
   - Strip HTML from all strings.

### 6.5 Solvability verifier (P1, high value)
A second, independent Gemini call receives **only** the public view (story, suspects, all clue texts) and must output `{ "culpritId": string, "confidence": 0–1 }` without seeing the solution. If its answer ≠ stored culprit, treat as validation failure and regenerate. This directly measures "is this mystery actually solvable?" and should be logged for evaluation (§13).

### 6.6 Logging
Log (server-side only): attempt count, validation failures by rule, latency, token usage if available, verifier agreement. Never log API keys; avoid logging full premises in production.

---

## 7. Scoring Rules (backend only)

| Component | Value |
|---|---|
| Correct accusation (base) | Easy **100**, Medium **150**, Hard **200** |
| Wrong accusation (base) | **0** |
| Each discovered clue | **+5** |
| Each hint used | **−10** |
| Minimum score | **0** |

```
total = max(0, base + 5 × cluesDiscovered − 10 × hintsUsed)
```

- `base` is 0 when the accusation is wrong; clue bonus and hint penalty still apply (floor 0).
- Max possible: Easy 100+25 = **125**, Medium 150+35 = **185**, Hard 200+45 = **245**.
- Score is computed **once**, at accusation time, from server-held progress. The client never sends a score.
- `scoring.js` exports a pure function `computeScore({ difficulty, correct, cluesDiscovered, hintsUsed })` with unit tests (§10).
- The **score preview** in the Investigation Room is a client-side estimate labelled "if correct" and is not authoritative.

### Required scoring test cases

| Difficulty | Correct | Clues | Hints | Expected |
|---|---|---|---|---|
| easy | yes | 0 | 0 | 100 |
| easy | yes | 5 | 2 | 105 |
| medium | yes | 7 | 3 | 155 |
| hard | yes | 9 | 3 | 215 |
| hard | yes | 3 | 0 | 215 |
| medium | no | 7 | 0 | 35 |
| easy | no | 1 | 2 | 0 (floor) |

---

## 8. Frontend Architecture

- **State:** React state + a `useCase(id)` hook that loads from `GET /api/cases/:id` and exposes `discoverClue`, `requestHint`, `refresh`. No global store needed.
- **API layer:** a single axios instance (`baseURL = import.meta.env.VITE_API_URL`, 60 s timeout for generation) with an interceptor that normalises errors to `{ code, message }`.
- **Persistence:** case ID is in the route; optionally store the last case ID in `localStorage` for a "Continue investigation" button on Home.
- **Never** compute or trust the score, culprit, or correctness on the client.
- **Route guards:** completed case → `/result`; active case → no access to `/result`.
- **Error boundary** at app root; friendly fallback.

---

## 9. Project Setup

### 9.1 Frontend
```bash
npm create vite@latest client -- --template react
cd client
npm install
npm install react-router-dom axios
npm install -D tailwindcss @tailwindcss/vite     # Tailwind v4 Vite plugin; follow the current Tailwind docs
```

### 9.2 Backend
```bash
mkdir server && cd server
npm init -y
npm install express cors dotenv mongoose @google/genai zod helmet express-rate-limit
npm install -D nodemon vitest supertest
```
Scripts: `"dev": "nodemon src/index.js"`, `"start": "node src/index.js"`, `"test": "vitest run"`.

### 9.3 Git hygiene
`.gitignore` must include `node_modules`, `.env`, `dist`. Run `git log -p | grep -i "AIza"` (or search for your key prefix) before the first push to confirm no key was committed. If a key leaks, **revoke it immediately**.

---

## 10. Testing Plan

### 10.1 Automated (backend)
| Area | Tests |
|---|---|
| `scoring.js` | All rows in §7 table. |
| `validator.js` | Valid payload passes; one failing test per rule in §6.4 (wrong counts, duplicate ids, bad culprit id, missing key clues, culprit-not-implicated, etc.). |
| `publicView.js` | **Leak test:** for a stored case, `JSON.stringify(publicView(doc))` must not contain the culprit id as a `culpritId` key, the solution explanation text, any clue `kind/implicates/clears`, unreleased hint text, or undiscovered clue text. |
| API (supertest, Gemini **mocked**) | Create at each difficulty; get case; discover clue twice (idempotent, score not doubled); hint until exhausted (→ 409); accuse; accuse again (→ 409); result before completion (→ 403); result after (→ 200); unknown ids (→ 404); bad bodies (→ 400). |
| Generation failure | Mock returns invalid JSON ×3 → `502`; invalid then valid → `201`. |

### 10.2 Manual E2E checklist (run on **localhost**, then again on **production**)
- [ ] Generate Easy, Medium, Hard mysteries; counts match §6.1.
- [ ] Open DevTools → Network: no response before accusation contains the culprit, explanation, or unreleased hints.
- [ ] Discover every clue; refresh; progress persists.
- [ ] Use all hints; extra request shows "no hints left".
- [ ] Accuse correct suspect → score matches formula; accuse in a new case with wrong suspect → score matches formula.
- [ ] Revisit `/case/:id/result` for a completed case; revisit for an active case → redirected.
- [ ] Disconnect network / stop backend: UI shows readable errors, no blank screens.
- [ ] Mobile viewport (375 px) usable end-to-end.

---

## 11. Deployment

1. **MongoDB Atlas:** create a free cluster, a database user, and allow network access (for hosted backends without static IPs, `0.0.0.0/0` with a strong password is the pragmatic free-tier option). Copy the connection string into `MONGODB_URI`.
2. **Backend (Render/Railway):** root dir `server`, build `npm install`, start `npm start`, health check `/api/health`. Set `PORT` (host-provided), `MONGODB_URI`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `CLIENT_URL` (your Vercel URL), `NODE_ENV=production`.
3. **Frontend (Vercel):** root dir `client`, framework Vite, env `VITE_API_URL` = backend URL. Add `client/vercel.json`:
   ```json
   { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
   ```
   so `/case/:id` deep links work on refresh.
4. **Update CORS** to the final Vercel URL; redeploy backend.
5. **Cold starts:** free tiers sleep. Before demo/submission, hit `/api/health` to warm the server; consider an uptime pinger. Mention this in the README.
6. **Smoke test on production** using §10.2, then create and solve one real mystery for the submission.

---

## 12. Build Order (give this to the AI coding tool **one step at a time**)

| Step | Task | Done when |
|---|---|---|
| 1 | Scaffold repo, `server` Express app, env validation, `/api/health`, Mongo connection | Server boots; health returns ok; missing env fails fast |
| 2 | `Case` model, `publicView.js`, `scoring.js` + unit tests | Scoring + leak tests pass |
| 3 | `validator.js` (zod + consistency rules) + unit tests | One test per rule passes |
| 4 | `gemini.js` + `generator.js` (prompt, structured output, retry loop) | A script generates a valid case for each difficulty |
| 5 | Endpoints: create, get, discover, hint, accuse, result + error handler + rate limits | supertest suite passes |
| 6 | Client scaffold: routes, layout, Tailwind, API layer | Pages render with mock data |
| 7 | Create Mystery page + loading/error states | Real mystery generated from UI |
| 8 | Investigation Room (suspects, clues, hints, progress) | Clue/hint actions work against API |
| 9 | Accusation + Results pages, route guards | Full game loop works locally |
| 10 | Polish: responsive, a11y, empty/error states, README | §10.2 passes locally |
| 11 | Deploy (DB → backend → frontend), env vars, CORS | §10.2 passes in production |
| 12 | (P1) Solvability verifier + rate limits tuning | Verifier agreement logged |
| 13 | Record/solve a mystery on production; submit | Form submitted |

**Instruction for AI assistants:** implement only the requested step; do not modify files outside that step unless required; run the tests for that step; never put the solution or API key in client code; if the spec is ambiguous, ask or state the assumption in a code comment.

---

## 13. Acceptance Criteria

The project is complete when **all** are true:

- [ ] Mysteries generate successfully at Easy, Medium, and Hard with exact counts (3/5/2, 4/7/3, 5/9/3).
- [ ] Invalid or inconsistent AI output is rejected, retried, and ultimately surfaces a friendly error, never a crash or bad data in the DB.
- [ ] Players can discover clues, request hints (up to the limit), and submit exactly one accusation.
- [ ] **No endpoint exposes the culprit, explanation, key clues, hidden clue metadata, unreleased hints, or undiscovered clue text before the accusation** (verified by automated leak test and manual Network-tab check).
- [ ] Score is computed on the backend using §7 and matches the test table.
- [ ] Results page shows verdict, correct culprit, explanation, key clues, and score breakdown.
- [ ] Refreshing any page restores state; completed cases can't be re-accused.
- [ ] App is usable on a 375 px-wide screen and keyboard-navigable.
- [ ] Frontend (Vercel), backend, and MongoDB Atlas are deployed and the full game works on the production URL.
- [ ] Repo has `SPEC.md`, `README.md` (setup, env vars, architecture, how to run tests, known limitations), `.env.example` files, and no committed secrets.
- [ ] A mystery has been created and solved on the live site.

---

## 14. Stretch Goals (only after P0 is deployed)

1. **Mystery quality eval harness:** generate 30+ cases per difficulty, run the blind verifier (§6.5), and report solvability rate, validation-failure breakdown, latency, and cost. Publish the findings in a short write-up. Likely the most distinctive part of this project.
2. **Prompt A/B testing:** compare two prompt variants on solvability and "interestingness" (LLM-as-judge plus manual spot checks).
3. **Streaming generation** (SSE) with progressive UI.
4. **Share a case** via link (players solve the same mystery); anonymous best-score board per case.
5. **Interrogation mode:** player asks suspects questions; a constrained Gemini call answers in-character without contradicting the hidden solution.
6. **Observability:** structured logs, error tracking (e.g. Sentry), basic metrics.
7. **CI:** GitHub Actions running backend tests on every push.

---

## 15. Known Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Gemini returns unsolvable mysteries | Consistency rules (§6.4) + blind verifier (§6.5) |
| Gemini latency/quota during demo | Retries with backoff, 45 s timeout, friendly errors, pre-generate a demo case before submission |
| Culprit position bias (LLMs favour certain slots/names) | Server-side shuffle |
| Free-tier cold starts | Warm-up ping, README note, health endpoint |
| API key leakage | Server-only key, `.env` ignored, history check before first push |
| Cost abuse | Per-IP rate limit on generation, TTL on stored cases |
| Scope creep before deadline | P0/P1/P2 tiers; **target deploy by 30 Oct**, leaving 2 days buffer |

---

## 16. Suggested Timeline (today = 25 Oct)

| Date | Goal |
|---|---|
| 25–26 Oct | Finalise this spec, Steps 1–3 |
| 27 Oct | Steps 4–5 (generation + API working locally) |
| 28 Oct | Steps 6–9 (full game loop in UI) |
| 29 Oct | Step 10 polish |
| 30 Oct | Step 11 **deploy** + production smoke test |
| 31 Oct–1 Nov | Step 12 (verifier), fixes, README, solve a mystery on prod |
| **1 Nov** | **Submit** (one day before the deadline) |
| 2 Nov | Buffer only |

# Proof‑Nomic LLM Game – **Vite + React** & MobX State Tree Architecture

## 1 · High‑Level Overview

A **Vite + React 18** single‑page application acts as the **Game Host**, orchestrating a Nomic match among multiple LLM "MCP servers" (remote HTTP services). The entire game state lives in a single **MobX State Tree (MST)** store whose **snapshots** are logged to the browser console to let developers time‑travel‑debug. When the game ends, the app compiles the final `RULEBOOK.md` (including a score report) and offers it as a client‑side download.

```
┌───────────────┐
│  UI (React)   │  Vite dev server / SPA routing
└──────┬────────┘        user click               HTTP/JSON
       │  ───────────────────────────────────▶   │
       ▼                                         │
┌────────────────┐  MST actions / snapshots  ┌───────────────┐
│   MST Store    │──────────────────────────▶│ LLM MCP #n │
└────────────────┘◀───────────────────────────└───────────────┘
```

**MVP assumptions**

- **Players**: *only automated LLMs* (no human interaction in‑game yet).
- **Turn Duration**: fastest possible loop (milliseconds/seconds) – but controlled by a config value `turnDelayMs` so it can be dialled up later.
- **Auth**: All MCP endpoints run on localhost with no authentication.
- **Error Handling**: On MCP timeout or invalid markdown the game **pauses** and throws a descriptive error (LLM id, request type, body, stack). The developer can then resume after fixing.

---

## 2 · Core Domain Models (MST)

| Model             | Key Fields                                                                                                           | Purpose                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| **RuleModel**     | `id:number`, `text:string`, `mutable:boolean`                                                                        | Immutable vs mutable rule tracking & lookup (Rule 101 ff).  |
| **PlayerModel**   | `id`, `name`, `icon`, `llmEndpoint`, `points`                                                                        | Represents each autonomous LLM agent (Rule 102, 106).       |
| **ProposalModel** | `id`, `proposerId`, `ruleChange:RuleChange`, `status:'pending' \| 'passed' \| 'failed'`, `votes:Vote[]`, `timestamp` | Captures a single rule‑change (Rule 103, 105).              |
| **VoteModel**     | `voterId`, `choice:'FOR' \| 'AGAINST' \| 'ABSTAIN'`                                                                  | Stored inside a Proposal; used to evaluate passage.         |
| **GameModel**     | `players`, `rules`, `proposals`, `turn:number`, `phase`, `freezeVotes`, `history:Snapshot[]`                         | Root store; enforces Rule Hierarchy, victory, scoring, etc. |

Each model exposes **actions** that mirror legal moves (e.g. `propose()`, `castVote()`, `resolveProposal()`, `callFreezeVote()`). An MST **middleware** hooks `onAction` & `onSnapshot` to push snapshots to `console.log` and to an optional in‑memory ring buffer for debugging.

### 2.1 RuleEngine Service

A functional layer that consumes the current snapshot and a candidate `GameAction`, throws if illegal, or returns an updated MST patch. Encodes precedence (Rule 109) and supports **transmutation** logic.

### 2.2 Persistence Adapter (WIP)

For MVP the store is in‑memory. **Optional plug‑ins** can hydrate/dehydrate snapshots to:

- **Dexie.js** (IndexedDB wrapper) – good performance, simple API.
- **sql.js (SQLite WASM)** – lightweight SQL DB in browser, if relational querying is desired. Both adapters follow a unified `IGamePersistence` interface so cloud or server‑side storage can later replace them.

---

## 3 · Turn Cycle Orchestrator

1. **Random‑Seat Start** – `GameModel.setup()` shuffles `players` and sets `turn=0` (Rule 104).
2. **Proposal Phase** – The **Active Player** (LLM) receives an HTTP `POST /propose` with the game snapshot + Prompt P. The LLM returns a Proposal markdown string.
3. **Voting Phase** – Host sends the Proposal to each LLM via `POST /vote` → choice. Votes are written to MST. The host resolves passage using Rule 105 logic and updates scores (Rule 106).
4. **Judging (opt.)** – If disputes arise, `RuleEngine` selects the Judge (Rule 107) and triggers `POST /judge`.
5. **Freeze Check** – Any player can trigger `callFreezeVote()`. The orchestrator tallies `FOR` vs total players (Rule 108).
6. **Next Turn** – `turn = (turn + 1) % playerCount`.

`setTimeout` (or `await delay(turnDelayMs)`) throttles each phase so developers can observe the cycle.

---

## 4 · UI Breakdown (Vite SPA + React Router v6)

| Component                         | Description                                                                                              |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `App.tsx`                         | Router with two routes: `/` (Landing) and `/game`.                                                       |
| `routes/Home.tsx`                 | **PromptForm** + **PlayButton**; on submit instantiates `<GameProvider>` and navigates to `/game`.       |
| `routes/Game.tsx`                 | Houses **Scoreboard**, **TurnBanner**, **ProposalViewer**, **ConsoleHint**.                              |
| `components/GameProvider.tsx`     | Creates MST root store, exposes via React Context, wires snapshot logger & optional persistence adapter. |
| `components/Scoreboard.tsx`       | Row of avatar icons + live point totals.                                                                 |
| `components/ProposalViewer.tsx`   | Shows current Proposal markdown (using `react-markdown`).                                                |
| `components/DownloadRulebook.tsx` | Appears when game phase === `completed`; triggers client‑side download of `RULEBOOK.md` using a Blob.    |

Styling: CSS Modules; icons via `vite-plugin-svgr` or local assets.

---

## 5 · API Contract with LLM MCP Servers (unchanged)

```http
POST /propose
Body: {
  promptP: string,
  gameSnapshot: SnapshotIn<typeof GameModel>
}
→ 201 Created {
  proposalMarkdown: string  // single rule‑change in markdown
}

POST /vote
Body: {
  proposalMarkdown: string,
  gameSnapshot: SnapshotIn<typeof GameModel>
}
→ 200 OK {
  vote: 'FOR' | 'AGAINST' | 'ABSTAIN'
}
```

Error → **timeout / 4xx** ⇒ host throws `MCPError` containing `playerId`, `endpoint`, `phase`, `body`, `response`.

---

## 6 · Snapshot Logging & Time‑Travel Debugging

```ts
onSnapshot(gameModel, (snap) => {
  console.log('[SNAPSHOT]', JSON.stringify(snap, null, 2));
});
```

Developers can paste a snapshot back into `GameModel.create()` to reproduce any moment. The store config exposes `snapshotMode` (`'full' | 'diff'`) and `debugSnapshots` (boolean) so early sessions can emit **all** snapshots, then switch to diff‑only for performance.

---

## 7 · End‑Game Packaging

`GameModel.finalize()` constructs:

1. `RULEBOOK.md` – concatenation of initial rules + all passed Proposals.
2. `SCORE_REPORT.md` – table of final point totals. Both blobs can be zipped (via `jszip`) and offered via an `<a download>`.

---

## 8 · Automated Tests (Vitest + @testing-library/react)

- **Unit** – RuleEngine invariants, score math, transmutation edge cases.
- **Integration** – Simulated game loop with mock LLM servers.

---

## 9 · Critical Observations & Potential Risks

1. **LLM Output Validation (Zod)** – Proposal markdown is parsed to a structured `RuleChange` AST that must conform to a `zod` schema (e.g., `ProposalSchema`). Invalid data throws immediately, pausing the game before state mutation.
2. **Rule Conflicts** – The RuleEngine needs a clear conflict‑resolution & override system (Rule 109). Snapshot‑based diffing can help detect ambiguous edits.
3. **Scalability** – MST snapshots grow quickly; default logging uses `onPatch` diffs after an initial *N* full‑snapshot warm‑up (configurable via `snapshotMode: 'full' | 'diff'` and `warmupTurns`).
4. **Async Turn Timing** – Network latency and LLM response times could stall the store; implement per‑step `Promise.race()` with `timeoutMs`. Failing MCPs raise a pause‑worthy `MCPError`.
5. **Security** – Never execute LLM‑returned code client‑side. Treat all strings as untrusted.

---

## 10 · Resolved Owner Decisions (✅)

| Decision           | Value                                                         |
| ------------------ | ------------------------------------------------------------- |
| Player Count & Mix | **LLM‑only (no humans) for MVP**                              |
| Turn Speed         | **Fastest** (`turnDelayMs` default = 200 ms) but configurable |
| Error Handling     | **Pause game & throw** `MCPError` with context                |
| Persistence        | MVP = in‑memory; optional **Dexie.js** or **sql.js** plug‑in  |
| Auth               | MCPs run on localhost, no auth                                |

---

## 11 · Next Steps

1. Finalise API spec & error contracts (`MCPError` shape, status codes).
2. `npm create vite@latest proof‑nomic -- --template react-ts` → set up ESLint + Prettier + Vitest.
3. Implement MST models & RuleEngine with exhaustive unit tests.
4. Build persistence adapter interface + Dexie.js prototype.
5. Wire Turn Cycle orchestrator with configurable delays & error pause.
6. Create minimal UI components & test time‑travel snapshots in dev console.
7. Add download packaging & zip helper.
8. Iterate! 🚀


---

# 📌 rev 3 Addendum — Phase 4 Enhancements

This addendum layers Phase 4 hardening features onto the existing **rev 2** architecture. No diagrams or core flows change; instead we expand metadata, validation, and dev tooling.

## 7.1 Packaging Metadata Extension
* **RULEBOOK.md** entries now include: turn #, proposer, FOR/AGAINST/ABSTAIN counts, and a *superseded* flag if the rule text was later amended or repealed.
* **SCORE_REPORT.md** gains a **Stats** section with, per player: total FOR votes, AGAINST votes, ABSTAINS, proposals authored, proposals adopted.
* A `game‑stats.json` file is added to the ZIP for programmatic analysis.

## 2.1 RuleEngine — Semantic Validation (Rule 115)
* After applying a candidate mutation, `RuleEngine.validateSemantic()` simulates the resulting rulebook and ensures:
  * Immutable rules cannot be repealed unless transmuted to Mutable **in the same proposal**.
  * Transmuting a rule that is already of the target mutability is void.
  * No duplicate rule numbers exist.
  * Rule text must be non‑empty.
* Violations raise `RuleValidationError`, causing the proposal to fail automatically.

## 3.3 Replay & Debug
* Each turn’s `MCPSeed` plus snapshot hash is stored in persistence.
* **DevPanel** now has a **Replay Turn** button that re‑executes the selected snapshot & seed, showing a diff overlay.

## 4.1 Real LLM Agent Adapter
* New optional adapter `OpenAIAgent` implements the MCP interface using OpenAI Chat completions.
* Activated when `process.env.LLM_TOKEN` is present; otherwise skipped.
* Timeout is fixed at 5 000 ms. Results are parsed through the same Zod validation.

## 8.1 Browser E2E in CI
* GitHub Actions job **ci‑e2e.yml** runs Playwright headless Chromium:
  1. Starts Vite dev server.
  2. Plays five turns on mocks.
  3. Reloads the page and verifies persistence (scoreboard & proposal count).

## 4.2 Accessibility & Keyboard Navigation
* `@axe‑core/react` integrated in dev; violations of *serious* or *critical* impact fail CI.
* Component tests ensure DevPanel and ErrorBanner are operable via keyboard only.

---

*End of rev 3 addendum.*
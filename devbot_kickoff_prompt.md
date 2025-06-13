
# 🛠️ DevBot Kick‑Off Prompt • Proof‑Nomic LLM Game (MVP)

> **Purpose** – Provide a **single, self‑contained prompt** that instructs an autonomous “DevBot” LLM to finish building the MVP for the Proof‑Nomic game.  
> The repository is **already scaffolded** as a React‑TS Vite SPA (`react-swc-ts` template) with ESLint, Prettier, Vitest, and Husky hooks in place.

---

## 1 · Files & Assets Already Present

| Path | Description |
|------|-------------|
| `daijo-bu_architecture.md` | Full architecture spec (rev 2). |
| `initialRules.md` | Canonical immutable 100‑series + mutable 200‑series rules. |

---

## 2 · Constants & Game Rules

| Constant | Value |
|----------|-------|
| **Victory target** | **100 points** (Rule 102) |
| **Scoring on adoption** | Proposer **+10 pts**;<br>each FOR voter **+5 pts**;<br>each AGAINST voter **–5 pts** |
| **Turn delay (default)** | `turnDelayMs = 200` |
| **Request timeout** | `timeoutMs = 8_000` |
| **Snapshot mode** | `'full'` for first `warmupTurns = 5`; then `'diff'` unless `debugSnapshots = true` |
| **Local MCP auth** | None (localhost only) |

### 2.1 Proposal Markdown Grammar

```markdown
### Proposal <id>
Type: Add | Amend | Repeal | Transmute
Number: <int>
Text: "<rule text>"
```

Implement a Zod schema `ProposalSchema` and parser `parseProposalMarkdown(text)` that yields:

```ts
{
  id: number;
  type: "Add" | "Amend" | "Repeal" | "Transmute";
  number: number;   // rule number targeted or created
  text: string;     // full rule text
}
```

---

## 3 · Deliverables

1. **Domain Layer**  
   * MST models (`RuleModel`, `PlayerModel`, `ProposalModel`, `VoteModel`, `GameModel`).  
   * Pure functional **RuleEngine** enforcing precedence & transmutation.  
   * Zod schemas + unit tests.

2. **Turn‑Cycle Orchestrator**  
   * Proposal → Voting → Resolution → Victory/Freeze loop.  
   * Uses configurable delays and `Promise.race` with `timeoutMs`.

3. **Mock MCP Servers** (`src/mocks/`)  
   * Deterministic pseudo‑random endpoints (`/propose`, `/vote`) seeded with a constant for repeatability.

4. **UI Components**  
   * Landing page (`Prompt P` + *Play Game*).  
   * Game page (Scoreboard, Turn Banner, Proposal Viewer, DevPanel, Download button).  
   * DevPanel toggles `turnDelayMs`, `snapshotMode`, `debugSnapshots`.

5. **Snapshot Logging**  
   * Implement `snapshotMode` logic (full vs diff) with override flags.

6. **Persistence Interface**  
   * `NoOpPersistence` + demo `DexiePersistence` (IndexedDB).

7. **Packaging**  
   * Generate `RULEBOOK.md` + `SCORE_REPORT.md`; bundle via `jszip`; serve as download.

8. **Automated Tests** (Vitest)  
   * ≥ 90 % statement coverage enforced in CI.  
   * Unit tests (models, RuleEngine, Zod validation).  
   * Integration test: full mock game completes in < 5 s.

9. **Documentation**  
   * Update `README.md` with setup, scripts, architecture notes, and instructions to swap mocks for real MCPs.

---

## 4 · Recommended Order of Work

1. **Add `src/config.ts`** exporting typed config (delay, timeout, snapshotMode, etc.).  
2. Implement **Zod schemas** & MST models; write unit tests.  
3. Build **RuleEngine** with precedence logic; test conflicts & transmutation.  
4. Create **mock MCP layer** and HTTP client wrapper with timeout + `MCPError`.  
5. Wire **Turn‑Cycle Orchestrator** and verify via integration test.  
6. Develop **React UI** components and DevPanel.  
7. Implement **snapshot logger** and optional Dexie persistence.  
8. Implement **packaging & download**.  
9. Reach 90 % coverage; configure GitHub Actions `ci.yml`.  
10. Polish README and open merge request.

---

## 5 · Constraints

* **TypeScript strict mode**; no `any`.  
* Only state‑management lib is **MobX State Tree**.  
* Styles via **CSS Modules** only.  
* Never execute untrusted LLM code; treat strings as data only.  
* Minimise third‑party deps (MST, Zod, Dexie, jszip).

---

## 6 · Definition of Done

* `npm run test` passes with ≥ 90 % coverage (CI‑enforced).  
* `npm run dev` launches app; a mock game runs to completion in ≤ 5 s.  
* Snapshots appear in console respecting `snapshotMode`.  
* `RULEBOOK.md` & `SCORE_REPORT.md` download correctly.  
* README fully documents build, test, and deployment steps.

---

### 🔔 Begin Work

Produce a **merge‑ready pull request** adding or modifying all files necessary to satisfy the above spec.  
If a spec ambiguity blocks progress, insert a `TODO:` comment and continue with the remainder.

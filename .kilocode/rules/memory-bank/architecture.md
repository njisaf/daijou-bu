# System Architecture

## High-Level Overview

Daijō-bu uses a **single-page application (SPA)** architecture with React 18 + Vite on the frontend, orchestrating gameplay through a centralized MobX State Tree (MST) root store. The system coordinates multiple autonomous LLM agents through an abstracted agent interface, supporting OpenAI, Ollama, and Mock implementations.

```
┌─────────────────────────────────────────────────────────────────┐
│                        React UI Layer                           │
│  (Home, Game, RulesetEditor, ConfigEditor, DevPanel)           │
└──────────────────────┬──────────────────────────────────────────┘
                       │
┌──────────────────────▼──────────────────────────────────────────┐
│                   GameProvider Context                          │
│  • MST Root Store Management                                    │
│  • Orchestrator Initialization                                  │
│  • Persistence Layer Setup                                      │
└──────────────────────┬──────────────────────────────────────────┘
                       │
        ┌──────────────┼──────────────┬──────────────┐
        │              │              │              │
┌───────▼────────┐ ┌──▼──────────┐ ┌─▼──────────┐ ┌─▼──────────┐
│   GameModel    │ │TurnOrch-    │ │ Snapshot   │ │Persistence │
│  (MST Root)    │ │estrator     │ │ Logger     │ │  Adapter   │
└───┬────────────┘ └──┬──────────┘ └────────────┘ └────────────┘
    │                 │
    │  ┌──────────────┴──────────────┐
    │  │                             │
┌───▼──▼────────┐            ┌───────▼──────────┐
│  RuleEngine   │            │  AgentFactory    │
│  Validation   │            │  (p-limit)       │
└───────────────┘            └───────┬──────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
              ┌──────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
              │OpenAI Agent │ │Ollama Agent│ │Mock Agent  │
              │(GPT-3.5)    │ │(Local LLM) │ │(Seeded)    │
              └─────────────┘ └────────────┘ └────────────┘
```

## Core Architecture Layers

### 1. UI Layer (`src/routes/`, `src/components/`)

**Purpose**: React-based presentation layer with client-side routing

**Key Components**:
- [`Home.tsx`](src/routes/Home.tsx:1) - Landing page with Prompt P input and game setup
- [`Game.tsx`](src/routes/Game.tsx:1) - Main gameplay interface with live updates
- [`RulesetEditor.tsx`](src/routes/RulesetEditor.tsx:1) - CRUD operations for rules with drag-and-drop
- [`ConfigEditor.tsx`](src/routes/ConfigEditor.tsx:1) - Game configuration management
- [`DevPanel.tsx`](src/components/DevPanel.tsx:1) - Time-travel debugging interface (dev mode only)

**UI Component Patterns**:
- **CSS Modules** for scoped styling
- **MobX observer** pattern for reactive updates
- **React.lazy()** for code-splitting routes
- **React Context** for dependency injection

### 2. State Management Layer (`src/models/`)

**Purpose**: MobX State Tree provides centralized, immutable state with snapshots

**MST Models** (all in [`src/models/`](src/models/)):

| Model | Purpose | Key Actions | Key Views |
|-------|---------|-------------|-----------|
| [`GameModel`](src/models/GameModel.ts:1) | Root store orchestrating entire game | `setupGame()`, `nextTurn()`, `checkVictoryCondition()` | `currentPlayer`, `isGameWon`, `gameSnapshot` |
| [`PlayerModel`](src/models/PlayerModel.ts:1) | Individual AI agent with scoring | `awardPoints()`, `incrementProposalCounter()`, `recordVoteAccuracy()` | `hasWon`, `performanceSummary`, `scoreReportData` |
| [`RuleModel`](src/models/RuleModel.ts:1) | Individual game rule | `updateText()`, `transmute()` | `isImmutable`, `isMutable`, `summary` |
| [`ProposalModel`](src/models/ProposalModel.ts:1) | Rule change proposal with votes | `addVote()`, `setJudgeVerdict()`, `resolve()` | `isPassed`, `isFailed`, `voteTally` |
| [`VoteModel`](src/models/VoteModel.ts:1) | Single player vote | None (value object) | Vote choice accessor |
| [`GameConfigModel`](src/models/GameConfigModel.ts:1) | Reactive configuration | `validateAndThrow()`, `update()` | Validation status |
| [`RuleSetModel`](src/models/RuleSetModel.ts:1) | Editable rule collections | `addRule()`, `moveRuleUp()`, `toJSON()` | `sortedRules`, `validation` |

**State Flow**:
```
User Action → MST Action → State Mutation → Observer Re-render
                    ↓
              Snapshot Logged → History Stored
```

### 3. Business Logic Layer (`src/engine/`, `src/orchestrator/`)

**RuleEngine** ([`src/engine/RuleEngine.ts`](src/engine/RuleEngine.ts:1)):
- **Pure functional** validation engine
- Implements rule precedence (Rule 109: Immutable > Mutable, Rule 113: Lower ID > Higher ID)
- Validates proposals against current ruleset
- Applies transmutation logic
- Performs Rule 115 consistency checks

**TurnOrchestrator** ([`src/orchestrator/TurnOrchestrator.ts`](src/orchestrator/TurnOrchestrator.ts:1)):
- **Async workflow** manager for turn cycles
- Coordinates: Proposal Phase → Voting Phase → Resolution → Next Turn
- Manages timeouts with `Promise.race()` (configurable: 5-25 seconds)
- Emits events for UI updates (`turnStart`, `votingPhaseStart`, `turnComplete`, `victory`)
- Handles errors with automatic game pause

**Turn Cycle Flow**:
```
1. Proposal Phase
   - Get current player from GameModel
   - Call AgentFactory.propose(gameSnapshot)
   - Parse markdown → validate → create ProposalModel

2. Voting Phase
   - For each player: AgentFactory.vote(proposalMarkdown, gameSnapshot)
   - Collect votes in parallel (p-limit: 4 concurrent)
   - Store votes in ProposalModel

3. Resolution
   - Auto-resolve judge verdict if pending (stub: always 'sound')
   - Call proposal.resolve() (majority vote logic)
   - Award points per Rules 301-303
   - Update player counters (proposals passed, vote accuracy)
   - Append score entry per Rule 303

4. Victory Check
   - Check: freeze proposal passed + acceptance tests (stub: false)
   - Check: player reached 100 points (legacy)
   - If victory: set phase='completed', emit victory event

5. Next Turn
   - Deactivate current player
   - Increment turn counter
   - Activate next player (round-robin)
```

### 4. LLM Agent Layer (`src/agents/`)

**Agent Interface** ([`IAgent.ts`](src/agents/IAgent.ts:1)):
```typescript
interface IAgent {
  propose(gameSnapshot: GameSnapshot, prompt?: string): Promise<string>;
  vote(proposal: string, gameSnapshot: GameSnapshot): Promise<'FOR' | 'AGAINST' | 'ABSTAIN'>;
  isAvailable(): boolean;
  getCurrentSeed?(): string;
  getType(): 'openai' | 'ollama' | 'mock';
}
```

**Agent Implementations**:

1. **OpenAIAgentAdapter** ([`src/agents/OpenAIAgentAdapter.ts`](src/agents/OpenAIAgentAdapter.ts:1))
   - Uses OpenAI Chat Completions API (GPT-3.5-turbo)
   - Environment: `LLM_TOKEN` required
   - Timeout: 15 seconds
   - Rate limiting: 3 req/min with 22s delays

2. **OllamaAgent** ([`src/agents/OllamaAgent.ts`](src/agents/OllamaAgent.ts:1))
   - Uses local Ollama API (http://localhost:11434)
   - Environment: `OLLAMA_BASE_URL`, `OLLAMA_MODEL`
   - Timeout: 25 seconds (longer for local processing)
   - Models: mistral:7b-instruct, llama2:7b-chat, etc.

3. **MockAgent** ([`src/agents/MockAgent.ts`](src/agents/MockAgent.ts:1))
   - Deterministic seeded pseudo-random responses
   - Uses Linear Congruential Generator (LCG) for reproducibility
   - Generates proposals from templates
   - Vote bias based on keyword analysis

**AgentFactory** ([`src/agents/AgentFactory.ts`](src/agents/AgentFactory.ts:1)):
- **Factory pattern** with automatic agent selection
- **Concurrency control** via p-limit (default: 4)
- **Automatic fallback**: 3 consecutive failures → switch to MockAgent
- **Configuration detection**: `AGENT_TYPE` env var → auto-detect from API keys → default to mock

### 5. Validation Layer (`src/schemas/`)

**Zod Schemas** ([`src/schemas/proposal.ts`](src/schemas/proposal.ts:1)):
- **ProposalSchema**: Validates proposal structure with required proof section (Rule 121)
- **parseProposalMarkdown()**: Parses LLM output with multi-line support and Unicode smart quote handling
- **Error recovery**: Handles XML-like tags and malformed LLM output

### 6. Persistence Layer (`src/persistence/`)

**Abstraction** ([`IGamePersistence.ts`](src/persistence/IGamePersistence.ts:1)):
```typescript
interface IGamePersistence {
  saveSnapshot(snapshot: GameSnapshot): Promise<void>;
  loadSnapshot(): Promise<GameSnapshot | null>;
  clearStorage(): Promise<void>;
}
```

**Implementations**:
- **DexiePersistence** ([`src/persistence/DexiePersistence.ts`](src/persistence/DexiePersistence.ts:1)): IndexedDB wrapper for browser storage
- **NoOpPersistence** ([`src/persistence/NoOpPersistence.ts`](src/persistence/NoOpPersistence.ts:1)): Fallback with no-op operations

### 7. Debugging & Logging Layer (`src/logging/`)

**SnapshotLogger** ([`src/logging/SnapshotLogger.ts`](src/logging/SnapshotLogger.ts:1)):
- **Time-travel debugging** with snapshot history
- **Compression modes**: 'none' or 'gzip' (~70% reduction)
- **Snapshot types**: 'full' or 'diff' after warmup
- **Replay support**: Stores mcpSeed with each snapshot for deterministic replay

### 8. Packaging Layer (`src/packaging/`)

**GamePackager** ([`src/packaging/GamePackager.ts`](src/packaging/GamePackager.ts:1)):
- Generates comprehensive ZIP archives on game completion
- **5-file package**:
  1. `RULEBOOK.md` - All rules + adopted proposals with metadata
  2. `SCORE_REPORT.md` - Player rankings and detailed statistics
  3. `game-stats.json` - Machine-readable analytics
  4. `README.md` - Archive instructions and replay guidance
  5. `PROMPT_P.txt` - AI behavioral instructions (if configured)

## Critical Implementation Paths

### Path 1: Game Initialization
```
User enters Prompt P on Home
→ sessionStorage.setItem('promptP', value)
→ Navigate to /game
→ GameProvider creates GameModel with config
→ loadInitialRules(promptP) injects Rule 100
→ Create 3 players (Alice, Bob, Charlie)
→ gameModel.setupGame() → phase='playing'
→ AgentFactory initializes primary agent
→ Persistence adapter created (Dexie or NoOp)
```

### Path 2: Turn Execution
```
TurnOrchestrator.executeTurn() called
→ Log snapshot with mcpSeed
→ executeProposalPhase():
  - Get currentPlayer from GameModel
  - AgentFactory.propose(gameSnapshot) with timeout
  - parseProposalMarkdownWithoutId() → validate
  - gameModel.createProposal() → auto-generate ID
→ executeVotingPhase():
  - For each player: AgentFactory.vote() in parallel
  - proposal.addVote() for each response
→ resolveProposal():
  - Auto-set judge verdict to 'sound' (stub)
  - proposal.resolve() → check majority
  - Award points per Rules 301-303
  - gameModel.updatePlayerCounters()
  - gameModel.appendScoreEntry()
  - gameModel.checkVictoryCondition()
→ Log snapshot with mcpSeed
→ gameModel.nextTurn() → rotate active player
```

### Path 3: Game Completion & Download
```
Victory detected → phase='completed'
→ GamePackager.createGamePackage(gameModel)
→ Generate 5 files in memory
→ JSZip.generateAsync() → create blob
→ URL.createObjectURL(blob) → temporary URL
→ <a download> click → browser download
→ URL.revokeObjectURL() → cleanup
```

## Key Architectural Decisions

### 1. MobX State Tree (MST) Over Redux
**Why**: Time-travel debugging, snapshot/patch middleware, runtime type validation, less boilerplate

### 2. Agent Factory Pattern
**Why**: Seamless switching between LLM providers, automatic fallback on failures, consistent interface

### 3. Pure Functional RuleEngine
**Why**: Deterministic validation, easy testing, no side effects, immutable transformations

### 4. Event-Driven Orchestration
**Why**: Decouples UI from game logic, enables async workflows, supports future WebSocket integration

### 5. Client-Side ZIP Generation (JSZip)
**Why**: No server required, instant downloads, works offline, reduces hosting costs

### 6. Seeded Pseudo-Random Mock Service
**Why**: Deterministic testing, reproducible gameplay, research applications, debugging support

### 7. IndexedDB with Fallback
**Why**: Persistent storage across sessions, works offline, graceful degradation to NoOp

## Component Relationships

```
GameProvider (Context)
├── GameModel (MST Root)
│   ├── GameConfigModel (Configuration)
│   ├── PlayerModel[] (3 AI players)
│   ├── RuleModel[] (Initial + adopted rules)
│   ├── ProposalModel[] (All proposals)
│   │   └── VoteModel[] (Votes per proposal)
│   └── JudgeModel (Judge tracking)
│
├── TurnOrchestrator
│   ├── Uses: GameModel (read/write)
│   ├── Uses: AgentFactory (propose/vote)
│   └── Uses: SnapshotLogger (logging)
│
├── AgentFactory
│   ├── PrimaryAgent (OpenAI|Ollama|Mock)
│   ├── FallbackAgent (always Mock)
│   └── p-limit (concurrency: 4)
│
├── SnapshotLogger
│   └── Uses: GameModel (snapshot)
│
└── Persistence (Dexie|NoOp)
    └── Uses: GameModel (save/load)
```

## Source Code Paths

**Core Source Structure**:
```
src/
├── routes/           # React Router pages
│   ├── Home.tsx      # Landing & setup
│   ├── Game.tsx      # Main gameplay
│   ├── RulesetEditor.tsx
│   ├── ConfigEditor.tsx
│   └── JudgeRoute.tsx
│
├── components/       # Reusable React components
│   ├── GameProvider.tsx    # MST context provider
│   ├── Scoreboard.tsx      # Player scores
│   ├── TurnBanner.tsx      # Current turn info
│   ├── ProposalViewer.tsx  # Proposal display
│   ├── DevPanel.tsx        # Debug interface
│   ├── ErrorBanner.tsx     # Error display
│   ├── DownloadRulebook.tsx
│   └── RuleFormModal.tsx
│
├── models/           # MobX State Tree models
│   ├── GameModel.ts        # Root store
│   ├── PlayerModel.ts      # AI player
│   ├── RuleModel.ts        # Single rule
│   ├── ProposalModel.ts    # Rule change
│   ├── VoteModel.ts        # Vote record
│   ├── JudgeModel.ts       # Judge tracking
│   ├── GameConfigModel.ts  # Configuration
│   └── RuleSetModel.ts     # Rule collection
│
├── engine/           # Business logic
│   └── RuleEngine.ts       # Validation logic
│
├── orchestrator/     # Game flow
│   └── TurnOrchestrator.ts # Turn cycle manager
│
├── agents/           # LLM integration
│   ├── IAgent.ts           # Interface
│   ├── AgentFactory.ts     # Factory + fallback
│   ├── OpenAIAgentAdapter.ts
│   ├── OllamaAgent.ts
│   ├── MockAgent.ts
│   └── JudgeAgent.ts       # Judge evaluation
│
├── schemas/          # Validation
│   └── proposal.ts         # Zod schemas + parsers
│
├── mocks/            # Mock services
│   ├── MockMCPService.ts   # Deterministic LLM
│   └── MCPClient.ts        # HTTP client
│
├── persistence/      # Storage
│   ├── IGamePersistence.ts # Interface
│   ├── DexiePersistence.ts # IndexedDB
│   └── NoOpPersistence.ts  # Fallback
│
├── logging/          # Debugging
│   └── SnapshotLogger.ts   # Time-travel debug
│
├── packaging/        # Archives
│   └── GamePackager.ts     # ZIP generation
│
└── utils/            # Utilities
    ├── loadInitialRules.ts # Rule loading + injection
    └── cloneDefaultRuleset.ts
```

## Design Patterns in Use

1. **Factory Pattern**: AgentFactory creates appropriate agent based on environment
2. **Strategy Pattern**: IAgent interface allows swapping LLM implementations
3. **Observer Pattern**: MobX reactions for reactive UI updates
4. **Command Pattern**: MST actions encapsulate state mutations
5. **Repository Pattern**: IGamePersistence abstracts storage implementation
6. **Singleton Pattern**: Global AgentFactory instance via `getAgentFactory()`
7. **Adapter Pattern**: OpenAIAgentAdapter wraps OpenAI API to IAgent interface
8. **Template Method**: TurnOrchestrator defines turn cycle skeleton
9. **Null Object Pattern**: NoOpPersistence provides do-nothing implementation

## Performance Considerations

- **Bundle Size**: 193KB gzipped (45% under 350KB target)
- **Vendor Chunking**: React, Router, MobX separated for caching
- **Tree Shaking**: Terser minification with console.log removal
- **Code Splitting**: Lazy-loaded routes with React.lazy()
- **Snapshot Compression**: GZIP reduces payload by ~70%
- **Concurrency Limit**: p-limit caps concurrent LLM requests at 4
- **Turn Delays**: Configurable 200ms default for smooth gameplay
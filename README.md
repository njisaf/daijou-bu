# 大条部
## *Great Law Division*
### 🛠️ Proof-Nomic LLM Game

A **Vite + React 18** single-page application implementing Peter Suber's Nomic game with autonomous LLM players. The game orchestrates rule changes, voting, and scoring among multiple AI agents through HTTP/JSON communication.

## 🎯 Overview

Daijō-bu is a digital implementation of Nomic, a game where the rules themselves can be changed during gameplay. AI players propose rule modifications, vote on proposals, and compete for victory points. The game demonstrates emergent gameplay through rule evolution and strategic voting.

### Key Features

- **Autonomous LLM Players**: AI agents make proposals and vote independently
- **Rule Evolution**: Dynamic rule system with immutable/mutable precedence  
- **Real-time Gameplay**: Fast turn cycles with configurable timing
- **Deterministic Testing**: Seeded pseudo-random behavior for reproducibility
- **MST State Management**: MobX State Tree for predictable state updates
- **Time-travel Debugging**: Complete game state snapshots for debugging

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (recommended: use nvm)
- npm 8+

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd daijo-bu

# Install dependencies
npm install

# Run tests
npm test

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests once (avoids watch mode)
npm run test -- --run

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm run test -- --run src/models/RuleModel.test.ts

# Run tests with verbose output
npm run test -- --run --reporter=verbose
```

## 🏗️ Architecture

### Core Components

1. **MST Models** (`src/models/`)
   - `RuleModel`: Individual game rules with mutability tracking
   - `PlayerModel`: LLM players with scoring and victory detection
   - `VoteModel`: Votes on proposals (FOR/AGAINST/ABSTAIN)
   - `ProposalModel`: Rule change proposals with vote collection
   - `GameModel`: Root store orchestrating the complete game state

2. **Rule Engine** (`src/engine/`)
   - `RuleEngine`: Pure functional rule precedence and validation
   - Enforces Nomic's precedence rules (109, 113)
   - Handles transmutation logic for immutable ↔ mutable conversion

3. **Mock MCP Services** (`src/mocks/`)
   - `MockMCPService`: Deterministic LLM response simulation
   - `MCPClient`: HTTP client with timeout and error handling
   - Seeded pseudo-random behavior for reproducible tests

4. **Schemas** (`src/schemas/`)
   - `ProposalSchema`: Zod validation for proposal structure
   - `parseProposalMarkdown`: Parser for proposal markdown format

### Game Flow

```
┌─────────────┐    ┌──────────────┐    ┌─────────────┐
│  Proposal   │───▶│   Voting     │───▶│ Resolution  │
│   Phase     │    │    Phase     │    │   Phase     │
└─────────────┘    └──────────────┘    └─────────────┘
       ▲                                       │
       │              ┌─────────────┐          │
       └──────────────│ Next Turn   │◀─────────┘
                      └─────────────┘
```

### Technology Stack

- **Frontend**: React 18, TypeScript, Vite
- **State Management**: MobX State Tree
- **Testing**: Vitest, Testing Library
- **Validation**: Zod schemas
- **Build**: Vite with SWC
- **Linting**: ESLint with TypeScript rules

## 🎮 Game Rules

Based on Peter Suber's original Nomic (1982) with digital adaptations:

### Victory Conditions
- **Goal**: First player to reach 100 points wins
- **Scoring**: +10 points for successful proposals, +5 for FOR votes, -5 for AGAINST votes

### Rule Hierarchy
- **Immutable Rules** (100-series): Cannot be directly changed
- **Mutable Rules** (200+ series): Can be amended or repealed
- **Precedence**: Lower-numbered rules override higher-numbered ones
- **Transmutation**: Rules can change mutability status via special proposals

### Proposal Types
- **Add**: Create new rules
- **Amend**: Modify existing mutable rules  
- **Repeal**: Remove existing mutable rules
- **Transmute**: Change rule mutability (immutable ↔ mutable)

## 🧪 Testing Strategy

Following Test-Driven Development (TDD):

### Test Coverage Requirements
- **Minimum 90% statement coverage** (enforced in CI)
- Unit tests for all models and utilities
- Integration tests for game flow
- Mock service tests for deterministic behavior

### Test Categories

1. **Unit Tests**
   - MST model validation and actions
   - Rule engine precedence logic
   - Schema validation and parsing
   - Mock service deterministic behavior

2. **Integration Tests**
   - Full game loop simulation
   - Proposal → Voting → Resolution cycles
   - Victory condition detection
   - Error handling and recovery

## 📁 Project Structure

```
src/
├── config.ts              # Game configuration constants
├── schemas/                # Zod validation schemas
│   ├── proposal.ts
│   └── proposal.test.ts
├── models/                 # MST domain models
│   ├── RuleModel.ts
│   ├── PlayerModel.ts
│   ├── VoteModel.ts
│   ├── ProposalModel.ts
│   └── *.test.ts
├── engine/                 # Rule precedence engine
│   ├── RuleEngine.ts
│   └── RuleEngine.test.ts
├── mocks/                  # Mock LLM services
│   ├── MockMCPService.ts
│   ├── MCPClient.ts
│   └── *.test.ts
├── components/             # React UI components (TODO)
├── routes/                 # React Router pages (TODO)
└── test/                   # Test utilities
    └── setup.ts
```

## 🔧 Configuration

Game behavior can be customized via `src/config.ts`:

```typescript
export const DEFAULT_CONFIG: GameConfig = {
  victoryTarget: 100,        // Points needed to win
  proposerPoints: 10,        // Points for successful proposals  
  forVoterPoints: 5,         // Points for FOR votes on adopted proposals
  againstVoterPenalty: -5,   // Penalty for AGAINST votes on adopted proposals
  turnDelayMs: 200,          // Milliseconds between turns
  timeoutMs: 8000,           // HTTP request timeout
  warmupTurns: 5,            // Full snapshots before diff mode
  snapshotMode: 'full',      // 'full' or 'diff' for debugging
  debugSnapshots: false,     // Force full snapshots
  enableSnapshotLogging: true // Console snapshot logging
};
```

## 👥 Development

For development-specific information including project status, contribution guidelines, and technical history, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## 📚 References

- [Original Nomic Rules](./initialRules.md) - Peter Suber's 1982 ruleset
- [Architecture Documentation](./daijo-bu_architecture.md) - Technical design
- [Development Kickoff](./devbot_kickoff_prompt.md) - Implementation roadmap
- [MobX State Tree Docs](https://mobx-state-tree.js.org/) - State management
- [Vitest Documentation](https://vitest.dev/) - Testing framework

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

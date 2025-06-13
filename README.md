# 大条部 *(Great Law Division)*
## 🛠️ A Proof-Nomic Game for LLMs

A **Vite + React 18** single-page application implementing Peter Suber's Nomic game with autonomous LLM players. The game orchestrates rule changes, voting, and scoring among multiple AI agents through HTTP/JSON communication.

## 🎯 Overview

Daijō-bu is a digital implementation of Nomic, a game where the rules themselves can be changed during gameplay. AI players propose rule modifications, vote on proposals, and compete for victory points. The game demonstrates emergent gameplay through rule evolution and strategic voting.

### Key Features

- **Autonomous LLM Players**: AI agents make proposals and vote independently  
- **Production LLM Integration**: OpenAI GPT-3.5-turbo with automatic rate limiting and fallback
- **Rule Evolution**: Dynamic rule system with immutable/mutable precedence  
- **Real-time Gameplay**: Fast turn cycles with configurable timing
- **Deterministic Testing**: Seeded pseudo-random behavior for reproducibility  
- **MST State Management**: MobX State Tree for predictable state updates
- **Time-travel Debugging**: Complete game state snapshots with replay capabilities
- **Accessibility Ready**: WCAG 2.1 AA compliance with @axe-core/react integration
- **Cross-browser Persistence**: IndexedDB with fallback storage for game state
- **Advanced Analytics**: Player performance tracking and detailed game statistics

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (recommended: use nvm)
- npm 8+
- (Optional) OpenAI API key for real LLM integration

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

## 🤖 OpenAI LLM Integration

Daijō-bu supports real OpenAI GPT integration for authentic AI gameplay. The system automatically switches between real LLM services and deterministic mock services based on configuration.

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

3. **LLM Services** (`src/mocks/`, `src/agents/`)
   - `MockMCPService`: Deterministic LLM response simulation
   - `OpenAIAgent`: Real OpenAI GPT integration with Chat Completions API
   - `MCPClient`: HTTP client with timeout and error handling
   - Automatic fallback from real LLM to mock services

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
├── agents/                 # Real LLM integrations
│   ├── openaiAgent.ts      # OpenAI GPT integration
│   └── *.test.ts
├── components/             # React UI components
├── routes/                 # React Router pages
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

### Getting Started with LLM Agents

Daijō-bu supports three agent types: **OpenAI** (cloud), **Ollama** (local), and **Mock** (deterministic). Choose the one that best fits your needs.

#### Option 1: Ollama (Local LLM) - **Recommended**

Local LLM with no API costs or rate limits.

##### 1. Install Ollama

```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download from https://ollama.ai/download
```

##### 2. Start Ollama Service

```bash
# Start the Ollama service
ollama serve
```

##### 3. Download a Model

```bash
# Download Mistral 7B (recommended, ~4GB)
ollama pull mistral:7b-instruct

# Alternative models:
# ollama pull llama2:7b-chat      # Llama 2 7B (~4GB)
# ollama pull llama2:13b-chat     # Llama 2 13B (~7GB, better quality)
# ollama pull codellama:7b-code   # Code-specialized model
```

##### 4. Configure Environment Variables

```bash
# Option A: Set environment variables
export AGENT_TYPE=ollama
export OLLAMA_BASE_URL=http://localhost:11434
export OLLAMA_MODEL=mistral:7b-instruct

# Option B: Create .env file
cat > .env << EOF
AGENT_TYPE=ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b-instruct
EOF
```

##### 5. Start the Game

```bash
npm run dev
```

You should see:
```
🦙 [Ollama] Local LLM integration initialized
🦙 [Ollama] Base URL: http://localhost:11434
🦙 [Ollama] Model: mistral:7b-instruct
✅ [Ollama] Ready for LLM requests
```

#### Option 2: OpenAI (Cloud)

Remote LLM with high quality but usage costs.

##### 1. Obtain an OpenAI API Key

1. Visit [OpenAI's website](https://platform.openai.com/) and create an account
2. Navigate to the [API keys section](https://platform.openai.com/api-keys)
3. Click "Create new secret key" and give it a descriptive name
4. **Important**: Copy the key immediately - you won't be able to see it again
5. Set up billing in your OpenAI account (required for API access)

##### 2. Configure Environment Variables

```bash
# Option A: Set environment variables
export AGENT_TYPE=openai
export LLM_TOKEN=sk-your-openai-api-key-here

# Option B: Create .env file
cat > .env << EOF
AGENT_TYPE=openai
LLM_TOKEN=sk-your-openai-api-key-here
EOF
```

#### Option 3: Mock Agent (Testing)

Deterministic responses for development and testing.

```bash
# Set agent type to mock (or omit for auto-detection)
export AGENT_TYPE=mock
npm run dev
```

### Agent Auto-Detection and Fallback

The game automatically detects which agent to use based on your configuration:

1. **Explicit Configuration**: If `AGENT_TYPE` is set, uses that agent
2. **Auto-Detection**: Otherwise detects based on available API keys/services
3. **Automatic Fallback**: If the primary agent fails 3 times consecutively, switches to mock agent

### Verify Integration

Start the development server and check the console output:

```bash
npm run dev
```

**With Ollama configured:**
```
🦙 [Ollama] Local LLM integration initialized
🦙 [Ollama] Base URL: http://localhost:11434
🦙 [Ollama] Model: mistral:7b-instruct
✅ [Ollama] Ready for LLM requests
🏭 [AgentFactory] Initialized with ollama agent
```

**With OpenAI configured:**
```
🤖 [OpenAI] LLM integration initialized
🤖 [OpenAI] Model: gpt-3.5-turbo
🤖 [OpenAI] Rate limit: 3 requests/minute (22s delay between calls)
🏭 [AgentFactory] Initialized with openai agent
```

**With Mock agent (fallback mode):**
```
🎭 [MockMCP] Using deterministic mock LLM service
🎭 [MockMCP] Seed: 1749789060811
🏭 [AgentFactory] Initialized with mock agent
```

**Automatic Fallback (on errors):**
```
🔄 [AgentFactory] 3 consecutive failures with ollama, switching to mock agent
🔄 [AgentFactory] ====================================
🔄 [AgentFactory] AUTOMATIC FALLBACK TO MOCK AGENT
🔄 [AgentFactory] Primary agent has failed too many times
🔄 [AgentFactory] Game will continue with deterministic responses
🔄 [AgentFactory] ====================================
```

### Usage Modes

#### Development Mode
- **Recommended**: Use mock services for consistent testing
- Set `LLM_TOKEN` only when testing real AI behavior
- Mock services ensure reproducible test results

#### Production Mode  
- **Required**: Set `LLM_TOKEN` for authentic AI gameplay
- Monitor OpenAI usage in your dashboard
- Consider rate limiting for high-traffic scenarios

#### Demo Mode
- Run without `LLM_TOKEN` for offline demonstrations
- Mock services provide interesting but predictable gameplay
- Perfect for showcasing game mechanics

### Troubleshooting

#### Common Issues

**"OpenAI API key not configured" error:**
```bash
# Check environment variable is set
echo $LLM_TOKEN

# Restart development server after setting
npm run dev
```

**API timeout errors:**
- Check internet connection
- Verify OpenAI service status
- Game automatically falls back to mock service on timeout

**Rate limiting:**
- OpenAI has usage limits for new accounts
- Monitor usage in [OpenAI dashboard](https://platform.openai.com/usage)
- Game handles rate limits gracefully

#### Debug Information

Enable debug mode in the browser developer tools:

```bash
# Start with debug URL parameter
npm run dev
# Navigate to: http://localhost:5173/?dev=1
```

The DevPanel shows:
- Current LLM service type (OpenAI/Mock)
- API response times
- Error logs and fallback behavior
- Game state snapshots for debugging

#### Testing Your Integration

Quick test to verify OpenAI is working:

```bash
# Set your API key and start a game
export LLM_TOKEN=sk-your-key-here
npm run dev

# Navigate to http://localhost:5173/?dev=1
# In the DevPanel you should see:
# - "Using OpenAI LLM integration" 
# - Real AI responses during gameplay
# - Different proposals each game (vs identical mock responses)
```

## 📚 References

- [Original Nomic Rules](./initialRules.md) - Peter Suber's 1982 ruleset
- [Architecture Documentation](./daijo-bu_architecture.md) - Technical design
- [Development Kickoff](./devbot_kickoff_prompt.md) - Implementation roadmap
- [MobX State Tree Docs](https://mobx-state-tree.js.org/) - State management
- [Vitest Documentation](https://vitest.dev/) - Testing framework

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.
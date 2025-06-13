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

### Getting Started with OpenAI

#### 1. Obtain an OpenAI API Key

1. Visit [OpenAI's website](https://platform.openai.com/) and create an account
2. Navigate to the [API keys section](https://platform.openai.com/api-keys)
3. Click "Create new secret key" and give it a descriptive name
4. **Important**: Copy the key immediately - you won't be able to see it again
5. Set up billing in your OpenAI account (required for API access)

#### 2. Configure Environment Variables

Create a `.env` file in the project root (this file is gitignored for security):

```bash
# Copy the example file and edit it
cp .env.example .env

# Edit .env file with your API key
# .env file
LLM_TOKEN=sk-your-openai-api-key-here
```

Or set the environment variable directly:

```bash
# For development session
export LLM_TOKEN=sk-your-openai-api-key-here
npm run dev

# For production deployment
LLM_TOKEN=sk-your-openai-api-key-here npm run build
```

#### 3. Verify Integration

Start the development server and check the browser console:

```bash
npm run dev
```

**With OpenAI configured:**
```
🚀 [GameProvider] OpenAI API key detected - using real LLM integration
🤖 [OpenAI] LLM integration initialized
🤖 [OpenAI] Model: gpt-3.5-turbo
🤖 [OpenAI] Max tokens: 500
🤖 [OpenAI] Rate limit: 3 requests/minute (22s delay between calls)
```

**Without OpenAI (fallback mode):**
```
🚀 [GameProvider] No OpenAI API key - using mock LLM service
🎭 [MockMCP] Using deterministic mock LLM service
🎭 [MockMCP] Seed: 1749789060811
🎭 [MockMCP] Behavior: Deterministic and predictable
```

### How It Works

#### Automatic Fallback Architecture

The game automatically detects and switches between LLM services:

```typescript
// Automatic service selection based on environment
const llmService = process.env.LLM_TOKEN 
  ? new OpenAIAgent(process.env.LLM_TOKEN)
  : new MockMCPService();
```

#### Service Comparison

| Feature | OpenAI Integration | Mock Service |
|---------|-------------------|--------------|
| **Behavior** | Real AI responses | Deterministic patterns |
| **Consistency** | Varies each game | Identical every time |
| **Cost** | ~$0.01-0.05 per game | Free |
| **Internet** | Required | Offline |
| **Testing** | Authentic AI gameplay | Reproducible testing |

#### OpenAI Configuration Details

The OpenAI integration uses the following settings:

```typescript
{
  model: 'gpt-3.5-turbo',           // Fast, cost-effective model
  max_tokens: 500,                  // Generous response length for detailed proposals
  temperature: 0.7,                 // Balanced creativity/consistency
  timeout: 5000,                    // 5-second timeout
  rateLimitDelay: 22000,            // 22-second delay between calls (free tier: 3/minute)
  retries: 1                        // Single retry on failure
}
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

**Expected behavior differences:**
- **Mock services**: Identical proposals like "Rule 301: Players must vote within 24 hours"
- **OpenAI services**: Varied, creative proposals that change each game

### Security Best Practices

1. **Never commit API keys** - Use `.env` files (already gitignored)
2. **Rotate keys regularly** - OpenAI allows key rotation
3. **Monitor usage** - Set up billing alerts in OpenAI dashboard
4. **Use environment-specific keys** - Different keys for dev/staging/prod

### Cost Management

**Typical costs per game:**
- **Short game** (10-20 turns): $0.01-0.02
- **Medium game** (50-100 turns): $0.03-0.08  
- **Long game** (200+ turns): $0.10-0.20

**Rate limiting considerations:**
- **Free tier**: 3 requests per minute (20+ second delays between turns)
- **Paid tier**: Higher limits enable faster gameplay
- **Game automatically handles rate limits** with built-in delays and clear logging

**Cost optimization:**
- Use `gpt-3.5-turbo` (cheaper than GPT-4)
- Set reasonable `max_tokens` limits
- Monitor usage in OpenAI dashboard
- Consider caching strategies for production

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

## 📚 References

- [Original Nomic Rules](./initialRules.md) - Peter Suber's 1982 ruleset
- [Architecture Documentation](./daijo-bu_architecture.md) - Technical design
- [Development Kickoff](./devbot_kickoff_prompt.md) - Implementation roadmap
- [MobX State Tree Docs](https://mobx-state-tree.js.org/) - State management
- [Vitest Documentation](https://vitest.dev/) - Testing framework

## 📄 License

This project is licensed under the MIT License. See LICENSE file for details.

## 🔍 Verifying Your OpenAI Connection

### Console Output When OpenAI is Working ✅

When your OpenAI integration is properly configured and connected, you'll see these distinctive console messages:

```bash
# At startup:
🚀 [GameProvider] OpenAI API key detected - using real LLM integration
🤖 [OpenAI] LLM integration initialized
🤖 [OpenAI] Model: gpt-3.5-turbo
🤖 [OpenAI] Max tokens: 500
🤖 [OpenAI] Temperature: 0.7
🤖 [OpenAI] Timeout: 5000ms

# During gameplay:
🤖 [OpenAI] Generating proposal...
🤖 [OpenAI] Making API call...
✅ [OpenAI] API call successful
✅ [OpenAI] Proposal generated successfully

🤖 [OpenAI] Generating vote...
🤖 [OpenAI] Making API call...
✅ [OpenAI] API call successful
✅ [OpenAI] Vote generated: FOR
```

### Console Output When Using Mock Services 🎭

When no OpenAI key is provided, you'll see:

```bash
# At startup:
🚀 [GameProvider] No OpenAI API key - using mock LLM service
🎭 [MockMCP] Using deterministic mock LLM service
🎭 [MockMCP] Seed: 1701234567890
🎭 [MockMCP] Behavior: Deterministic and predictable

# During gameplay:
🎭 [MockMCP] Generating mock proposal...
✅ [MockMCP] Mock proposal generated (ID: 123)

🎭 [MockMCP] Generating mock vote...
✅ [MockMCP] Mock vote generated: AGAINST
```

### Quick Verification Steps

1. **Check the browser console** (F12 → Console tab)
2. **Look for startup messages** when the page loads
3. **Start a game** and watch for generation messages
4. **Troubleshoot issues** using the error patterns below

### Error Patterns & Solutions

#### ❌ Invalid API Key
```bash
❌ [OpenAI] API error: HTTP 401 - Invalid API key
```
**Solution**: Double-check your API key in `.env` file

#### ❌ API Timeout
```bash
❌ [OpenAI] Request timeout after 5000ms
```
**Solution**: Check your internet connection; OpenAI may be experiencing issues

#### ❌ Rate Limiting
```bash
❌ [OpenAI] API error: HTTP 429 - Rate limit exceeded
🤖 [OpenAI] Rate limiting: waiting 22s before API call
🤖 [OpenAI] Reason: Free tier limit is 3 requests/minute
```
**Solution**: The game automatically handles rate limits with built-in delays. Free tier users get 3 requests/minute (22-second delays). Consider upgrading your OpenAI plan for faster gameplay.

#### ❌ Insufficient Credits
```bash
❌ [OpenAI] API error: HTTP 402 - Insufficient credits
```
**Solution**: Add billing information to your OpenAI account

### Debug Information Access

For detailed debugging information:
1. Add `?dev=1` to your URL: `http://localhost:5173/?dev=1`
2. Click the "DevPanel" button that appears
3. View the "Service Status" section for connection details

### Testing Your Setup

You can test your configuration without starting a full game:

```bash
# Test with your OpenAI key
LLM_TOKEN=sk-your-key-here npm run dev

# Test without key (mock mode)
npm run dev
```

The console output in the first few seconds will clearly show which service is active.

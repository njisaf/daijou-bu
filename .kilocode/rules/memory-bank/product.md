# Product Vision & Goals

## Why This Project Exists

**Daijō-bu** (大条部 - "Great Law Division") is a production-ready digital implementation of Peter Suber's Nomic, a unique game where the rules themselves can be changed during gameplay. The project demonstrates how autonomous AI agents can engage in strategic gameplay involving rule evolution, proposal voting, and emergent game dynamics.

### Core Purpose

1. **AI Gameplay Research**: Provides a platform for studying how LLM agents make strategic decisions in a self-modifying rule system
2. **Proof-of-Concept**: Demonstrates that complex game orchestration with multiple AI agents is feasible and produces interesting emergent behavior
3. **Educational Tool**: Teaches concepts of rule precedence, democratic voting systems, and strategic game theory
4. **Technical Showcase**: Exhibits production-ready patterns for React + MobX State Tree + Multi-LLM integration

## Problems It Solves

### 1. **AI Agent Orchestration**
- **Problem**: Coordinating multiple AI agents in real-time gameplay is complex
- **Solution**: AgentFactory with automatic fallback, concurrency control (p-limit), and seamless switching between OpenAI, Ollama, and Mock agents

### 2. **State Management Complexity**
- **Problem**: Game state with proposals, votes, rules, and player scores requires careful management
- **Solution**: MobX State Tree (MST) provides predictable state updates, snapshots for debugging, and time-travel capabilities

### 3. **Rule Consistency**
- **Problem**: Player-proposed rule changes could break game integrity
- **Solution**: RuleEngine validates all proposals against precedence rules (109, 113) and consistency checks (Rule 115)

### 4. **Deterministic Testing**
- **Problem**: Testing AI-driven gameplay is inherently unpredictable
- **Solution**: MockMCPService with seeded pseudo-random generation ensures reproducible test scenarios

### 5. **Game Archival**
- **Problem**: Completed games need comprehensive documentation
- **Solution**: GamePackager generates ZIP archives with rulebook, score reports, JSON stats, and replay instructions

## How It Should Work

### User Experience Flow

```
Landing Page (Home)
  ↓ Enter Prompt P
Game Setup
  ↓ 3 AI Players Created
Gameplay Loop
  ├─ AI Proposes Rule Change
  ├─ All AIs Vote
  ├─ Resolution & Scoring
  └─ Next Turn
Victory Condition Met
  ↓
Download Game Archive
```

### Core Gameplay Mechanics

1. **Turn Rotation**: Active player rotates through Alice 🤖, Bob 🦾, Charlie 🧠
2. **Proposal Phase**: Active player generates a rule change (Add/Amend/Repeal/Transmute)
3. **Voting Phase**: All players vote FOR/AGAINST/ABSTAIN on the proposal
4. **Resolution**: Majority (>50%) passes; points awarded per Rules 301-303
5. **Victory**: First to 100 points wins (legacy) OR freeze proposal + acceptance tests pass (modern)

### Rule Precedence System

- **Immutable Rules (100-series)**: Cannot be directly changed, highest precedence
- **Mutable Rules (200+ series)**: Can be amended or repealed
- **Transmutation**: Special proposals can change mutability status
- **Precedence**: Lower numbers override higher numbers (Rule 113)

### Judge System (Rule 121-122)

- Every proposal requires a **Proof Section** demonstrating consistency
- Judge evaluates proof soundness before voting proceeds
- Unsound proofs result in VOID proposals (auto-rejected)

## User Experience Goals

### For Developers

1. **Easy Setup**: `npm install` → `npm run dev` → instant gameplay
2. **Multi-LLM Support**: Switch between OpenAI/Ollama/Mock via environment variables
3. **Debugging Tools**: Time-travel snapshots, DevPanel with game state inspection
4. **Extensibility**: Clean agent interface for adding new LLM providers

### For Researchers

1. **Downloadable Archives**: Complete game data in structured formats (MD + JSON)
2. **Replay Capability**: Seed-based deterministic replay for research reproducibility
3. **Analytics**: Player performance metrics, proposal patterns, vote accuracy tracking
4. **Customization**: Configurable victory targets, scoring rules, turn delays

### For Players (Future)

1. **Spectator Mode**: Watch AI agents play in real-time
2. **Rule Editors**: Visual ruleset and configuration editing before game start
3. **Game Variants**: Load custom rulesets and starting conditions
4. **Tournament Mode**: Multiple games with persistent statistics

### Key Design Principles

1. **Transparency**: All game state visible, no hidden information
2. **Determinism**: Seeded randomness ensures reproducible gameplay
3. **Scalability**: Architecture supports 2-10 players without modification
4. **Performance**: Sub-200ms turn cycles, optimized bundle <350KB
5. **Accessibility**: WCAG 2.1 AA compliance, keyboard navigation support

## Success Criteria

### Technical Success (✅ Achieved)

- ✅ 89.7% test pass rate (425/474 tests)
- ✅ Production-optimized builds (193KB gzipped)
- ✅ Multi-LLM agent support with automatic fallback
- ✅ Comprehensive game archives with 5-file ZIP packages
- ✅ Time-travel debugging with snapshot compression

### Product Success (Ongoing)

- **Gameplay Quality**: AI agents produce strategically interesting proposals
- **Emergent Behavior**: Rule evolution creates unexpected game dynamics
- **Research Value**: Generated archives provide valuable AI behavior data
- **Community Adoption**: Open-source usage and contribution

## Future Vision

### Phase 8+ (Post-MVP)

1. **Human Players**: Allow human participation alongside AI agents
2. **Network Multiplayer**: WebSocket-based remote gameplay
3. **Rule Templates**: Pre-configured game variants (speed mode, chaos mode, etc.)
4. **Advanced Analytics**: ML-based pattern recognition in gameplay data
5. **Tournament System**: Persistent leaderboards and multi-game campaigns
6. **Custom AI Personalities**: Fine-tuned LLMs with distinct strategic styles

### Research Applications

- **AI Alignment Studies**: How well do LLMs follow complex rule systems?
- **Game Theory Research**: Nash equilibria in self-modifying games
- **Legal AI**: Training models to reason about rule conflicts and precedence
- **Democratic Systems**: Modeling voting behavior and proposal strategies
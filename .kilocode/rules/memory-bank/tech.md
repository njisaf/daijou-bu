# Technology Stack & Development Setup

## Core Technologies

### Frontend Framework
- **React 19.1.0**: Latest React with concurrent features and improved performance
- **React DOM 19.1.0**: DOM rendering layer
- **TypeScript 5.8.3**: Strict type checking with latest ECMAScript features
- **Vite 6.3.5**: Lightning-fast build tool with HMR (Hot Module Replacement)

### State Management
- **MobX State Tree 7.0.2**: Observable state management with snapshots and time-travel debugging
- **mobx-react-lite 4.1.0**: Lightweight React bindings for MobX with hooks support

### Routing
- **react-router-dom 7.6.2**: Client-side routing with v7 features (lazy loading, data APIs)

### LLM Integration
- **OpenAI Chat Completions API**: GPT-3.5-turbo for cloud-based AI agents
- **Ollama**: Local LLM support for cost-free development
- **p-limit 6.2.0**: Concurrency control for parallel LLM requests

### Data Validation & Parsing
- **Zod 3.25.63**: TypeScript-first schema validation for proposal parsing
- **react-markdown 10.1.0**: Markdown rendering for proposals and documentation

### Storage & Persistence
- **Dexie 4.0.11**: IndexedDB wrapper for browser-based persistence
- **pako** (via types): GZIP compression for snapshot optimization

### Build & Packaging
- **JSZip 3.10.1**: Client-side ZIP generation for game archives
- **@vitejs/plugin-react-swc 3.9.0**: Fast Refresh with SWC compiler
- **Terser 5.42.0**: JavaScript minification for production builds

## Development Tools

### Testing Framework
- **Vitest 3.2.3**: Fast unit test runner compatible with Vite
- **@testing-library/react 16.3.0**: React component testing utilities
- **@testing-library/jest-dom 6.6.3**: Custom Jest matchers for DOM assertions
- **@vitest/ui 3.2.3**: Web-based UI for test visualization
- **@vitest/coverage-v8 3.2.3**: Code coverage reporting with V8
- **jsdom 26.1.0**: DOM implementation for Node.js testing
- **fast-check 4.1.1**: Property-based testing library

### E2E Testing
- **@playwright/test 1.53.0**: Cross-browser end-to-end testing
- **Playwright browsers**: Chromium, Firefox, WebKit support

### Linting & Code Quality
- **ESLint 9.25.0**: JavaScript/TypeScript linting
- **@eslint/js 9.25.0**: ESLint core rules
- **typescript-eslint 8.30.1**: TypeScript-specific linting rules
- **eslint-plugin-react-hooks 5.2.0**: React Hooks rules enforcement
- **eslint-plugin-react-refresh 0.4.19**: React Fast Refresh validation

### Performance & Accessibility
- **@lhci/cli 0.15.0**: Lighthouse CI for performance budgets
- **lighthouse 12.6.1**: Performance, accessibility, and SEO auditing
- **@axe-core/react 4.10.2**: Accessibility testing during development

### Type Definitions
- **@types/node 24.0.1**: Node.js type definitions
- **@types/react 19.1.2**: React type definitions
- **@types/react-dom 19.1.2**: React DOM type definitions
- **@types/pako 2.0.3**: Pako compression library types

### Utilities
- **dotenv 16.5.0**: Environment variable management
- **globals 16.0.0**: Global variable definitions for linting

## Development Setup

### Prerequisites
```bash
Node.js 18+ (recommended: use nvm)
npm 8+
```

### Installation
```bash
# Clone repository
git clone <repository-url>
cd daijo-bu

# Install dependencies
npm install

# Set up environment variables (optional)
cp .env.example .env
```

### Environment Variables

**LLM Configuration**:
```bash
# Agent type (auto-detected if not set)
AGENT_TYPE=mock|openai|ollama

# OpenAI configuration
LLM_TOKEN=sk-your-openai-api-key

# Ollama configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b-instruct

# Game configuration
PROMPT_P="Your AI behavioral guidance here"
```

**Auto-Detection Logic**:
1. If `AGENT_TYPE` is set → use that agent
2. Else if `LLM_TOKEN` is set → use OpenAI
3. Else if `OLLAMA_BASE_URL` or `OLLAMA_MODEL` is set → use Ollama
4. Else → default to Mock agent

### Development Commands

```bash
# Development server (http://localhost:5173)
npm run dev

# Development with configuration editor
npm run dev:config

# Development with judge panel
npm run dev:judge

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Testing Commands

```bash
# Run all tests (watch mode)
npm test

# Run tests once (CI mode)
npm run test -- --run

# Run tests with coverage
npm run test:coverage

# Run tests with UI
npm run test:ui

# Run specific test file
npm run test -- --run src/models/GameModel.test.ts

# Run tests with verbose output
npm run test -- --run --reporter=verbose

# Property-based testing
npm run test:fuzz

# E2E tests
npm run test:e2e
```

### Build Commands

```bash
# Production build
npm run build

# Build with type checking
npm run build:check

# Preview production build
npm run preview

# Performance analysis with Lighthouse
npm run perf
```

### Debug Scripts

```bash
# Debug ruleset loading
npm run debug:rules

# Snapshot ruleset tests
npm run snapshot:ruleset

# Snapshot score tests
npm run snapshot:scores

# Vitest profiling
npm run vitest:profile
```

## Build Configuration

### Vite Configuration ([`vite.config.ts`](vite.config.ts:1))

**Key Settings**:
- **Target**: ES2020 for modern browser support
- **Minification**: Terser with console.log removal in production
- **Bundle Size**: 193KB gzipped (45% under 350KB target)
- **Source Maps**: Disabled in production for smaller builds

**Manual Chunks**:
```typescript
manualChunks: {
  'react-vendor': ['react', 'react-dom'],
  'router-vendor': ['react-router-dom'],
  'mobx-vendor': ['mobx-state-tree', 'mobx-react-lite'],
  'agent-modules': ['./src/agents/AgentFactory.ts']
}
```

**Environment Variables Exposed**:
- `process.env.LLM_TOKEN`
- `process.env.AGENT_TYPE`
- `process.env.OLLAMA_BASE_URL`
- `process.env.OLLAMA_MODEL`

### TypeScript Configuration

**[`tsconfig.json`](tsconfig.json:1)**: Root configuration with references
- **[`tsconfig.app.json`](tsconfig.app.json:1)**: Application source configuration
- **[`tsconfig.node.json`](tsconfig.node.json:1)**: Build tool configuration

**Strict Mode**: Enabled for maximum type safety

### Vitest Configuration ([`vitest.config.ts`](vitest.config.ts:1))

**Settings**:
- **Environment**: jsdom for browser-like testing
- **Globals**: Enabled for Jest-compatible API
- **Setup**: [`src/test/setup.ts`](src/test/setup.ts:1) for test initialization
- **Coverage**: V8 provider with 90% thresholds (statements, branches, functions, lines)

### Playwright Configuration ([`playwright.config.ts`](playwright.config.ts:1))

**E2E Testing**:
- **Test Directory**: `./src/test/e2e`
- **Browsers**: Chromium, Firefox, WebKit
- **Base URL**: http://localhost:5173
- **Reporter**: HTML reports with screenshots

### ESLint Configuration ([`eslint.config.js`](eslint.config.js:1))

**Rules**:
- TypeScript strict checking
- React Hooks rules enforcement
- React Refresh validation
- Import organization

## Technical Constraints

### Browser Support
- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **ES2020 Features**: Required for optional chaining, nullish coalescing
- **No IE11 Support**: Project uses modern JavaScript features

### Performance Targets
- **Bundle Size**: <350KB gzipped (currently 193KB ✅)
- **Initial Load**: <3 seconds on 3G
- **Turn Cycle**: <200ms base delay (configurable)
- **Test Pass Rate**: >89% (currently 89.7% ✅)

### Storage Limitations
- **IndexedDB**: Subject to browser quota (typically 50% of available disk space)
- **Fallback**: NoOpPersistence when IndexedDB unavailable
- **Snapshot Compression**: GZIP reduces payload by ~70%

### LLM Constraints
- **OpenAI**: Rate limits (3 req/min default), API costs, requires internet
- **Ollama**: Requires local installation, 4GB+ RAM for 7B models
- **Mock**: Deterministic, no actual AI reasoning

## Testing Strategy

### Test Categories

1. **Unit Tests** (`*.test.ts` files):
   - MST model validation and actions
   - Rule engine precedence logic
   - Schema validation and parsing
   - Agent factory and fallback logic
   - Pure utility functions

2. **Integration Tests** (`src/test/integration/`):
   - Full game loop simulation
   - Config-orchestrator integration
   - Custom ruleset workflows
   - Prompt P integration
   - Duplicate ID handling

3. **E2E Tests** (`src/test/e2e/`):
   - Browser persistence validation
   - Cross-browser compatibility
   - Page reload scenarios

4. **Property-Based Tests** (`src/test/robustness/`):
   - Snapshot compression edge cases
   - Large payload handling
   - Memory leak detection
   - Serialization robustness

5. **Accessibility Tests** (`src/test/accessibility.test.tsx`):
   - WCAG 2.1 AA compliance
   - Keyboard navigation
   - Screen reader support

### Test Utilities ([`src/test/utils/`](src/test/utils/))
- **`factories.ts`**: Test data factories for MST models
- **`mstHelpers.ts`**: MobX State Tree testing helpers
- **`renderWithProviders.tsx`**: React Testing Library wrapper with context
- **`agentFactoryMock.ts`**: Mock agent factory for testing

### Coverage Requirements
- **Minimum**: 90% across all metrics
- **Current**: 89.7% (425/474 tests passing)
- **Reports**: HTML, JSON, text formats

## Dependencies Overview

### Production Dependencies (14 packages)
- React ecosystem: react, react-dom, react-router-dom
- State management: mobx-state-tree, mobx-react-lite
- Validation: zod
- LLM utilities: p-limit
- Storage: dexie
- Packaging: jszip
- Rendering: react-markdown
- Testing (bundled): vitest, @testing-library/react, @testing-library/jest-dom, @vitest/ui
- Config: dotenv

### Development Dependencies (17 packages)
- Build tools: vite, @vitejs/plugin-react-swc, terser
- TypeScript: typescript, @types/*
- Testing: vitest, @vitest/coverage-v8, @playwright/test, jsdom, fast-check
- Linting: eslint, typescript-eslint, eslint-plugin-*
- Performance: @lhci/cli, lighthouse
- Accessibility: @axe-core/react
- Utilities: globals

### Total Bundle Impact
- **Vendor Chunks**: React (45KB), Router (12KB), MobX (38KB)
- **Application Code**: ~98KB gzipped
- **Total**: 193KB gzipped

## Tool Usage Patterns

### Development Workflow
1. Start dev server: `npm run dev`
2. Make changes with HMR feedback
3. Write/update tests: `npm test`
4. Check types: `npx tsc --noEmit`
5. Lint code: `npm run lint`
6. Build & verify: `npm run build && npm run preview`

### CI/CD Workflow
1. Install dependencies: `npm ci`
2. Type checking: `npx tsc --noEmit`
3. Lint: `npm run lint`
4. Test: `npm run test -- --run`
5. Coverage: `npm run test:coverage`
6. E2E: `npm run test:e2e`
7. Build: `npm run build`
8. Performance: `npm run perf`

### Debugging Tools
- **DevPanel**: Enable with `?dev=1` URL parameter
- **Snapshot Logger**: Automatic logging in dev mode
- **React DevTools**: Browser extension support
- **MobX DevTools**: MST tree inspection
- **Source Maps**: Available in dev mode

### Known Issues

**Test Failures** (49 tests, 10.3%):
- Some integration tests have timeout issues
- Property-based tests need edge case refinement
- DOM state cleanup between test groups

**Technical Debt**:
- Judge verdict auto-resolution is stubbed (always 'sound')
- Acceptance tests are stubbed (always false)
- Game restoration from persistence not fully implemented
- Some test utilities need `llmEndpoint` field updates

## Future Enhancements

**Tooling**:
- Storybook for component documentation
- Prettier for consistent code formatting
- Husky for Git hooks
- Commitlint for conventional commits

**Testing**:
- Visual regression testing
- Performance benchmarking suite
- Load testing for multi-agent scenarios
- Mutation testing for code quality

**Build**:
- Module federation for plugin architecture
- Web Workers for background processing
- Service Worker for offline support
- Progressive Web App (PWA) features
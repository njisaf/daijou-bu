# Contributing to Daijo-bu

Thank you for your interest in contributing to Daijo-bu! This document provides guidelines for contributing to the Proof-Nomic game platform.

## 📋 Table of Contents

- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Pull Request Process](#pull-request-process)
- [Architecture Guidelines](#architecture-guidelines)
- [Documentation Standards](#documentation-standards)

## 🚀 Getting Started

### Prerequisites

- **Node.js 18+** (recommended: use nvm for version management)
- **npm 8+**
- **Git** for version control
- **OpenAI API Key** (optional, for LLM integration testing)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/daijo-bu.git
   cd daijo-bu
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Verify setup by running tests:
   ```bash
   npm test -- --run
   ```

### Environment Setup

Create a `.env` file for local development (optional):
```bash
# For LLM integration testing
AGENT_TYPE=ollama  # or 'openai' or 'mock'
LLM_TOKEN=your-api-key-here  # Only needed for OpenAI
OLLAMA_BASE_URL=http://localhost:11434  # For Ollama
OLLAMA_MODEL=mistral:7b-instruct  # Ollama model
```

## 🔄 Development Workflow

### Branch Strategy

- **`main`**: Production-ready code
- **Feature branches**: `feature/description-of-feature`
- **Bug fixes**: `fix/description-of-bug`
- **Documentation**: `docs/description-of-changes`

### Development Process

1. **Create a feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow TDD approach**:
   - Write failing tests first
   - Implement minimal code to pass tests
   - Refactor while keeping tests green
   - Maintain 89%+ test pass rate

3. **Development commands**:
   ```bash
   # Start development server
   npm run dev
   
   # Run tests (avoid watch mode)
   npm test -- --run
   
   # Run tests with coverage
   npm run test:coverage
   
   # Check code quality
   npm run lint
   
   # Build for production
   npm run build
   ```

4. **Commit regularly** with descriptive messages

5. **Push and create Pull Request**

## 📝 Code Standards

### TypeScript

- **Strict mode enabled**: All code must compile without TypeScript errors
- **Type safety**: Prefer explicit types over `any`
- **Interface definitions**: Use interfaces for complex object types
- **Null safety**: Handle undefined/null cases explicitly

### Code Style

- **ESLint configuration**: Follow project ESLint rules
- **Formatting**: Use consistent formatting (Prettier recommended)
- **Naming conventions**:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and components
  - `UPPER_SNAKE_CASE` for constants
  - Descriptive names over brevity

### React Components

- **Functional components**: Use function components with hooks
- **Observer pattern**: Wrap MobX-dependent components with `observer()`
- **Props interfaces**: Define explicit TypeScript interfaces for props
- **Error boundaries**: Handle errors gracefully

### MobX State Tree

- **Model-first architecture**: Define MST models with proper typing
- **Actions for mutations**: All state changes through MST actions
- **Views for computed values**: Use MST views for derived data
- **Snapshots for persistence**: Leverage MST snapshot functionality

## 🧪 Testing Requirements

### Test Coverage Standards

- **Minimum 89% test pass rate** (current: 425/474 tests passing)
- **Unit tests**: Test individual components and utilities
- **Integration tests**: Test component interactions and workflows
- **Property-based tests**: Use fast-check for edge case validation

### Test Categories

1. **Model Tests** (`*.test.ts`):
   - MST model validation and actions
   - Rule engine logic and precedence
   - Schema validation and parsing

2. **Component Tests** (`*.test.tsx`):
   - React component rendering and behavior
   - User interaction testing
   - Integration with MST stores

3. **Integration Tests**:
   - Full game flow simulation
   - LLM service integration
   - End-to-end workflows

### Test Writing Guidelines

```typescript
// Example test structure
describe('ComponentName', () => {
  let gameModel: IGameModel;
  
  beforeEach(() => {
    // Setup clean state for each test
    gameModel = createTestGameModel();
  });
  
  it('should do specific behavior when condition', () => {
    // Arrange: Set up test data
    const testData = createTestData();
    
    // Act: Perform the action
    const result = gameModel.performAction(testData);
    
    // Assert: Verify the outcome
    expect(result).toBe(expectedValue);
  });
});
```

### Running Tests

```bash
# Run all tests once (preferred for CI/development)
npm test -- --run

# Run specific test file
npm test -- --run src/models/GameModel.test.ts

# Run tests with coverage report
npm run test:coverage

# Run tests matching pattern
npm test -- --run --grep "GameModel"
```

## 🔀 Pull Request Process

### Before Submitting

1. **Ensure tests pass**:
   ```bash
   npm test -- --run
   ```

2. **Build successfully**:
   ```bash
   npm run build
   ```

3. **Code quality checks**:
   ```bash
   npm run lint
   ```

4. **Update documentation** if needed

### Pull Request Template

When creating a PR, please include:

```markdown
## Description
Brief description of changes and motivation.

## Type of Change
- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)  
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Tests pass: `npm test -- --run`
- [ ] Build succeeds: `npm run build`
- [ ] New tests added for new functionality
- [ ] Test coverage maintained (89%+ pass rate)

## Architecture Compliance
- [ ] Changes align with `daijo-bu_architecture.md`
- [ ] MST patterns followed correctly
- [ ] No regressions in existing functionality

## Documentation
- [ ] README.md updated (if needed)
- [ ] DEVELOPMENT.md updated (if needed)
- [ ] JSDoc comments added for new functions
- [ ] Architecture documentation updated (if needed)
```

### Review Process

1. **Automated checks**: CI/CD pipeline runs tests and linting
2. **Code review**: Team members review for quality and architecture alignment
3. **Testing**: Manual testing for complex features
4. **Approval**: At least one approval required for merge

## 🏗️ Architecture Guidelines

### Follow daijo-bu_architecture.md

All changes must align with the project's architecture document. Key principles:

- **Separation of concerns**: Keep models, views, and controllers separate
- **MST-first state management**: Use MobX State Tree for all application state
- **Pure functions**: Keep business logic in pure functions where possible
- **Dependency injection**: Use dependency injection for services and external dependencies

### File Organization

```
src/
├── models/           # MST domain models
├── components/       # React UI components  
├── routes/          # React Router pages
├── engine/          # Pure business logic
├── agents/          # LLM service integrations
├── schemas/         # Zod validation schemas
├── packaging/       # Game archive generation
├── logging/         # Debug and snapshot utilities
└── test/           # Test utilities and setup
```

### Component Architecture

- **Container components**: Handle MST state and business logic
- **Presentation components**: Handle UI rendering and user interaction
- **Service components**: Handle external API integration
- **Utility components**: Reusable UI elements

## 📖 Documentation Standards

### Code Documentation

- **JSDoc comments**: Required for all public functions and classes
- **Type annotations**: Explicit TypeScript types for clarity
- **README updates**: Update README.md for user-facing changes
- **Architecture notes**: Update daijo-bu_architecture.md for structural changes

### JSDoc Example

```typescript
/**
 * Calculate the score for a player based on proposal and voting performance
 * 
 * This function implements Rules 301-303 scoring logic, including:
 * - Proposal success bonuses (+10 points per adopted proposal)
 * - Vote accuracy tracking (FOR votes on adopted proposals = +5 points)
 * - Missed vote penalties (-10 points per missed vote)
 * 
 * @param player - The player model to calculate score for
 * @param proposals - Array of all proposals in the game
 * @returns Object containing detailed score breakdown
 * 
 * @see https://daijo-bu-docs.com/rules/scoring Rules 301-303 specification
 * @since Stage 6.5 (Enhanced scoring system implementation)
 */
function calculatePlayerScore(player: IPlayerModel, proposals: IProposalModel[]): ScoreBreakdown {
  // Implementation here
}
```

### Commit Message Format

Use conventional commit format:

```
type(scope): description

[optional body]

[optional footer]
```

Examples:
- `feat(models): add snapshot compression toggle`
- `fix(ui): resolve accessibility issue in vote buttons`
- `docs(readme): update installation instructions`
- `test(models): add property-based tests for GameModel`

## 🐛 Reporting Issues

### Bug Reports

When reporting bugs, please include:

1. **Environment**: OS, Node.js version, browser
2. **Steps to reproduce**: Detailed reproduction steps
3. **Expected behavior**: What should happen
4. **Actual behavior**: What actually happens
5. **Console output**: Any error messages or logs
6. **Game state**: Export game configuration if relevant

### Feature Requests

For feature requests, please include:

1. **Use case**: Why is this feature needed?
2. **Proposed solution**: How should it work?
3. **Alternatives considered**: Other approaches you've thought about
4. **Architecture impact**: How might this affect the codebase?

## 🤝 Community Guidelines

### Code of Conduct

- **Be respectful**: Treat all contributors with respect
- **Be constructive**: Provide helpful feedback and suggestions
- **Be patient**: Remember that everyone is learning and contributing their time
- **Be collaborative**: Work together to improve the project

### Getting Help

- **Documentation**: Check README.md and DEVELOPMENT.md first
- **Issues**: Search existing issues before creating new ones
- **Discussions**: Use GitHub Discussions for questions and ideas

## 📚 Additional Resources

- **Architecture Documentation**: [daijo-bu_architecture.md](./daijo-bu_architecture.md)
- **Development History**: [DEVELOPMENT.md](./DEVELOPMENT.md)
- **Project Status**: Check the latest DEVELOPMENT.md entries for current progress
- **Testing Guide**: See the Testing section in README.md

---

Thank you for contributing to Daijo-bu! Your contributions help make this project better for everyone. 🎮✨ 
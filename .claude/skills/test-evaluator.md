# Test Evaluator Skill

## Purpose
Systematically evaluate what testing is needed after implementing features or making changes, covering unit tests, integration tests, and API testing via Postman.

## Testing Strategy Overview

### Current Testing Setup
- **Unit Tests**: Vitest with co-located `.spec.ts` files
- **API Tests**: Postman collections via MCP integration
- **Integration Scripts**: Manual scripts in `scripts/` for Airtable connectivity
- **Test Commands**: `npm test`, `npm run test:unit`

## Evaluation Criteria

### Should Create Tests When:

#### 1. **New Business Logic**
- Service functions (attendance, auth, events)
- Utility functions with complex logic
- Data transformation/validation
- Authentication/authorization logic

#### 2. **New API Routes**
- All `/api/*` endpoints need Postman tests
- Authentication flows
- Data CRUD operations
- Error handling scenarios

#### 3. **New Components with Logic**
- Svelte components with state management
- Form validation logic
- Event handling
- Computed properties

#### 4. **Bug Fixes**
- Regression tests to prevent re-occurrence
- Edge case validation
- Error boundary testing

### Should Skip Tests When:
- Simple UI text changes
- Styling/CSS only changes
- Documentation updates
- Configuration tweaks without logic changes

## Test Types and Tools

### 1. **Unit Tests (Vitest)**
```typescript
// Pattern: src/lib/service.spec.ts
import { describe, it, expect } from 'vitest';
import { functionToTest } from './service';

describe('functionToTest', () => {
  it('should handle normal case', () => {
    expect(functionToTest('input')).toBe('expected');
  });

  it('should handle edge cases', () => {
    expect(functionToTest(null)).toBe(null);
  });
});
```

**Test Location**: Co-located with source files
**Test Coverage**: Business logic, utilities, validation

### 2. **API Tests (Postman via MCP)**
```javascript
// Postman collection structure
{
  "name": "Feature API Tests",
  "item": [
    {
      "name": "POST /api/endpoint - Success",
      "request": { /* ... */ },
      "event": [
        {
          "listen": "test",
          "script": {
            "exec": [
              "pm.test('Status is 200', () => {",
              "  pm.response.to.have.status(200);",
              "});"
            ]
          }
        }
      ]
    }
  ]
}
```

**Test Coverage**: API endpoints, authentication, error responses

### 3. **Integration Tests (Scripts)**
```typescript
// Pattern: scripts/test-feature-integration.ts
// For testing Airtable connectivity, external services
```

## Decision Framework

### Code Change Analysis
```bash
# Check what was changed
git diff HEAD~1 --name-only

# Look for indicators:
- src/routes/api/** → Need Postman tests
- src/lib/server/** → Need unit tests
- src/lib/airtable/** → Need integration tests
- *.svelte with logic → Need component tests
```

### Test Priority Matrix

| Change Type | Unit Test | API Test | Integration | Priority |
|-------------|-----------|----------|-------------|----------|
| New API route | Optional | **Required** | Optional | High |
| Service logic | **Required** | Optional | Optional | High |
| Auth changes | **Required** | **Required** | Optional | Critical |
| Bug fixes | **Required** | Depends | Optional | High |
| UI components | Optional | N/A | N/A | Low |

## Postman Integration via MCP

### Available MCP Commands
- `mcp__postman__createCollection` - Create test collections
- `mcp__postman__createCollectionRequest` - Add test requests
- `mcp__postman__getCollections` - List existing collections
- `mcp__postman__getCollection` - Get collection details

### API Test Pattern
1. **Create collection** for the feature/module
2. **Add requests** for each endpoint variant:
   - Success scenarios
   - Error scenarios (401, 400, 500)
   - Edge cases
3. **Include test scripts** for response validation
4. **Organize by workspace** (development vs staging)

### Example API Test Structure
```
Collection: "Attendance API Tests"
├── POST /api/checkin - Success
├── POST /api/checkin - Invalid token
├── POST /api/checkin - Missing event
├── GET /api/events - Success
└── GET /api/events - Unauthorized
```

## Assessment Criteria Mapping

### P4: Testing (40% coverage target)
- Unit test coverage for core business logic
- API test coverage for all endpoints
- Integration tests for external dependencies

### P7: Version Control (20% test-related)
- Tests committed with features
- Test updates in same commits as code changes

### D2: Technical Investigation (30% test strategy)
- Appropriate testing strategies chosen
- Test architecture decisions documented

## Quality Standards

### Unit Test Quality
- **Arrange, Act, Assert** pattern
- **Descriptive test names** that explain the scenario
- **Edge cases covered** (null, empty, invalid inputs)
- **Mock external dependencies** (Airtable, APIs)

### API Test Quality
- **Status code validation**
- **Response schema validation**
- **Authentication testing**
- **Error message validation**

### Test Organization
- **Co-location**: Tests next to source files
- **Clear naming**: `*.spec.ts` for unit tests
- **Logical grouping**: Postman collections by feature
- **Documentation**: Test strategy in README

## Integration with Plan Iterator

The `/evaluate-tests` command should:
1. Analyze recent code changes
2. Determine what types of tests are needed
3. Create missing test files/collections
4. Run existing tests to ensure they pass
5. Update test documentation if needed

## Skip Conditions

Don't create tests for:
- Proof of concept code
- Temporary implementations
- Pure configuration changes
- Documentation-only updates
- Dependency updates without API changes
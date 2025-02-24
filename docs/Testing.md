# Testing Guide

## Test Structure

### Unit Tests

Tests are organized by module in the `tests/` directory, mirroring the `src/` structure.

```plaintext
tests/
├── lambda/
│   ├── discordBot.test.js
│   ├── telegramBot.test.js
│   └── metaBot.test.js
├── utils/
│   ├── monitoringUtils.test.js
│   ├── backupUtils.test.js
│   └── analyticsUtils.test.js
└── setup.js
```

## Running Tests

### Basic Test Commands

```bash
# Run all tests
npm test

# Run tests with watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- tests/lambda/discordBot.test.js
```

### Test Environment

Tests use a dedicated test environment with:
- Mock AWS services
- Test database
- Mock webhooks
- Sample test data

## Writing Tests

### Test Structure Example

```javascript
describe('ModuleName', () => {
  beforeEach(() => {
    // Setup for each test
  });

  afterEach(() => {
    // Cleanup after each test
  });

  describe('functionName', () => {
    it('should handle successful case', async () => {
      // Arrange
      const input = {};
      
      // Act
      const result = await functionName(input);
      
      // Assert
      expect(result).toBeDefined();
    });

    it('should handle error case', async () => {
      // Test error scenarios
    });
  });
});
```

### Mocking

#### Service Mocks
```javascript
jest.mock('@aws-sdk/client-dynamodb', () => ({
  DynamoDBClient: jest.fn(() => ({
    send: jest.fn()
  }))
}));
```

#### API Mocks
```javascript
global.fetch = jest.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: 'test' })
  })
);
```

## Test Categories

### 1. Unit Tests
- Test individual functions
- Mock dependencies
- Fast execution
- High coverage

### 2. Integration Tests
- Test multiple components
- Limited mocking
- Database operations
- API interactions

### 3. End-to-End Tests
- Full system testing
- Real dependencies
- Complete workflows
- Performance testing

## Test Data

### Sample Data
- Located in `tests/fixtures/`
- JSON format
- Platform-specific samples
- Error case samples

### Mock Services
- DynamoDB Local
- Mock webhooks
- Test storage bucket
- Test authentication

## Coverage Requirements

### Minimum Coverage
- Statements: 80%
- Branches: 80%
- Functions: 80%
- Lines: 80%

### Critical Paths
- Authentication flows
- Data validation
- Error handling
- Platform integrations

## Testing Tools

### Jest Configuration
```javascript
module.exports = {
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: ['src/**/*.js'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
};
```

### Test Utilities
- Jest matchers
- Custom assertions
- Test helpers
- Mock factories

## Test Best Practices

### 1. Test Organization
- Group related tests
- Clear descriptions
- Isolated test cases
- Proper setup/teardown

### 2. Test Quality
- Test edge cases
- Error scenarios
- Boundary conditions
- Performance limits

### 3. Test Maintenance
- Regular updates
- Remove obsolete tests
- Update dependencies
- Monitor coverage

## Debugging Tests

### Common Issues
1. Async timing problems
2. Mock configuration
3. Environment variables
4. Database connections

### Solutions
1. Use proper async/await
2. Verify mock setup
3. Check test environment
4. Validate connections

## Performance Testing

### Load Tests
- Response times
- Concurrent requests
- Resource usage
- Error rates

### Stress Tests
- System limits
- Recovery behavior
- Error handling
- Resource cleanup

## Security Testing

### Authentication Tests
- Token validation
- Permission checks
- Rate limiting
- Error responses

### Data Protection
- Input validation
- Output sanitization
- Encryption
- Access control

## Continuous Integration

### GitHub Actions
- Automated testing
- Coverage reports
- Dependency checks
- Security scans

### Test Reports
- Test results
- Coverage metrics
- Performance data
- Error logs
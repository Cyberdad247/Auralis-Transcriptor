# Testing Guide - Auralis Transcriptor

This guide provides comprehensive information about the testing strategy, setup, and best practices for the Auralis Transcriptor application.

## Testing Philosophy

Our testing approach follows the testing pyramid principle:
- **Unit Tests (70%):** Fast, isolated tests for individual functions and components
- **Integration Tests (20%):** Tests for API endpoints and component interactions
- **End-to-End Tests (10%):** Full user journey testing

## Test Coverage Goals

- **Backend:** >80% code coverage
- **Frontend:** >75% code coverage
- **Critical User Paths:** 100% coverage
- **API Endpoints:** 100% coverage

## Backend Testing

### Technology Stack
- **Jest:** Test runner and assertion library
- **Supertest:** HTTP assertion library for API testing
- **Babel:** ES6+ transpilation for tests

### Test Structure

```
backend/tests/
├── setup.js                 # Global test setup
├── routes/                  # API endpoint tests
│   ├── auth.test.js
│   └── transcriptions.test.js
├── services/               # Service layer tests
│   └── transcriptionService.test.js
├── middleware/             # Middleware tests
└── utils/                  # Utility function tests
```

### Running Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- auth.test.js

# Run tests with verbose output
npm test -- --verbose
```

### Backend Test Examples

#### API Route Testing
```javascript
describe('POST /auth/register', () => {
  test('should register a new user successfully', async () => {
    const userData = {
      email: 'test@example.com',
      password: 'password123',
      username: 'testuser'
    };

    const response = await request(app)
      .post('/auth/register')
      .send(userData)
      .expect(201);

    expect(response.body).toHaveProperty('message', 'User registered successfully');
    expect(response.body).toHaveProperty('user');
    expect(response.body.user).not.toHaveProperty('password');
  });
});
```

#### Service Testing
```javascript
describe('TranscriptionService', () => {
  test('should transcribe audio file successfully', async () => {
    const mockFilePath = '/path/to/audio.mp3';
    const result = await transcriptionService.transcribe(mockFilePath, {
      provider: 'openai-whisper',
      language: 'en'
    });

    expect(result).toHaveProperty('text');
    expect(result).toHaveProperty('confidence');
    expect(result.confidence).toBeGreaterThan(0);
  });
});
```

### Backend Test Configuration

#### Jest Configuration (`jest.config.js`)
```javascript
export default {
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.js'],
  transform: {
    '^.+\\.js$': ['babel-jest', { 
      presets: [['@babel/preset-env', { targets: { node: 'current' } }]] 
    }]
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/database/migrate.js'
  ],
  testTimeout: 10000
};
```

#### Test Setup (`tests/setup.js`)
```javascript
import dotenv from 'dotenv';

// Load test environment variables
dotenv.config({ path: '.env.test' });

// Set test environment
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';

// Global test utilities
global.testUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  username: 'testuser'
};

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});
```

## Frontend Testing

### Technology Stack
- **Vitest:** Fast test runner for Vite projects
- **React Testing Library:** Component testing utilities
- **Jest DOM:** Custom Jest matchers for DOM elements
- **MSW:** Mock Service Worker for API mocking

### Test Structure

```
frontend/src/tests/
├── setup.ts                # Global test setup
├── components/             # Component tests
│   └── LcarsButton.test.tsx
├── pages/                  # Page component tests
├── hooks/                  # Custom hook tests
├── utils/                  # Utility function tests
└── __mocks__/             # Mock implementations
```

### Running Frontend Tests

```bash
cd frontend/auralis-transcriptor-frontend

# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test LcarsButton.test.tsx
```

### Frontend Test Examples

#### Component Testing
```typescript
describe('LcarsButton', () => {
  test('renders button with text', () => {
    render(<LcarsButton>Test Button</LcarsButton>);
    
    const button = screen.getByRole('button', { name: /test button/i });
    expect(button).toBeInTheDocument();
  });

  test('handles click events', () => {
    const handleClick = vi.fn();
    render(<LcarsButton onClick={handleClick}>Click Me</LcarsButton>);
    
    const button = screen.getByRole('button', { name: /click me/i });
    fireEvent.click(button);
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
```

#### Hook Testing
```typescript
describe('useAuth', () => {
  test('should login user successfully', async () => {
    const { result } = renderHook(() => useAuth());
    
    await act(async () => {
      await result.current.login('test@example.com', 'password123');
    });
    
    expect(result.current.user).toBeTruthy();
    expect(result.current.isAuthenticated).toBe(true);
  });
});
```

### Frontend Test Configuration

#### Vitest Configuration (`vitest.config.ts`)
```typescript
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/tests/setup.ts'],
    globals: true,
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/tests/',
        '**/*.d.ts'
      ]
    }
  }
});
```

#### Test Setup (`src/tests/setup.ts`)
```typescript
import '@testing-library/jest-dom';
import { vi, afterEach } from 'vitest';

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
  localStorageMock.clear();
});
```

## Integration Testing

### API Integration Tests

Integration tests verify that different parts of the application work together correctly.

```javascript
describe('Transcription Integration', () => {
  test('should complete full transcription workflow', async () => {
    // 1. Register user
    const registerResponse = await request(app)
      .post('/auth/register')
      .send(testUser);
    
    const token = registerResponse.body.token;
    
    // 2. Upload audio file
    const uploadResponse = await request(app)
      .post('/transcriptions/upload')
      .set('Authorization', `Bearer ${token}`)
      .attach('audio', mockAudioBuffer, 'test.mp3')
      .expect(201);
    
    const transcriptId = uploadResponse.body.transcriptId;
    
    // 3. Check transcription status
    const statusResponse = await request(app)
      .get(`/transcriptions/${transcriptId}/status`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(statusResponse.body.status).toBe('processing');
    
    // 4. Retrieve completed transcription
    // (In real tests, you might need to wait or mock the completion)
    const transcriptResponse = await request(app)
      .get(`/transcriptions/${transcriptId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    expect(transcriptResponse.body.transcript).toHaveProperty('text');
  });
});
```

### Frontend Integration Tests

```typescript
describe('Upload Flow Integration', () => {
  test('should complete file upload and show progress', async () => {
    // Mock API responses
    server.use(
      rest.post('/api/transcriptions/upload', (req, res, ctx) => {
        return res(ctx.json({ transcriptId: 'test-id' }));
      })
    );
    
    render(<FileUploader />);
    
    // Upload file
    const fileInput = screen.getByLabelText(/upload file/i);
    const file = new File(['audio content'], 'test.mp3', { type: 'audio/mp3' });
    
    fireEvent.change(fileInput, { target: { files: [file] } });
    
    // Check progress indicator
    expect(screen.getByText(/uploading/i)).toBeInTheDocument();
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText(/upload complete/i)).toBeInTheDocument();
    });
  });
});
```

## End-to-End Testing

### Technology Stack
- **Playwright:** Modern E2E testing framework
- **Docker:** Containerized test environment

### E2E Test Examples

```typescript
test('user can register, login, and upload file', async ({ page }) => {
  // Navigate to registration
  await page.goto('/register');
  
  // Fill registration form
  await page.fill('[data-testid="email-input"]', 'test@example.com');
  await page.fill('[data-testid="password-input"]', 'password123');
  await page.fill('[data-testid="confirm-password-input"]', 'password123');
  
  // Submit registration
  await page.click('[data-testid="register-button"]');
  
  // Should redirect to dashboard
  await expect(page).toHaveURL('/dashboard');
  
  // Upload file
  await page.setInputFiles('[data-testid="file-input"]', 'test-audio.mp3');
  
  // Check upload progress
  await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
  
  // Wait for completion
  await expect(page.locator('[data-testid="transcription-result"]')).toBeVisible();
});
```

## Test Data Management

### Test Fixtures

```javascript
// tests/fixtures/users.js
export const testUsers = {
  validUser: {
    email: 'test@example.com',
    password: 'password123',
    username: 'testuser'
  },
  adminUser: {
    email: 'admin@example.com',
    password: 'adminpass123',
    username: 'admin',
    role: 'admin'
  }
};

// tests/fixtures/audio.js
export const mockAudioFiles = {
  validMp3: {
    filename: 'test.mp3',
    mimetype: 'audio/mp3',
    size: 1024 * 1024 // 1MB
  },
  invalidFile: {
    filename: 'test.txt',
    mimetype: 'text/plain',
    size: 1024
  }
};
```

### Database Seeding

```javascript
// tests/helpers/database.js
export async function seedTestData() {
  await database.users.create(testUsers.validUser);
  await database.transcripts.create({
    userId: testUsers.validUser.id,
    filename: 'test.mp3',
    text: 'Test transcription',
    status: 'completed'
  });
}

export async function cleanupTestData() {
  await database.transcripts.deleteMany({});
  await database.users.deleteMany({});
}
```

## Mocking Strategies

### External Service Mocking

```javascript
// Mock OpenAI API
jest.mock('openai', () => ({
  OpenAI: jest.fn().mockImplementation(() => ({
    audio: {
      transcriptions: {
        create: jest.fn().mockResolvedValue({
          text: 'Mocked transcription result',
          duration: 10.5
        })
      }
    }
  }))
}));

// Mock file system operations
jest.mock('fs', () => ({
  readFileSync: jest.fn().mockReturnValue(Buffer.from('mock-audio-data')),
  existsSync: jest.fn().mockReturnValue(true),
  unlinkSync: jest.fn()
}));
```

### Frontend API Mocking with MSW

```typescript
// src/tests/mocks/handlers.ts
export const handlers = [
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        user: { id: '1', email: 'test@example.com' },
        token: 'mock-jwt-token'
      })
    );
  }),
  
  rest.post('/api/transcriptions/upload', (req, res, ctx) => {
    return res(
      ctx.json({
        transcriptId: 'mock-transcript-id',
        status: 'processing'
      })
    );
  })
];
```

## Performance Testing

### Load Testing with Artillery

```yaml
# artillery-config.yml
config:
  target: 'http://localhost:5000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Upload and transcribe"
    flow:
      - post:
          url: "/api/auth/login"
          json:
            email: "test@example.com"
            password: "password123"
      - post:
          url: "/api/transcriptions/upload"
          beforeRequest: "setAuthHeader"
```

### Frontend Performance Testing

```typescript
test('component renders within performance budget', async () => {
  const startTime = performance.now();
  
  render(<TranscriptionList transcriptions={largeMockData} />);
  
  const endTime = performance.now();
  const renderTime = endTime - startTime;
  
  // Should render within 100ms
  expect(renderTime).toBeLessThan(100);
});
```

## Accessibility Testing

### Automated A11y Testing

```typescript
import { axe, toHaveNoViolations } from 'jest-axe';

expect.extend(toHaveNoViolations);

test('should not have accessibility violations', async () => {
  const { container } = render(<LcarsButton>Accessible Button</LcarsButton>);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

## Continuous Integration

### GitHub Actions Test Workflow

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run backend tests
        run: |
          cd backend
          npm test -- --coverage
      
      - name: Run frontend tests
        run: |
          cd frontend/auralis-transcriptor-frontend
          npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Test Debugging

### Debugging Backend Tests

```bash
# Run tests with debugging
node --inspect-brk node_modules/.bin/jest --runInBand

# Debug specific test
node --inspect-brk node_modules/.bin/jest --runInBand auth.test.js
```

### Debugging Frontend Tests

```bash
# Run tests with debugging
npm test -- --inspect-brk

# Debug in browser
npm run test:ui
```

## Best Practices

### General Testing Principles

1. **Write tests first (TDD)** when possible
2. **Test behavior, not implementation**
3. **Keep tests simple and focused**
4. **Use descriptive test names**
5. **Arrange, Act, Assert pattern**
6. **Mock external dependencies**
7. **Test edge cases and error conditions**

### Test Organization

1. **Group related tests** using `describe` blocks
2. **Use consistent naming conventions**
3. **Keep test files close to source code**
4. **Share common setup** using `beforeEach`/`beforeAll`
5. **Clean up after tests** using `afterEach`/`afterAll`

### Performance Considerations

1. **Run tests in parallel** when possible
2. **Use test databases** for isolation
3. **Mock expensive operations**
4. **Optimize test data setup**
5. **Monitor test execution time**

## Troubleshooting

### Common Issues

#### Test Timeouts
```javascript
// Increase timeout for slow tests
test('slow operation', async () => {
  // Test implementation
}, 30000); // 30 second timeout
```

#### Memory Leaks
```javascript
// Proper cleanup
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers();
});
```

#### Flaky Tests
```javascript
// Use waitFor for async operations
await waitFor(() => {
  expect(screen.getByText('Expected text')).toBeInTheDocument();
});
```

### Debug Commands

```bash
# Backend
DEBUG=* npm test
NODE_ENV=test npm test -- --verbose

# Frontend
VITE_DEBUG=true npm test
npm test -- --reporter=verbose
```

---

**Last Updated:** August 6, 2025
**Version:** 2.1.4


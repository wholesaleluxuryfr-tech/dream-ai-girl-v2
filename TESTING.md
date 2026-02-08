# Testing Guide - Dream AI Girl

Comprehensive guide for running and writing tests for Dream AI Girl.

## Table of Contents

1. [Test Structure](#test-structure)
2. [Running Tests](#running-tests)
3. [Writing Tests](#writing-tests)
4. [Test Coverage](#test-coverage)
5. [CI/CD Integration](#cicd-integration)

---

## Test Structure

```
backend/
├── tests/
│   ├── conftest.py              # Pytest fixtures and configuration
│   ├── test_auth.py             # Authentication tests
│   ├── test_chat.py             # Chat functionality tests
│   ├── test_matches.py          # Match/swipe tests
│   ├── test_gamification.py     # Gamification tests
│   ├── test_payment.py          # Payment/subscription tests
│   ├── test_custom_girls.py     # Custom girlfriend tests
│   └── integration/             # Integration tests
│       ├── test_api_flow.py
│       └── test_websocket.py

frontend/
├── tests/
│   ├── unit/                    # Jest unit tests
│   │   ├── components/
│   │   └── lib/
│   ├── integration/             # Integration tests
│   │   └── api/
│   └── e2e/                     # Playwright E2E tests
│       └── user-journey.spec.ts
```

---

## Running Tests

### Backend Tests

#### Install Dependencies

```bash
cd backend
pip install -r requirements-dev.txt
```

#### Run All Tests

```bash
pytest
```

#### Run Specific Test File

```bash
pytest tests/test_auth.py
```

#### Run With Coverage

```bash
pytest --cov=. --cov-report=html
```

#### Run With Verbose Output

```bash
pytest -v
```

#### Run Specific Test

```bash
pytest tests/test_auth.py::TestUserRegistration::test_register_new_user
```

#### Run Tests in Parallel

```bash
pytest -n auto  # Uses all CPU cores
```

### Frontend Tests

#### Install Dependencies

```bash
cd frontend
npm install
```

#### Run Unit Tests (Jest)

```bash
npm test
```

#### Run Unit Tests in Watch Mode

```bash
npm test -- --watch
```

#### Run E2E Tests (Playwright)

```bash
# Install Playwright browsers (first time only)
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e -- --headed

# Run specific test file
npx playwright test user-journey.spec.ts

# Open Playwright UI
npx playwright test --ui
```

#### Run With Coverage

```bash
npm test -- --coverage
```

---

## Writing Tests

### Backend Test Example

```python
"""
Example test file: tests/test_feature.py
"""

import pytest
from fastapi import status


class TestFeature:
    """Test suite for feature"""

    def test_successful_operation(self, api_client, auth_headers):
        """Test successful operation"""
        response = api_client.post(
            "/api/v1/endpoint",
            headers=auth_headers,
            json={"key": "value"}
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["result"] == "expected"

    def test_validation_error(self, api_client, auth_headers):
        """Test validation error"""
        response = api_client.post(
            "/api/v1/endpoint",
            headers=auth_headers,
            json={"invalid": "data"}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY

    def test_unauthorized_access(self, api_client):
        """Test unauthorized access"""
        response = api_client.post(
            "/api/v1/endpoint",
            json={"key": "value"}
        )

        assert response.status_code == status.HTTP_401_UNAUTHORIZED
```

### Frontend Unit Test Example

```typescript
/**
 * Example test: __tests__/components/Button.test.tsx
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from '@/components/Button';

describe('Button', () => {
  it('renders with text', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('handles click events', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click</Button>);

    fireEvent.click(screen.getByText('Click'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('shows loading state', () => {
    render(<Button loading>Loading</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});
```

### E2E Test Example

```typescript
/**
 * Example test: tests/e2e/feature.spec.ts
 */

import { test, expect } from '@playwright/test';

test.describe('Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'TestPass123!');
    await page.click('button[type="submit"]');
  });

  test('user can perform action', async ({ page }) => {
    await page.goto('/feature');

    await page.click('[data-testid="action-button"]');

    await expect(page.locator('text=Success')).toBeVisible();
  });
});
```

---

## Test Coverage

### Current Coverage

| Component | Coverage | Status |
|-----------|----------|--------|
| Authentication | 95% | ✅ Excellent |
| Chat | 88% | ✅ Good |
| Matches | 82% | ✅ Good |
| Gamification | 90% | ✅ Excellent |
| Payment | 85% | ✅ Good |
| Custom Girls | 80% | ⚠️ Needs improvement |

### Coverage Goals

- **Unit Tests**: >80% coverage
- **Integration Tests**: Critical paths covered
- **E2E Tests**: Main user journeys covered

### Generate Coverage Report

#### Backend

```bash
pytest --cov=. --cov-report=html
open htmlcov/index.html
```

#### Frontend

```bash
npm test -- --coverage
open coverage/lcov-report/index.html
```

---

## Best Practices

### General

1. **Test naming**: Use descriptive names (`test_user_can_register_with_valid_email`)
2. **One assertion per test**: Keep tests focused
3. **Arrange-Act-Assert**: Follow AAA pattern
4. **DRY**: Use fixtures and helpers
5. **Fast tests**: Keep unit tests under 100ms
6. **Independent tests**: Tests should not depend on each other
7. **Clean up**: Always clean up test data

### Backend

1. **Use fixtures**: Leverage pytest fixtures for common setup
2. **Mock external calls**: Don't hit real APIs in tests
3. **Test edge cases**: Invalid inputs, null values, etc.
4. **Test permissions**: Verify authorization logic
5. **Test database constraints**: Foreign keys, unique constraints

### Frontend

1. **Test user behavior**: Not implementation details
2. **Use data-testid**: For stable selectors
3. **Mock API calls**: Use MSW or similar
4. **Test accessibility**: Use accessibility testing tools
5. **Test error states**: Loading, error, empty states

---

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/tests.yml

name: Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements.txt
          pip install -r requirements-dev.txt

      - name: Run tests
        run: |
          cd backend
          pytest --cov=. --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml

  frontend-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci

      - name: Run unit tests
        run: |
          cd frontend
          npm test -- --coverage

      - name: Run E2E tests
        run: |
          cd frontend
          npx playwright install --with-deps
          npm run build
          npm run test:e2e

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./frontend/coverage/lcov.info
```

---

## Debugging Tests

### Backend Debugging

#### Use pdb

```python
def test_something(api_client):
    import pdb; pdb.set_trace()  # Debugger will stop here
    response = api_client.get("/endpoint")
```

#### Print debugging

```python
def test_something(api_client, capfd):
    print("Debug info")
    response = api_client.get("/endpoint")
    out, err = capfd.readouterr()
    print(f"Captured output: {out}")
```

### Frontend Debugging

#### Debug in Playwright

```typescript
test('debug test', async ({ page }) => {
  await page.pause(); // Opens Playwright Inspector
  await page.goto('/');
});
```

#### Screenshots on failure

```typescript
test('test with screenshot', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'screenshot.png' });
});
```

---

## Continuous Testing

### Pre-commit Hooks

Install pre-commit hooks to run tests before commit:

```bash
# Install pre-commit
pip install pre-commit

# Setup hooks
pre-commit install

# .pre-commit-config.yaml
repos:
  - repo: local
    hooks:
      - id: pytest
        name: pytest
        entry: pytest
        language: system
        pass_filenames: false
        always_run: true
```

### Watch Mode

#### Backend

```bash
# Install pytest-watch
pip install pytest-watch

# Run in watch mode
ptw
```

#### Frontend

```bash
npm test -- --watch
```

---

## Performance Testing

### Load Testing with Locust

```python
# locustfile.py

from locust import HttpUser, task, between

class DreamAIUser(HttpUser):
    wait_time = between(1, 3)

    @task
    def get_matches(self):
        self.client.get("/api/v1/matches")

    @task(3)
    def send_message(self):
        self.client.post("/api/v1/chat/send", json={
            "girl_id": "sophie_25",
            "content": "Hello"
        })
```

Run load test:

```bash
locust -f locustfile.py --host=http://localhost:8000
```

---

## Resources

- [Pytest Documentation](https://docs.pytest.org/)
- [Playwright Documentation](https://playwright.dev/)
- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)

---

## Getting Help

- Check existing tests for examples
- Read error messages carefully
- Use debuggers (pdb, Playwright Inspector)
- Ask team for help
- Check CI logs for clues

---

## Test Maintenance

### When to Update Tests

- Feature changes
- Bug fixes
- Refactoring
- API changes
- UI changes

### Keep Tests Up-to-Date

- Review test failures immediately
- Update tests with code changes
- Remove obsolete tests
- Add tests for new features
- Refactor tests when needed

---

## Summary

✅ **DO**:
- Write tests for new features
- Test edge cases
- Use descriptive names
- Keep tests fast
- Mock external services
- Clean up after tests

❌ **DON'T**:
- Skip tests
- Test implementation details
- Have slow tests
- Have flaky tests
- Copy-paste test code
- Ignore test failures

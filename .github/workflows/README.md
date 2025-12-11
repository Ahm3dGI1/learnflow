# GitHub Actions Workflows

This directory contains CI/CD workflows for the LearnFlow project.

## Active Workflows

### 1. Backend Tests (`backend-tests.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Only runs when backend files change (`server/**`)

**Jobs:**

#### Test Job (Matrix: Python 3.10, 3.11, 3.12)
- Runs all unit tests (excludes integration tests)
- Generates code coverage report
- Enforces minimum 50% coverage threshold
- Tests database isolation and cleanup

---

### 2. Frontend Tests (`frontend-tests.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Only runs when frontend files change (`client/**`)

**Jobs:**

#### Test Job (Matrix: Node 18.x, 20.x)
- Runs Jest tests with React Testing Library
- Generates code coverage report
- Enforces minimum 50% coverage threshold
- Uploads coverage to Codecov

#### Build Job (Node 20.x)
- Builds production bundle with Vite
- Verifies build succeeds without errors
- Uploads build artifacts for review
- Tests with dummy environment variables

**Environment Variables for Build:**
The build job uses dummy values for Firebase config to test build process without exposing credentials:
```yaml
VITE_API_BASE_URL: http://localhost:5000
VITE_FIREBASE_API_KEY: dummy
VITE_FIREBASE_AUTH_DOMAIN: dummy
# ... etc
```

Real environment variables should be set in GitHub Secrets for deployment workflows.

---

## Workflow Best Practices

### Path Filtering
Both workflows use `paths` filters to run only when relevant files change:
```yaml
paths:
  - 'server/**'  # Backend workflow
  - 'client/**'  # Frontend workflow
```

This saves CI minutes by not running backend tests when only frontend changes, and vice versa.

### Caching
Both workflows use dependency caching to speed up runs:
- Backend: `pip` cache via `actions/setup-python@v5`
- Frontend: `npm` cache via `actions/setup-node@v4`

### Matrix Testing
- Backend tests across Python 3.10, 3.11, 3.12 (future-proofing)
- Frontend tests across Node 18.x, 20.x (current LTS versions)

### Test Isolation
Backend tests use:
- SQLite in-memory database
- Automatic cleanup after each test (see `server/tests/conftest.py`)
- Mocked external services (Firebase, LLM APIs)

Frontend tests use:
- Jest with `jsdom` environment
- React Testing Library for component testing
- Mocked API calls

---

## Adding New Checks

### Adding a New Linter (Backend)

Edit `backend-tests.yml` lint job:
```yaml
- name: Run MyPy (type checking)
  working-directory: ./server
  run: |
    mypy . --strict
```

### Adding a New Frontend Test Step

Edit `frontend-tests.yml` test job:
```yaml
- name: Run E2E tests
  working-directory: ./client
  run: npm run test:e2e
```

### Adding Deployment Workflow

Create `deploy.yml`:
```yaml
name: Deploy to Production

on:
  release:
    types: [published]

jobs:
  deploy-backend:
    # ... deploy backend to server

  deploy-frontend:
    # ... deploy frontend to CDN
```

---
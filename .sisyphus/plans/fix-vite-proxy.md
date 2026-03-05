# Fix: Frontend API Proxy for Remote Access

## TL;DR

> **Quick Summary**: Frontend API requests fail because the browser sends them to `http://localhost:8000` which is unreachable from a remote/port-forwarded environment. Fix by adding a Vite dev proxy and using relative API paths.
>
> **Deliverables**:
> - Vite proxy config so `/api/*` requests are forwarded to the Go backend
> - apiClient baseURL changed to relative path
>
> **Estimated Effort**: Quick
> **Parallel Execution**: NO — single task
> **Critical Path**: Task 1

---

## Context

### Original Request
User reports "注册的时候都是请求失败" (registration requests always fail). The app is accessed via a remote/port-forwarded URL, but the frontend hardcodes `http://localhost:8000` as the API base URL.

### Root Cause
- `frontend/src/lib/apiClient.ts:14` sets `baseURL` to `http://localhost:8000`
- When accessed via port forwarding (e.g., `https://xxx-5174.gitpod.io`), the browser resolves `localhost` to the user's local machine, not the server
- Result: every API call gets `ERR_CONNECTION_REFUSED` → "请求失败"

---

## Work Objectives

### Core Objective
Make API requests work regardless of whether the app is accessed via `localhost` or a remote forwarded URL.

### Concrete Deliverables
- `frontend/vite.config.ts` with proxy config
- `frontend/src/lib/apiClient.ts` with relative baseURL

### Definition of Done
- [ ] `curl` to register via Vite proxy returns 201
- [ ] Browser can register/login without "请求失败"

### Must Have
- Vite proxy forwards `/api/*` to `http://localhost:8000`
- apiClient uses relative URL (empty string) as default baseURL
- `VITE_API_BASE_URL` env override still works if set

### Must NOT Have (Guardrails)
- Do NOT change any backend code
- Do NOT change CORS middleware
- Do NOT modify any other frontend files

---

## Verification Strategy

### Test Decision
- **Automated tests**: None needed — trivial config change
- **Agent-Executed QA**: YES — curl through Vite + Playwright browser check

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Single task):
└── Task 1: Add Vite proxy + fix apiClient baseURL [quick]

Wave FINAL (Verification):
└── Task F1: Verify register works through browser
```

---

## TODOs

- [ ] 1. Add Vite proxy and fix apiClient baseURL

  **What to do**:
  - Edit `frontend/vite.config.ts`: Add `server.proxy` config that forwards `/api` to `http://localhost:8000`
  - Edit `frontend/src/lib/apiClient.ts` line 14: Change default baseURL from `"http://localhost:8000"` to `""`

  **Exact changes**:

  File 1: `frontend/vite.config.ts`
  ```
  OLD (line 5-12):
  export default defineConfig({
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      }
    }
  })

  NEW:
  export default defineConfig({
    plugins: [vue()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      }
    },
    server: {
      proxy: {
        '/api': {
          target: 'http://localhost:8000',
          changeOrigin: true,
        },
      },
    },
  })
  ```

  File 2: `frontend/src/lib/apiClient.ts`
  ```
  OLD (line 14):
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

  NEW:
  const API_BASE = import.meta.env.VITE_API_BASE_URL || "";
  ```

  **Must NOT do**:
  - Do NOT touch any other files
  - Do NOT add comments

  **Recommended Agent Profile**:
  - **Category**: `quick`
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO (only one task)
  - **Blocks**: F1
  - **Blocked By**: None

  **References**:
  - `frontend/vite.config.ts` — Current config without proxy (full file, 12 lines)
  - `frontend/src/lib/apiClient.ts:14` — The line with hardcoded `http://localhost:8000`
  - `frontend/src/lib/api/echo.ts`, `chat.ts`, `community.ts`, `user.ts` — All use relative paths like `/api/v1/...` so they'll work with proxy

  **Acceptance Criteria**:
  - [ ] `frontend/vite.config.ts` contains `server.proxy` with `/api` → `http://localhost:8000`
  - [ ] `frontend/src/lib/apiClient.ts` line 14 has `|| ""` not `|| "http://localhost:8000"`
  - [ ] `npx vue-tsc --noEmit` passes
  - [ ] `npx vite build` passes

  **QA Scenarios (MANDATORY)**:

  ```
  Scenario: Register via Vite proxy
    Tool: Bash (curl)
    Preconditions: Backend running on :8000, Vite dev server restarted after config change
    Steps:
      1. curl -s -w "\nHTTP: %{http_code}" http://localhost:5174/api/v1/auth/register -H "Content-Type: application/json" -d '{"username":"proxytest","email":"proxy@test.com","password":"Test1234!","nickname":"ProxyTest"}'
      2. Assert HTTP status is 201
      3. Assert response contains "username":"proxytest"
    Expected Result: 201 Created with user object
    Failure Indicators: Connection refused, 404, or CORS error
    Evidence: .sisyphus/evidence/task-1-register-proxy.txt

  Scenario: Login via Vite proxy
    Tool: Bash (curl)
    Preconditions: User registered in previous scenario
    Steps:
      1. curl -s -w "\nHTTP: %{http_code}" http://localhost:5174/api/v1/auth/login -H "Content-Type: application/json" -d '{"login":"proxytest","password":"Test1234!"}'
      2. Assert HTTP status is 200
      3. Assert response contains "access_token"
    Expected Result: 200 OK with token pair
    Failure Indicators: Connection refused, 401, or empty response
    Evidence: .sisyphus/evidence/task-1-login-proxy.txt
  ```

  **Commit**: YES
  - Message: `fix: add Vite proxy so API works via remote/port-forwarded access`
  - Files: `frontend/vite.config.ts`, `frontend/src/lib/apiClient.ts`
  - Pre-commit: `npx vue-tsc --noEmit`

---

## Final Verification Wave

- [ ] F1. **Smoke Test** — `quick`
  After Vite restarts, run both QA scenarios above. Verify register + login work through the Vite proxy at port 5174.

---

## Commit Strategy

- **1**: `fix: add Vite proxy so API works via remote/port-forwarded access` — `frontend/vite.config.ts`, `frontend/src/lib/apiClient.ts`

---

## Success Criteria

### Verification Commands
```bash
curl -s http://localhost:5174/api/v1/auth/register -H "Content-Type: application/json" -d '{"username":"smoketest","email":"smoke@test.com","password":"Test1234!","nickname":"Smoke"}' # Expected: 201
```

### Final Checklist
- [ ] Vite proxy configured
- [ ] apiClient uses relative URL
- [ ] Register/login work through port 5174
- [ ] No TypeScript errors

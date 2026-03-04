### Related Issue

<!-- Enter the related issue number, e.g., Fixes #123 -->

### Summary

<!-- Briefly describe the changes -->

### Change Type

- [ ] New Feature (feat)
- [ ] Bug Fix (fix)
- [ ] Refactoring (refactor)
- [ ] Documentation (docs)
- [ ] Dependency / Configuration (chore)

### Self-Check Checklist

**Backend (Go)**:
- [ ] `go build ./...` passes
- [ ] `go vet ./...` passes
- [ ] `gofmt` produces no diff

**Frontend (Vue)**:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes

**General**:
- [ ] Removed all temporary debug output
- [ ] No sensitive data in the code

### Test Steps

1. Pull branch and install dependencies:
   ```bash
   cd backend && go mod download
   cd ../frontend && npm install
   ```
2. Start the application:
   ```bash
   make dev-backend    # Terminal 1
   make dev-frontend   # Terminal 2
   ```
3. Verification steps:
   - ...

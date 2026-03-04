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

> Run `make check` to execute all checks at once.

**Backend (Go)**:
- [ ] `go build ./...` passes
- [ ] `go vet ./...` passes
- [ ] `gofmt` produces no diff
- [ ] `golangci-lint run` passes (or no new issues)

**Frontend (Vue)**:
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
- [ ] `npm run build` succeeds

**General**:
- [ ] Removed all temporary debug output
- [ ] No sensitive data in the code
- [ ] CI checks pass

### Test Steps

1. Pull branch and install dependencies:
   ```bash
   make install
   ```
2. Start the application:
   ```bash
   make dev-backend    # Terminal 1
   make dev-frontend   # Terminal 2
   ```
3. Verification steps:
   - ...

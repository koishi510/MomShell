### Related Issue

<!-- Enter the related issue number, e.g., Fixes #123 -->

### Summary

<!-- Briefly describe the changes, purpose, and problem solved -->

### Change Type

<!-- Mark with "x" in the appropriate checkbox -->

- [ ] New Feature (feat)
- [ ] Bug Fix (fix)
- [ ] Refactoring (refactor)
- [ ] Performance Improvement (perf)
- [ ] Documentation (docs)
- [ ] Dependency / Configuration (chore)

### Self-Check Checklist

<!-- Please confirm the following before submitting -->

**Backend**:
- [ ] Code runs correctly in local environment
- [ ] Ran `uv run ruff format .` and `uv run ruff check . --fix`
- [ ] Ran `uv run mypy app/`
- [ ] (If dependencies changed) Ran `uv lock && uv export > requirements.txt` and committed both files

**Frontend**:
- [ ] (If frontend changed) Ran `npm run lint` in `frontend/`
- [ ] (If frontend changed) Ran `npm run build` in `frontend/` without errors

**General**:
- [ ] Removed all temporary debug output (print/console.log)
- [ ] No sensitive data (API keys, credentials) in the code

### Test Steps

<!-- Provide steps to verify this change -->

1. Pull branch and sync environment:
   ```bash
   uv sync
   cd frontend && npm install && cd ..
   ```
2. Run the application:
   ```bash
   # Terminal 1 - Backend
   uv run uvicorn app.main:app --reload --port 8000
   # Terminal 2 - Frontend
   cd frontend && npm run dev
   ```
3. Verification steps:
   - ...

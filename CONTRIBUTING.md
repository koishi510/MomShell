# Contributing

Thank you for contributing to MomShell!

## Getting Started

- [Getting Started](docs/getting-started.md) — Prerequisites and setup
- [Development Guide](docs/development.md) — Workflow and commands

## Code Quality

Before committing, run checks locally:

```bash
make check    # lint + typecheck (Go + Vue)
make format   # go fmt
```

Pre-commit hooks run automatically if installed:

```bash
pre-commit install
```

### What the hooks check

- **Go**: `gofmt`, `go vet`, `go build`
- **Vue**: ESLint, `vue-tsc`
- **General**: trailing whitespace, YAML validity, merge conflicts, large files

## Code Standards

**Backend (Go)**:
- `gofmt` formatting
- `go vet` passes
- Follow standard Go project layout

**Frontend (Vue/TypeScript)**:
- ESLint with `eslint-plugin-vue` + `typescript-eslint`
- `vue-tsc` type checking passes

## Dependency Management

**Backend**:

```bash
cd backend
go get github.com/some/package
go mod tidy
```

**Frontend**:

```bash
cd frontend
npm install some-package
```

Lock files (`go.sum`, `package-lock.json`) must be committed.

## Commit Convention

All commits follow [Conventional Commits](https://www.conventionalcommits.org/): `type: description`

| Type | Description |
|------|-------------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code restructuring |
| `chore` | Build, config, tooling |
| `docs` | Documentation |
| `ci` | CI/CD changes |
| `test` | Tests |

## Branch & PR Workflow

1. Create feature branch from `main`: `feat/feature-name` or `fix/issue-name`
2. Make changes, commit with conventional messages
3. Push and create PR targeting `main`
4. Ensure CI passes and request review

## Sensitive Files

**Never commit**: `.env`, `*.pem`, `*.key`, `credentials.json`

## Troubleshooting

**Pre-commit hook failing?**
Run `make check` to see which check fails, fix, then commit again.

**Frontend build failing?**
Delete `node_modules` and run `npm install`.

**Port already in use?**
```bash
lsof -i :8000
kill -9 <PID>
```

# Contributing

This document outlines the development environment setup process and collaboration standards for project contributors. To ensure cross-platform consistency and code quality, all contributors must follow these steps before starting development.

## 1. System Prerequisites

Before cloning the project, ensure your operating system has the following tools installed.

### 1.1 Install uv Package Manager

This project uses uv for Python version management and dependency locking. Run the appropriate command for your operating system.

- **Linux / macOS**:
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- **Windows (PowerShell)**:
  ```powershell
  powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```

**Note**: After installation, restart your terminal and run `uv --version` to verify.

### 1.2 Install nvm (Node Version Manager)

This project uses nvm to manage Node.js versions for the frontend.

- **Linux / macOS**:
  ```bash
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  ```
- **Windows**: Use [nvm-windows](https://github.com/coreybutler/nvm-windows)

**Note**: After installation, restart your terminal and run `nvm --version` to verify.

### 1.3 Install Git LFS

This project uses Git LFS (Large File Storage) to manage model weights and binary data files.

- **Linux**: Run `sudo apt install git-lfs` (Ubuntu example)
- **macOS**: Run `brew install git-lfs`
- **Windows**: Usually pre-installed with Git for Windows. If not, download from the official website.

After installation, run the global initialization command:

```bash
git lfs install
```

## 2. Project Initialization

After cloning the repository, run the following commands in order from the project root directory.

### 2.1 Sync Development Environment

Run the following command. uv will automatically download Python 3.11.5, create a virtual environment, and install exact dependency versions from `uv.lock`.

```bash
uv sync
```

### 2.2 Install Git Hooks (Pre-commit)

This project uses automated code checks. Run the following command to install Git hooks for automatic formatting and quality checks on commit.

```bash
uv run pre-commit install
```

## 3. IDE Configuration

We recommend VS Code for development. Configure it as follows to ensure proper interpreter and toolchain integration.

1. **Select Python Interpreter**:
   - Open Command Palette (Windows: `Ctrl+Shift+P`, macOS: `Cmd+Shift+P`)
   - Type and select `Python: Select Interpreter`
   - Choose the option containing `.venv` (usually marked as Recommended)

2. **Install Recommended Extensions**:
   - **Python** (Microsoft)
   - **Ruff** (Astral Software): For code formatting and linting
   - **Mypy** (Microsoft): For static type checking

## 4. Daily Development Workflow

Follow these guidelines to maintain a clean and stable codebase.

### 4.1 Daily Sync

Before writing code, always update your local development branch and sync dependencies:

```bash
# Switch to dev branch and pull latest code
git checkout dev
git pull --rebase origin dev

# Sync backend dependencies
uv sync

# Sync frontend dependencies (if package.json changed)
cd frontend && npm install && cd ..
```

### 4.2 Running the Project

#### Using Make (Recommended)

The project includes a Makefile for common tasks. Run `make help` to see all available commands.

```bash
# Start development servers
make dev-backend   # Terminal 1: Backend on http://localhost:8000
make dev-frontend  # Terminal 2: Frontend on http://localhost:3000

# Or use tmux to start both in split panes
make dev-tmux

# Docker deployment
make docker-up     # Build and start containers
make docker-down   # Stop containers
make docker-logs   # View logs
```

#### Manual Commands

You need to run both the backend and frontend servers in separate terminals.

**Terminal 1 - Backend (FastAPI)**:
```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend (Next.js)**:
```bash
cd frontend
npm run dev
```

**Access the Application**:
- Frontend: http://localhost:3000
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

#### Docker Development

Alternatively, you can run the entire stack using Docker Compose:

```bash
# Start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop all services
docker compose down
```

**Access via Docker**: http://localhost:7860

### 4.3 Dependency Management

**Backend (Python)** - Do not use pip directly:

```bash
# Add production dependency
uv add numpy

# Add development dependency
uv add --dev ruff
```

**Frontend (Node.js)**:

```bash
cd frontend

# Add production dependency
npm install axios

# Add development dependency
npm install -D @types/node
```

### 4.4 Code Quality Checks

Before committing, run these checks locally.

#### Using Make (Recommended)

```bash
make lint       # Run all linters (backend + frontend)
make format     # Format all code
make typecheck  # Run all type checkers
make check      # Run lint + typecheck
```

#### Manual Commands

**Backend**:
```bash
# Code formatting
uv run ruff format .

# Static analysis (Lint)
uv run ruff check . --fix

# Type checking
uv run mypy app/
```

**Frontend**:
```bash
cd frontend

# Lint (ESLint + TypeScript)
npm run lint

# Build check (catches TypeScript errors)
npm run build
```

## 5. Collaboration Standards

### 5.1 Dependency & Lock File Management

**Backend (Python)**:
- **uv.lock**: Auto-generated by uv. **Do not edit manually**. Must be committed to version control.
- **requirements.txt**: Auto-generated by `uv export`. **Do not edit manually**. Used for Docker builds.
- **Conflict Resolution**: If `uv.lock` or `requirements.txt` conflicts after `git pull`, do not manually merge. Run `uv lock && uv export > requirements.txt` to regenerate, then commit.

**Frontend (Node.js)**:
- **package-lock.json**: Auto-generated by npm. **Do not edit manually**. Must be committed to version control.
- **Conflict Resolution**: If conflicts occur, delete `package-lock.json`, run `npm install`, then commit the regenerated file.

### 5.2 Large File Handling

- Before committing large binary files (.pt, .parquet, .db), verify their extensions are listed in `.gitattributes` to ensure LFS storage.
- **Never commit**: Model weights, datasets, or any file larger than 10MB without LFS.

### 5.3 Sensitive Files

The following files should **never** be committed:
- `.env` - Contains API keys and secrets (use `.env.example` as template)
- Credential files (`credentials.json`, `*.pem`, `*.key`)
- IDE-specific files not in `.gitignore`
- `__pycache__/`, `node_modules/`, `.next/`, `out/`

### 5.4 Code Standards

**Backend (Python)** - Enforced by Ruff and Mypy:

1. **Formatting**: PEP 8 + Black standards (**double quotes**, **88-char line width**, **4-space indent**)
2. **Imports**: Ordered as "standard library > third-party > local modules". No unused imports.
3. **Quality**: No unused variables, risky syntax, or deprecated features.
4. **Type Safety**: Type hints required, must pass Mypy checks.

**Frontend (TypeScript)** - Enforced by ESLint:

1. **Formatting**: Prettier defaults (**single quotes**, **2-space indent**, **semicolons**)
2. **Type Safety**: Strict TypeScript, no `any` types without justification.
3. **React**: Follow React hooks rules, no deprecated lifecycle methods.

### 5.4 Commit Message Convention

All commit messages must follow Conventional Commits format: `type: description`.

| Type         | Description                           | CI Behavior         |
| :----------- | :------------------------------------ | :------------------ |
| **feat**     | New feature                           | Triggers build/test |
| **fix**      | Bug fix                               | Triggers build/test |
| **refactor** | Code refactoring (no logic change)    | Triggers build/test |
| **perf**     | Performance improvement               | Triggers build/test |
| **test**     | Add or update tests                   | Triggers build/test |
| **style**    | Code style changes (formatting, etc.) | **Skips CI build**  |
| **docs**     | Documentation only                    | **Skips CI build**  |
| **chore**    | Build config or tooling changes       | **Skips CI build**  |
| **ci**       | CI/CD configuration changes           | **Skips CI build**  |
| **build**    | Build system or dependency changes    | **Skips CI build**  |
| **revert**   | Revert a previous commit              | Triggers build/test |

### 5.5 Branch Management & Pull Request Process

This project uses a **dual main branch strategy** (`main` for production, `dev` for development integration).

1. **Branch Structure & Naming**:
   - **dev**: Main development branch. All feature branches should be created from here.
   - **main**: Production releases only. Direct pushes are prohibited.
   - **Feature branches**: Name as `feat/feature-name` or `fix/issue-description`.

2. **Sync & Rebase**:
   - To maintain linear history, **do not merge dev into feature branches**.
   - Before creating a Pull Request, rebase your feature branch onto the latest `dev`:
     ```bash
     git fetch origin
     git rebase origin/dev
     ```
   - If conflicts occur, resolve them locally and continue the rebase.

3. **Submission Process**:
   - Ensure all code quality checks pass locally.
   - Push branch to remote (may require `git push --force-with-lease` after rebase).
   - Create Pull Request with **target branch set to `dev`**.

4. **Merge Criteria**:
   - **CI Checks**: All automated tests and linter checks must pass.
   - **Code Review**: Approval from a CODEOWNER is required before merging.

## 6. Troubleshooting

- **Q: uv command not found?**
  - A: Check if environment variables are set or if you need to restart the terminal. Windows users should try running PowerShell as administrator.

- **Q: nvm command not found?**
  - A: Restart your terminal after installation. If still not working, manually add nvm to your shell profile (`~/.bashrc`, `~/.zshrc`).

- **Q: VS Code showing code errors?**
  - A: Verify the Python interpreter (bottom-right corner) is set to the `.venv` virtual environment, not the system Python.

- **Q: Git rejecting commits?**
  - A: Read the terminal error message carefully. Usually caused by failing pre-commit checks (formatting errors or leftover debug code). Ruff typically auto-fixes formatting issues — just run `git add` and `git commit` again.

- **Q: Frontend build failing with TypeScript errors?**
  - A: Run `cd frontend && npm install` to ensure dependencies are up to date. If errors persist, delete `node_modules` and `package-lock.json`, then run `npm install` again.

- **Q: Docker build failing on MediaPipe model download?**
  - A: This is usually a network issue. The Dockerfile includes retry logic, but if it still fails, check your network connection or try building again later.

- **Q: Port already in use?**
  - A: Another process is using the port. Find and kill it:
    ```bash
    # Find process on port 8000 (backend)
    lsof -i :8000
    # Find process on port 3000 (frontend)
    lsof -i :3000
    # Kill process by PID
    kill -9 <PID>
    ```

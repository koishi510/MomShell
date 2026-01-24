# MomShell

An AI powered assistant for postpartum mothers.

## Features

- **Recovery Coach**: AI-powered postpartum exercise coaching with real-time pose detection
- **Soulful Companion**: Emotional support chat companion powered by Zhipu GLM-4

## Project Structure

```
MomShell/
├── app/                    # FastAPI backend
│   ├── api/               # API routes (REST + WebSocket)
│   ├── core/              # Configuration and database
│   ├── models/            # Database models
│   ├── schemas/           # Pydantic schemas
│   └── services/          # Business logic
│       ├── chat/          # Soulful Companion service
│       └── rehab/         # Recovery Coach service
└── frontend/              # Next.js frontend
    ├── app/               # App router pages
    ├── components/        # React components
    ├── hooks/             # Custom hooks
    └── lib/               # Utilities
```

## Getting Started

### Prerequisites

- Node.js >= 18
- [uv](https://docs.astral.sh/uv/) (Python package manager)

### Install uv

```bash
# Linux / macOS
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Installation

1. Clone the repository

```bash
git clone https://github.com/your-username/MomShell.git
cd MomShell
```

2. Set up environment variables

```bash
cp .env.example .env
# Edit .env and fill in your API keys
```

3. Install backend dependencies

```bash
uv sync
```

4. Install frontend dependencies

```bash
cd frontend
npm install
```

### Running the Application

You need to run both the backend and frontend servers.

**Terminal 1 - Backend (FastAPI)**

```bash
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 - Frontend (Next.js)**

```bash
cd frontend
npm run dev
```

### Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ANTHROPIC_API_KEY` | Anthropic API key for AI feedback | - |
| `ZHIPUAI_API_KEY` | Zhipu AI API key for chat companion | - |
| `DATABASE_URL` | Database connection URL | `sqlite+aiosqlite:///./momshell.db` |
| `DEBUG` | Enable debug mode | `false` |

See `.env.example` for all available configuration options.

## License

This project is licensed under the GPL-3.0 License - see the [LICENSE](LICENSE) file for details.

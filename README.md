# MomShell

<!-- Badges -->

[![CI](https://img.shields.io/github/actions/workflow/status/koishi510/MomShell/ci.yml?branch=main&style=flat&logo=githubactions&logoColor=white&label=CI)](https://github.com/koishi510/MomShell/actions/workflows/ci.yml)
[![Version](https://img.shields.io/github/v/release/koishi510/MomShell?style=flat&logo=github&label=version)](https://github.com/koishi510/MomShell/releases)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL%203.0-blue?style=flat&logo=gnu&logoColor=white)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat&logo=python&logoColor=white)](https://www.python.org/)
[![Node.js](https://img.shields.io/badge/Node.js-22-339933?style=flat&logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat&logo=next.js&logoColor=white)](https://nextjs.org/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=flat&logo=docker&logoColor=white)](https://www.docker.com/)
[![Ruff](https://img.shields.io/badge/code%20style-Ruff-D7FF64?style=flat&logo=ruff&logoColor=white)](https://docs.astral.sh/ruff/)
[![Qwen](https://img.shields.io/badge/AI-Qwen-6F42C1?style=flat&logo=alibabacloud&logoColor=white)](https://www.alibabacloud.com/solutions/generative-ai/qwen)

A warm, AI-powered companion for postpartum recovery — offering emotional support, exercise coaching, and a caring community for new mothers.

## Features

| Module | Description |
|--------|-------------|
| **Soul Companion** | AI chat companion providing emotional support with conversation memory and web search for fact-checked responses |
| **Sisterhood Bond** | Community connecting mothers with verified healthcare professionals and fellow moms |
| **Recovery Coach** | Real-time pose detection with voice-guided postpartum exercises and progress tracking |
| **Guardian Partner** | Gamified system engaging partners in the recovery journey with tasks and level progression |

[View detailed feature documentation](docs/features.md)

## Quick Start

```bash
# Clone and setup
git clone https://github.com/koishi510/MomShell.git
cd MomShell
./scripts/dev-setup.sh

# Start (in separate terminals)
make dev-backend
make dev-frontend

# Access at http://localhost:3000
```

[Full getting started guide](docs/getting-started.md)

## Docker Deployment

```bash
cp .env.example .env
# Edit .env, set MODELSCOPE_KEY

cd deploy
docker compose up -d --build
# Access at http://localhost:7860
```

[Full deployment guide](docs/deployment.md)

## Documentation

| Document | Description |
|----------|-------------|
| [Features](docs/features.md) | Detailed feature descriptions |
| [Getting Started](docs/getting-started.md) | Installation and setup |
| [Development](docs/development.md) | Development environment |
| [Deployment](docs/deployment.md) | Docker deployment |
| [Configuration](docs/configuration.md) | Environment variables |
| [Architecture](docs/architecture.md) | Technical overview |
| [Contributing](CONTRIBUTING.md) | Contribution guidelines |
| [Changelog](CHANGELOG.md) | Version history |
| [Code of Conduct](CODE_OF_CONDUCT.md) | Community guidelines |
| [Security](SECURITY.md) | Security policy |

## License

This project is licensed under the AGPL-3.0 License - see the [LICENSE](LICENSE) file for details.

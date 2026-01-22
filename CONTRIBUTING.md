# 开发环境配置与协作指南

本文档旨在规范项目成员的开发环境配置流程与日常协作标准。为了确保跨平台环境的一致性及代码质量，所有成员在开始开发前必须严格按照以下步骤完成环境搭建。

## 1. 系统预置要求

在获取项目代码前，请确保您的操作系统已安装以下基础工具。

### 1.1 安装 uv 包管理器

本项目使用 uv 进行 Python 版本管理与依赖锁定。请根据您的操作系统执行相应命令。

- **Linux / macOS**:
  ```bash
  curl -LsSf https://astral.sh/uv/install.sh | sh
  ```
- **Windows (PowerShell)**:
  ```powershell
  powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
  ```

**注意**：安装完成后，请重启终端或命令行窗口，并运行 `uv --version` 验证安装是否成功。

### 1.2 安装 Git LFS

本项目启用 Git LFS (Large File Storage) 以管理模型权重及二进制数据文件。

- **Linux**: 执行 `sudo apt install git-lfs` (以 Ubuntu 为例)
- **macOS**: 执行 `brew install git-lfs`
- **Windows**: 通常 Git for Windows 已预装。如未安装，请前往官网下载。

安装后，请在终端执行一次全局初始化命令：

```bash
git lfs install
```

## 2. 项目初始化流程

克隆项目代码仓库后，请在项目根目录下按顺序执行以下指令以完成环境构建。

### 2.1 同步开发环境

执行以下命令，uv 将自动下载项目指定的 Python 3.11.5 版本，创建虚拟环境，并根据 `uv.lock` 安装精确版本的依赖库。

```bash
uv sync
```

### 2.2 部署 Git 钩子 (Pre-commit)

本项目配置了自动化代码检查机制。执行以下命令安装 Git 钩子，确保在提交代码时自动进行格式化与质量检查。

```bash
uv run pre-commit install
```

## 3. 集成开发环境 (IDE) 配置

建议使用 VS Code 进行开发，并进行如下配置以确保解释器与工具链正常工作。

1.  **选择 Python 解释器**:
    - 打开命令面板 (Windows: `Ctrl+Shift+P`, macOS: `Cmd+Shift+P`)。
    - 输入并选择 `Python: Select Interpreter`。
    - 选择路径中包含 `.venv` 的选项 (通常标记为 Recommended)。

2.  **安装推荐插件**:
    - **Python** (Microsoft)
    - **Ruff** (Astral Software): 用于代码格式化与静态检查。
    - **Mypy** (Microsoft): 用于静态类型检查。

## 4. 日常开发工作流

为维护代码库的整洁与稳定，请在开发过程中遵循以下操作规范。

### 4.1 每日同步

在开始编写代码前，请务必更新本地的开发分支。建议使用 `rebase` 模式拉取远程代码，以保持提交历史的线性整洁：

```bash
# 切换到 dev 分支并拉取最新代码
git checkout dev
git pull --rebase origin dev
uv sync
```

### 4.2 运行项目

请使用 `uv run` 指令启动应用，以确保程序运行在隔离的虚拟环境中。具体启动命令取决于最终选用的框架或入口文件：

- **运行通用 Python 脚本**:
  ```bash
  uv run python app/main.py
  ```
- **运行框架专用指令**:
  若使用了特定框架，请按照以下格式执行：
  ```bash
  uv run [框架命令] [入口文件路径]
  ```

### 4.3 依赖管理

禁止直接使用 pip 安装依赖。请使用以下标准指令管理包，以保证 `pyproject.toml` 与 `uv.lock` 的同步更新。

- **添加生产依赖** (如 numpy, pandas):
  ```bash
  uv add numpy
  ```
- **添加开发依赖** (如测试工具):
  ```bash
  uv add --dev pytest
  ```

### 4.4 代码质量自查

在提交代码前，建议在本地手动运行以下检查指令：

- **代码格式化**:
  ```bash
  uv run ruff format .
  ```
- **静态代码分析 (Lint)**:
  ```bash
  uv run ruff check . --fix
  ```
- **单元测试 (可选)**:
  ```bash
  uv run pytest
  ```

## 5. 协作规范与注意事项

### 5.1 依赖与锁文件管理

- **uv.lock**: 该文件由工具自动生成，**严禁手动修改**。该文件必须提交至版本控制系统，以保证团队环境的一致性。
- **冲突解决**: 若在 `git pull` 后出现 `uv.lock` 冲突，禁止手动合并文本，请直接执行 `uv lock` 命令重新生成锁定文件，并提交变更。

### 5.2 大文件处理

- 提交非文本的大型文件 (如 .pt, .parquet, .db) 前，请确认其后缀已包含在 `.gitattributes` 配置中，以确保通过 LFS 存储。

### 5.3 代码规范体系

本项目采用自动化工具链强制执行统一的代码标准，所有提交均需通过 CI 校验：

1.  **格式规范**: 遵循 PEP 8 与 Black 标准（**双引号**、**88 字符行宽**、**4 空格缩进**），由 `ruff format` 自动处理。
2.  **导入规范**: Import 语句须按“标准库 > 第三方库 > 本地模块”的分组顺序排列，严禁保留未使用的引用。
3.  **质量管控**: 代码须通过 Linter 静态分析，杜绝未使用的变量、高风险语法及过时的 Python 特性。
4.  **类型安全**: 必须编写类型提示 (Type Hints)，并通过 Mypy 静态类型检查以确保逻辑稳健。

### 5.4 提交信息规范 (Commit Convention)

为配合 CI/CD 自动化流程及节省构建资源，所有 Commit Message 必须遵循 Conventional Commits 规范。格式为 `type: description`。

| 类型 (Type)  | 说明                      | CI 行为          |
| :----------- | :------------------------ | :--------------- |
| **feat**     | 新增功能                  | 触发构建与测试   |
| **fix**      | 修复 Bug                  | 触发构建与测试   |
| **refactor** | 代码重构 (无逻辑变更)     | 触发构建与测试   |
| **docs**     | 仅修改文档 (README, 注释) | **跳过 CI 构建** |
| **chore**    | 构建配置或工具变动        | **跳过 CI 构建** |

### 5.5 分支管理与 Pull Request 流程

本项目采用 **双主分支策略** (`main` 为生产分支，`dev` 为开发集成分支)。

1.  **分支结构与命名**:
    - **dev**: 日常开发的主干分支，所有新功能分支应基于此分支创建。
    - **main**: 仅用于发布生产版本，严禁直接推送。
    - **Feature 分支**: 命名为 `feat/功能名称` 或 `fix/问题描述`。

2.  **同步与变基 (Rebase)**:
    - 为保持提交历史的线性, **不要在Feature分支上使用Merge合并dev代码**。
    - 在提交 Pull Request 前，必须将本地 Feature 分支变基 (Rebase) 到最新的 `dev` 分支：
      ```bash
      git fetch origin
      git rebase origin/dev
      ```
    - 如遇冲突，请在本地解决冲突后继续变基过程。

3.  **提交流程**:
    - 确保本地 `uv run pytest` 全部通过。
    - 推送分支至远程仓库（如使用了 rebase，可能需要 `git push --force-with-lease`）。
    - 创建 Pull Request，**目标分支必须选择 `dev`**。

4.  **合并标准**:
    - **CI 检查**: 所有自动化测试与 Linter 检查必须通过。
    - **代码评审**: 必须获得至少一位管理员的批准 (Approve) 方可合并。

## 6. 常见问题排查

- **Q: 找不到 uv 命令？**
  - A: 请检查是否配置了环境变量或未重启终端。Windows 用户请尝试以管理员身份运行 PowerShell。
- **Q: VS Code 代码提示报错？**
  - A: 请确认 IDE 右下角的 Python 解释器已选择 `.venv` 目录下的虚拟环境，而非系统全局 Python。
- **Q: 提交代码被 Git 拒绝？**
  - A: 请仔细阅读终端报错信息。通常是因为未通过 Pre-commit 检查（如格式错误或遗留了调试代码）。Ruff 通常会自动修复格式问题，您只需再次执行 `git add` 并 `git commit` 即可。

```

```

# 贡献指南

感谢您为 MomShell 做出贡献！

## 开始

- [快速开始](getting-started.md) — 前置要求和安装
- [开发指南](development.md) — 工作流程和命令

## 代码质量

提交前，请在本地运行检查：

```bash
make check    # lint + 类型检查（Go + Vue）
make format   # go fmt
```

如果已安装，Pre-commit 钩子会自动运行：

```bash
pre-commit install
```

### 钩子检查内容

- **Go**：`gofmt`、`go vet`、`go build`
- **Vue**：ESLint、`vue-tsc`
- **通用**：尾部空白、YAML 有效性、合并冲突、大文件

## 代码规范

**后端（Go）**：
- `gofmt` 格式化
- `go vet` 通过
- 遵循标准 Go 项目布局

**前端（Vue/TypeScript）**：
- ESLint，使用 `eslint-plugin-vue` + `typescript-eslint`
- `vue-tsc` 类型检查通过

## 依赖管理

**后端**：

```bash
cd backend
go get github.com/some/package
go mod tidy
```

**前端**：

```bash
cd frontend
npm install some-package
```

锁文件（`go.sum`、`package-lock.json`）必须一起提交。

## 提交约定

所有提交遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：`type: description`

| 类型 | 说明 |
|------|------|
| `feat` | 新功能 |
| `fix` | Bug 修复 |
| `refactor` | 代码重构 |
| `chore` | 构建、配置、工具 |
| `docs` | 文档 |
| `ci` | CI/CD 变更 |
| `test` | 测试 |

## 分支 & PR 工作流

1. 从 `main` 创建功能分支：`feat/feature-name` 或 `fix/issue-name`
2. 进行修改，使用约定格式提交
3. 推送并创建指向 `main` 的 PR
4. 确保 CI 通过并请求审核

## 敏感文件

**绝对不要提交**：`.env`、`*.pem`、`*.key`、`credentials.json`

## 故障排除

**Pre-commit 钩子失败？**
运行 `make check` 查看哪个检查失败，修复后再提交。

**前端构建失败？**
删除 `node_modules` 并运行 `npm install`。

**端口被占用？**
```bash
lsof -i :8000
kill -9 <PID>
```

---

[返回文档索引](README.md) | [返回主 README](../../README.md)

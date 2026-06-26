# Custom Awesome Stars (Mawesome 安全平替版)

[![Automated Release](https://github.com/ZSCGR/awesome/actions/workflows/release.yml/badge.svg)](https://github.com/ZSCGR/awesome/actions/workflows/release.yml)
[![GitHub release](https://github.com/ZSCGR/awesome/releases/latest)](https://github.com/ZSCGR/awesome/releases)

这是一个安全、自主可控且自托管的 GitHub Action，用于自动将你账户中所有 Star 的仓库整理并生成 Awesome 列表。

### ⚠️ 背景与致敬
本仓库是针对原开源仓库 [simonecorsi/mawesome](https://github.com/simonecorsi/mawesome) 的安全复刻（Fork / Rewrite）。由于原仓库在 2026 年 6 月遭遇了严重的供应链投毒攻击，其发布的版本 Tag 被恶意篡改植入了窃取 Secret 的代码，导致该仓库已被 GitHub 官方下架封禁。

为了能够继续安全地整理 GitHub Stars，本仓库进行了以下彻底的安全重构：
1. **零外部 Action 依赖**：在打包发布流程中移除了所有非 GitHub 官方或第三方的发布 Action，使用纯原生 Bash 脚本和 GitHub 官方 CLI (`gh`) 执行版本号自动递增和 Release 自动发布。
2. **现代官方 SDK**：数据拉取弃用非官方库，采用 GitHub 官方维护的最新版 `@octokit/rest` 进行安全的分页拉取。
3. **完全开源可审计**：源码无任何代码混淆或未经审核的包，所有核心逻辑均采用 TypeScript 编写，打包过程在本地与云端完全一致且完全透明。

---

### 🚀 功能特点
- 自动拉取你 Star 的所有仓库。
- 支持按**编程语言**分类生成 awesome 列表（例如 `README.md`）。
- 可选支持按**仓库标签 (Topics)** 分类生成单独的列表（如 `topics.md`）。
- 自动生成分类后的 `data.json` 原始数据文件，方便前端或其他程序调用。
- **自包含打包**：利用 `@vercel/ncc` 将 TypeScript 代码与内置 EJS 模版打包为单个 `dist/index.js` 文件，免去运行时实时下载模板的依赖，速度极快且完全沙盒化。

---

### 🛠️ 使用方法

在你的个人 Star 整理仓库中，创建 `.github/workflows/awesome-stars.yml` 配置文件：

```yaml
name: Generate Awesome Stars List

on:
  schedule:
    - cron: '0 0 * * *' # 每天凌晨自动运行一次
  workflow_dispatch: # 支持手动点击运行

permissions:
  contents: write

jobs:
  awesome:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Organize Stars
        uses: ZSCGR/awesome@v1
        with:
          api-token: ${{ secrets.GH_TOKEN }} # 拥有读取 starred 和写入 contents 权限的 PAT
          output-filename: 'README.md'
          compact-by-topic: 'true' # 是否同步生成按标签分类的 topics.md
```

#### 输入参数 (Inputs)
| 参数名 | 描述 | 是否必填 | 默认值 |
| :--- | :--- | :--- | :--- |
| `api-token` | 你的 GitHub 个人访问令牌 (PAT) | 是 | - |
| `output-filename` | 按语言分类星表输出的 Markdown 文件名 | 否 | `README.md` |
| `compact-by-topic` | 是否生成按标签分类的 `topics.md` 文件 | 否 | `false` |
| `template-path` | 自定义 EJS 模板的路径（如果不填则使用内置默认模板） | 否 | - |

---

### 📦 开发与本地测试

#### 本地调试
你可以在本地直接模拟运行该 Action，验证生成结果是否正确：
1. 安装 Node 24 及其依赖：
   ```bash
   npm install
   ```
2. 导出你的 GitHub Token：
   ```fish
   # Fish shell 终端执行：
   set -Ux GITHUB_TOKEN "你的_GitHub_PAT_Token"
   ```
3. 运行本地测试：
   ```bash
   npm run test
   ```
   测试运行会在本地生成 `README-test.md` 和 `data.json` 等文件用于预览，且**被测试脚本安全拦截，不会自动执行 Git 远程推送**，保证环境安全。

#### 本地打包
如果修改了 `src/` 中的任何 TypeScript 代码，在提交前必须重新执行打包：
```bash
npm run build
```
编译产物会输出到 `dist/index.js`，该文件需要同源码一起提交到 Git 仓库。

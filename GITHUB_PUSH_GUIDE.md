# 推送 VortexRAG 到 GitHub 指南

## 步骤 1：在 GitHub 上创建新仓库

1. 访问 https://github.com/new
2. 填写仓库信息：
   - **Repository name:** `VortexRAG`
   - **Description:** `Advanced RAG Framework - Forked from UltraRAG`
   - **Visibility:** Public 或 Private（根据需要）
   - **⚠️ 不要勾选** "Initialize this repository with a README"
   - **⚠️ 不要** 添加 .gitignore 或 license（我们已经有了）

3. 点击 "Create repository"

---

## 步骤 2：准备本地仓库

### 2.1 确认当前状态
```bash
cd /Users/aluka/Desktop/Vortex/VortexRAG
git status
git log --oneline -5
```

### 2.2 清理敏感文件（如果有）
```bash
# 检查是否有敏感信息
git log --all --full-history -- "*password*" "*secret*" "*key*" "*.env"

# 如果发现敏感文件，使用 git filter-branch 或 BFG Repo-Cleaner 清理
```

### 2.3 确认 .gitignore 正确
```bash
cat .gitignore
```

确保包含：
- `.claude/`
- `__pycache__/`
- `node_modules/`
- `.env`
- `output/`
- `logs/`

---

## 步骤 3：连接到 GitHub 仓库

### 3.1 移除旧的远程仓库（如果有）
```bash
git remote -v
git remote remove origin  # 如果存在旧的 origin
```

### 3.2 添加新的 GitHub 远程仓库
```bash
# 替换 YOUR_USERNAME 为你的 GitHub 用户名
git remote add origin https://github.com/YOUR_USERNAME/VortexRAG.git

# 或者使用 SSH（推荐）
git remote add origin git@github.com:YOUR_USERNAME/VortexRAG.git
```

### 3.3 验证远程仓库
```bash
git remote -v
```

应该看到：
```
origin  https://github.com/YOUR_USERNAME/VortexRAG.git (fetch)
origin  https://github.com/YOUR_USERNAME/VortexRAG.git (push)
```

---

## 步骤 4：推送到 GitHub

### 4.1 推送主分支
```bash
# 推送 main 分支
git push -u origin main
```

### 4.2 如果遇到错误

**错误 1：认证失败**
```bash
# 使用 GitHub Personal Access Token
# 1. 访问 https://github.com/settings/tokens
# 2. 生成新 token（勾选 repo 权限）
# 3. 使用 token 作为密码
```

**错误 2：分支名称不匹配**
```bash
# 如果远程是 master，本地是 main
git branch -M main
git push -u origin main
```

**错误 3：远程仓库不为空**
```bash
# 如果不小心初始化了 README
git pull origin main --allow-unrelated-histories
git push -u origin main
```

---

## 步骤 5：验证推送成功

1. 访问你的 GitHub 仓库页面
2. 确认文件已上传
3. 检查 README.md 显示正确
4. 确认 .claude/ 目录**没有**被推送

---

## 步骤 6：配置仓库设置（可选）

### 6.1 添加 Topics
在 GitHub 仓库页面，点击 "Add topics"，添加：
- `rag`
- `retrieval-augmented-generation`
- `llm`
- `vue`
- `python`
- `mcp`

### 6.2 设置 About
- Description: `Advanced RAG Framework - Forked from UltraRAG`
- Website: 你的项目网站（如果有）

### 6.3 启用 Issues 和 Discussions（可选）
在 Settings → Features 中启用

---

## 完整命令序列（快速参考）

```bash
# 1. 确认当前状态
cd /Users/aluka/Desktop/Vortex/VortexRAG
git status

# 2. 移除旧远程（如果有）
git remote remove origin

# 3. 添加新远程（替换 YOUR_USERNAME）
git remote add origin https://github.com/YOUR_USERNAME/VortexRAG.git

# 4. 推送
git push -u origin main

# 5. 验证
git remote -v
```

---

## 注意事项

### ✅ 已包含在仓库中
- 源代码（`src/vortexrag/`）
- 前端代码（`ui/frontend/src/`）
- 前端构建产物（`ui/frontend/dist/`）
- 服务器代码（`servers/`）
- 示例配置（`examples/`）
- 文档（`README.md`, `REBRANDING_SUMMARY.md`）

### ❌ 已排除（通过 .gitignore）
- `.claude/` 目录
- `__pycache__/` 和 `*.pyc`
- `node_modules/`
- `output/` 和 `logs/`
- `.env` 文件
- 临时文件

### ⚠️ 需要手动检查
- 确保没有 API keys 或密码
- 确保没有个人数据
- 确保 `data/` 目录中没有敏感信息

---

## 克隆和使用（给其他人）

其他人可以这样使用你的仓库：

```bash
# 克隆
git clone https://github.com/YOUR_USERNAME/VortexRAG.git
cd VortexRAG

# 安装
pip install -e .

# 启动
vortexrag show ui --admin
```

---

## 后续维护

### 推送新的更改
```bash
git add .
git commit -m "your commit message"
git push
```

### 拉取更新
```bash
git pull
```

### 创建新分支
```bash
git checkout -b feature/new-feature
git push -u origin feature/new-feature
```

---

## 故障排除

### 问题 1：推送太慢
```bash
# 使用 SSH 而不是 HTTPS
git remote set-url origin git@github.com:YOUR_USERNAME/VortexRAG.git
```

### 问题 2：文件太大
```bash
# 检查大文件
find . -type f -size +50M

# 如果有大文件，添加到 .gitignore
echo "large_file.bin" >> .gitignore
git rm --cached large_file.bin
git commit -m "Remove large file"
```

### 问题 3：历史记录太大
```bash
# 查看仓库大小
du -sh .git

# 如果需要，可以清理历史
git gc --aggressive --prune=now
```

---

**准备好后，执行上述命令即可推送到 GitHub！** 🚀

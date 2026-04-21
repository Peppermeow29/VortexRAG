# 🚀 VortexRAG 快速开始

## 5 分钟上手指南

### 1. 安装 (2 分钟)

```bash
# 克隆仓库
git clone https://github.com/Peppermeow29/VortexRAG.git
cd VortexRAG

# 安装
pip install -e .
```

### 2. 配置 LLM (1 分钟)

**选项 A：使用 Ollama（推荐）**
```bash
# 安装 Ollama
brew install ollama  # macOS

# 拉取模型
ollama pull llama3.1

# 编辑配置
# examples/parameter/RAG_parameter.yaml
# model_name: llama3.1
# base_url: http://localhost:11434/v1
```

**选项 B：使用 OpenAI**
```yaml
# 编辑 examples/parameter/RAG_parameter.yaml
generation:
  backend_configs:
    openai:
      model_name: gpt-4o-mini
      api_key: sk-your-key
```

### 3. 启动 (1 分钟)

```bash
vortexrag show ui --admin
```

访问：http://localhost:5050

### 4. 使用 (1 分钟)

1. 点击 **Chat** 标签
2. 选择 **RAG** pipeline
3. 点击 **Start Engine**
4. 输入问题并发送

---

## 常见问题

**Q: 命令未找到？**
```bash
pip install -e .
```

**Q: 前端未构建？**
```bash
cd ui/frontend && npm install && npm run build
```

**Q: Ollama 连接失败？**
```bash
ollama serve
```

---

**详细文档：** [INSTALLATION.md](INSTALLATION.md)

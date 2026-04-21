# VortexRAG 完整安装和配置指南

## 📋 系统要求

### 必需
- **Python:** 3.11 或 3.12
- **操作系统:** macOS, Linux, 或 Windows (WSL2)
- **内存:** 至少 8GB RAM
- **磁盘空间:** 至少 10GB

### 可选（用于本地模型）
- **GPU:** NVIDIA GPU with CUDA (Linux) 或 Apple Silicon (macOS)
- **Ollama:** 用于本地模型部署

---

## 🚀 快速安装

### 步骤 1：克隆仓库

```bash
git clone https://github.com/Peppermeow29/VortexRAG.git
cd VortexRAG
```

### 步骤 2：创建虚拟环境（推荐）

```bash
# 使用 venv
python3 -m venv venv
source venv/bin/activate  # macOS/Linux
# 或
venv\Scripts\activate  # Windows

# 或使用 conda
conda create -n vortexrag python=3.11
conda activate vortexrag
```

### 步骤 3：安装 VortexRAG

```bash
# 安装核心包
pip install -e .

# 验证安装
vortexrag --help
```

**预期输出：**
```
usage: vortexrag [-h] {build,run,show,validate} ...

VortexRAG CLI

positional arguments:
  {build,run,show,validate}
    build               Build a pipeline
    run                 Run a pipeline
    show                Show UI interface
    validate            Validate configuration
```

---

## 🎨 启动 Web UI

### 方法 1：生产模式（推荐）

```bash
# 启动 Web UI（管理员模式）
vortexrag show ui --admin

# 或者只启动聊天模式
vortexrag show ui
```

访问：**http://localhost:5050**

### 方法 2：开发模式

```bash
# Terminal 1: 启动后端
cd ui/backend
python app.py

# Terminal 2: 启动前端开发服务器
cd ui/frontend
npm install  # 首次运行
npm run dev
```

访问：**http://localhost:5173** (开发) 或 **http://localhost:5050** (生产)

---

## ⚙️ 配置 LLM 后端

### 选项 1：使用 OpenAI API

编辑 `examples/parameter/RAG_parameter.yaml`:

```yaml
generation:
  backend: openai
  backend_configs:
    openai:
      model_name: gpt-4o-mini  # 或 gpt-4
      base_url: https://api.openai.com/v1
      api_key: sk-your-api-key-here
      timeout: 600.0
      concurrency: 8
      retries: 3
  sampling_params:
    max_tokens: 2048
    temperature: 0.7
    top_p: 0.95
```

### 选项 2：使用 Ollama（本地模型）

**安装 Ollama：**
```bash
# macOS
brew install ollama

# Linux
curl -fsSL https://ollama.com/install.sh | sh

# 启动 Ollama
ollama serve
```

**拉取模型：**
```bash
# 拉取 Llama 3.1
ollama pull llama3.1

# 或其他模型
ollama pull qwen2.5
ollama pull mistral
```

**配置 VortexRAG：**
```yaml
generation:
  backend: openai
  backend_configs:
    openai:
      model_name: llama3.1  # 你拉取的模型名称
      base_url: http://localhost:11434/v1
      api_key: ollama  # 任意值
      timeout: 600.0
  sampling_params:
    max_tokens: 2048
    temperature: 0.7
```

### 选项 3：使用兼容 OpenAI 的 API

支持任何 OpenAI 兼容的 API：

```yaml
generation:
  backend: openai
  backend_configs:
    openai:
      model_name: your-model-name
      base_url: https://your-api-endpoint.com/v1
      api_key: your-api-key
      timeout: 600.0
```

**支持的服务：**
- Moonshot AI (Kimi)
- DeepSeek
- 智谱 AI (GLM)
- 阿里云百炼
- 腾讯混元
- 任何 vLLM 部署

---

## 📚 配置向量检索

### 使用 Sentence Transformers（本地）

```yaml
retriever:
  backend: sentence_transformers
  backend_configs:
    sentence_transformers:
      model_name_or_path: BAAI/bge-small-en-v1.5  # 英文
      # 或
      model_name_or_path: BAAI/bge-small-zh-v1.5  # 中文
      device: cpu  # 或 cuda, mps
  top_k: 5
```

**常用嵌入模型：**
- `BAAI/bge-small-en-v1.5` - 英文，小型
- `BAAI/bge-base-en-v1.5` - 英文，中型
- `BAAI/bge-large-en-v1.5` - 英文，大型
- `BAAI/bge-small-zh-v1.5` - 中文，小型
- `sentence-transformers/all-MiniLM-L6-v2` - 多语言，快速

### 使用 OpenAI Embeddings

```yaml
retriever:
  backend: openai
  backend_configs:
    openai:
      model_name: text-embedding-3-small
      api_key: sk-your-api-key
      base_url: https://api.openai.com/v1
```

---

## 🗄️ 配置向量数据库

### 使用 Milvus（推荐）

**安装 Milvus Lite：**
```bash
pip install pymilvus
```

**配置：**
```yaml
retriever:
  backend_configs:
    milvus:
      uri: "./milvus_demo.db"  # 本地文件
      # 或远程 Milvus
      # uri: "http://localhost:19530"
      collection_name: my_collection
```

### 使用 FAISS（简单）

```yaml
retriever:
  backend_configs:
    faiss:
      index_path: ./index/faiss
      index_type: IVF  # 或 Flat, HNSW
```

---

## 🎯 运行第一个 Pipeline

### 1. 准备数据

创建 `my_data.jsonl`:
```json
{"id": 0, "question": "什么是 RAG？", "golden_answers": [], "meta_data": {}}
```

### 2. 配置参数

复制并编辑配置文件：
```bash
cp examples/parameter/RAG_parameter.yaml my_config.yaml
```

编辑 `my_config.yaml`，设置你的 API key 和模型。

### 3. 运行 Pipeline

```bash
vortexrag run examples/RAG.yaml my_config.yaml
```

**预期输出：**
```
[INFO] Loading pipeline: examples/RAG.yaml
[INFO] Loading parameters: my_config.yaml
[INFO] Initializing retriever...
[INFO] Initializing generation...
[INFO] Running pipeline...
[INFO] Question: 什么是 RAG？
[INFO] Answer: RAG（Retrieval-Augmented Generation）是...
```

---

## 📖 使用 Web UI

### 1. 上传文档

1. 启动 UI：`vortexrag show ui --admin`
2. 访问 **Knowledge Base** 标签
3. 点击 **Upload Documents**
4. 选择文件（PDF, DOCX, TXT, MD）
5. 点击 **Import**

### 2. 配置 Pipeline

1. 访问 **Builder** 标签
2. 选择一个 pipeline（如 RAG）
3. 点击 **Parameters** 配置模型
4. 保存配置

### 3. 开始聊天

1. 访问 **Chat** 标签
2. 选择 pipeline
3. 点击 **Start Engine**
4. 输入问题并发送

### 4. 后台任务

1. 启用 **Background Mode**
2. 提交长时间运行的查询
3. 在 **Recent Sessions** 查看结果

---

## 🔧 高级配置

### 环境变量

创建 `.env` 文件：
```bash
# LLM API
OPENAI_API_KEY=sk-your-key
OPENAI_BASE_URL=https://api.openai.com/v1

# 会话超时（秒）
VORTEXRAG_SESSION_TIMEOUT=86400
VORTEXRAG_BG_SESSION_TIMEOUT=172800

# 日志级别
LOG_LEVEL=info
```

### 自定义 Prompt

编辑 `prompt/qa_rag_boxed.jinja`:
```jinja
你是一个专业的问答助手。

已知信息：
{% for passage in passages_ls[0] %}
{{ passage }}
{% endfor %}

问题：{{ q_ls[0] }}

请基于已知信息回答问题。
```

### 自定义 Pipeline

创建 `my_pipeline.yaml`:
```yaml
servers:
  generation: servers/generation
  retriever: servers/retriever
  prompt: servers/prompt

pipeline:
  - retriever.retriever_init
  - generation.generation_init
  
  - retriever.retriever_batch_search:
      input:
        batch_query_list: q_ls
      output:
        batch_search_results: passages_ls
  
  - prompt.qa_rag_boxed:
      input:
        q_ls: q_ls
        passages_ls: passages_ls
      output:
        prompt_ls: prompt_ls
  
  - generation.generate:
      input:
        prompt_ls: prompt_ls
      output:
        ans_ls: ans_ls
```

---

## 🐛 故障排除

### 问题 1：`vortexrag: command not found`

**解决：**
```bash
# 重新安装
pip install -e .

# 或使用完整路径
python -m vortexrag.client show ui --admin
```

### 问题 2：前端未构建

**错误：**
```
RuntimeError: Frontend dist not found. Build required.
```

**解决：**
```bash
cd ui/frontend
npm install
npm run build
cd ../..
vortexrag show ui --admin
```

### 问题 3：模型超时

**错误：**
```
openai.APITimeoutError: Request timed out.
```

**解决：**
在配置文件中增加超时：
```yaml
generation:
  backend_configs:
    openai:
      timeout: 900.0  # 15 分钟
```

### 问题 4：Ollama 连接失败

**错误：**
```
Connection refused: http://localhost:11434
```

**解决：**
```bash
# 启动 Ollama
ollama serve

# 验证
curl http://localhost:11434/api/tags
```

### 问题 5：内存不足

**错误：**
```
CUDA out of memory
```

**解决：**
```yaml
# 使用更小的模型
model_name: llama3.1:8b  # 而不是 70b

# 或减少批处理大小
batch_size: 1
```

---

## 📊 性能优化

### 1. 使用 GPU 加速

```yaml
retriever:
  backend_configs:
    sentence_transformers:
      device: cuda  # 或 mps (Apple Silicon)
```

### 2. 启用批处理

```yaml
generation:
  backend_configs:
    openai:
      concurrency: 8  # 并发请求数
```

### 3. 缓存嵌入

```yaml
retriever:
  backend_configs:
    sentence_transformers:
      cache_folder: ./cache/embeddings
```

---

## 🔐 安全建议

1. **不要提交 API Keys**
   - 使用 `.env` 文件
   - 添加到 `.gitignore`

2. **使用环境变量**
   ```bash
   export OPENAI_API_KEY=sk-your-key
   ```

3. **限制访问**
   ```bash
   # 只监听本地
   vortexrag show ui --host 127.0.0.1
   ```

---

## 📚 更多资源

- **示例 Pipelines:** `examples/`
- **配置模板:** `examples/parameter/`
- **Prompt 模板:** `prompt/`
- **GitHub Issues:** https://github.com/Peppermeow29/VortexRAG/issues

---

## 🆘 获取帮助

遇到问题？

1. 查看 [故障排除](#-故障排除) 部分
2. 搜索 [GitHub Issues](https://github.com/Peppermeow29/VortexRAG/issues)
3. 提交新 Issue
4. 加入 [Discussions](https://github.com/Peppermeow29/VortexRAG/discussions)

---

**祝你使用 VortexRAG 愉快！** 🚀

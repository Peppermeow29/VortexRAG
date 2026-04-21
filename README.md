# VortexRAG

<p align="center">
  <img alt="VortexRAG" src="./docs/vortexrag.svg" width="55%">
</p>

<h3 align="center">
Advanced RAG Framework - Forked from UltraRAG
</h3>

---

## About VortexRAG

VortexRAG is an advanced Retrieval-Augmented Generation (RAG) framework, forked and enhanced from [OpenBMB/UltraRAG](https://github.com/OpenBMB/UltraRAG). This version includes custom improvements and optimizations for production use.

### Key Features

- 🚀 **Vue 3 Frontend** - Modern, responsive UI built with Vue 3 + Vite
- 🔧 **Unified Architecture** - Single frontend/backend structure
- 📦 **Background Tasks** - Asynchronous task processing with session management
- 🎯 **Pipeline Builder** - Visual pipeline configuration and management
- 📚 **Knowledge Base** - Advanced document ingestion and retrieval
- 🤖 **Multi-Model Support** - Compatible with OpenAI, Ollama, vLLM, and more

### What's New in VortexRAG

- ✅ Migrated to unified `ui/frontend` architecture
- ✅ Enhanced background task management with automatic session creation
- ✅ Improved timeout handling for slow models
- ✅ Better cancellation mechanisms for long-running tasks
- ✅ Configurable OpenAI client with extended timeouts

---

## Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/VortexRAG.git
cd VortexRAG

# Install dependencies
pip install -e .
```

### Launch UI

```bash
# Start the web interface (admin mode)
vortexrag show ui --admin
```

Visit: http://localhost:5050

### Development Mode

```bash
# Terminal 1: Start backend
cd ui/backend
python app.py

# Terminal 2: Start frontend dev server
cd ui/frontend
npm install
npm run dev
```

Visit: http://localhost:5173 (dev) or http://localhost:5050 (production)

---

## Architecture

```
VortexRAG/
├── ui/
│   ├── backend/              # Flask backend
│   │   ├── app.py           # Main application
│   │   └── pipeline_manager.py
│   └── frontend/            # Vue 3 frontend
│       ├── src/             # Source code
│       ├── dist/            # Build output
│       └── vite.config.js
├── src/vortexrag/           # Core library
│   ├── client.py            # CLI and client
│   └── server.py            # MCP server
├── servers/                 # MCP servers
│   ├── generation/          # LLM generation
│   ├── retriever/           # Vector retrieval
│   ├── prompt/              # Prompt templates
│   └── ...
├── examples/                # Example pipelines
└── docs/                    # Documentation
```

---

## Usage

### Running a Pipeline

```bash
# Run a RAG pipeline
vortexrag run examples/RAG.yaml examples/parameter/RAG_parameter.yaml

# Run with demo mode
vortexrag run examples/RAG.yaml examples/parameter/RAG_parameter.yaml --is_demo
```

### Building a Pipeline

```bash
# Build pipeline from configuration
vortexrag build examples/RAG.yaml
```

### Using the Web UI

1. **Start the UI:**
   ```bash
   vortexrag show ui --admin
   ```

2. **Create a Pipeline:**
   - Navigate to Builder tab
   - Configure your pipeline
   - Save and test

3. **Chat Interface:**
   - Select a pipeline
   - Start the engine
   - Ask questions

4. **Background Tasks:**
   - Enable background mode
   - Submit tasks
   - View results in recent sessions

---

## Configuration

### Model Configuration

Edit `examples/parameter/your_pipeline_parameter.yaml`:

```yaml
generation:
  backend_configs:
    openai:
      model_name: your-model-name
      base_url: http://localhost:11434/v1  # Ollama
      api_key: your-api-key
      timeout: 600.0  # 10 minutes
  backend: openai
```

### Supported Backends

- **OpenAI API** - GPT-4, GPT-3.5, etc.
- **Ollama** - Local model deployment
- **vLLM** - High-performance inference (Linux + NVIDIA GPU)
- **Hugging Face** - Transformers models

---

## Development

### Frontend Development

```bash
cd ui/frontend

# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

### Backend Development

```bash
cd ui/backend

# Run Flask app
python app.py

# The app will serve ui/frontend/dist/
```

### Adding New Features

1. Frontend: Edit files in `ui/frontend/src/`
2. Backend: Edit `ui/backend/app.py` or `pipeline_manager.py`
3. Core: Edit files in `src/vortexrag/`

---

## Troubleshooting

### Frontend not loading

```bash
cd ui/frontend
npm run build
```

### Model timeout errors

Increase timeout in your parameter file:
```yaml
generation:
  backend_configs:
    openai:
      timeout: 900.0  # 15 minutes
```

### npm cache issues (macOS)

```bash
sudo chown -R $(whoami) ~/.npm
```

---

## Credits

VortexRAG is based on [UltraRAG](https://github.com/OpenBMB/UltraRAG) by OpenBMB.

Original UltraRAG features:
- MCP-based architecture
- Pipeline configuration system
- Multi-modal support
- Evaluation framework

---

## License

This project inherits the license from UltraRAG. Please refer to the original repository for licensing details.

---

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

---

## Contact

For questions and support, please open an issue on GitHub.

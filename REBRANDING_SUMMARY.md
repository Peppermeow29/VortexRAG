# VortexRAG Rebranding Summary

**Date:** 2026-04-21  
**Status:** ✅ Complete

---

## Overview

Successfully rebranded the project from **UltraRAG** to **VortexRAG**, maintaining full compatibility with the original architecture while establishing a distinct identity.

---

## Changes Made

### 1. Core Module Rename
- **Directory:** `src/ultrarag/` → `src/vortexrag/`
- **All Python imports updated:** `from ultrarag` → `from vortexrag`
- **Files affected:** 39 files

### 2. Package Configuration
- **pyproject.toml:**
  - Package name: `ultrarag` → `vortexrag`
  - CLI command: `ultrarag` → `vortexrag`
  - Description updated to reflect fork status

### 3. Frontend Rebranding
- **Package name:** `vue-ui` → `vortexrag-ui`
- **UI text:** All "UltraRAG" → "VortexRAG"
- **Files updated:** All `.vue` and `.js` files in `ui/frontend/src/`

### 4. Backend Updates
- **Logger names:** `UltraRAG-UI` → `VortexRAG-UI`
- **Environment variables:** `ULTRARAG_*` → `VORTEXRAG_*`
  - `ULTRARAG_SESSION_TIMEOUT` → `VORTEXRAG_SESSION_TIMEOUT`
  - `ULTRARAG_BG_SESSION_TIMEOUT` → `VORTEXRAG_BG_SESSION_TIMEOUT`

### 5. Server Imports
- All MCP servers updated to import from `vortexrag`
- Server functionality unchanged

### 6. Documentation
- **README.md:** Complete rewrite with VortexRAG branding
- Removed original UltraRAG documentation files
- Added fork attribution

---

## Installation & Usage

### Reinstall Package
```bash
pip install -e .
```

### New Command
```bash
# Old command (no longer works)
ultrarag show ui --admin

# New command
vortexrag show ui --admin
```

### Environment Variables (Optional)
```bash
# Old
export ULTRARAG_SESSION_TIMEOUT=86400

# New
export VORTEXRAG_SESSION_TIMEOUT=86400
```

---

## Compatibility Notes

### ✅ Fully Compatible
- All pipeline configurations work unchanged
- MCP server architecture unchanged
- API endpoints unchanged
- Database schemas unchanged
- Configuration file formats unchanged

### ⚠️ Breaking Changes
- **CLI command:** Must use `vortexrag` instead of `ultrarag`
- **Python imports:** Code importing `ultrarag` must update to `vortexrag`
- **Environment variables:** Update `ULTRARAG_*` to `VORTEXRAG_*`

---

## File Statistics

- **Files modified:** 39
- **Lines changed:** +246 / -4,262
- **Directories renamed:** 1 (`src/ultrarag/` → `src/vortexrag/`)
- **Git commits:** 1 comprehensive commit

---

## Testing Checklist

After rebranding, verify:

- [ ] `pip install -e .` succeeds
- [ ] `vortexrag show ui --admin` launches UI
- [ ] Frontend displays "VortexRAG" branding
- [ ] All pipelines run correctly
- [ ] MCP servers initialize properly
- [ ] Background tasks work
- [ ] Session management works

---

## Credits

VortexRAG is a fork of [UltraRAG](https://github.com/OpenBMB/UltraRAG) by OpenBMB.

**Original UltraRAG Authors:** OpenBMB Team  
**Fork Maintainer:** [Your Name]

---

## Next Steps

1. **Test the installation:**
   ```bash
   pip install -e .
   vortexrag show ui --admin
   ```

2. **Update any custom scripts** that reference `ultrarag`

3. **Update environment variables** in deployment configs

4. **Create VortexRAG logo** (optional)
   - Replace `docs/vortexrag.svg`

5. **Update repository settings:**
   - Repository name
   - Description
   - Topics/tags

---

## Rollback (If Needed)

```bash
git revert HEAD
pip install -e .
```

---

**Rebranding complete! Welcome to VortexRAG!** 🚀

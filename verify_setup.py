#!/usr/bin/env python3
"""
VortexRAG 配置验证脚本
检查安装是否正确，配置是否有效
"""

import sys
import subprocess
from pathlib import Path

def check_python_version():
    """检查 Python 版本"""
    version = sys.version_info
    if version.major == 3 and version.minor >= 11:
        print(f"✅ Python 版本: {version.major}.{version.minor}.{version.micro}")
        return True
    else:
        print(f"❌ Python 版本过低: {version.major}.{version.minor}.{version.micro}")
        print("   需要 Python 3.11 或更高版本")
        return False

def check_vortexrag_installed():
    """检查 VortexRAG 是否安装"""
    try:
        result = subprocess.run(
            ["vortexrag", "--help"],
            capture_output=True,
            text=True,
            timeout=5
        )
        if result.returncode == 0:
            print("✅ VortexRAG CLI 已安装")
            return True
        else:
            print("❌ VortexRAG CLI 未正确安装")
            return False
    except FileNotFoundError:
        print("❌ VortexRAG CLI 未找到")
        print("   运行: pip install -e .")
        return False
    except Exception as e:
        print(f"❌ 检查失败: {e}")
        return False

def check_frontend_built():
    """检查前端是否已构建"""
    dist_path = Path("ui/frontend/dist")
    index_path = dist_path / "index.html"

    if dist_path.exists() and index_path.exists():
        print("✅ 前端已构建")
        return True
    else:
        print("⚠️  前端未构建")
        print("   运行: cd ui/frontend && npm install && npm run build")
        return False

def check_config_files():
    """检查配置文件"""
    config_files = [
        "examples/RAG.yaml",
        "examples/parameter/RAG_parameter.yaml",
        "pyproject.toml"
    ]

    all_exist = True
    for config in config_files:
        path = Path(config)
        if path.exists():
            print(f"✅ 配置文件存在: {config}")
        else:
            print(f"❌ 配置文件缺失: {config}")
            all_exist = False

    return all_exist

def check_dependencies():
    """检查关键依赖"""
    dependencies = [
        "flask",
        "fastmcp",
        "openai",
        "pyyaml",
        "rich"
    ]

    all_installed = True
    for dep in dependencies:
        try:
            __import__(dep)
            print(f"✅ 依赖已安装: {dep}")
        except ImportError:
            print(f"❌ 依赖缺失: {dep}")
            all_installed = False

    return all_installed

def check_example_data():
    """检查示例数据"""
    data_files = [
        "data/sample_nq_10.jsonl",
        "data/corpus_example.jsonl"
    ]

    for data_file in data_files:
        path = Path(data_file)
        if path.exists():
            print(f"✅ 示例数据存在: {data_file}")
        else:
            print(f"⚠️  示例数据缺失: {data_file}")

def main():
    """主函数"""
    print("=" * 60)
    print("VortexRAG 配置验证")
    print("=" * 60)
    print()

    checks = [
        ("Python 版本", check_python_version),
        ("VortexRAG 安装", check_vortexrag_installed),
        ("前端构建", check_frontend_built),
        ("配置文件", check_config_files),
        ("Python 依赖", check_dependencies),
    ]

    results = []
    for name, check_func in checks:
        print(f"\n检查: {name}")
        print("-" * 60)
        result = check_func()
        results.append(result)

    print("\n" + "=" * 60)
    print("额外检查")
    print("=" * 60)
    check_example_data()

    print("\n" + "=" * 60)
    print("验证结果")
    print("=" * 60)

    passed = sum(results)
    total = len(results)

    if passed == total:
        print(f"\n✅ 所有检查通过 ({passed}/{total})")
        print("\n可以开始使用 VortexRAG:")
        print("  vortexrag show ui --admin")
        return 0
    else:
        print(f"\n⚠️  部分检查未通过 ({passed}/{total})")
        print("\n请根据上述提示修复问题")
        print("详细安装指南: INSTALLATION.md")
        return 1

if __name__ == "__main__":
    sys.exit(main())

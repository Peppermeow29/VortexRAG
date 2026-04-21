#!/bin/bash

# VortexRAG GitHub 推送脚本
# 使用方法：./push_to_github.sh YOUR_GITHUB_USERNAME

set -e  # 遇到错误立即退出

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 VortexRAG GitHub 推送脚本${NC}"
echo ""

# 检查参数
if [ -z "$1" ]; then
    echo -e "${RED}❌ 错误：请提供 GitHub 用户名${NC}"
    echo "使用方法：./push_to_github.sh YOUR_GITHUB_USERNAME"
    exit 1
fi

GITHUB_USERNAME=$1
REPO_NAME="VortexRAG"

echo -e "${YELLOW}📋 配置信息：${NC}"
echo "  GitHub 用户名: $GITHUB_USERNAME"
echo "  仓库名称: $REPO_NAME"
echo "  远程 URL: https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo ""

# 确认
read -p "确认推送到上述仓库？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}❌ 已取消${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ 开始推送...${NC}"
echo ""

# 步骤 1：检查 git 状态
echo -e "${YELLOW}[1/5] 检查 git 状态...${NC}"
git status

# 步骤 2：移除旧的 origin（如果存在）
echo ""
echo -e "${YELLOW}[2/5] 移除旧的远程仓库...${NC}"
if git remote | grep -q "^origin$"; then
    git remote remove origin
    echo "  ✓ 已移除旧的 origin"
else
    echo "  ✓ 没有旧的 origin"
fi

# 步骤 3：添加新的 origin
echo ""
echo -e "${YELLOW}[3/5] 添加新的远程仓库...${NC}"
git remote add origin "https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"
echo "  ✓ 已添加 origin: https://github.com/$GITHUB_USERNAME/$REPO_NAME.git"

# 步骤 4：验证远程仓库
echo ""
echo -e "${YELLOW}[4/5] 验证远程仓库...${NC}"
git remote -v

# 步骤 5：推送到 GitHub
echo ""
echo -e "${YELLOW}[5/5] 推送到 GitHub...${NC}"
echo "  这可能需要几分钟，请耐心等待..."
echo ""

if git push -u origin main; then
    echo ""
    echo -e "${GREEN}🎉 推送成功！${NC}"
    echo ""
    echo -e "${GREEN}✅ 仓库地址：${NC}"
    echo "  https://github.com/$GITHUB_USERNAME/$REPO_NAME"
    echo ""
    echo -e "${GREEN}✅ 下一步：${NC}"
    echo "  1. 访问仓库页面"
    echo "  2. 添加 Topics: rag, llm, vue, python, mcp"
    echo "  3. 设置 About 描述"
    echo "  4. 启用 Issues 和 Discussions（可选）"
    echo ""
else
    echo ""
    echo -e "${RED}❌ 推送失败${NC}"
    echo ""
    echo -e "${YELLOW}可能的原因：${NC}"
    echo "  1. 仓库不存在 - 请先在 GitHub 创建仓库"
    echo "  2. 认证失败 - 请检查 GitHub 凭据"
    echo "  3. 网络问题 - 请检查网络连接"
    echo ""
    echo -e "${YELLOW}解决方案：${NC}"
    echo "  1. 访问 https://github.com/new 创建仓库"
    echo "  2. 使用 Personal Access Token 认证"
    echo "  3. 查看详细指南：GITHUB_PUSH_GUIDE.md"
    echo ""
    exit 1
fi

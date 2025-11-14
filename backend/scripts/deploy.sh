#!/bin/bash

# Cloudflare Worker 部署腳本

set -e

echo "🚀 開始部署到 Cloudflare..."
echo ""

# 1. 檢查是否已登錄
echo "1️⃣  檢查 Cloudflare 登錄狀態..."
if ! wrangler whoami &> /dev/null; then
    echo "   ❌ 未登錄 Cloudflare，請先運行: wrangler login"
    exit 1
fi
echo "   ✅ 已登錄 Cloudflare"
echo ""

# 2. 檢查依賴
echo "2️⃣  檢查依賴..."
if [ ! -d "node_modules" ]; then
    echo "   📦 安裝依賴..."
    npm install
    if [ $? -ne 0 ]; then
        echo "   ❌ 依賴安裝失敗"
        exit 1
    fi
else
    echo "   ✅ 依賴已安裝"
fi
echo ""

# 3. 驗證遷移文件
echo "3️⃣  驗證遷移文件..."
if [ -f "scripts/validate-migrations.js" ]; then
    node scripts/validate-migrations.js
    if [ $? -ne 0 ]; then
        echo "   ⚠️  遷移文件驗證有問題，但繼續部署..."
    else
        echo "   ✅ 遷移文件驗證通過"
    fi
else
    echo "   ⚠️  驗證腳本不存在，跳過驗證"
fi
echo ""

# 4. 運行數據庫遷移（生產環境）
echo "4️⃣  數據庫遷移..."
read -p "   是否運行生產環境數據庫遷移? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   🗄️  執行數據庫遷移..."
    wrangler d1 migrations apply DATABASE --remote
    if [ $? -ne 0 ]; then
        echo "   ❌ 數據庫遷移失敗"
        exit 1
    fi
    echo "   ✅ 數據庫遷移完成"
else
    echo "   ⏭️  跳過數據庫遷移"
fi
echo ""

# 5. 部署 Worker
echo "5️⃣  部署 Worker..."
wrangler deploy
if [ $? -ne 0 ]; then
    echo "   ❌ 部署失敗"
    exit 1
fi
echo "   ✅ Worker 部署成功"
echo ""

# 6. 部署後驗證
echo "6️⃣  部署後驗證..."
echo "   📍 API 地址: https://horgoscpa.com/api/v2/*"
echo "   💡 建議測試以下端點:"
echo "      - GET  https://horgoscpa.com/api/v2/health"
echo "      - POST https://horgoscpa.com/api/v2/auth/login"
echo ""

echo "✅ 部署完成！"


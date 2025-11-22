#!/bin/bash

# 自動化數據庫遷移腳本

set -e

echo "🔄 自動化數據庫遷移流程"
echo ""

# 1. 檢查環境
echo "1️⃣  檢查環境..."
if ! wrangler whoami &> /dev/null; then
    echo "   ❌ 未登錄 Cloudflare，請先運行: wrangler login"
    exit 1
fi
echo "   ✅ Cloudflare 已登錄"
echo ""

# 2. 驗證遷移文件
echo "2️⃣  驗證遷移文件..."
if [ -f "scripts/validate-migrations.js" ]; then
    node scripts/validate-migrations.js
    if [ $? -ne 0 ]; then
        echo "   ⚠️  遷移文件驗證失敗，請檢查後再繼續"
        exit 1
    fi
    echo "   ✅ 遷移文件驗證通過"
else
    echo "   ⚠️  驗證腳本不存在，跳過驗證"
fi
echo ""

# 3. 檢查待執行的遷移
echo "3️⃣  檢查待執行的遷移..."
migrations=$(wrangler d1 migrations list DATABASE --remote 2>&1)
if echo "$migrations" | grep -q "No migrations to apply"; then
    echo "   ✅ 沒有待執行的遷移"
    echo ""
    echo "✅ 遷移流程完成！"
    exit 0
fi

pending_count=$(echo "$migrations" | grep -c "Migrations to be applied" || echo "0")
echo "   📋 發現待執行的遷移"
echo ""

# 4. 確認執行
echo "4️⃣  確認執行遷移..."
read -p "   是否執行數據庫遷移? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "   ⏭️  已取消遷移"
    exit 0
fi
echo ""

# 5. 執行遷移
echo "5️⃣  執行數據庫遷移..."
wrangler d1 migrations apply DATABASE --remote
if [ $? -ne 0 ]; then
    echo "   ❌ 遷移執行失敗"
    echo "   💡 請檢查錯誤訊息並修復問題"
    exit 1
fi
echo "   ✅ 遷移執行成功"
echo ""

# 6. 驗證遷移結果
echo "6️⃣  驗證遷移結果..."
final_check=$(wrangler d1 migrations list DATABASE --remote 2>&1)
if echo "$final_check" | grep -q "No migrations to apply"; then
    echo "   ✅ 所有遷移已成功執行"
else
    echo "   ⚠️  仍有待執行的遷移"
fi
echo ""

echo "✅ 自動化遷移流程完成！"













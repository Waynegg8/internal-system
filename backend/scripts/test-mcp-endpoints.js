/**
 * MCP 端點測試腳本
 * 測試所有 MCP 功能是否正常運作
 */

const API_BASE_URL = process.env.API_URL || "http://localhost:8787/api/v2";

// 測試結果統計
const results = {
  passed: 0,
  failed: 0,
  tests: [],
};

// 測試助手
async function testEndpoint(name, method, path, body = null, expectedStatus = 200) {
  const url = `${API_BASE_URL}${path}`;
  console.log(`\n測試: ${name}`);
  console.log(`請求: ${method} ${url}`);

  try {
    const options = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    const data = await response.json();

    console.log(`狀態: ${response.status}`);
    console.log(`響應:`, JSON.stringify(data, null, 2));

    if (response.status === expectedStatus) {
      console.log("✅ 測試通過");
      results.passed++;
      results.tests.push({ name, status: "passed" });
      return { success: true, data };
    } else {
      console.log(`❌ 測試失敗 - 預期狀態 ${expectedStatus}, 實際 ${response.status}`);
      results.failed++;
      results.tests.push({ name, status: "failed", error: `狀態碼不匹配` });
      return { success: false, error: "狀態碼不匹配" };
    }
  } catch (error) {
    console.log(`❌ 測試失敗 - ${error.message}`);
    results.failed++;
    results.tests.push({ name, status: "failed", error: error.message });
    return { success: false, error: error.message };
  }
}

// 主測試函數
async function runTests() {
  console.log("=".repeat(60));
  console.log("MCP 端點測試");
  console.log("=".repeat(60));
  console.log(`API Base URL: ${API_BASE_URL}`);

  // 1. 測試獲取 MCP 工具列表
  await testEndpoint(
    "獲取 MCP 工具列表",
    "GET",
    "/mcp/tools"
  );

  // 2. 測試獲取 API 配置
  await testEndpoint(
    "獲取 API 配置",
    "GET",
    "/mcp/config"
  );

  // 3. 測試獲取數據庫架構
  await testEndpoint(
    "獲取數據庫架構",
    "GET",
    "/mcp/schema"
  );

  // 4. 測試獲取儀表板統計
  await testEndpoint(
    "獲取儀表板統計",
    "GET",
    "/mcp/stats"
  );

  // 5. 測試獲取客戶列表
  await testEndpoint(
    "獲取客戶列表（全部）",
    "GET",
    "/mcp/clients?status=all&limit=10"
  );

  // 6. 測試獲取任務列表
  await testEndpoint(
    "獲取任務列表",
    "GET",
    "/mcp/tasks?limit=10"
  );

  // 7. 測試搜索知識庫
  await testEndpoint(
    "搜索知識庫",
    "GET",
    "/mcp/knowledge?keyword=稅務"
  );

  // 8. 測試數據庫查詢（簡單查詢）
  await testEndpoint(
    "執行數據庫查詢 - 查詢用戶",
    "POST",
    "/mcp/query",
    {
      query: "SELECT user_id, username, display_name FROM Users LIMIT 5",
      params: [],
    }
  );

  // 9. 測試數據庫查詢（帶參數）
  await testEndpoint(
    "執行數據庫查詢 - 帶參數",
    "POST",
    "/mcp/query",
    {
      query: "SELECT * FROM Clients WHERE status = ? LIMIT 5",
      params: ["active"],
    }
  );

  // 10. 測試無效查詢（應該失敗）
  await testEndpoint(
    "執行無效查詢（預期失敗）",
    "POST",
    "/mcp/query",
    {
      query: "DELETE FROM Users WHERE user_id = 1",
    },
    400
  );

  // 輸出測試結果摘要
  console.log("\n" + "=".repeat(60));
  console.log("測試結果摘要");
  console.log("=".repeat(60));
  console.log(`總測試數: ${results.passed + results.failed}`);
  console.log(`通過: ${results.passed} ✅`);
  console.log(`失敗: ${results.failed} ❌`);
  console.log(`成功率: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(2)}%`);

  console.log("\n詳細結果:");
  results.tests.forEach((test, index) => {
    const icon = test.status === "passed" ? "✅" : "❌";
    console.log(`${index + 1}. ${icon} ${test.name}`);
    if (test.error) {
      console.log(`   錯誤: ${test.error}`);
    }
  });

  console.log("\n" + "=".repeat(60));

  // 返回退出碼
  process.exit(results.failed > 0 ? 1 : 0);
}

// 執行測試
runTests().catch((error) => {
  console.error("測試執行失敗:", error);
  process.exit(1);
});






/**
 * Cloudflare 管理 MCP 橋接器
 * 提供 Cloudflare 服務的完整管理功能，讓 AI 協助管理系統
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 配置
const WORKER_NAME = process.env.WORKER_NAME || "horgoscpa-api-v2";
const WORKER_DIR = process.env.WORKER_DIR || join(__dirname, "..", "..");
const PROJECT_ROOT =
  process.env.PROJECT_ROOT || join(__dirname, "..", "..", "..");
const PAGES_PROJECT =
  process.env.PAGES_PROJECT || "horgoscpa-internal-v2";
const ACCOUNT_ID =
  process.env.ACCOUNT_ID || "4ad0a8042beb2d218bd6edf39aee0fea";

/**
 * 建立 MCP 伺服器
 */
async function createServer() {
  const server = new Server(
    {
      name: "cloudflare-management-mcp",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
        resources: {
          subscribe: false,
          listChanged: false,
        },
      },
    }
  );

  // 註冊工具列表處理器
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        // ========== 部署管理 ==========
        {
          name: "deploy_worker",
          description: "部署 Cloudflare Worker",
          inputSchema: {
            type: "object",
            properties: {
              dry_run: {
                type: "boolean",
                description: "是否為預覽模式（不實際部署）",
                default: false,
              },
            },
          },
        },
        {
          name: "deploy_pages",
          description: "部署 Cloudflare Pages 專案",
          inputSchema: {
            type: "object",
            properties: {
              directory: {
                type: "string",
                description: "要部署的目錄（預設：dist）",
                default: "dist",
              },
            },
          },
        },
        {
          name: "get_deployment_status",
          description: "獲取部署狀態",
          inputSchema: {
            type: "object",
            properties: {
              type: {
                type: "string",
                description: "部署類型：worker 或 pages",
                enum: ["worker", "pages"],
                default: "worker",
              },
            },
          },
        },

        // ========== D1 資料庫管理 ==========
        {
          name: "d1_list_databases",
          description: "列出所有 D1 資料庫",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "d1_execute_query",
          description: "執行 D1 資料庫查詢（僅 SELECT）",
          inputSchema: {
            type: "object",
            properties: {
              database: {
                type: "string",
                description: "資料庫名稱（預設：horgoscpa-db-v2）",
                default: "horgoscpa-db-v2",
              },
              query: {
                type: "string",
                description: "SQL 查詢語句（僅支援 SELECT）",
              },
              remote: {
                type: "boolean",
                description: "是否查詢遠端資料庫（預設：true）",
                default: true,
              },
            },
            required: ["query"],
          },
        },
        {
          name: "d1_list_migrations",
          description: "列出資料庫遷移狀態",
          inputSchema: {
            type: "object",
            properties: {
              database: {
                type: "string",
                description: "資料庫名稱",
                default: "horgoscpa-db-v2",
              },
              remote: {
                type: "boolean",
                description: "是否查詢遠端資料庫",
                default: true,
              },
            },
          },
        },

        // ========== KV 快取管理 ==========
        {
          name: "kv_list_keys",
          description: "列出 KV namespace 中的所有 keys",
          inputSchema: {
            type: "object",
            properties: {
              namespace: {
                type: "string",
                description: "KV namespace ID（預設：CACHE）",
                default: "0b5186bacfc24815a04a9240d6e7ba45",
              },
              prefix: {
                type: "string",
                description: "key 前綴過濾",
              },
            },
          },
        },
        {
          name: "kv_get_value",
          description: "獲取 KV 中的值",
          inputSchema: {
            type: "object",
            properties: {
              namespace: {
                type: "string",
                description: "KV namespace ID",
                default: "0b5186bacfc24815a04a9240d6e7ba45",
              },
              key: {
                type: "string",
                description: "要獲取的 key",
              },
            },
            required: ["key"],
          },
        },
        {
          name: "kv_delete_key",
          description: "刪除 KV 中的 key",
          inputSchema: {
            type: "object",
            properties: {
              namespace: {
                type: "string",
                description: "KV namespace ID",
                default: "0b5186bacfc24815a04a9240d6e7ba45",
              },
              key: {
                type: "string",
                description: "要刪除的 key",
              },
            },
            required: ["key"],
          },
        },
        {
          name: "kv_purge_all",
          description: "清除 KV namespace 中的所有資料（謹慎使用）",
          inputSchema: {
            type: "object",
            properties: {
              namespace: {
                type: "string",
                description: "KV namespace ID",
                default: "0b5186bacfc24815a04a9240d6e7ba45",
              },
              confirm: {
                type: "boolean",
                description: "確認清除（必須為 true）",
                default: false,
              },
            },
            required: ["confirm"],
          },
        },

        // ========== R2 檔案管理 ==========
        {
          name: "r2_list_objects",
          description: "列出 R2 bucket 中的物件",
          inputSchema: {
            type: "object",
            properties: {
              bucket: {
                type: "string",
                description: "R2 bucket 名稱（預設：horgoscpa-documents）",
                default: "horgoscpa-documents",
              },
              prefix: {
                type: "string",
                description: "物件前綴過濾",
              },
              limit: {
                type: "number",
                description: "返回數量限制（預設：50）",
                default: 50,
              },
            },
          },
        },
        {
          name: "r2_get_object_info",
          description: "獲取 R2 物件的資訊",
          inputSchema: {
            type: "object",
            properties: {
              bucket: {
                type: "string",
                description: "R2 bucket 名稱",
                default: "horgoscpa-documents",
              },
              key: {
                type: "string",
                description: "物件 key",
              },
            },
            required: ["key"],
          },
        },
        {
          name: "r2_delete_object",
          description: "刪除 R2 物件",
          inputSchema: {
            type: "object",
            properties: {
              bucket: {
                type: "string",
                description: "R2 bucket 名稱",
                default: "horgoscpa-documents",
              },
              key: {
                type: "string",
                description: "要刪除的物件 key",
              },
            },
            required: ["key"],
          },
        },

        // ========== 快取管理 ==========
        {
          name: "purge_cache",
          description: "清除 Cloudflare 快取",
          inputSchema: {
            type: "object",
            properties: {
              zone: {
                type: "string",
                description: "Zone 名稱（預設：horgoscpa.com）",
                default: "horgoscpa.com",
              },
              files: {
                type: "array",
                description: "要清除的檔案 URL 列表（可選）",
                items: { type: "string" },
              },
              purge_everything: {
                type: "boolean",
                description: "是否清除所有快取",
                default: false,
              },
            },
          },
        },

        // ========== 系統資訊 ==========
        {
          name: "get_account_info",
          description: "獲取 Cloudflare 帳戶資訊",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "get_worker_analytics",
          description: "獲取 Worker 分析數據",
          inputSchema: {
            type: "object",
            properties: {
              start_date: {
                type: "string",
                description: "開始日期（YYYY-MM-DD）",
              },
              end_date: {
                type: "string",
                description: "結束日期（YYYY-MM-DD）",
              },
            },
          },
        },
      ],
    };
  });

  // 註冊資源列表處理器
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    return {
      resources: [
        {
          uri: "cloudflare://account/info",
          name: "Cloudflare 帳戶資訊",
          description: "當前 Cloudflare 帳戶的基本資訊",
          mimeType: "application/json",
        },
        {
          uri: "cloudflare://worker/info",
          name: "Worker 資訊",
          description: `Cloudflare Worker ${WORKER_NAME} 的資訊`,
          mimeType: "application/json",
        },
        {
          uri: "cloudflare://pages/info",
          name: "Pages 專案資訊",
          description: `Cloudflare Pages 專案 ${PAGES_PROJECT} 的資訊`,
          mimeType: "application/json",
        },
        {
          uri: "cloudflare://d1/databases",
          name: "D1 資料庫列表",
          description: "所有 D1 資料庫的列表",
          mimeType: "application/json",
        },
      ],
    };
  });

  // 註冊資源讀取處理器
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      let result;
      switch (uri) {
        case "cloudflare://account/info":
          result = await handleGetAccountInfo();
          break;
        case "cloudflare://d1/databases":
          result = await handleD1ListDatabases();
          break;
        default:
          throw new Error(`未知資源: ${uri}`);
      }

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: result.content[0].text,
          },
        ],
      };
    } catch (error) {
      return {
        contents: [
          {
            uri,
            mimeType: "text/plain",
            text: `讀取失敗: ${error.message}`,
          },
        ],
      };
    }
  });

  // 註冊工具調用處理器
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        // 部署管理
        case "deploy_worker":
          return await handleDeployWorker(args);
        case "deploy_pages":
          return await handleDeployPages(args);
        case "get_deployment_status":
          return await handleGetDeploymentStatus(args);

        // D1 資料庫管理
        case "d1_list_databases":
          return await handleD1ListDatabases();
        case "d1_execute_query":
          return await handleD1ExecuteQuery(args);
        case "d1_list_migrations":
          return await handleD1ListMigrations(args);

        // KV 快取管理
        case "kv_list_keys":
          return await handleKVListKeys(args);
        case "kv_get_value":
          return await handleKVGetValue(args);
        case "kv_delete_key":
          return await handleKVDeleteKey(args);
        case "kv_purge_all":
          return await handleKVPurgeAll(args);

        // R2 檔案管理
        case "r2_list_objects":
          return await handleR2ListObjects(args);
        case "r2_get_object_info":
          return await handleR2GetObjectInfo(args);
        case "r2_delete_object":
          return await handleR2DeleteObject(args);

        // 快取管理
        case "purge_cache":
          return await handlePurgeCache(args);

        // 系統資訊
        case "get_account_info":
          return await handleGetAccountInfo();
        case "get_worker_analytics":
          return await handleGetWorkerAnalytics(args);

        default:
          throw new Error(`未知工具: ${name}`);
      }
    } catch (error) {
      console.error(`[Cloudflare MCP] 工具調用失敗 (${name}):`, error);
      return {
        content: [
          {
            type: "text",
            text: `執行失敗: ${error.message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

// ========== 部署管理 ==========

async function handleDeployWorker(args) {
  return executeCommand(
    ["wrangler", "deploy", ...(args.dry_run ? ["--dry-run"] : [])],
    "部署 Worker"
  );
}

async function handleDeployPages(args) {
  const directory = args.directory || "dist";
  return executeCommand(
    [
      "wrangler",
      "pages",
      "deploy",
      directory,
      "--project-name",
      PAGES_PROJECT,
    ],
    "部署 Pages",
    { cwd: PROJECT_ROOT }
  );
}

async function handleGetDeploymentStatus(args) {
  const type = args.type || "worker";
  if (type === "worker") {
    return executeCommand(["wrangler", "deployments", "list"], "獲取 Worker 部署狀態");
  } else {
    return executeCommand(
      ["wrangler", "pages", "deployment", "list", "--project-name", PAGES_PROJECT],
      "獲取 Pages 部署狀態"
    );
  }
}

// ========== D1 資料庫管理 ==========

async function handleD1ListDatabases() {
  return executeCommand(["wrangler", "d1", "list"], "列出 D1 資料庫");
}

async function handleD1ExecuteQuery(args) {
  const database = args.database || "horgoscpa-db-v2";
  const query = args.query;

  if (!query.trim().toUpperCase().startsWith("SELECT")) {
    throw new Error("僅支援 SELECT 查詢");
  }

  const remoteFlag = args.remote !== false ? "--remote" : "--local";
  return executeCommand(
    ["wrangler", "d1", "execute", database, remoteFlag, "--command", query],
    "執行 D1 查詢"
  );
}

async function handleD1ListMigrations(args) {
  const database = args.database || "horgoscpa-db-v2";
  const remoteFlag = args.remote !== false ? "--remote" : "--local";
  return executeCommand(
    ["wrangler", "d1", "migrations", "list", database, remoteFlag],
    "列出遷移狀態"
  );
}

// ========== KV 快取管理 ==========

async function handleKVListKeys(args) {
  const namespace = args.namespace || "0b5186bacfc24815a04a9240d6e7ba45";
  const prefix = args.prefix ? `--prefix ${args.prefix}` : "";
  return executeCommand(
    ["wrangler", "kv", "key", "list", `--namespace-id=${namespace}`, ...(prefix ? [prefix] : [])],
    "列出 KV keys"
  );
}

async function handleKVGetValue(args) {
  const namespace = args.namespace || "0b5186bacfc24815a04a9240d6e7ba45";
  const key = args.key;
  return executeCommand(
    ["wrangler", "kv", "key", "get", key, `--namespace-id=${namespace}`],
    "獲取 KV 值"
  );
}

async function handleKVDeleteKey(args) {
  const namespace = args.namespace || "0b5186bacfc24815a04a9240d6e7ba45";
  const key = args.key;
  return executeCommand(
    ["wrangler", "kv", "key", "delete", key, `--namespace-id=${namespace}`],
    "刪除 KV key"
  );
}

async function handleKVPurgeAll(args) {
  if (!args.confirm) {
    throw new Error("必須確認清除操作（設定 confirm: true）");
  }
  const namespace = args.namespace || "0b5186bacfc24815a04a9240d6e7ba45";
  
  // 先列出所有 keys，然後逐一刪除
  const listResult = await handleKVListKeys({ namespace });
  // 注意：實際實作需要解析 listResult 並逐一刪除
  return {
    content: [
      {
        type: "text",
        text: "KV 清除功能需要手動確認每個 key。請使用 kv_list_keys 和 kv_delete_key 逐一處理。",
      },
    ],
  };
}

// ========== R2 檔案管理 ==========

async function handleR2ListObjects(args) {
  const bucket = args.bucket || "horgoscpa-documents";
  const prefix = args.prefix || "";
  const limit = args.limit || 50;
  return executeCommand(
    [
      "wrangler",
      "r2",
      "object",
      "list",
      `--bucket=${bucket}`,
      ...(prefix ? [`--prefix=${prefix}`] : []),
      `--limit=${limit}`,
    ],
    "列出 R2 物件"
  );
}

async function handleR2GetObjectInfo(args) {
  const bucket = args.bucket || "horgoscpa-documents";
  const key = args.key;
  return executeCommand(
    ["wrangler", "r2", "object", "get", key, `--bucket=${bucket}`],
    "獲取 R2 物件資訊"
  );
}

async function handleR2DeleteObject(args) {
  const bucket = args.bucket || "horgoscpa-documents";
  const key = args.key;
  return executeCommand(
    ["wrangler", "r2", "object", "delete", key, `--bucket=${bucket}`],
    "刪除 R2 物件"
  );
}

// ========== 快取管理 ==========

async function handlePurgeCache(args) {
  const zone = args.zone || "horgoscpa.com";
  
  if (args.purge_everything) {
    return executeCommand(
      ["wrangler", "cache", "purge", `--zone=${zone}`, "--everything"],
      "清除所有快取"
    );
  } else if (args.files && args.files.length > 0) {
    return executeCommand(
      ["wrangler", "cache", "purge", `--zone=${zone}`, ...args.files],
      "清除指定檔案快取"
    );
  } else {
    throw new Error("必須指定 purge_everything 或 files");
  }
}

// ========== 系統資訊 ==========

async function handleGetAccountInfo() {
  return executeCommand(["wrangler", "whoami"], "獲取帳戶資訊");
}

async function handleGetWorkerAnalytics(args) {
  // 注意：wrangler 沒有直接的 analytics 命令，這需要透過 API
  return {
    content: [
      {
        type: "text",
        text: "Worker 分析數據需要透過 Cloudflare Dashboard 或 API 獲取。建議使用 Cloudflare Dashboard 查看。",
      },
    ],
  };
}

// ========== 輔助函數 ==========

function executeCommand(command, description, options = {}) {
  return new Promise((resolve, reject) => {
    const output = [];
    let errorOutput = "";

    const process = spawn("npx", command, {
      cwd: options.cwd || WORKER_DIR,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    process.stdout.on("data", (data) => {
      output.push(data.toString());
    });

    process.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    process.on("close", (code) => {
      const result = output.join("");
      if (code !== 0 && !result) {
        reject(new Error(`${description}失敗: ${errorOutput || `退出碼 ${code}`}`));
        return;
      }

      resolve({
        content: [
          {
            type: "text",
            text: result || errorOutput || `${description}完成（無輸出）`,
          },
        ],
      });
    });

    // 設定超時（30 秒）
    setTimeout(() => {
      process.kill();
      if (output.length > 0) {
        resolve({
          content: [
            {
              type: "text",
              text: output.join(""),
            },
          ],
        });
      } else {
        reject(new Error(`${description}超時`));
      }
    }, 30000);
  });
}

// 啟動伺服器
async function main() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[Cloudflare MCP] Cloudflare 管理 MCP 橋接器已啟動");
  console.error(`[Cloudflare MCP] Worker: ${WORKER_NAME}`);
  console.error(`[Cloudflare MCP] Pages Project: ${PAGES_PROJECT}`);
}

main().catch((error) => {
  console.error("[Cloudflare MCP] 啟動失敗:", error);
  process.exit(1);
});




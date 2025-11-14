/**
 * MCP Cloudflare Workers Logs 橋接器
 * 讓 AI 透過 MCP 查看 Cloudflare Workers 的即時 logs
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

// Worker 名稱（從 wrangler.toml 讀取）
const WORKER_NAME = process.env.WORKER_NAME || "horgoscpa-api-v2";
const WORKER_DIR = process.env.WORKER_DIR || join(__dirname, "..", "..");

/**
 * 建立 MCP 伺服器
 */
async function createServer() {
  const server = new Server(
    {
      name: "horgoscpa-logs-mcp",
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
        {
          name: "get_worker_logs",
          description: "獲取 Cloudflare Worker 的即時 logs（使用 wrangler tail）",
          inputSchema: {
            type: "object",
            properties: {
              lines: {
                type: "number",
                description: "要獲取的 log 行數（預設 50，最大 500）",
                default: 50,
              },
              format: {
                type: "string",
                description: "輸出格式：json（結構化）或 text（純文字）",
                enum: ["json", "text"],
                default: "text",
              },
              status: {
                type: "string",
                description: "過濾狀態碼（例如：200, 404, 500）",
              },
              method: {
                type: "string",
                description: "過濾 HTTP 方法（例如：GET, POST）",
              },
              search: {
                type: "string",
                description: "搜尋關鍵字（在 log 訊息中搜尋）",
              },
            },
          },
        },
        {
          name: "tail_worker_logs",
          description: "即時監控 Cloudflare Worker 的 logs（持續輸出）",
          inputSchema: {
            type: "object",
            properties: {
              duration: {
                type: "number",
                description: "監控持續時間（秒），預設 30 秒",
                default: 30,
              },
              format: {
                type: "string",
                description: "輸出格式：json 或 text",
                enum: ["json", "text"],
                default: "text",
              },
            },
          },
        },
        {
          name: "get_worker_info",
          description: "獲取 Cloudflare Worker 的基本資訊",
          inputSchema: {
            type: "object",
            properties: {},
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
          uri: `horgoscpa://logs/${WORKER_NAME}`,
          name: "Worker 日誌",
          description: `Cloudflare Worker ${WORKER_NAME} 的日誌資源`,
          mimeType: "text/plain",
        },
        {
          uri: `horgoscpa://logs/${WORKER_NAME}/info`,
          name: "Worker 資訊",
          description: `Cloudflare Worker ${WORKER_NAME} 的基本資訊`,
          mimeType: "application/json",
        },
      ],
    };
  });

  // 註冊資源讀取處理器
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    try {
      if (uri === `horgoscpa://logs/${WORKER_NAME}/info`) {
        const info = await handleGetWorkerInfo();
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: info.content[0].text,
            },
          ],
        };
      } else if (uri.startsWith(`horgoscpa://logs/${WORKER_NAME}`)) {
        // 獲取最近的日誌
        const logs = await handleGetLogs({ lines: 100, format: "text" });
        return {
          contents: [
            {
              uri,
              mimeType: "text/plain",
              text: logs.content[0].text,
            },
          ],
        };
      } else {
        throw new Error(`未知資源: ${uri}`);
      }
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
        case "get_worker_logs":
          return await handleGetLogs(args);

        case "tail_worker_logs":
          return await handleTailLogs(args);

        case "get_worker_info":
          return await handleGetWorkerInfo();

        default:
          throw new Error(`未知工具: ${name}`);
      }
    } catch (error) {
      console.error(`[MCP Logs] 工具調用失敗 (${name}):`, error);
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

/**
 * 獲取 Worker logs
 */
async function handleGetLogs(args) {
  const lines = Math.min(Math.max(1, args.lines || 50), 500);
  const format = args.format || "text";

  return new Promise((resolve, reject) => {
    const logs = [];
    let errorOutput = "";

    // 執行 wrangler tail 命令
    const wranglerProcess = spawn("npx", ["wrangler", "tail", WORKER_NAME, "--format", format, "--lines", lines.toString()], {
      cwd: WORKER_DIR,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    // 收集標準輸出
    wranglerProcess.stdout.on("data", (data) => {
      const text = data.toString();
      logs.push(text);
    });

    // 收集錯誤輸出
    wranglerProcess.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    // 處理完成
    wranglerProcess.on("close", (code) => {
      if (code !== 0 && logs.length === 0) {
        reject(new Error(`wrangler tail 執行失敗: ${errorOutput || `退出碼 ${code}`}`));
        return;
      }

      // 過濾 logs（如果有提供過濾條件）
      let filteredLogs = logs.join("");

      if (args.status) {
        filteredLogs = filteredLogs
          .split("\n")
          .filter((line) => line.includes(`"status":${args.status}`) || line.includes(`status: ${args.status}`))
          .join("\n");
      }

      if (args.method) {
        filteredLogs = filteredLogs
          .split("\n")
          .filter((line) => line.includes(`"method":"${args.method}"`) || line.includes(`method: ${args.method}`))
          .join("\n");
      }

      if (args.search) {
        filteredLogs = filteredLogs
          .split("\n")
          .filter((line) => line.toLowerCase().includes(args.search.toLowerCase()))
          .join("\n");
      }

      resolve({
        content: [
          {
            type: "text",
            text: filteredLogs || "沒有找到符合條件的 logs",
          },
        ],
      });
    });

    // 設定超時（10 秒）
    setTimeout(() => {
      wranglerProcess.kill();
      if (logs.length > 0) {
        resolve({
          content: [
            {
              type: "text",
              text: logs.join(""),
            },
          ],
        });
      } else {
        reject(new Error("獲取 logs 超時"));
      }
    }, 10000);
  });
}

/**
 * 即時監控 Worker logs
 */
async function handleTailLogs(args) {
  const duration = Math.min(Math.max(5, args.duration || 30), 300); // 5-300 秒
  const format = args.format || "text";

  return new Promise((resolve) => {
    const logs = [];
    const startTime = Date.now();

    // 執行 wrangler tail 命令（持續監控）
    const wranglerProcess = spawn("npx", ["wrangler", "tail", WORKER_NAME, "--format", format], {
      cwd: WORKER_DIR,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    // 收集標準輸出
    wranglerProcess.stdout.on("data", (data) => {
      const text = data.toString();
      logs.push(text);
    });

    // 設定持續時間後停止
    setTimeout(() => {
      wranglerProcess.kill();
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

      resolve({
        content: [
          {
            type: "text",
            text: `監控 ${elapsed} 秒的 logs：\n\n${logs.join("")}`,
          },
        ],
      });
    }, duration * 1000);
  });
}

/**
 * 獲取 Worker 資訊
 */
async function handleGetWorkerInfo() {
  return new Promise((resolve, reject) => {
    let output = "";

    // 執行 wrangler whoami 和相關命令獲取資訊
    const wranglerProcess = spawn("npx", ["wrangler", "whoami"], {
      cwd: WORKER_DIR,
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
    });

    wranglerProcess.stdout.on("data", (data) => {
      output += data.toString();
    });

    wranglerProcess.on("close", (code) => {
      if (code === 0) {
        resolve({
          content: [
            {
              type: "text",
              text: `Worker 名稱: ${WORKER_NAME}\n\n${output}`,
            },
          ],
        });
      } else {
        resolve({
          content: [
            {
              type: "text",
              text: `Worker 名稱: ${WORKER_NAME}\n\n無法獲取詳細資訊（請確認已登入 wrangler）`,
            },
          ],
        });
      }
    });
  });
}

// 啟動伺服器
async function main() {
  const server = await createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[MCP Logs] MCP Logs 橋接器已啟動");
  console.error(`[MCP Logs] Worker: ${WORKER_NAME}`);
  console.error(`[MCP Logs] Worker Dir: ${WORKER_DIR}`);
}

main().catch((error) => {
  console.error("[MCP Logs] 啟動失敗:", error);
  process.exit(1);
});




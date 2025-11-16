#!/usr/bin/env node
/**
 * Tesseract OCR MCP 伺服器（免費開源）
 * 使用 Tesseract.js 提供 OCR 功能，完全免費，無需 API Key
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { createWorker } from 'tesseract.js';

// 預設語言（支援繁體中文和英文）
const DEFAULT_LANGUAGE = process.env.TESSERACT_LANGUAGE || 'chi_tra+eng';

let worker = null;

// 初始化 Tesseract Worker
async function initWorker() {
  if (!worker) {
    console.error('正在初始化 Tesseract OCR Worker...');
    worker = await createWorker(DEFAULT_LANGUAGE, 1, {
      logger: (m) => {
        // 只記錄重要訊息，避免過多輸出
        if (m.status === 'recognizing text') {
          console.error(`進度: ${Math.round(m.progress * 100)}%`);
        }
      },
    });
    console.error('Tesseract OCR Worker 已初始化');
  }
  return worker;
}

const server = new Server(
  {
    name: 'tesseract-ocr',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// 列出可用工具
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'extract_text',
        description: '從圖片中提取文字內容（免費開源 OCR）。支援 Base64 編碼的圖片數據或檔案 URL。支援格式：JPEG、PNG、WebP、BMP。預設支援繁體中文和英文。',
        inputSchema: {
          type: 'object',
          properties: {
            image_data: {
              type: 'string',
              description: 'Base64 編碼的圖片數據（不含 data:image/... 前綴）或完整的 data URI',
            },
            image_url: {
              type: 'string',
              description: '圖片的 URL（如果提供，將優先使用此參數）',
            },
            language: {
              type: 'string',
              description: 'OCR 語言代碼，例如：chi_tra（繁體中文）、eng（英文）、chi_tra+eng（繁體中文+英文）。預設：chi_tra+eng',
              default: 'chi_tra+eng',
            },
          },
          required: [],
        },
      },
    ],
  };
});

// 處理工具調用
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === 'extract_text') {
    try {
      const { image_data, image_url, language = DEFAULT_LANGUAGE } = args || {};

      if (!image_data && !image_url) {
        return {
          content: [
            {
              type: 'text',
              text: '錯誤: 請提供 image_data（Base64 編碼）或 image_url（圖片 URL）',
            },
          ],
          isError: true,
        };
      }

      // 初始化 Worker（如果尚未初始化或語言改變）
      const currentWorker = await initWorker();
      
      // 如果語言改變，重新載入 Worker
      if (language !== DEFAULT_LANGUAGE && worker) {
        await worker.terminate();
        worker = null;
        const newWorker = await createWorker(language, 1, {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              console.error(`進度: ${Math.round(m.progress * 100)}%`);
            }
          },
        });
        worker = newWorker;
      }

      let imageSource;

      if (image_url) {
        // 使用圖片 URL
        imageSource = image_url;
      } else if (image_data) {
        // 處理 Base64 數據
        if (image_data.startsWith('data:')) {
          // 完整的 data URI，直接使用
          imageSource = image_data;
        } else {
          // 純 Base64，假設是 PNG
          imageSource = `data:image/png;base64,${image_data}`;
        }
      }

      console.error('開始 OCR 辨識...');
      
      // 執行 OCR
      const { data: { text, confidence } } = await currentWorker.recognize(imageSource);

      console.error(`OCR 完成，信心度: ${Math.round(confidence)}%`);

      // 格式化結果
      const result = {
        text: text.trim(),
        confidence: Math.round(confidence),
        language: language,
      };

      return {
        content: [
          {
            type: 'text',
            text: `辨識結果（信心度: ${result.confidence}%）:\n\n${result.text}`,
          },
        ],
      };
    } catch (error) {
      console.error('OCR 錯誤:', error);
      return {
        content: [
          {
            type: 'text',
            text: `OCR 處理錯誤: ${error.message}\n\n提示：請確認圖片格式正確（JPEG、PNG、WebP、BMP），且圖片清晰可讀。`,
          },
        ],
        isError: true,
      };
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `未知的工具: ${name}`,
      },
    ],
    isError: true,
  };
});

// 清理資源
process.on('SIGINT', async () => {
  if (worker) {
    await worker.terminate();
  }
  process.exit(0);
});

process.on('SIGTERM', async () => {
  if (worker) {
    await worker.terminate();
  }
  process.exit(0);
});

// 啟動伺服器
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Tesseract OCR MCP 伺服器已啟動（免費開源版本）');
}

main().catch((error) => {
  console.error('伺服器錯誤:', error);
  process.exit(1);
});







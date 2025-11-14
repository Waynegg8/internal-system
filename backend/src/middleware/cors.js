/**
 * CORS 中间件
 */

import { corsPreflightResponse, getCorsHeaders } from "../utils/cors.js";

export function handleCORS(request) {
  if (request.method === "OPTIONS") {
    return corsPreflightResponse(request, {});
  }
  return null;
}

export function addCorsHeaders(response, request) {
  const origin = request.headers.get("Origin") || "";
  const corsHeaders = getCorsHeaders(origin);
  
  // 如果沒有 CORS 頭，直接返回響應
  if (!corsHeaders || Object.keys(corsHeaders).length === 0) {
    // 開發環境：即使沒有 origin，也添加基本的 CORS 頭
    const newHeaders = new Headers(response.headers);
    newHeaders.set("Access-Control-Allow-Origin", "*");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: newHeaders,
    });
  }
  
  // 創建新的 Headers 對象
  const newHeaders = new Headers(response.headers);
  
  // 添加 CORS 頭
  Object.entries(corsHeaders).forEach(([key, value]) => {
    if (value) {
      newHeaders.set(key, value);
    }
  });
  
  // 返回新的 Response，保留原始響應的所有屬性
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders,
  });
}


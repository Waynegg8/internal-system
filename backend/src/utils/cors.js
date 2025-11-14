/**
 * CORS 处理工具
 */

export function getCorsHeaders(origin) {
  // 開發環境：允許所有 localhost 來源（用於本地開發）
  if (!origin) {
    // 如果沒有 Origin 頭，可能是同源請求或開發環境，允許
    return {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Credentials": "true",
    };
  }
  
  try {
    const url = new URL(origin);
    const hostname = url.hostname || "";
    
    // 允许 localhost 和 127.0.0.1（本地开发环境）
    if (hostname === "localhost" || hostname === "127.0.0.1") {
      return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
      };
    }
    
    // 允许 pages.dev 和 horgoscpa.com 域名
    if (hostname.endsWith(".pages.dev") || hostname.endsWith("horgoscpa.com")) {
      return {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Vary": "Origin",
      };
    }
  } catch (_) {}
  
  // 開發環境：如果無法解析，允許所有來源
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Credentials": "true",
  };
}

export function corsPreflightResponse(request, env) {
  const origin = request.headers.get("Origin") || "";
  const corsHeaders = getCorsHeaders(origin);
  
  // 構建完整的 CORS 預檢響應頭
  const headers = new Headers();
  
  // 添加 CORS 頭
  if (corsHeaders["Access-Control-Allow-Origin"]) {
    headers.set("Access-Control-Allow-Origin", corsHeaders["Access-Control-Allow-Origin"]);
  } else if (origin) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else {
    headers.set("Access-Control-Allow-Origin", "*");
  }
  
  if (corsHeaders["Access-Control-Allow-Credentials"]) {
    headers.set("Access-Control-Allow-Credentials", corsHeaders["Access-Control-Allow-Credentials"]);
  }
  
  if (corsHeaders["Vary"]) {
    headers.set("Vary", corsHeaders["Vary"]);
  }
  
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", request.headers.get("Access-Control-Request-Headers") || "Content-Type, X-Request-Id");
  headers.set("Access-Control-Max-Age", "600");
  
  return new Response(null, { status: 204, headers });
}


/**
 * Cookie 处理工具
 */

export function getCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  const parts = raw.split(";");
  
  for (const p of parts) {
    const [k, ...v] = p.trim().split("=");
    if (k === name) return v.join("=");
  }
  
  return null;
}

export function setCookie(name, value, options = {}) {
  const {
    domain = null, // 不设置domain，让浏览器自动处理
    path = "/",
    maxAge = 2592000,
    httpOnly = true,
    secure = true,
    sameSite = "None", // 跨域需要None
  } = options;
  
  const parts = [
    `${name}=${value}`,
    domain ? `Domain=${domain}` : "",
    `Path=${path}`,
    httpOnly ? "HttpOnly" : "",
    secure ? "Secure" : "",
    `SameSite=${sameSite}`,
    `Max-Age=${maxAge}`,
  ].filter(Boolean);
  
  return parts.join("; ");
}

export function clearCookie(name, options = {}) {
  return setCookie(name, "", { ...options, maxAge: 0 });
}


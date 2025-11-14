/**
 * 认证工具函数
 */

import { getCookie } from "./cookie.js";

/**
 * 获取当前会话用户
 */
export async function getSessionUser(request, env) {
  const cookieName = String(env.SESSION_COOKIE_NAME || "session");
  const sessionId = getCookie(request, cookieName);
  
  if (!sessionId || !env.DATABASE) return null;
  
  const row = await env.DATABASE.prepare(
    `SELECT s.id as session_id, s.user_id, s.expires_at, 
            u.username, u.name, u.email, u.is_admin, u.gender 
     FROM sessions s 
     JOIN Users u ON u.user_id = s.user_id 
     WHERE s.id = ? AND u.is_deleted = 0
     LIMIT 1`
  ).bind(sessionId).first();
  
  if (!row) return null;
  
  const exp = Date.parse(row.expires_at);
  if (Number.isNaN(exp) || exp <= Date.now()) return null;
  
  // 返回用户数据，格式与前端期望一致
  return {
    user_id: row.user_id,
    id: String(row.user_id), // 兼容前端使用的id字段
    username: row.username,
    name: row.name,
    email: row.email,
    is_admin: row.is_admin === 1,
    isAdmin: row.is_admin === 1, // 兼容前端使用的isAdmin字段
    gender: row.gender || "M"
  };
}

/**
 * 生成 Session ID
 */
export function generateSessionId() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("=", "")
    .replaceAll("+", "-")
    .replaceAll("/", "_");
}

/**
 * PBKDF2-SHA256 密码验证
 */
export async function verifyPasswordPBKDF2(password, stored) {
  if (!stored || typeof stored !== "string") return false;
  
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  
  const iterations = parseInt(parts[1], 10);
  if (!Number.isFinite(iterations) || iterations < 100000) return false;
  
  const salt = Uint8Array.from(atob(parts[2]), (c) => c.charCodeAt(0));
  const expected = Uint8Array.from(atob(parts[3]), (c) => c.charCodeAt(0));
  
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    keyMaterial,
    expected.byteLength * 8
  );
  
  const derived = new Uint8Array(derivedBits);
  if (derived.byteLength !== expected.byteLength) return false;
  
  let diff = 0;
  for (let i = 0; i < derived.byteLength; i++) {
    diff |= derived[i] ^ expected[i];
  }
  
  return diff === 0;
}

/**
 * PBKDF2-SHA256 密码哈希
 */
export async function hashPasswordPBKDF2(password, iterations = 100000, keyLen = 32) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const enc = new TextEncoder();
  
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  
  const derivedBits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    keyLen * 8
  );
  
  const derived = new Uint8Array(derivedBits);
  const b64 = (u8) => btoa(String.fromCharCode(...u8));
  
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(derived)}`;
}


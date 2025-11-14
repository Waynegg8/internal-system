/**
 * 统一的 JSON 响应工具
 */

export function jsonResponse(status, body, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...extraHeaders,
    },
  });
}

export function errorResponse(status, code, message, errors = null, requestId = null) {
  const body = {
    ok: false,
    code,
    message,
    meta: requestId ? { requestId } : {},
  };
  if (errors) body.errors = errors;
  return jsonResponse(status, body);
}

export function notImplementedResponse(message = "此功能正在迁移中", requestId = null) {
  return errorResponse(501, "NOT_IMPLEMENTED", message, null, requestId);
}

export function successResponse(data, message = "成功", requestId = null, extraMeta = {}) {
  const meta = requestId ? { requestId, version: '1.0.1', ...extraMeta } : { version: '1.0.1', ...extraMeta };
  return jsonResponse(200, {
    ok: true,
    code: "OK",
    message,
    data,
    meta: Object.keys(meta).length > 0 ? meta : {},
  });
}

export function generateRequestId() {
  const random = crypto.getRandomValues(new Uint8Array(8));
  return "req_" + Array.from(random).map((b) => b.toString(16).padStart(2, "0")).join("");
}


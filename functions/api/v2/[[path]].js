export async function onRequest(context) {
  const { request, params } = context;
  const { path } = params;
  const url = new URL(request.url);

  // 目標後端 Worker 網域（已在 wrangler 中配置的 API 路由）
  const backendBase = 'https://v2.horgoscpa.com';
  const targetUrl = new URL(`/api/v2/${path || ''}${url.search}`, backendBase);

  // 轉發請求，保留方法與 body，過濾 Host/Origin 等由 CF 設定的標頭
  const forwardHeaders = new Headers(request.headers);
  forwardHeaders.delete('host');
  forwardHeaders.delete('origin');
  forwardHeaders.delete('referer');
  forwardHeaders.set('x-forwarded-for', request.headers.get('cf-connecting-ip') || '');

  const init = {
    method: request.method,
    headers: forwardHeaders,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual',
  };

  const resp = await fetch(targetUrl.toString(), init);

  // 直接回傳後端回應（保留狀態碼與標頭）
  const respHeaders = new Headers(resp.headers);
  // 防止跨來源問題，讓瀏覽器可讀取 JSON
  respHeaders.set('access-control-allow-origin', url.origin);
  respHeaders.set('access-control-allow-credentials', 'true');

  return new Response(resp.body, {
    status: resp.status,
    statusText: resp.statusText,
    headers: respHeaders,
  });
}









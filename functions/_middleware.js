export async function onRequest(context) {
  try {
    return await context.next();
  } catch (err) {
    // For all routes that don't match a file, return index.html
    return context.env.ASSETS.fetch(new Request(new URL("/index.html", context.request.url)));
  }
}













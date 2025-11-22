import { onRequest as __api_v2___path___js_onRequest } from "C:\\Users\\miama\\Desktop\\system-new\\functions\\api\\v2\\[[path]].js"
import { onRequest as ___middleware_js_onRequest } from "C:\\Users\\miama\\Desktop\\system-new\\functions\\_middleware.js"

export const routes = [
    {
      routePath: "/api/v2/:path*",
      mountPath: "/api/v2",
      method: "",
      middlewares: [],
      modules: [__api_v2___path___js_onRequest],
    },
  {
      routePath: "/",
      mountPath: "/",
      method: "",
      middlewares: [___middleware_js_onRequest],
      modules: [],
    },
  ]
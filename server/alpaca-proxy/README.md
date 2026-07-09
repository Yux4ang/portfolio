# Alpaca 价格代理服务

这是一个独立的、极简的 Cloudflare Worker，作用是安全地转发前端到 Alpaca Market Data API 的请求，避免把 Alpaca 的 API Key/Secret 暴露在浏览器端代码里。

## 为什么需要这个？

Alpaca 官方 API：
1. 不支持浏览器直接跨域调用（无 CORS）
2. 需要在请求头里带上密钥，前端代码里的任何密钥都能被用户轻易看到

所以密钥必须放在服务端。这个 Worker 就是最小化的服务端中转层。

## 部署步骤

```bash
cd server/alpaca-proxy
npm install
npx wrangler login
npx wrangler secret put ALPACA_API_KEY
npx wrangler secret put ALPACA_API_SECRET
npx wrangler deploy
```

部署成功后，Wrangler 会输出一个类似 `https://alpaca-price-proxy.<你的子域>.workers.dev` 的地址。

## 配置前端

把上面得到的地址填到前端项目根目录（不是这个 server 目录）的 `.env.local` 文件里：

```
VITE_PRICE_PROXY_BASE_URL=https://alpaca-price-proxy.xxx.workers.dev
```

## 本地开发调试代理本身

```bash
cd server/alpaca-proxy
npm install
npx wrangler dev --port 8787
```

前端项目的 `vite.config.ts` 已经配置好会把 `/api/proxy` 请求转发到 `http://localhost:8787`，所以本地开发时前端不需要额外配置 `VITE_PRICE_PROXY_BASE_URL`（留空即可，默认走 `/api/proxy`）。

## 如果不想用 Cloudflare Worker

这个 Worker 逻辑非常简单（一个 fetch 请求 + 加请求头），可以很容易改写成：
- Vercel Edge Function / Serverless Function
- Netlify Function
- 自己的 Node.js/Express 后端里加一个路由

核心逻辑都在 `worker.ts` 里，只有约 30 行，照着搬过去改造成对应平台的入口函数格式即可。

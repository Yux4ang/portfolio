/**
 * ============================================================================
 * Finnhub 价格代理 —— Cloudflare Worker 版本
 * ============================================================================
 * Finnhub 免费版没有批量报价接口，每个 symbol 需要单独请求一次。
 * API Key 放在服务端，由服务端代为发起请求，前端只请求这个代理。
 *
 * 部署步骤：
 *   1. cd server/alpaca-proxy   (文件夹名不影响功能，可以先不改)
 *   2. wrangler login
 *   3. wrangler secret put FINNHUB_API_KEY   (输入你的 Finnhub API Key)
 *   4. wrangler deploy
 *   5. 部署成功后会得到一个形如 https://xxx.workers.dev 的 URL，
 *      把它填到前端项目根目录的 .env.local 里：
 *      VITE_PRICE_PROXY_BASE_URL=https://xxx.workers.dev
 *
 * 本地开发：
 *   wrangler dev --port 8787
 *   这样 Vite dev server 配置的 /api/proxy -> http://localhost:8787 就能生效
 */

export interface Env {
  FINNHUB_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    if (url.pathname === '/finnhub/quote') {
      const symbol = url.searchParams.get('symbol');
      if (!symbol) {
        return jsonResponse({ error: 'missing symbol param' }, 400);
      }
      const finnhubUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
        symbol
      )}&token=${env.FINNHUB_API_KEY}`;
      let finnhubRes: Response;
      try {
        finnhubRes = await fetch(finnhubUrl);
      } catch (err) {
        return jsonResponse({ error: 'upstream fetch failed', detail: String(err) }, 502);
      }
      const rawText = await finnhubRes.text();
      try {
        const data = JSON.parse(rawText);
        return jsonResponse(data, finnhubRes.status);
      } catch (err) {
        return jsonResponse(
          { error: 'upstream returned non-JSON', status: finnhubRes.status, raw: rawText.slice(0, 200) },
          finnhubRes.status || 502
        );
      }
    }

    // 路由：/icon?domain=nvidia.com
    // 代理 DuckDuckGo 图标服务，解决浏览器直连时的 CORS 拦截问题
    if (url.pathname === '/icon') {
      const domain = url.searchParams.get('domain');
      if (!domain) {
        return jsonResponse({ error: 'missing domain param' }, 400);
      }

      const iconUrl = `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico`;
      let iconRes: Response;
      try {
        iconRes = await fetch(iconUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0' },
        });
      } catch (err) {
        return jsonResponse({ error: 'upstream fetch failed', detail: String(err) }, 502);
      }

      if (!iconRes.ok) {
        return jsonResponse({ error: 'icon not found', status: iconRes.status }, 404);
      }

      // 二进制内容直接透传，不走 jsonResponse
      return new Response(iconRes.body, {
        status: 200,
        headers: {
          'Content-Type': iconRes.headers.get('Content-Type') || 'image/x-icon',
          'Cache-Control': 'public, max-age=604800, immutable',
          ...CORS_HEADERS,
        },
      });
    }

    return jsonResponse({ error: 'not found' }, 404);
  },
};

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}
const ALLOWED = ['/simple/price', '/coins/', '/search'];

export default async function handler(req, res) {
  const upstreamPath = req.url.replace(/^\/api\/cg/, '');

  if (!ALLOWED.some((p) => upstreamPath.startsWith(p))) {
    return res.status(400).json({ error: 'Path not allowed' });
  }

  const headers = { accept: 'application/json' };
  if (process.env.COINGECKO_API_KEY) {
    headers['x-cg-demo-api-key'] = process.env.COINGECKO_API_KEY;
  }

  try {
    const r = await fetch(`https://api.coingecko.com/api/v3${upstreamPath}`, { headers });
    const body = await r.text();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120');
    res.status(r.status).send(body);
  } catch (e) {
    res.status(502).json({ error: e.message });
  }
}
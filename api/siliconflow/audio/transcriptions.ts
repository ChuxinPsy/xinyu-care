export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const key =
    process.env.SILICONFLOW_API_KEY ||
    process.env.VITE_SILICONFLOW_API_KEY ||
    process.env.NEXT_PUBLIC_SILICONFLOW_API_KEY ||
    '';
  if (!key) { res.status(500).setHeader('Content-Type','application/json'); res.end(JSON.stringify({ error: 'SILICONFLOW_API_KEY 未配置' })); return; }
  try {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c: any) => chunks.push(Buffer.from(c)));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    const body = Buffer.concat(chunks);
    const upstream = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        ...(req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] as string } : {})
      },
      body
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json');
    const traceId = upstream.headers.get('x-siliconcloud-trace-id');
    if (traceId) res.setHeader('x-siliconcloud-trace-id', traceId);
    res.end(text);
  } catch (err: any) {
    res.status(500).setHeader('Content-Type','application/json');
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}

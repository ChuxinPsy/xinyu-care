export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const key = process.env.MODELSCOPE_API_KEY || process.env.VITE_MODELSCOPE_API_KEY || '';
  if (!key) { res.status(500).setHeader('Content-Type','application/json'); res.end(JSON.stringify({ error: 'MODELSCOPE_API_KEY 未配置' })); return; }
  try {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c: any) => chunks.push(Buffer.from(c)));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    const body = chunks.length ? Buffer.concat(chunks) : Buffer.from('{}');
    const upstream = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key}`,
        'Content-Type': req.headers['content-type'] || 'application/json'
      },
      body
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json');
    res.end(text);
  } catch (err: any) {
    res.status(500).setHeader('Content-Type','application/json');
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}


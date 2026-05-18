const clampOpenRouterMaxTokens = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), fallback);
};

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const key = process.env.OPENROUTER_API_KEY || '';
  if (!key) { res.status(500).setHeader('Content-Type','application/json'); res.end(JSON.stringify({ error: 'OPENROUTER_API_KEY 未配置' })); return; }
  try {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c: any) => chunks.push(Buffer.from(c)));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    const rawBody = chunks.length ? Buffer.concat(chunks).toString('utf-8') : '{}';
    const requestBody = JSON.parse(rawBody);
    const hasImage = JSON.stringify(requestBody.messages || []).includes('"image_url"');
    const {
      max_tokens: requestedMaxTokens,
      max_completion_tokens: _requestedMaxCompletionTokens,
      ...safeRequestBody
    } = requestBody;
    const maxTokens = clampOpenRouterMaxTokens(requestedMaxTokens, hasImage ? 256 : 512);
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${key.trim()}`,
        'Content-Type': req.headers['content-type'] || 'application/json',
        'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
        'X-Title': process.env.OPENROUTER_APP_NAME || 'XinyuCare',
      },
      body: JSON.stringify({
        ...safeRequestBody,
        model: hasImage
          ? (process.env.OPENROUTER_VISION_MODEL || 'qwen/qwen2.5-vl-72b-instruct')
          : (process.env.OPENROUTER_TEXT_MODEL || 'deepseek/deepseek-chat-v3-0324'),
        max_tokens: maxTokens,
      })
    });
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json');
    res.end(text);
  } catch (err: any) {
    res.status(500).setHeader('Content-Type','application/json');
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}

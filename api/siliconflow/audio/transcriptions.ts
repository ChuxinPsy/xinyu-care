export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  const openRouterKey = process.env.OPENROUTER_API_KEY || '';
  const key =
    openRouterKey ||
    process.env.SILICONFLOW_API_KEY ||
    process.env.VITE_SILICONFLOW_API_KEY ||
    process.env.NEXT_PUBLIC_SILICONFLOW_API_KEY ||
    '';
  if (!key) { res.status(500).setHeader('Content-Type','application/json'); res.end(JSON.stringify({ error: 'OPENROUTER_API_KEY 或 SILICONFLOW_API_KEY 未配置' })); return; }
  try {
    const chunks: Buffer[] = [];
    await new Promise<void>((resolve, reject) => {
      req.on('data', (c: any) => chunks.push(Buffer.from(c)));
      req.on('end', () => resolve());
      req.on('error', reject);
    });
    const body = Buffer.concat(chunks);
    let upstream: Response;
    if (openRouterKey) {
      const request = new Request('http://localhost/audio', {
        method: 'POST',
        headers: req.headers,
        body,
      } as any);
      const form = await request.formData();
      const file = form.get('file') as File | null;
      if (!file) throw new Error('音频文件不能为空');
      const buffer = Buffer.from(await file.arrayBuffer());
      const format = (file.name || 'audio.wav').split('.').pop()?.toLowerCase() || 'wav';
      upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.OPENROUTER_SITE_URL || 'http://localhost:5173',
          'X-Title': process.env.OPENROUTER_APP_NAME || 'XinyuCare',
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_TRANSCRIPTION_MODEL || 'mistralai/voxtral-small-24b-2507',
          messages: [{
            role: 'user',
            content: [
              { type: 'text', text: '请把这段音频转写成中文文本。只返回转写文本。' },
              {
                type: 'input_audio',
                input_audio: {
                  data: buffer.toString('base64'),
                  format,
                },
              },
            ],
          }],
          stream: false,
          max_tokens: 256,
        }),
      });
    } else {
      upstream = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          ...(req.headers['content-type'] ? { 'Content-Type': req.headers['content-type'] as string } : {})
        },
        body
      });
    }
    const text = await upstream.text();
    res.status(upstream.status).setHeader('Content-Type', 'application/json');
    const traceId = upstream.headers.get('x-siliconcloud-trace-id');
    if (traceId) res.setHeader('x-siliconcloud-trace-id', traceId);
    if (openRouterKey && upstream.ok) {
      const data = JSON.parse(text);
      res.end(JSON.stringify({ text: data?.choices?.[0]?.message?.content || '' }));
    } else {
      res.end(text);
    }
  } catch (err: any) {
    res.status(500).setHeader('Content-Type','application/json');
    res.end(JSON.stringify({ error: String(err?.message || err) }));
  }
}

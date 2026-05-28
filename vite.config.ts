import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

import { miaodaDevPlugin } from "miaoda-sc-plugin";

const clampOpenRouterMaxTokens = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(Math.floor(parsed), fallback);
};

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || './';

  return {
    base,
    publicDir: 'public',
    server: {
      allowedHosts: ['jp.jerrypsy.top'],
      proxy: {
        '/api': {
          target: env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:8088',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        maxParallelFileOps: 64,
      },
    },
    plugins: [
      {
        name: 'code-server-proxy-base-compat',
        configureServer(server) {
          const normalizedBase = base.startsWith('/') && base.endsWith('/')
            ? base.slice(0, -1)
            : '';

          if (!normalizedBase) return;

          server.middlewares.use((req, _res, next) => {
            const url = req.url || '';
            if (url.startsWith(`${normalizedBase}/api/`)) {
              req.url = url.slice(normalizedBase.length);
              next();
              return;
            }

            if (url.startsWith(`${normalizedBase}/innerapi/`)) {
              req.url = url.slice(normalizedBase.length);
              next();
              return;
            }

            const shouldRewrite =
              !url.startsWith(normalizedBase) &&
              (
                url.startsWith('/@') ||
                url.startsWith('/src/') ||
                url.startsWith('/node_modules/') ||
                url.startsWith('/images/') ||
                url.startsWith('/assets/') ||
                url === '/bg.png' ||
                url === '/sh.png' ||
                url === '/favicon.png' ||
                url === '/temple_run_2_icon.png'
              );

            if (shouldRewrite) {
              req.url = `${normalizedBase}${url}`;
            }

            next();
          });
        },
      },
      react(),
      svgr({
        svgrOptions: {
          icon: true, exportType: 'named', namedExport: 'ReactComponent',
        },
      }),
      (miaodaDevPlugin() as any),
      {
        name: 'openrouter-chat-proxy',
        configureServer(server: any) {
          server.middlewares.use('/innerapi/v1/openrouter/chat/completions', async (req: any, res: any) => {
            const key = env.OPENROUTER_API_KEY || '';
            console.log('[AI Chat Proxy] Request received. Provider: OpenRouter');
            if (!key) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'OPENROUTER_API_KEY 未配置' }));
              return;
            }
            try {
              const chunks: Buffer[] = [];
              await new Promise<void>((resolve, reject) => {
                req.on('data', (c: any) => chunks.push(Buffer.from(c)));
                req.on('end', () => resolve());
                req.on('error', reject);
              });
              const body = chunks.length ? Buffer.concat(chunks).toString('utf-8') : '{}';
              const requestBody = JSON.parse(body);
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
                  'Content-Type': 'application/json',
                  'Accept': 'application/json, text/event-stream',
                  'HTTP-Referer': env.OPENROUTER_SITE_URL || 'http://localhost:5173',
                  'X-Title': env.OPENROUTER_APP_NAME || 'XinyuCare',
                },
                body: JSON.stringify({
                  ...safeRequestBody,
                  model: hasImage
                    ? (env.OPENROUTER_VISION_MODEL || 'qwen/qwen2.5-vl-72b-instruct')
                    : (env.OPENROUTER_TEXT_MODEL || 'deepseek/deepseek-chat-v3-0324'),
                  max_tokens: maxTokens,
                }),
              });

              res.statusCode = upstream.status;
              res.setHeader('Content-Type', upstream.headers.get('Content-Type') || 'application/json');

              if (upstream.body) {
                const reader = upstream.body.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  res.write(value);
                }
              }
              res.end();
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: String(err?.message || err) }));
            }
          });
        }
      },
      {
        name: 'openrouter-audio-proxy',
        configureServer(server: any) {
          server.middlewares.use('/innerapi/v1/openrouter/audio/transcriptions', async (req: any, res: any) => {
            const key = env.OPENROUTER_API_KEY || '';
            if (!key) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'OPENROUTER_API_KEY 未配置' }));
              return;
            }
            try {
              const chunks: Buffer[] = [];
              await new Promise<void>((resolve, reject) => {
                req.on('data', (c: any) => chunks.push(Buffer.from(c)));
                req.on('end', () => resolve());
                req.on('error', reject);
              });
              const body = Buffer.concat(chunks);

              const request = new Request('http://localhost/audio', {
                method: 'POST',
                headers: req.headers,
                body,
              } as any);
              const form = await request.formData();
              const file = form.get('file') as File | null;
              if (!file) throw new Error('音频文件不能为空');
              const buffer = Buffer.from(await file.arrayBuffer());
              const filename = file.name || 'audio.wav';
              const format = filename.split('.').pop()?.toLowerCase() || 'wav';
              const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json',
                  'HTTP-Referer': env.OPENROUTER_SITE_URL || 'http://localhost:5173',
                  'X-Title': env.OPENROUTER_APP_NAME || 'XinyuCare',
                },
                body: JSON.stringify({
                  model: env.OPENROUTER_TRANSCRIPTION_MODEL || 'mistralai/voxtral-small-24b-2507',
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
              
              const text = await upstream.text();
              res.statusCode = upstream.status;
              res.setHeader('Content-Type', 'application/json');
              if (upstream.ok) {
                const data = JSON.parse(text);
                res.end(JSON.stringify({ text: data?.choices?.[0]?.message?.content || '' }));
              } else {
                res.end(text);
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: String(err?.message || err) }));
            }
          });
        }
      }
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});

import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import path from 'path';

import { miaodaDevPlugin } from "miaoda-sc-plugin";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all envs regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');
  const base = env.VITE_BASE_PATH || './';

  return {
    base,
    publicDir: 'public',
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
        name: 'modelscope-intern-proxy',
        configureServer(server: any) {
          server.middlewares.use('/innerapi/v1/modelscope/chat/completions', async (req: any, res: any) => {
            const key = env.MODELSCOPE_API_KEY || env.VITE_MODELSCOPE_API_KEY || '';
            console.log(`[ModelScope Proxy] Request received. Key length: ${key.length}`);
            if (!key) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'MODELSCOPE_API_KEY 未配置' }));
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
              const upstream = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${key.trim()}`,
                  'X-Modelscope-Token': key.trim(),
                  'Content-Type': 'application/json',
                  'Accept': 'application/json, text/event-stream'
                },
                body
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
        name: 'volc-ark-responses-proxy',
        configureServer(server: any) {
          server.middlewares.use('/innerapi/v1/volc/responses', async (req: any, res: any) => {
            const key = env.VOLC_ARK_API_KEY || env.VITE_VOLC_ARK_API_KEY || '';
            if (!key) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'VOLC_ARK_API_KEY 未配置' }));
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
              const upstream = await fetch('https://ark.cn-beijing.volces.com/api/v3/responses', {
                method: 'POST',
                headers: {
                  'Authorization': `Bearer ${key}`,
                  'Content-Type': 'application/json'
                },
                body
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
        name: 'siliconflow-audio-proxy',
        configureServer(server: any) {
          server.middlewares.use('/innerapi/v1/siliconflow/audio/transcriptions', async (req: any, res: any) => {
            const key = env.SILICONFLOW_API_KEY || env.VITE_SILICONFLOW_API_KEY || '';
            if (!key) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'SILICONFLOW_API_KEY 未配置' }));
              return;
            }
            try {
              // Forward the multipart/form-data request
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
                  'Content-Type': req.headers['content-type'] || 'multipart/form-data',
                },
                body
              });
              
              const text = await upstream.text();
              res.statusCode = upstream.status;
              res.setHeader('Content-Type', 'application/json');
              res.end(text);
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

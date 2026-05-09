
    import { defineConfig, loadConfigFromFile } from "vite";
    import type { Plugin, ConfigEnv } from "vite";
    import tailwindcss from "tailwindcss";
    import autoprefixer from "autoprefixer";
    import fs from "fs/promises";
    import path from "path";
    import dotenv from "dotenv";
    import {
      makeTagger,
      injectedGuiListenerPlugin,
      injectOnErrorPlugin,
      monitorPlugin
    } from "miaoda-sc-plugin";

    dotenv.config();
    const env: ConfigEnv = { command: "serve", mode: "development" };
    const configFile = path.resolve(__dirname, "vite.config.ts");
    const result = await loadConfigFromFile(env, configFile);
    const userConfig = result?.config;

    export default defineConfig({
      ...userConfig,
      plugins: [
        makeTagger(),
        injectedGuiListenerPlugin({
          path: 'https://resource-static.cdn.bcebos.com/common/v2/injected.js'
        }),
        injectOnErrorPlugin(),
        ...(userConfig?.plugins || []),
        
{
  name: 'hmr-toggle',
  configureServer(server) {
    let hmrEnabled = true;

    // 包装原来的 send 方法
    const _send = server.ws.send;
    server.ws.send = (payload) => {
      if (hmrEnabled) {
        return _send.call(server.ws, payload);
      } else {
        console.log('[HMR disabled] skipped payload:', payload.type);
      }
    };

    // 提供接口切换 HMR
    server.middlewares.use('/innerapi/v1/sourcecode/__hmr_off', (req, res) => {
      hmrEnabled = false;
      let body = {
          status: 0,
          msg: 'HMR disabled'
      };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    });

    server.middlewares.use('/innerapi/v1/sourcecode/__hmr_on', (req, res) => {
      hmrEnabled = true;
      let body = {
          status: 0,
          msg: 'HMR enabled'
      };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    });

    // 注册一个 HTTP API，用来手动触发一次整体刷新
    server.middlewares.use('/innerapi/v1/sourcecode/__hmr_reload', (req, res) => {
      if (hmrEnabled) {
        server.ws.send({
          type: 'full-reload',
          path: '*', // 整页刷新
        });
      }
      res.statusCode = 200;
      let body = {
          status: 0,
          msg: 'Manual full reload triggered'
      };
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    });
  },
  load(id) {
    if (id === 'virtual:after-update') {
      return `
        if (import.meta.hot) {
          import.meta.hot.on('vite:afterUpdate', () => {
            window.postMessage(
              {
                type: 'editor-update'
              },
              '*'
            );
          });
        }
      `;
    }
  },
  transformIndexHtml(html) {
    return {
      html,
      tags: [
        {
          tag: 'script',
          attrs: {
            type: 'module',
            src: '/@id/virtual:after-update'
          },
          injectTo: 'body'
        }
      ]
    };
  }
},
,
// 火山方舟 Doubao responses 代理中间件（仅开发态）
{
      name: 'volc-ark-responses-proxy',
      configureServer(server) {
        const key = process.env.VOLC_ARK_API_KEY || process.env.VITE_VOLC_ARK_API_KEY || '';
        server.middlewares.use('/innerapi/v1/volc/responses', async (req, res) => {
          if (!key) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'VOLC_ARK_API_KEY 未配置' }));
            return;
          }
          try {
            const chunks: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
              req.on('data', (c) => chunks.push(Buffer.from(c)));
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
    },
    {
      name: 'siliconflow-audio-proxy',
      configureServer(server) {
        const key = process.env.SILICONFLOW_API_KEY || process.env.VITE_SILICONFLOW_API_KEY || '';
        server.middlewares.use('/innerapi/v1/siliconflow/audio/transcriptions', async (req, res) => {
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
              req.on('data', (c) => chunks.push(Buffer.from(c)));
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
    },
    {
      name: 'modelscope-intern-proxy',
      configureServer(server) {
        const key = process.env.MODELSCOPE_API_KEY || process.env.VITE_MODELSCOPE_API_KEY || '';
        server.middlewares.use('/innerapi/v1/modelscope/chat/completions', async (req, res) => {
          if (!key) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'MODELSCOPE_API_KEY 未配置' }));
            return;
          }
          try {
            const chunks: Buffer[] = [];
            await new Promise<void>((resolve, reject) => {
              req.on('data', (c) => chunks.push(Buffer.from(c)));
              req.on('end', () => resolve());
              req.on('error', reject);
            });
            const body = chunks.length ? Buffer.concat(chunks).toString('utf-8') : '{}';
            const upstream = await fetch('https://api-inference.modelscope.cn/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${key}`,
                'Content-Type': 'application/json'
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
    },
        monitorPlugin(
          {
            scriptSrc: 'https://resource-static.cdn.bcebos.com/sentry/browser.sentry.min.js',
            sentryDsn: 'https://e3c07b90fcb5207f333d50ac24a99d3e@sentry.miaoda.cn/233',
            environment: 'undefined',
            environment: 'undefined',
            appId: 'app-97zabxvzebcx'
          }
        )
      ]
    });
    

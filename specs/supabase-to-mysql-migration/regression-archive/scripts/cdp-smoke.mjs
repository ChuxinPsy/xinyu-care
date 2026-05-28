const DEBUG_PORT = process.env.CDP_PORT || '9222';
const TARGET_HINT = process.env.CDP_TARGET_HINT || 'about:blank';

class CdpClient {
  constructor(wsUrl) {
    this.wsUrl = wsUrl;
    this.id = 0;
    this.ws = null;
    this.pending = new Map();
    this.handlers = new Map();
  }

  async connect() {
    this.ws = new WebSocket(this.wsUrl);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('CDP connect timeout')), 10000);
      this.ws.addEventListener('open', () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      this.ws.addEventListener('error', (event) => {
        clearTimeout(timer);
        reject(event.error || new Error('CDP websocket error'));
      }, { once: true });
    });

    this.ws.addEventListener('message', (event) => {
      const message = JSON.parse(String(event.data));
      if (message.id) {
        const pending = this.pending.get(message.id);
        if (!pending) {
          return;
        }
        this.pending.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message || 'CDP error'));
          return;
        }
        pending.resolve(message.result);
        return;
      }

      const listeners = this.handlers.get(message.method);
      if (!listeners) {
        return;
      }
      for (const listener of listeners) {
        listener(message.params || {});
      }
    });
  }

  async close() {
    if (!this.ws) {
      return;
    }
    this.ws.close();
    await new Promise((resolve) => {
      if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
        resolve();
        return;
      }
      this.ws.addEventListener('close', () => resolve(), { once: true });
    });
  }

  on(method, listener) {
    const listeners = this.handlers.get(method) || [];
    listeners.push(listener);
    this.handlers.set(method, listeners);
  }

  once(method, timeoutMs = 10000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for ${method}`));
      }, timeoutMs);

      const listener = (params) => {
        clearTimeout(timer);
        const listeners = this.handlers.get(method) || [];
        this.handlers.set(method, listeners.filter((item) => item !== listener));
        resolve(params);
      };

      this.on(method, listener);
    });
  }

  send(method, params = {}) {
    if (!this.ws) {
      throw new Error('CDP websocket not connected');
    }
    const id = ++this.id;
    this.ws.send(JSON.stringify({ id, method, params }));
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
    });
  }
}

async function getTargetWsUrl() {
  const response = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`);
  if (!response.ok) {
    throw new Error(`Failed to list CDP targets: ${response.status}`);
  }

  const targets = await response.json();
  const target =
    targets.find((item) => item.url === TARGET_HINT || item.title === TARGET_HINT) ||
    targets.find((item) => item.url === 'about:blank') ||
    targets[0];

  if (!target?.webSocketDebuggerUrl) {
    throw new Error('No debuggable Chrome target found');
  }

  return target.webSocketDebuggerUrl;
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function clearTrace(trace) {
  trace.requests.length = 0;
  trace.responses.length = 0;
  trace.consoleLines.length = 0;
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

async function setupPage(client) {
  const requests = [];
  const responses = [];
  const consoleLines = [];

  client.on('Network.requestWillBeSent', (params) => {
    requests.push({
      url: params.request?.url,
      method: params.request?.method,
      type: params.type,
    });
  });

  client.on('Network.responseReceived', (params) => {
    responses.push({
      url: params.response?.url,
      status: params.response?.status,
      mimeType: params.response?.mimeType,
    });
  });

  client.on('Runtime.consoleAPICalled', (params) => {
    consoleLines.push({
      type: params.type,
      text: (params.args || []).map((arg) => arg.value ?? arg.description ?? '').join(' '),
    });
  });

  client.on('Log.entryAdded', (params) => {
    consoleLines.push({
      type: params.entry?.level || 'log',
      text: params.entry?.text || '',
    });
  });

  await client.send('Page.enable');
  await client.send('DOM.enable');
  await client.send('Runtime.enable');
  await client.send('Network.enable');
  await client.send('Network.setCacheDisabled', { cacheDisabled: true });
  await client.send('Log.enable');

  return { requests, responses, consoleLines };
}

async function navigate(client, url) {
  const loadEvent = client.once('Page.loadEventFired', 5000).catch(() => null);
  await client.send('Page.navigate', { url });
  await loadEvent;
  await wait(1500);
}

async function evalInPage(client, expression, awaitPromise = true) {
  const result = await client.send('Runtime.evaluate', {
    expression,
    awaitPromise,
    returnByValue: true,
  });
  return result.result?.value;
}

async function waitForCondition(client, expression, timeoutMs = 15000, intervalMs = 250) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await evalInPage(client, expression);
    if (value) {
      return value;
    }
    await wait(intervalMs);
  }
  throw new Error(`Timeout waiting for condition: ${expression}`);
}

async function waitForStableBodyText(client, timeoutMs = 30000, intervalMs = 500, stableRounds = 4) {
  const start = Date.now();
  let previous = '';
  let stableCount = 0;

  while (Date.now() - start < timeoutMs) {
    const current = await evalInPage(client, 'document.body.innerText');
    if (current === previous) {
      stableCount += 1;
      if (stableCount >= stableRounds) {
        return current;
      }
    } else {
      previous = current;
      stableCount = 0;
    }
    await wait(intervalMs);
  }

  return evalInPage(client, 'document.body.innerText');
}

async function waitForResponse(trace, urlPart, timeoutMs = 60000, intervalMs = 500) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const match = trace.responses.find((item) => item.url?.includes(urlPart));
    if (match) {
      return match;
    }
    await wait(intervalMs);
  }
  return null;
}

async function installAutoConfirm(client) {
  await evalInPage(client, `
    (() => {
      window.confirm = () => true;
      window.alert = () => {};
      return true;
    })()
  `);
}

async function clickByText(client, tagName, text) {
  const escapedText = JSON.stringify(text);
  const escapedTagName = JSON.stringify(tagName.toUpperCase());
  const expression = `
    (() => {
      const target = Array.from(document.querySelectorAll(${escapedTagName}.toLowerCase()))
        .find((node) =>
          (node.textContent || '').trim() === ${escapedText}
          && node.getClientRects().length > 0
        );
      if (!target) return false;
      target.click();
      return true;
    })()
  `;
  return waitForCondition(client, expression);
}

async function clickByTextContains(client, tagName, text) {
  const escapedText = JSON.stringify(text);
  const escapedTagName = JSON.stringify(tagName.toUpperCase());
  const expression = `
    (() => {
      const target = Array.from(document.querySelectorAll(${escapedTagName}.toLowerCase()))
        .find((node) =>
          (node.textContent || '').includes(${escapedText})
          && node.getClientRects().length > 0
        );
      if (!target) return false;
      target.click();
      return true;
    })()
  `;
  return waitForCondition(client, expression);
}

async function clickSelector(client, selector) {
  const expression = `
    (() => {
      const target = document.querySelector(${JSON.stringify(selector)});
      if (!target) return false;
      const options = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1 };
      target.dispatchEvent(new PointerEvent('pointerdown', options));
      target.dispatchEvent(new MouseEvent('mousedown', options));
      target.dispatchEvent(new PointerEvent('pointerup', options));
      target.dispatchEvent(new MouseEvent('mouseup', options));
      target.click();
      return true;
    })()
  `;
  return waitForCondition(client, expression);
}

async function clickSelectorIfPresent(client, selector) {
  return evalInPage(client, `
    (() => {
      const target = document.querySelector(${JSON.stringify(selector)});
      if (!target) return false;
      const options = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1 };
      target.dispatchEvent(new PointerEvent('pointerdown', options));
      target.dispatchEvent(new MouseEvent('mousedown', options));
      target.dispatchEvent(new PointerEvent('pointerup', options));
      target.dispatchEvent(new MouseEvent('mouseup', options));
      target.click();
      return true;
    })()
  `);
}

async function setInputValue(client, selector, value) {
  const expression = `
    (() => {
      const input = document.querySelector(${JSON.stringify(selector)});
      if (!input) return false;
      input.focus();
      const prototype = input.tagName === 'TEXTAREA'
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');
      if (descriptor?.set) {
        descriptor.set.call(input, ${JSON.stringify(value)});
      } else {
        input.value = ${JSON.stringify(value)};
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    })()
  `;
  return waitForCondition(client, expression);
}

async function clickByExpression(client, expression) {
  return waitForCondition(client, expression);
}

async function clickTopRightIconButton(client) {
  const expression = `
    (() => {
      const visibleButtons = Array.from(document.querySelectorAll('button'))
        .filter((node) => node.getClientRects().length > 0)
        .map((node) => ({
          node,
          text: (node.textContent || '').trim(),
          rect: node.getBoundingClientRect(),
          iconClass: Array.from(node.querySelectorAll('svg'))
            .map((icon) => icon.getAttribute('class') || '')
            .join(' '),
        }));

      const target = visibleButtons.find((item) =>
        !item.text
        && item.rect.top >= 0
        && item.rect.top < window.innerHeight * 0.45
        && item.rect.left > window.innerWidth * 0.55
        && item.rect.width <= 64
        && item.rect.height <= 64
      ) || visibleButtons.find((item) =>
        /(lucide-edit|lucide-square-pen|lucide-pencil)/.test(item.iconClass)
      );

      if (!target) return false;
      target.node.click();
      return true;
    })()
  `;
  return waitForCondition(client, expression);
}

async function dispatchMouseEvent(client, type, x, y, extra = {}) {
  return client.send('Input.dispatchMouseEvent', {
    type,
    x,
    y,
    button: 'left',
    buttons: type === 'mouseReleased' ? 0 : 1,
    clickCount: 1,
    ...extra,
  });
}

async function drawOnFirstCanvas(client, strokes) {
  const canvasRect = await evalInPage(client, `
    (() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    })()
  `);

  if (!canvasRect || !canvasRect.width || !canvasRect.height) {
    return false;
  }

  for (const points of strokes) {
    if (!points.length) continue;
    const [startX, startY] = points[0];
    await dispatchMouseEvent(client, 'mouseMoved', canvasRect.left + startX, canvasRect.top + startY);
    await dispatchMouseEvent(client, 'mousePressed', canvasRect.left + startX, canvasRect.top + startY);
    for (const [x, y] of points.slice(1)) {
      await dispatchMouseEvent(client, 'mouseMoved', canvasRect.left + x, canvasRect.top + y);
      await wait(60);
    }
    const [endX, endY] = points[points.length - 1];
    await dispatchMouseEvent(client, 'mouseReleased', canvasRect.left + endX, canvasRect.top + endY);
    await wait(140);
  }

  return true;
}

async function setFileInputFiles(client, selector, files) {
  const { root } = await client.send('DOM.getDocument', { depth: -1, pierce: true });
  const { nodeId } = await client.send('DOM.querySelector', {
    nodeId: root.nodeId,
    selector,
  });

  if (!nodeId) {
    throw new Error(`File input not found for selector: ${selector}`);
  }

  await client.send('DOM.setFileInputFiles', {
    nodeId,
    files,
  });
}

async function installFakeCamera(client) {
  await evalInPage(client, `
    (() => {
      const originalGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);
      const originalEnumerateDevices = navigator.mediaDevices?.enumerateDevices?.bind(navigator.mediaDevices);

      const createStream = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 720;
        canvas.height = 960;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('2d context unavailable');

        let tick = 0;
        const render = () => {
          tick += 1;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
          gradient.addColorStop(0, '#0f172a');
          gradient.addColorStop(0.55, '#1d4ed8');
          gradient.addColorStop(1, '#0891b2');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.fillStyle = 'rgba(255,255,255,0.08)';
          for (let i = 0; i < 14; i += 1) {
            const x = (i * 53 + tick * 7) % canvas.width;
            const y = (i * 71 + tick * 5) % canvas.height;
            ctx.beginPath();
            ctx.arc(x, y, 3 + (i % 3), 0, Math.PI * 2);
            ctx.fill();
          }

          ctx.save();
          ctx.translate(canvas.width / 2, canvas.height / 2 + 20);
          const blink = tick % 24 > 20 ? 2 : 12;
          const mouthCurve = Math.sin(tick / 18) * 8;
          ctx.fillStyle = '#f8fafc';
          ctx.beginPath();
          ctx.ellipse(0, 0, 180, 230, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 6;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(-98, -78);
          ctx.quadraticCurveTo(-65, -95 - mouthCurve / 8, -30, -76);
          ctx.moveTo(30, -76);
          ctx.quadraticCurveTo(65, -95 + mouthCurve / 8, 98, -78);
          ctx.stroke();

          ctx.fillStyle = '#0f172a';
          ctx.fillRect(-92, -38, 54, blink);
          ctx.fillRect(38, -38, 54, blink);
          ctx.beginPath();
          ctx.arc(-65, -32, 12, 0, Math.PI * 2);
          ctx.arc(65, -32, 12, 0, Math.PI * 2);
          ctx.fill();

          ctx.lineWidth = 7;
          ctx.beginPath();
          ctx.moveTo(0, -8);
          ctx.lineTo(-12, 34);
          ctx.lineTo(12, 34);
          ctx.stroke();

          ctx.beginPath();
          ctx.moveTo(-58, 102);
          ctx.quadraticCurveTo(0, 138 + mouthCurve, 58, 102);
          ctx.stroke();
          ctx.restore();

          requestAnimationFrame(render);
        };

        render();
        return canvas.captureStream(12);
      };

      const fakeStream = createStream();
      window.__xinyuFakeVideoStream = fakeStream;

      navigator.mediaDevices.getUserMedia = async (constraints) => {
        const wantsVideo = Boolean(constraints && typeof constraints === 'object' && constraints.video);
        if (wantsVideo) return fakeStream;
        if (originalGetUserMedia) return originalGetUserMedia(constraints);
        throw new Error('getUserMedia unavailable');
      };

      if (navigator.mediaDevices && originalEnumerateDevices) {
        navigator.mediaDevices.enumerateDevices = async () => {
          const devices = await originalEnumerateDevices();
          const hasVideo = devices.some((item) => item.kind === 'videoinput');
          if (hasVideo) return devices;
          return [
            ...devices,
            {
              deviceId: 'xinyu-fake-camera',
              groupId: 'xinyu-fake-group',
              kind: 'videoinput',
              label: 'Xinyu Fake Camera',
              toJSON() { return this; },
            },
          ];
        };
      }

      return true;
    })()
  `);
}

async function collectPageState(client) {
  return evalInPage(client, `
    (() => {
      const toasts = Array.from(document.querySelectorAll('[data-sonner-toast]')).map((node) => node.textContent?.trim()).filter(Boolean);
      const visibleButtons = Array.from(document.querySelectorAll('button'))
        .filter((node) => node.getClientRects().length > 0)
        .map((node) => (node.textContent || '').trim())
        .filter(Boolean)
        .slice(0, 40);
      const progressText =
        Array.from(document.querySelectorAll('span, div, p'))
          .map((node) => (node.textContent || '').trim())
          .find((text) => /^\\d+\\s*\\/\\s*3\\s*完成$/.test(text))
        || '';
      return {
        href: window.location.href,
        hash: window.location.hash,
        token: window.localStorage.getItem('xinyu-care.access-token'),
        bodyText: document.body.innerText.slice(0, 3000),
        progressText,
        visibleButtons,
        toasts,
      };
    })()
  `);
}

async function getAssessmentProgress(client) {
  return evalInPage(client, `
    (() => {
      const exact = Array.from(document.querySelectorAll('span, div, p'))
        .map((node) => (node.textContent || '').trim())
        .find((text) => /^\\d+\\s*\\/\\s*3\\s*完成$/.test(text));
      if (exact) return exact;
      const bodyText = document.body.innerText || '';
      const match = bodyText.match(/\\d+\\s*\\/\\s*3\\s*完成/);
      return match ? match[0] : '';
    })()
  `);
}

async function waitForAssessmentProgress(client, expectedProgress, timeoutMs = 20000) {
  await waitForCondition(client, `
    (() => {
      const expected = ${JSON.stringify(expectedProgress)};
      const exact = Array.from(document.querySelectorAll('span, div, p'))
        .map((node) => (node.textContent || '').trim())
        .find((text) => /^\\d+\\s*\\/\\s*3\\s*完成$/.test(text));
      const bodyText = document.body.innerText || '';
      return exact === expected || bodyText.includes(expected);
    })()
  `, timeoutMs);
  return getAssessmentProgress(client);
}

async function clickEnabledQuickResponse(client, text) {
  return waitForCondition(client, `
    (() => {
      const target = Array.from(document.querySelectorAll('button'))
        .find((node) =>
          (node.textContent || '').trim() === ${JSON.stringify(text)}
          && node.getClientRects().length > 0
          && !node.disabled
        );
      if (!target) return false;
      target.click();
      return true;
    })()
  `, 20000);
}

async function waitForScaleProgress(client, expectedIndex, totalQuestions = 9, timeoutMs = 20000) {
  await waitForCondition(client, `
    (() => {
      const expected = ${JSON.stringify(`${expectedIndex} / ${totalQuestions}`)};
      const progressText = Array.from(document.querySelectorAll('span, div, p'))
        .map((node) => (node.textContent || '').trim())
        .find((text) => text === expected);
      const reportVisible = document.body.innerText.includes('评估完成');
      const quickResponseReady = Array.from(document.querySelectorAll('button'))
        .some((node) =>
          (node.textContent || '').trim() === '有时候'
          && node.getClientRects().length > 0
          && !node.disabled
        );
      if (${expectedIndex} >= ${totalQuestions}) {
        return progressText === expected || reportVisible;
      }
      return progressText === expected && quickResponseReady;
    })()
  `, timeoutMs);
}

async function clickExpressionCaptureByVideoRect(client) {
  const videoRect = await evalInPage(client, `
    (() => {
      const video = Array.from(document.querySelectorAll('video'))
        .find((node) => node.getClientRects().length > 0);
      if (!video) return null;
      const rect = video.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    })()
  `);

  if (!videoRect || !videoRect.width || !videoRect.height) {
    throw new Error('Expression video rect unavailable');
  }

  const x = Math.round(videoRect.left + videoRect.width / 2);
  const y = Math.round(videoRect.top + videoRect.height - Math.min(96, Math.max(72, videoRect.height * 0.1)));
  await dispatchMouseEvent(client, 'mouseMoved', x, y);
  await dispatchMouseEvent(client, 'mousePressed', x, y);
  await wait(120);
  await dispatchMouseEvent(client, 'mouseReleased', x, y);
}

async function runAssessmentFullScenario(baseUrl, username, password, audioFilePath) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const authState = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json())
    `);
    const userId = authState?.session?.user?.id;

    await navigate(client, `${baseUrl}#/assessment`);
    await wait(2000);
    await installFakeCamera(client);
    const progressBeforeStart = await getAssessmentProgress(client);
    await clickByText(client, 'button', '开始评估');
    await wait(1800);

    const scaleTexts = [];
    for (let i = 0; i < 9; i += 1) {
      scaleTexts.push(await evalInPage(client, 'document.body.innerText'));
      await clickEnabledQuickResponse(client, '有时候');
      await waitForScaleProgress(client, i + 1, 9, i === 8 ? 30000 : 20000);
    }

    await waitForCondition(client, 'document.body.innerText.includes("评估完成")', 30000);
    const scaleReportState = await collectPageState(client);
    await waitForCondition(client, `
      Array.from(document.querySelectorAll('button')).some((node) => (node.textContent || '').includes('下一步：语音情绪识别'))
    `, 18000);
    await clickByTextContains(client, 'button', '下一步：语音情绪识别');
    const progressAfterScale = await waitForAssessmentProgress(client, '1 / 3 完成');

    clearTrace(trace);
    await setFileInputFiles(client, 'input[type="file"][accept="audio/*"]', [audioFilePath]);
    await waitForCondition(client, 'document.body.innerText.includes("语音识别完成")', 30000);
    const voiceReportState = await collectPageState(client);
    await clickByText(client, 'button', '表情识别');
    const progressAfterVoice = await waitForAssessmentProgress(client, '2 / 3 完成');

    await clickByText(client, 'button', '开始表情识别');
    await waitForCondition(client, 'Boolean(document.querySelector("video"))', 12000);
    await wait(1000);
    await clickExpressionCaptureByVideoRect(client);
    await waitForCondition(client, 'document.body.innerText.includes("表情识别完成")', 30000);
    const expressionReportState = await collectPageState(client);
    const progressAfterExpression = await waitForAssessmentProgress(client, '3 / 3 完成');
    await clickByTextContains(client, 'button', '综合报告');
    await wait(800);
    await clickByText(client, 'button', '生成融合报告');
    await waitForCondition(client, 'document.body.innerText.includes("综合风险分")', 20000);
    const fusionState = await collectPageState(client);

    let assessmentPersistence = null;
    if (userId) {
      for (let attempt = 0; attempt < 15; attempt += 1) {
        assessmentPersistence = await evalInPage(client, `
          fetch(${JSON.stringify(`${apiBase}/data/assessments?select=*`)} +
            '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: ${JSON.stringify(userId)} }])) +
            '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
            '&limit=1', {
              headers: {
                Accept: 'application/json',
                Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
              },
            }).then((response) => response.json())
        `);
        const latestAssessment = assessmentPersistence?.rows?.[0];
        if (
          latestAssessment?.assessment_type === 'fusion_report'
          && latestAssessment?.report?.scaleData
          && latestAssessment?.report?.voiceData
          && latestAssessment?.report?.expressionData
        ) {
          break;
        }
        await wait(2000);
      }
    }

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      scaleTexts,
      progressBeforeStart,
      progressAfterScale,
      progressAfterVoice,
      progressAfterExpression,
      scaleReportState,
      voiceReportState,
      expressionReportState,
      fusionState,
      assessmentPersistence,
    };
  } finally {
    await client.close();
  }
}

async function runAssessmentExpressionInspectScenario(baseUrl, username, password, audioFilePath) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();

  try {
    await setupPage(client);
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    await navigate(client, `${baseUrl}#/assessment`);
    await wait(2000);
    await installFakeCamera(client);
    await clickByText(client, 'button', '开始评估');
    await wait(1800);

    for (let i = 0; i < 9; i += 1) {
      await clickEnabledQuickResponse(client, '有时候');
      await waitForScaleProgress(client, i + 1, 9, i === 8 ? 30000 : 20000);
    }

    await waitForCondition(client, 'document.body.innerText.includes("评估完成")', 30000);
    await clickByTextContains(client, 'button', '下一步：语音情绪识别');
    await waitForAssessmentProgress(client, '1 / 3 完成');
    await setFileInputFiles(client, 'input[type="file"][accept="audio/*"]', [audioFilePath]);
    await waitForCondition(client, 'document.body.innerText.includes("语音识别完成")', 30000);
    await clickByText(client, 'button', '表情识别');
    await waitForAssessmentProgress(client, '2 / 3 完成');
    await clickByText(client, 'button', '开始表情识别');
    await waitForCondition(client, 'Boolean(document.querySelector("video"))', 12000);
    await wait(2000);

    return evalInPage(client, `
      (() => ({
        href: window.location.href,
        bodyText: document.body.innerText.slice(0, 4000),
        buttons: Array.from(document.querySelectorAll('button'))
          .filter((node) => node.getClientRects().length > 0)
          .map((node) => {
            const rect = node.getBoundingClientRect();
            return {
              text: (node.textContent || '').trim(),
              disabled: !!node.disabled,
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              width: Math.round(rect.width),
              height: Math.round(rect.height),
              className: node.className,
              iconClasses: Array.from(node.querySelectorAll('svg')).map((icon) => icon.getAttribute('class') || ''),
            };
          }),
        videos: Array.from(document.querySelectorAll('video')).map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            width: Math.round(rect.width),
            height: Math.round(rect.height),
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            readyState: node.readyState,
          };
        }),
      }))()
    `);
  } finally {
    await client.close();
  }
}

async function runAuthScenario(baseUrl) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    clearTrace(trace);
    await clickSelector(client, '[role="tab"][id$="trigger-signup"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#signup-username"))');

    const username = `auto_${Date.now().toString().slice(-8)}`;
    await setInputValue(client, '#signup-username', username);
    await setInputValue(client, '#signup-password', 'Pass1234');
    await clickSelector(client, 'button[type="submit"]');
    await wait(3000);

    const signupState = await collectPageState(client);
    const signupRequests = trace.requests.slice();
    const signupResponses = trace.responses.slice();
    const signupConsoleLines = trace.consoleLines.slice();

    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    clearTrace(trace);
    await clickSelector(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', 'Pass1234');
    await clickSelector(client, 'button[type="submit"]');
    await wait(3000);

    const loginState = await collectPageState(client);

    return {
      username,
      signupRequests,
      signupResponses,
      signupConsoleLines,
      loginRequests: trace.requests,
      loginResponses: trace.responses,
      loginConsoleLines: trace.consoleLines,
      signupState,
      loginState,
    };
  } finally {
    await client.close();
  }
}

async function runAssessmentScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, `${baseUrl}#/login`);
    await clickSelector(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    await navigate(client, `${baseUrl}#/assessment`);
    await wait(2500);

    const beforeStart = await evalInPage(client, `
      (() => ({
        bodyText: document.body.innerText,
        buttons: Array.from(document.querySelectorAll('button')).map((node) => (node.textContent || '').trim()).filter(Boolean).slice(0, 80),
      }))()
    `);

    await clickByText(client, 'button', '开始评估');
    await wait(4000);

    const afterStart = await evalInPage(client, `
      (() => ({
        bodyText: document.body.innerText,
        buttons: Array.from(document.querySelectorAll('button')).map((node) => (node.textContent || '').trim()).filter(Boolean).slice(0, 120),
      }))()
    `);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      beforeStart,
      afterStart,
    };
  } finally {
    await client.close();
  }
}

async function runAssessmentDialogueScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelector(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    await navigate(client, `${baseUrl}#/assessment`);
    await wait(2500);
    await clickByText(client, 'button', '开始评估');
    await wait(4000);

    const initialState = await evalInPage(client, `
      (() => ({
        bodyText: document.body.innerText,
        buttons: Array.from(document.querySelectorAll('button')).map((node) => (node.textContent || '').trim()).filter(Boolean).slice(0, 120),
      }))()
    `);

    await clickByText(client, 'button', '有时候');
    await waitForStableBodyText(client, 12000, 400, 3);

    const afterAnswerState = await evalInPage(client, `
      (() => ({
        bodyText: document.body.innerText,
        buttons: Array.from(document.querySelectorAll('button')).map((node) => (node.textContent || '').trim()).filter(Boolean).slice(0, 120),
        sessions: Object.keys(window.localStorage)
          .filter((key) => key.startsWith('mindcare_assessment_session_'))
          .map((key) => ({ key, value: window.localStorage.getItem(key) })),
      }))()
    `);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      initialState,
      afterAnswerState,
    };
  } finally {
    await client.close();
  }
}

async function runPatientProfileScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);
    await installAutoConfirm(client);

    const apiBase = apiBaseFromBaseUrl(baseUrl);

    await navigate(client, `${baseUrl}#/profile`);
    await wait(2000);
    const initialProfileState = await collectPageState(client);

    await clickTopRightIconButton(client);
    await waitForCondition(client, 'Boolean(document.querySelector("#pf-full-name"))');
    await setInputValue(client, '#pf-full-name', `档案患者${Date.now().toString().slice(-4)}`);
    await setInputValue(client, '#pf-phone', '13900004567');
    await setInputValue(client, '#pf-wechat', `wx_${Date.now().toString().slice(-6)}`);
    await setInputValue(client, '#pf-email', `${username}@miaoda.com`);
    await setInputValue(client, 'input[placeholder="请输入年龄"]', '29');
    await setInputValue(client, '#pf-height', '173');
    await setInputValue(client, '#pf-weight', '64');
    await clickByText(client, 'button', '头像设置');
    await evalInPage(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('button'))
          .find((node) => (node.textContent || '').includes('🌸') && node.getClientRects().length > 0);
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await clickByText(client, 'button', '背景主题');
    await evalInPage(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('button'))
          .find((node) => (node.textContent || '').includes('森林绿') && node.getClientRects().length > 0);
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    clearTrace(trace);
    await clickByText(client, 'button', '保存更改');
    await waitForResponse(trace, '/api/data/profiles', 20000);
    await wait(2000);
    const editedProfileState = await collectPageState(client);
    const profileFetchState = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json()).then(async (sessionData) => {
        const userId = sessionData?.session?.user?.id;
        const profileUrl = ${JSON.stringify(`${apiBase}/data/profiles?select=*`)} +
          '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'id', value: userId }])) +
          '&limit=1';
        const profileRes = await fetch(profileUrl, {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        });
        return {
          session: sessionData,
          profileEnvelope: await profileRes.json(),
        };
      })
    `);

    await clickByExpression(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('*'))
          .find((node) => (node.textContent || '').includes('查看健康报告') && node.classList?.contains('cursor-pointer'));
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await wait(3500);
    const reportState = await collectPageState(client);
    await client.send('Input.dispatchKeyEvent', { type: 'keyDown', windowsVirtualKeyCode: 27, key: 'Escape', code: 'Escape' });
    await client.send('Input.dispatchKeyEvent', { type: 'keyUp', windowsVirtualKeyCode: 27, key: 'Escape', code: 'Escape' });
    await wait(1000);

    await navigate(client, `${baseUrl}#/profile/privacy`);
    await wait(1500);
    const privacyBefore = await evalInPage(client, `
      Array.from(document.querySelectorAll('[role="switch"]')).map((node) => node.getAttribute('aria-checked'))
    `);
    await clickSelector(client, '[role="switch"]');
    await wait(800);
    const privacyAfter = await evalInPage(client, `
      ({
        switches: Array.from(document.querySelectorAll('[role="switch"]')).map((node) => node.getAttribute('aria-checked')),
        toasts: Array.from(document.querySelectorAll('[data-sonner-toast]')).map((node) => node.textContent?.trim()).filter(Boolean),
      })
    `);

    await navigate(client, `${baseUrl}#/profile/subscription`);
    await wait(1500);
    await clickByText(client, 'button', '立即开通会员');
    await wait(2200);
    const subscriptionState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/profile/smart-band`);
    await wait(2000);
    await clickByExpression(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('div'))
          .find((node) => (node.textContent || '').includes('智能手环') && node.classList?.contains('cursor-pointer'));
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await wait(1000);
    await clickByText(client, 'button', '扫描设备');
    await waitForCondition(client, 'document.body.innerText.includes("可用设备")', 10000);
    await clickByText(client, 'button', '连接');
    await waitForCondition(client, 'document.body.innerText.includes("已连接")', 12000);
    const smartBandConnectedState = await collectPageState(client);
    await clickByText(client, 'button', '断开');
    await wait(1200);
    const smartBandDisconnectedState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/profile/healing-plan`);
    await wait(1500);
    await clickByText(client, 'button', '去完成');
    await wait(1200);
    const healingPlanRedirectState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/profile/connect-doctor`);
    await wait(1800);
    await clickByText(client, 'button', '图文咨询');
    await wait(1800);
    const connectDoctorConsultState = await collectPageState(client);
    await navigate(client, `${baseUrl}#/profile/connect-doctor`);
    await wait(1800);
    await clickByText(client, 'button', '预约视频');
    await wait(1200);
    const connectDoctorBookingState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/profile/about`);
    await wait(1200);
    const aboutState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/assessment/htp`);
    await wait(1800);
    await waitForCondition(client, 'Boolean(document.querySelector("canvas"))', 10000);
    await drawOnFirstCanvas(client, [
      [[40, 70], [120, 60], [180, 120], [240, 110]],
      [[80, 180], [110, 120], [160, 160], [210, 100]],
      [[260, 210], [300, 160], [340, 220], [380, 180]],
      [[160, 260], [190, 300], [220, 260], [250, 300]],
    ]);
    await wait(1000);
    await clickByTextContains(client, 'button', '开启 AI 心理评估');
    let htpReportVisible = false;
    try {
      await waitForCondition(client, 'document.body.innerText.includes("HTP 综合分析报告")', 10000);
      htpReportVisible = true;
    } catch {}
    if (htpReportVisible) {
      await clickByTextContains(client, 'button', '保存结果至历史记录');
      await wait(1200);
    }
    const htpState = {
      ...(await collectPageState(client)),
      reportVisible: htpReportVisible,
    };

    await navigate(client, `${baseUrl}#/profile`);
    await wait(1500);
    await clickByText(client, 'button', '退出当前账号');
    await wait(1500);
    const logoutState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      initialProfileState,
      editedProfileState,
      profileFetchState,
      reportState,
      privacyBefore,
      privacyAfter,
      subscriptionState,
      smartBandConnectedState,
      smartBandDisconnectedState,
      healingPlanRedirectState,
      connectDoctorConsultState,
      connectDoctorBookingState,
      aboutState,
      htpState,
      logoutState,
    };
  } finally {
    await client.close();
  }
}

async function runDoctorManagementScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickByTextContains(client, 'button', '医生端');
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);
    await installAutoConfirm(client);

    await navigate(client, `${baseUrl}#/doctor/dashboard`);
    await wait(1800);
    const dashboardState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/doctor/patients`);
    await wait(1800);
    await clickByText(client, 'button', '验证码管理');
    await waitForCondition(client, 'Boolean(document.querySelector("#new-code"))');
    const newCode = `AUTO${Date.now().toString().slice(-6)}`;
    await setInputValue(client, '#new-code', newCode);
    await setInputValue(client, '#notes', '自动化验证码');
    clearTrace(trace);
    await clickByTextContains(client, 'button', '创建验证码');
    await waitForResponse(trace, '/api/data/doctor_verification_codes', 20000);
    await wait(1500);
    const codeManagerCreatedState = await collectPageState(client);

    await clickByExpression(client, `
      (() => {
        const codeNode = Array.from(document.querySelectorAll('code'))
          .find((node) => (node.textContent || '').trim() === ${JSON.stringify(newCode)});
        if (!codeNode) return false;
        const row = codeNode.closest('div.flex.items-center.justify-between') || codeNode.closest('div[class*="justify-between"]');
        const buttons = row ? row.querySelectorAll('button') : [];
        if (!buttons.length) return false;
        const target = buttons[buttons.length - 1];
        target.click();
        return true;
      })()
    `);
    await wait(1200);
    const codeManagerDeletedState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/doctor/knowledge`);
    await wait(1500);
    const knowledgeState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/doctor/alerts`);
    await wait(1500);
    const alertsState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/doctor/patients`);
    await wait(1500);
    await clickByTextContains(client, 'button', '退出登录');
    await wait(1500);
    const logoutState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      newCode,
      dashboardState,
      codeManagerCreatedState,
      codeManagerDeletedState,
      knowledgeState,
      alertsState,
      logoutState,
    };
  } finally {
    await client.close();
  }
}

function apiBaseFromBaseUrl(baseUrl) {
  const url = new URL(baseUrl);
  return `${url.origin}${url.pathname.replace(/\/$/, '')}/api`;
}

async function runDoctorScenario(baseUrl, patientId) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await clickByTextContains(client, 'button', '医生端');
    await clickSelector(client, '[role="tab"][id$="trigger-signup"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#signup-username"))');

    const username = `doctor_${Date.now().toString().slice(-8)}`;
    await setInputValue(client, '#signup-username', username);
    await setInputValue(client, '#signup-password', 'Pass1234');
    await setInputValue(client, '#verification-code', '2026');
    await clickSelector(client, 'button[type="submit"]');
    await wait(4000);

    const signupState = await collectPageState(client);
    const token = await evalInPage(client, `window.localStorage.getItem('xinyu-care.access-token')`);
    const apiBase = apiBaseFromBaseUrl(baseUrl);

    const doctorSession = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json())
    `);

    let linkResult = null;
    if (patientId && doctorSession?.session?.user?.id) {
      linkResult = await evalInPage(client, `
        fetch(${JSON.stringify(`${apiBase}/data/doctor_patients`)}, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
          body: JSON.stringify({
            data: {
              doctor_id: ${JSON.stringify(doctorSession.session.user.id)},
              patient_id: ${JSON.stringify(patientId)},
              notes: '自动化测试接诊',
            },
            single: true,
          }),
        }).then(async (response) => ({
          status: response.status,
          body: await response.text(),
        }))
      `);
    }

    await navigate(client, `${baseUrl}#/doctor/dashboard`);
    await wait(2500);
    const dashboardState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/doctor/patients`);
    await wait(2500);
    const patientsState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/doctor/knowledge`);
    await wait(2500);
    const knowledgeState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/doctor/alerts`);
    await wait(2500);
    const alertsState = await collectPageState(client);

    return {
      username,
      token,
      doctorSession,
      linkResult,
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      signupState,
      dashboardState,
      patientsState,
      knowledgeState,
      alertsState,
    };
  } finally {
    await client.close();
  }
}

async function runPatientActionsScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);
    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const authState = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json())
    `);
    const userId = authState?.session?.user?.id;

    await navigate(client, `${baseUrl}#/record`);
    await wait(2000);
    const diaryText = `自动化情绪记录 ${Date.now()}`;
    await setInputValue(client, 'textarea[placeholder="写下点什么..."]', diaryText);
    clearTrace(trace);
    await clickByText(client, 'button', '保存记录');
    const recordResponse = await waitForResponse(trace, '/api/data/emotion_diaries', 20000);
    await wait(1500);
    const recordState = await collectPageState(client);
    const recordRequests = trace.requests.slice();
    const recordResponses = trace.responses.slice();
    const latestDiaryState = userId ? await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/emotion_diaries?select=*&filters=`)} + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: ${JSON.stringify(userId)} }])) + ${JSON.stringify(`&orders=${encodeURIComponent(JSON.stringify([{ field: 'diary_date', ascending: false }]))}&limit=1`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json())
    `) : null;

    await navigate(client, `${baseUrl}#/profile/personal`);
    await wait(2000);
    const newFullName = `患者${Date.now().toString().slice(-4)}`;
    await setInputValue(client, '#full_name', newFullName);
    await setInputValue(client, '#phone', '13800001234');
    await setInputValue(client, '#height', '172');
    await setInputValue(client, '#weight', '63');
    clearTrace(trace);
    await clickByText(client, 'button', '立即保存');
    await waitForResponse(trace, '/api/data/profiles', 20000);
    await wait(1500);
    const personalState = await evalInPage(client, `
      (() => ({
        href: window.location.href,
        fullName: document.querySelector('#full_name')?.value || '',
        phone: document.querySelector('#phone')?.value || '',
        height: document.querySelector('#height')?.value || '',
        weight: document.querySelector('#weight')?.value || '',
        toasts: Array.from(document.querySelectorAll('[data-sonner-toast]')).map((node) => node.textContent?.trim()).filter(Boolean),
      }))()
    `);

    const profileState = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json())
    `);

    await navigate(client, `${baseUrl}#/healing`);
    await wait(2000);
    const healingState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/profile/connect-doctor`);
    await wait(2000);
    const connectDoctorState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      diaryText,
      recordResponse,
      recordRequests,
      recordResponses,
      recordState,
      latestDiaryState,
      personalState,
      profileState,
      healingState,
      connectDoctorState,
    };
  } finally {
    await client.close();
  }
}

async function runDoctorActionsScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickByTextContains(client, 'button', '医生端');
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);
    const apiBase = apiBaseFromBaseUrl(baseUrl);

    const authState = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json())
    `);
    const doctorId = authState?.session?.user?.id;

    let seededAlert = null;
    if (doctorId) {
      const doctorPatients = await evalInPage(client, `
        fetch(${JSON.stringify(`${apiBase}/data/doctor_patients?select=*`)} +
          '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
          '&limit=1', {
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
          }).then((response) => response.json())
      `);
      const patientId = doctorPatients?.rows?.[0]?.patient_id;
      if (patientId) {
        seededAlert = await evalInPage(client, `
          fetch(${JSON.stringify(`${apiBase}/data/risk_alerts`)}, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
            body: JSON.stringify({
              data: {
                patient_id: ${JSON.stringify(patientId)},
                alert_type: '自动化回归预警',
                risk_level: 6,
                description: ${JSON.stringify(`自动化医生处理验证 ${Date.now()}`)},
                data_source: 'smoke_test',
                source_id: ${JSON.stringify(`doctor-actions-${Date.now()}`)},
                is_handled: false
              },
              single: true,
            }),
          }).then(async (response) => ({
            status: response.status,
            body: await response.json().catch(() => null),
          }))
        `);
      }
    }

    await navigate(client, `${baseUrl}#/doctor/patients`);
    await wait(2000);
    clearTrace(trace);
    await clickByText(client, 'button', '查看详情');
    await wait(2000);
    const patientDetailState = await collectPageState(client);

    await navigate(client, `${baseUrl}#/doctor/alerts`);
    await wait(2000);
    clearTrace(trace);
    const alertsBeforeState = await collectPageState(client);
    const hasUnhandledButton = await evalInPage(client, `
      Array.from(document.querySelectorAll('button')).some((node) => (node.textContent || '').trim() === '标记为已处理')
    `);
    let alertsActionState = null;
    let handledAlertVerification = null;
    if (hasUnhandledButton) {
      await clickByText(client, 'button', '标记为已处理');
      await wait(1000);
      await setInputValue(client, 'textarea', `自动化处理备注 ${Date.now()}`);
      await clickByText(client, 'button', '确认已处理');
      await waitForResponse(trace, '/api/data/risk_alerts', 20000);
      await wait(1500);
      alertsActionState = await collectPageState(client);
      await clickByText(client, 'button', '已处理');
      await wait(1200);
      const alertsHandledTabState = await collectPageState(client);
      handledAlertVerification = await evalInPage(client, `
        fetch(${JSON.stringify(`${apiBase}/data/risk_alerts?select=*`)} +
          '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
          '&limit=3', {
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
          }).then((response) => response.json()).then((payload) => ({
            latestRows: payload.rows || [],
            handledTabBody: ${JSON.stringify('doctor-alert-handled-tab')},
          }))
      `);
      handledAlertVerification.page = alertsHandledTabState;
    }

    await navigate(client, `${baseUrl}#/doctor/knowledge`);
    await wait(2500);
    const knowledgeTitle = `自动化知识 ${Date.now()}`;
    clearTrace(trace);
    await clickByText(client, 'button', '添加知识');
    await wait(1000);
    await setInputValue(client, '#title', knowledgeTitle);
    await setInputValue(client, 'input[placeholder="请输入题目文本"]', '自动化测试题目 1');
    await clickByText(client, 'button', '添加题目');
    await clickByText(client, 'button', '保存知识');
    await waitForResponse(trace, '/api/data/knowledge_base', 20000);
    await wait(1500);
    const knowledgeState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      seededAlert,
      patientDetailState,
      alertsBeforeState,
      alertsActionState,
      handledAlertVerification,
      knowledgeTitle,
      knowledgeState,
    };
  } finally {
    await client.close();
  }
}

async function runHealingFavoriteScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const authState = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json())
    `);
    const userId = authState?.session?.user?.id;

    await navigate(client, `${baseUrl}#/healing`);
    await wait(1800);
    await clickByTextContains(client, 'button', '知识');
    await wait(1800);

    const selectedCard = await evalInPage(client, `
      (() => {
        const cards = Array.from(document.querySelectorAll('.cursor-pointer'))
          .filter((node) => node.querySelector('h3') && node.getClientRects().length > 0);
        const card = cards[0];
        if (!card) return null;
        const title = card.querySelector('h3')?.textContent?.trim() || '';
        card.click();
        return { title };
      })()
    `);
    if (!selectedCard?.title) {
      throw new Error('Knowledge card unavailable');
    }

    await waitForCondition(client, 'document.body.innerText.includes("收藏")', 12000);
    clearTrace(trace);
    await clickByTextContains(client, 'button', '收藏');
    await waitForResponse(trace, '/api/data/user_favorites', 15000);
    await wait(1200);
    const favoriteCreateState = await collectPageState(client);
    const favoriteCreateFetch = userId ? await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/user_favorites?select=*`)} +
        '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: ${JSON.stringify(userId)} }])) +
        '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
        '&limit=10', {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }).then((response) => response.json())
    `) : null;

    clearTrace(trace);
    await clickByTextContains(client, 'button', '收藏');
    await waitForResponse(trace, '/api/data/user_favorites', 15000);
    await wait(1200);
    const favoriteDeleteState = await collectPageState(client);
    const favoriteDeleteFetch = userId ? await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/user_favorites?select=*`)} +
        '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: ${JSON.stringify(userId)} }])) +
        '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
        '&limit=10', {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }).then((response) => response.json())
    `) : null;

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      selectedCard,
      favoriteCreateState,
      favoriteCreateFetch,
      favoriteDeleteState,
      favoriteDeleteFetch,
    };
  } finally {
    await client.close();
  }
}

async function runDoctorAlertHandleScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickByTextContains(client, 'button', '医生端');
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const authState = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json())
    `);
    const doctorId = authState?.session?.user?.id;

    const doctorPatients = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/doctor_patients?select=*`)} +
        '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
        '&limit=10', {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }).then((response) => response.json())
    `);
    const matchedPatient = (doctorPatients?.rows || []).find((item) => item.doctor_id === doctorId) || doctorPatients?.rows?.[0];
    const patientId = matchedPatient?.patient_id || '59d96e79-85d0-4f59-a05a-e3d3347d9744';

    const seededAlert = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/risk_alerts`)}, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
        body: JSON.stringify({
          data: {
            patient_id: ${JSON.stringify(patientId)},
            alert_type: '前端点击回归预警',
            risk_level: 6,
            description: ${JSON.stringify(`医生点击处理验证 ${Date.now()}`)},
            data_source: 'doctor_alert_click',
            source_id: ${JSON.stringify(`doctor-alert-click-${Date.now()}`)},
            is_handled: false
          },
          single: true,
        }),
      }).then((response) => response.json())
    `);
    const alertId = seededAlert?.data?.id;
    if (!alertId) {
      throw new Error('Failed to seed doctor alert');
    }

    await navigate(client, `${baseUrl}#/doctor/alerts`);
    await wait(2000);
    const alertsBeforeState = await collectPageState(client);
    clearTrace(trace);
    await clickByTextContains(client, 'button', '标记为已处理');
    await wait(800);
    await setInputValue(client, 'textarea', `前端点击处理 ${Date.now()}`);
    await clickByTextContains(client, 'button', '确认已处理');
    await waitForResponse(trace, '/api/data/risk_alerts', 15000);
    await wait(1200);
    const alertsAfterState = await collectPageState(client);
    const handledFetch = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/risk_alerts?select=*`)} +
        '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'id', value: ${JSON.stringify(alertId)} }])) +
        '&limit=1', {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }).then((response) => response.json())
    `);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      seededAlert,
      alertsBeforeState,
      alertsAfterState,
      handledFetch,
    };
  } finally {
    await client.close();
  }
}

async function runDoctorDashboardAuditScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickByTextContains(client, 'button', '医生端');
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    await navigate(client, `${baseUrl}#/doctor/dashboard`);
    await wait(2500);
    const dashboardState = await collectPageState(client);
    const dashboardNumbers = await evalInPage(client, `
      (() => {
        const text = document.body.innerText;
        const pick = (label) => {
          const idx = text.indexOf(label);
          if (idx === -1) return null;
          const slice = text.slice(idx, idx + 80);
          const match = slice.match(/\\n(\\d+(?:\\.\\d+)?)\\n/);
          return match ? match[1] : null;
        };
        return {
          totalPatients: pick('患者总数'),
          activeAlerts: pick('待处理预警'),
          todayAssessments: pick('今日评估'),
          avgEmotionScore: pick('平均情绪'),
        };
      })()
    `);

    const apiAudit = await evalInPage(client, `
      Promise.all([
        fetch(${JSON.stringify(`${apiBase}/data/profiles?select=*`)} + '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) + '&limit=2000', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json()),
        fetch(${JSON.stringify(`${apiBase}/data/risk_alerts?select=*`)} + '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'is_handled', value: false }])) + '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) + '&limit=2000', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json()),
        fetch(${JSON.stringify(`${apiBase}/data/assessments?select=*`)} + '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) + '&limit=2000', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json()),
        fetch(${JSON.stringify(`${apiBase}/data/emotion_diaries?select=*`)} + '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'diary_date', ascending: false }])) + '&limit=2000', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json())
      ]).then(([profiles, alerts, assessments, diaries]) => {
        const today = new Date().toISOString().slice(0, 10);
        const profileRows = ${extractRows.toString()}(profiles);
        const alertRows = ${extractRows.toString()}(alerts);
        const assessmentRows = ${extractRows.toString()}(assessments);
        const diaryRows = ${extractRows.toString()}(diaries);
        const patientCount = profileRows.filter((item) => item.role === 'user').length;
        const todayAssessments = assessmentRows.filter((item) => String(item.created_at || '').slice(0, 10) === today).length;
        const scoreMap = { very_bad: 1, bad: 2, neutral: 3, good: 4, very_good: 5 };
        const scores = diaryRows.map((item) => scoreMap[item.emotion_level]).filter(Boolean);
        const avgEmotionScore = scores.length ? Number((scores.reduce((sum, value) => sum + value, 0) / scores.length).toFixed(1)) : 0;
        return {
          totalPatients: patientCount,
          activeAlerts: alertRows.length,
          todayAssessments,
          avgEmotionScore,
        };
      })
    `);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      dashboardState,
      dashboardNumbers,
      apiAudit,
    };
  } finally {
    await client.close();
  }
}

async function runDoctorPatientTabsScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickByTextContains(client, 'button', '医生端');
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    await navigate(client, `${baseUrl}#/doctor/patients`);
    await wait(2200);

    const patientCandidate = await evalInPage(client, `
      Promise.all([
        fetch(${JSON.stringify(`${apiBase}/data/profiles?select=*`)} + '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) + '&limit=200', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json()),
        fetch(${JSON.stringify(`${apiBase}/data/assessments?select=*`)} + '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) + '&limit=2000', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json()),
        fetch(${JSON.stringify(`${apiBase}/data/emotion_diaries?select=*`)} + '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'diary_date', ascending: false }])) + '&limit=2000', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json())
      ]).then(([profiles, assessments, diaries]) => {
        const pickRows = ${extractRows.toString()};
        const profileRows = pickRows(profiles).filter((item) => item.role === 'user');
        const assessmentRows = pickRows(assessments);
        const diaryRows = pickRows(diaries);
        const candidates = profileRows.map((profile) => {
          const assessmentsCount = assessmentRows.filter((item) => item.user_id === profile.id).length;
          const diariesCount = diaryRows.filter((item) => item.user_id === profile.id).length;
          return {
            id: profile.id,
            username: profile.username,
            full_name: profile.full_name,
            assessmentsCount,
            diariesCount,
            score: assessmentsCount * 10 + diariesCount,
          };
        }).sort((a, b) => b.score - a.score);
        return candidates[0] || null;
      })
    `);

    if (!patientCandidate?.username) {
      throw new Error('No patient candidate with backend data found');
    }

    await clickByExpression(client, `
      (() => {
        const username = ${JSON.stringify(patientCandidate.username)};
        const detailButton = Array.from(document.querySelectorAll('button'))
          .find((button) => {
            if ((button.textContent || '').trim() !== '查看详情') return false;
            const row = button.closest('div');
            return row && (row.textContent || '').includes('@' + username);
          });
        if (!detailButton) return false;
        detailButton.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'document.body.innerText.includes("用户详情")', 12000);
    await waitForCondition(client, 'document.body.innerText.includes("量表评估")', 12000);
    const detailOverview = await collectPageState(client);

    const apiPatientAudit = await evalInPage(client, `
      Promise.all([
        fetch(${JSON.stringify(`${apiBase}/data/profiles?select=*`)} + '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) + '&limit=100', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json()),
        fetch(${JSON.stringify(`${apiBase}/data/assessments?select=*`)} + '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: ${JSON.stringify(patientCandidate.id)} }])) + '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) + '&limit=50', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json()),
        fetch(${JSON.stringify(`${apiBase}/data/emotion_diaries?select=*`)} + '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: ${JSON.stringify(patientCandidate.id)} }])) + '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'diary_date', ascending: false }])) + '&limit=50', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json())
      ]).then(([profiles, assessments, diaries]) => {
        const pickRows = ${extractRows.toString()};
        const profileRows = pickRows(profiles);
        const assessmentRows = pickRows(assessments);
        const diaryRows = pickRows(diaries);
        return {
          patient: profileRows.find((item) => item.id === ${JSON.stringify(patientCandidate.id)}) || null,
          assessmentsCount: assessmentRows.length,
          diariesCount: diaryRows.length,
        };
      })
    `);

    await clickByExpression(client, `
      (() => {
        const trigger = Array.from(document.querySelectorAll('[role="tab"]'))
          .find((node) => (node.textContent || '').includes('语音情绪') && node.getClientRects().length > 0);
        if (!trigger) return false;
        const options = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1 };
        trigger.dispatchEvent(new PointerEvent('pointerdown', options));
        trigger.dispatchEvent(new MouseEvent('mousedown', options));
        trigger.dispatchEvent(new PointerEvent('pointerup', options));
        trigger.dispatchEvent(new MouseEvent('mouseup', options));
        trigger.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'document.body.innerText.includes("语音情绪分析")', 12000);
    const voiceTab = await collectPageState(client);

    await clickByExpression(client, `
      (() => {
        const trigger = Array.from(document.querySelectorAll('[role="tab"]'))
          .find((node) => (node.textContent || '').includes('表情识别') && node.getClientRects().length > 0);
        if (!trigger) return false;
        const options = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1 };
        trigger.dispatchEvent(new PointerEvent('pointerdown', options));
        trigger.dispatchEvent(new MouseEvent('mousedown', options));
        trigger.dispatchEvent(new PointerEvent('pointerup', options));
        trigger.dispatchEvent(new MouseEvent('mouseup', options));
        trigger.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'document.body.innerText.includes("表情识别分析")', 12000);
    const expressionTab = await collectPageState(client);

    await clickByExpression(client, `
      (() => {
        const trigger = Array.from(document.querySelectorAll('[role="tab"]'))
          .find((node) => (node.textContent || '').includes('对话记录') && node.getClientRects().length > 0);
        if (!trigger) return false;
        const options = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1 };
        trigger.dispatchEvent(new PointerEvent('pointerdown', options));
        trigger.dispatchEvent(new MouseEvent('mousedown', options));
        trigger.dispatchEvent(new PointerEvent('pointerup', options));
        trigger.dispatchEvent(new MouseEvent('mouseup', options));
        trigger.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'document.body.innerText.includes("AI评估助手与用户的完整交互过程") || document.body.innerText.includes("量表评估对话") || document.body.innerText.includes("多模态评估对话")', 12000);
    const conversationTab = await collectPageState(client);

    await clickByExpression(client, `
      (() => {
        const trigger = Array.from(document.querySelectorAll('[role="tab"]'))
          .find((node) => (node.textContent || '').includes('量表评估') && node.getClientRects().length > 0);
        if (!trigger) return false;
        const options = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1 };
        trigger.dispatchEvent(new PointerEvent('pointerdown', options));
        trigger.dispatchEvent(new MouseEvent('mousedown', options));
        trigger.dispatchEvent(new PointerEvent('pointerup', options));
        trigger.dispatchEvent(new MouseEvent('mouseup', options));
        trigger.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'document.body.innerText.includes("多模态融合评估") || document.body.innerText.includes("PHQ-9量表评估")', 12000);
    const scaleTab = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      patientCandidate,
      detailOverview,
      apiPatientAudit,
      scaleTab,
      voiceTab,
      expressionTab,
      conversationTab,
    };
  } finally {
    await client.close();
  }
}

async function runDoctorKnowledgeCrudScenario(baseUrl, username, password, uploadFilePath) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickByTextContains(client, 'button', '医生端');
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const assessmentTitle = `自动化量表 ${Date.now()}`;
    const documentTitle = `自动化文档 ${Date.now()}`;

    await navigate(client, `${baseUrl}#/doctor/knowledge`);
    await wait(2200);

    clearTrace(trace);
    await clickByTextContains(client, 'button', '添加知识');
    await waitForCondition(client, 'Boolean(document.querySelector("#title"))', 10000);
    await setInputValue(client, '#title', assessmentTitle);
    await setInputValue(client, 'input[placeholder="请输入题目文本"]', '自动化题目一');
    await clickByTextContains(client, 'button', '添加题目');
    await setInputValue(client, 'input[placeholder="请输入题目文本"]', '自动化题目二');
    await clickByTextContains(client, 'button', '添加题目');
    await clickByTextContains(client, 'button', '保存知识');
    await waitForResponse(trace, '/api/data/knowledge_base', 20000);
    await wait(1500);
    const assessmentCreateState = await collectPageState(client);

    const assessmentFetch = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/knowledge_base?select=*`)} +
        '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'title', value: ${JSON.stringify(assessmentTitle)} }])) +
        '&limit=5', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json())
    `);
    const assessmentId = assessmentFetch?.data?.[0]?.id || assessmentFetch?.rows?.[0]?.id;

    await setInputValue(client, 'input[placeholder="搜索知识..."]', assessmentTitle);
    await wait(800);
    await clickByExpression(client, `
      (() => {
        const title = ${JSON.stringify(assessmentTitle)};
        const row = Array.from(document.querySelectorAll('div, article, section'))
          .find((node) => (node.textContent || '').includes(title) && node.querySelector('button[title="编辑"]'));
        const button = row?.querySelector('button[title="编辑"]');
        if (!button) return false;
        const options = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1 };
        button.dispatchEvent(new PointerEvent('pointerdown', options));
        button.dispatchEvent(new MouseEvent('mousedown', options));
        button.dispatchEvent(new PointerEvent('pointerup', options));
        button.dispatchEvent(new MouseEvent('mouseup', options));
        button.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'Boolean(document.querySelector("#title"))', 10000);
    await setInputValue(client, '#title', `${assessmentTitle} 已编辑`);
    clearTrace(trace);
    await clickByTextContains(client, 'button', '保存知识');
    await waitForResponse(trace, '/api/data/knowledge_base', 20000);
    await wait(1200);
    const assessmentEditFetch = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/knowledge_base?select=*`)} +
        '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'id', value: ${JSON.stringify(assessmentId)} }])) +
        '&limit=1', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json())
    `);

    await setInputValue(client, 'input[placeholder="搜索知识..."]', '');
    await wait(500);
    clearTrace(trace);
    await clickByTextContains(client, 'button', '添加知识');
    await waitForCondition(client, 'Boolean(document.querySelector("#title"))', 10000);
    await setInputValue(client, '#title', documentTitle);
    await clickByExpression(client, `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const trigger = dialog
          ? Array.from(dialog.querySelectorAll('[role="combobox"]'))
              .find((node) => (node.textContent || '').includes('评估量表') && node.getClientRects().length > 0)
          : null;
        if (!trigger) return false;
        trigger.click();
        return true;
      })()
    `);
    await waitForCondition(client, `
      Array.from(document.querySelectorAll('[role="option"]'))
        .some((node) => (node.textContent || '').trim() === '治疗方法' && node.getClientRects().length > 0)
    `, 10000);
    await clickByExpression(client, `
      (() => {
        const item = Array.from(document.querySelectorAll('[role="option"]'))
          .find((node) => (node.textContent || '').trim() === '治疗方法' && node.getClientRects().length > 0);
        if (!item) return false;
        item.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'Boolean(document.querySelector("#document-upload"))', 10000);
    await setFileInputFiles(client, '#document-upload', [uploadFilePath]);
    await wait(600);
    await setInputValue(client, 'textarea[placeholder="为文档添加简短的描述..."]', '自动化文档说明');
    await clickByTextContains(client, 'button', '保存知识');
    await waitForResponse(trace, '/api/storage/knowledge-documents/upload', 20000);
    await waitForResponse(trace, '/api/data/knowledge_base', 20000);
    await wait(1800);
    const documentFetch = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/knowledge_base?select=*`)} +
        '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'title', value: ${JSON.stringify(documentTitle)} }])) +
        '&limit=5', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json())
    `);
    const documentId = documentFetch?.data?.[0]?.id || documentFetch?.rows?.[0]?.id;

    await setInputValue(client, 'input[placeholder="搜索知识..."]', documentTitle);
    await wait(800);
    clearTrace(trace);
    await installAutoConfirm(client);
    await clickByExpression(client, `
      (() => {
        const title = ${JSON.stringify(documentTitle)};
        const row = Array.from(document.querySelectorAll('div, article, section'))
          .find((node) => (node.textContent || '').includes(title) && node.querySelector('button[title="删除"]'));
        const button = row?.querySelector('button[title="删除"]');
        if (!button) return false;
        button.click();
        return true;
      })()
    `);
    await waitForResponse(trace, '/api/data/knowledge_base', 20000);
    await wait(1500);
    const documentDeleteFetch = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/knowledge_base?select=*`)} +
        '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'id', value: ${JSON.stringify(documentId)} }])) +
        '&limit=1', {
          headers: { Accept: 'application/json', Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token') },
        }).then((r) => r.json())
    `);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      assessmentCreateState,
      assessmentFetch,
      assessmentEditFetch,
      documentFetch,
      documentDeleteFetch,
    };
  } finally {
    await client.close();
  }
}

async function runProfileAssetsScenario(baseUrl, username, password, avatarFilePath, backgroundFilePath) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    await navigate(client, `${baseUrl}#/profile`);
    await wait(2000);
    await clickByExpression(client, `
      (() => {
        const button = Array.from(document.querySelectorAll('button'))
          .find((node) => {
            if (node.getClientRects().length === 0) return false;
            const rect = node.getBoundingClientRect();
            return rect.top >= 0
              && rect.top < window.innerHeight * 0.5
              && rect.left > window.innerWidth * 0.55
              && node.querySelector('.lucide-edit, .lucide-square-pen, .lucide-pencil');
          });
        if (!button) return false;
        button.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'Boolean(document.querySelector("#pf-full-name"))', 12000);

    await clickByExpression(client, `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const tab = dialog
          ? Array.from(dialog.querySelectorAll('[role="tab"]'))
            .find((node) => (node.textContent || '').includes('头像设置') && node.getClientRects().length > 0)
          : null;
        if (!tab) return false;
        const options = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1 };
        tab.dispatchEvent(new PointerEvent('pointerdown', options));
        tab.dispatchEvent(new MouseEvent('mousedown', options));
        tab.dispatchEvent(new PointerEvent('pointerup', options));
        tab.dispatchEvent(new MouseEvent('mouseup', options));
        tab.click();
        return true;
      })()
    `);
    await waitForCondition(client, `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return false;
        const text = dialog.innerText || '';
        return text.includes('点击上传自定义头像')
          || text.includes('选择预设头像')
          || dialog.querySelector('input[type="file"]');
      })()
    `, 12000);
    await evalInPage(client, `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const input = dialog
          ? Array.from(dialog.querySelectorAll('input[type="file"]'))
            .find((node) => node.getClientRects().length > 0 || node.classList.contains('hidden'))
          : null;
        if (input) input.setAttribute('data-cdp-file', 'avatar');
        return Boolean(input);
      })()
    `);
    clearTrace(trace);
    await setFileInputFiles(client, 'input[data-cdp-file="avatar"]', [avatarFilePath]);
    const avatarUploadResponse = await waitForResponse(trace, '/api/storage/diary-images/upload', 20000);
    await wait(1500);

    await clickByExpression(client, `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const tab = dialog
          ? Array.from(dialog.querySelectorAll('[role="tab"]'))
            .find((node) => (node.textContent || '').includes('背景主题') && node.getClientRects().length > 0)
          : null;
        if (!tab) return false;
        const options = { bubbles: true, cancelable: true, composed: true, button: 0, buttons: 1 };
        tab.dispatchEvent(new PointerEvent('pointerdown', options));
        tab.dispatchEvent(new MouseEvent('mousedown', options));
        tab.dispatchEvent(new PointerEvent('pointerup', options));
        tab.dispatchEvent(new MouseEvent('mouseup', options));
        tab.click();
        return true;
      })()
    `);
    await waitForCondition(client, `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return false;
        const text = dialog.innerText || '';
        return text.includes('点击上传背景图片')
          || text.includes('上传自定义背景')
          || dialog.querySelector('input[type="file"]');
      })()
    `, 12000);
    await evalInPage(client, `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        const input = dialog
          ? Array.from(dialog.querySelectorAll('input[type="file"]'))
            .find((node) => node.getClientRects().length > 0 || node.classList.contains('hidden'))
          : null;
        if (input) input.setAttribute('data-cdp-file', 'background');
        return Boolean(input);
      })()
    `);
    clearTrace(trace);
    await setFileInputFiles(client, 'input[data-cdp-file="background"]', [backgroundFilePath]);
    const backgroundUploadResponse = await waitForResponse(trace, '/api/storage/diary-images/upload', 20000);
    await wait(1500);

    clearTrace(trace);
    await clickByTextContains(client, 'button', '保存更改');
    await waitForResponse(trace, '/api/data/profiles', 20000);
    await wait(1800);
    const profileStateAfterSave = await collectPageState(client);

    const profileFetch = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json()).then(async (sessionData) => {
        const userId = sessionData?.session?.user?.id;
        const profileRes = await fetch(
          ${JSON.stringify(`${apiBase}/data/profiles?select=*`)} +
            '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'id', value: userId }])) +
            '&limit=1',
          {
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
          }
        );
        return {
          session: sessionData,
          profileEnvelope: await profileRes.json(),
        };
      })
    `);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      avatarUploadResponse,
      backgroundUploadResponse,
      profileStateAfterSave,
      profileFetch,
    };
  } finally {
    await client.close();
  }
}

async function runDoctorCodeSignupScenario(baseUrl, doctorUsername, doctorPassword) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickByTextContains(client, 'button', '医生端');
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', doctorUsername);
    await setInputValue(client, '#login-password', doctorPassword);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);
    await installAutoConfirm(client);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const verificationCode = `DOC${Date.now().toString().slice(-6)}`;
    const signupUsername = `doctor_auto_${Date.now().toString().slice(-6)}`;
    const secondSignupUsername = `doctor_retry_${Date.now().toString().slice(-6)}`;

    await navigate(client, `${baseUrl}#/doctor/patients`);
    await wait(1800);
    await clickByText(client, 'button', '验证码管理');
    await waitForCondition(client, 'Boolean(document.querySelector("#new-code"))', 10000);
    await setInputValue(client, '#new-code', verificationCode);
    await setInputValue(client, '#notes', '自动化注册验证码');
    clearTrace(trace);
    await clickByTextContains(client, 'button', '创建验证码');
    const createCodeResponse = await waitForResponse(trace, '/api/data/doctor_verification_codes', 20000);
    await wait(1500);

    await navigate(client, `${baseUrl}#/doctor/dashboard`);
    await wait(1200);
    await clickByTextContains(client, 'button', '退出登录');
    await wait(1500);

    await navigate(client, `${baseUrl}#/login`);
    await clickByTextContains(client, 'button', '医生端');
    await clickSelector(client, '[role="tab"][id$="trigger-signup"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#signup-username"))', 10000);
    await setInputValue(client, '#signup-username', signupUsername);
    await setInputValue(client, '#signup-password', 'Pass1234');
    await setInputValue(client, '#verification-code', verificationCode);
    clearTrace(trace);
    await clickSelector(client, 'button[type="submit"]');
    const signupResponse = await waitForResponse(trace, '/api/auth/signup', 20000);
    await wait(2500);
    const firstSignupState = await collectPageState(client);

    const codeUsageFetch = await evalInPage(client, `
      Promise.all([
        fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }).then((response) => response.json()),
        fetch(
          ${JSON.stringify(`${apiBase}/data/doctor_verification_codes?select=*`)} +
            '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'code', value: ${JSON.stringify(verificationCode)} }])) +
            '&limit=1',
          {
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
          }
        ).then((response) => response.json())
      ]).then(([sessionData, codeData]) => ({ sessionData, codeData }))
    `);

    await clickByTextContains(client, 'button', '退出登录');
    await wait(1500);
    await navigate(client, `${baseUrl}#/login`);
    await clickByTextContains(client, 'button', '医生端');
    await clickSelector(client, '[role="tab"][id$="trigger-signup"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#signup-username"))', 10000);
    await setInputValue(client, '#signup-username', secondSignupUsername);
    await setInputValue(client, '#signup-password', 'Pass1234');
    await setInputValue(client, '#verification-code', verificationCode);
    clearTrace(trace);
    await clickSelector(client, 'button[type="submit"]');
    const reusedCodeResponse = await waitForResponse(trace, '/api/auth/signup', 20000);
    await wait(1800);
    const secondSignupState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      verificationCode,
      signupUsername,
      createCodeResponse,
      signupResponse,
      firstSignupState,
      codeUsageFetch,
      reusedCodeResponse,
      secondSignupState,
    };
  } finally {
    await client.close();
  }
}

async function runSmartBandPersistenceScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const startIso = new Date().toISOString();
    const beforeRow = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json()).then(async (sessionData) => {
        const userId = sessionData?.session?.user?.id;
        const today = new Date().toISOString().slice(0, 10);
        const response = await fetch(
          ${JSON.stringify(`${apiBase}/data/wearable_data?select=*`)} +
            '&filters=' + encodeURIComponent(JSON.stringify([
              { op: 'eq', field: 'user_id', value: userId },
              { op: 'eq', field: 'record_date', value: today }
            ])) +
            '&limit=1',
          {
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
          }
        );
        const payload = await response.json();
        const rows = ${extractRows.toString()}(payload);
        return { sessionData, payload, row: rows[0] || null };
      })
    `);

    await navigate(client, `${baseUrl}#/profile/smart-band`);
    await wait(2200);
    await clickByExpression(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('div'))
          .find((node) => (node.textContent || '').includes('智能手环') && node.classList?.contains('cursor-pointer'));
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await wait(1000);
    await clickByText(client, 'button', '扫描设备');
    await waitForCondition(client, 'document.body.innerText.includes("可用设备")', 10000);
    await clickByText(client, 'button', '连接');
    await waitForCondition(client, 'document.body.innerText.includes("设备已连接") || document.body.innerText.includes("已连接")', 15000);
    const connectedState = await collectPageState(client);

    const beforeRowJson = JSON.stringify(beforeRow?.row || null);
    const afterRow = await waitForCondition(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json()).then(async (sessionData) => {
        const userId = sessionData?.session?.user?.id;
        const today = new Date().toISOString().slice(0, 10);
        const response = await fetch(
          ${JSON.stringify(`${apiBase}/data/wearable_data?select=*`)} +
            '&filters=' + encodeURIComponent(JSON.stringify([
              { op: 'eq', field: 'user_id', value: userId },
              { op: 'eq', field: 'record_date', value: today }
            ])) +
            '&limit=1',
          {
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
          }
        );
        const payload = await response.json();
        const rows = ${extractRows.toString()}(payload);
        const row = rows[0];
        if (!row) return false;
        const beforeRow = ${JSON.stringify(beforeRowJson)};
        if (!beforeRow || beforeRow === 'null') {
          const createdAt = row.created_at || '';
          return createdAt > ${JSON.stringify(startIso)} ? { payload, row } : false;
        }
        return JSON.stringify(row) !== beforeRow ? { payload, row } : false;
      })
    `, 90000, 5000);

    await clickByText(client, 'button', '断开');
    await wait(1200);
    const disconnectedState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      beforeRow,
      connectedState,
      afterRow,
      disconnectedState,
    };
  } finally {
    await client.close();
  }
}

async function runKnowledgeEngagementScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const contentTitle = '认识抑郁症:症状与诊断';
    const beforeFetch = await evalInPage(client, `
      fetch(
        ${JSON.stringify(`${apiBase}/data/healing_contents?select=*`)} +
          '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'title', value: ${JSON.stringify(contentTitle)} }])) +
          '&limit=1',
        {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }
      ).then((response) => response.json())
    `);

    await navigate(client, `${baseUrl}#/healing`);
    await wait(1800);
    await clickByTextContains(client, 'button', '知识');
    await wait(1800);
    await setInputValue(client, 'input[placeholder="搜索内容..."]', contentTitle);
    await wait(1000);
    await clickByExpression(client, `
      (() => {
        const title = ${JSON.stringify(contentTitle)};
        const card = Array.from(document.querySelectorAll('.grid button, .grid .cursor-pointer, .grid [class*="cursor-pointer"]'))
          .find((node) => (node.textContent || '').includes(title) && node.getClientRects().length > 0);
        if (!card) return false;
        card.click();
        return true;
      })()
    `);
    await waitForCondition(client, `document.body.innerText.includes(${JSON.stringify(contentTitle)}) && document.body.innerText.includes('收藏')`, 12000);
    await wait(1500);
    const afterViewFetch = await evalInPage(client, `
      fetch(
        ${JSON.stringify(`${apiBase}/data/healing_contents?select=*`)} +
          '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'title', value: ${JSON.stringify(contentTitle)} }])) +
          '&limit=1',
        {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }
      ).then((response) => response.json())
    `);

    await clickByExpression(client, `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return false;
        const button = Array.from(dialog.querySelectorAll('button'))
          .find((node) => node.querySelector('svg.lucide-thumbs-up') && node.getClientRects().length > 0);
        if (!button) return false;
        button.click();
        return true;
      })()
    `);
    await wait(1500);
    const afterLikeFetch = await evalInPage(client, `
      fetch(
        ${JSON.stringify(`${apiBase}/data/healing_contents?select=*`)} +
          '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'title', value: ${JSON.stringify(contentTitle)} }])) +
          '&limit=1',
        {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }
      ).then((response) => response.json())
    `);

    const detailState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      beforeFetch,
      afterViewFetch,
      afterLikeFetch,
      detailState,
    };
  } finally {
    await client.close();
  }
}

async function runRecordUpdateScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const todayKey = new Date().toISOString().slice(0, 10);
    await navigate(client, `${baseUrl}#/record`);
    await wait(2200);
    await clickByTextContains(client, 'button', '不错');
    await setInputValue(client, 'textarea', `记录更新基准 ${Date.now()}`);
    clearTrace(trace);
    await clickByTextContains(client, 'button', '保存记录');
    await waitForResponse(trace, '/api/data/emotion_diaries', 20000);
    await wait(1800);

    await clickByExpression(client, `
      (() => {
        const day = String(new Date().getDate());
        const candidates = Array.from(document.querySelectorAll('button'))
          .filter((node) =>
            node.getClientRects().length > 0 &&
            node.className.includes('aspect-square') &&
            Array.from(node.querySelectorAll('span')).some((span) => (span.textContent || '').trim() === day)
          );
        const target = candidates.find((node) => node.className.includes('ring-2')) || candidates[0];
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'document.body.innerText.includes("当天记录")', 10000);
    const beforeUpdateFetch = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json()).then(async (sessionData) => {
        const userId = sessionData?.session?.user?.id;
        const response = await fetch(
          ${JSON.stringify(`${apiBase}/data/emotion_diaries?select=*`)} +
            '&filters=' + encodeURIComponent(JSON.stringify([
              { op: 'eq', field: 'user_id', value: userId },
              { op: 'eq', field: 'diary_date', value: ${JSON.stringify(todayKey)} }
            ])) +
            '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
            '&limit=1',
          {
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
          }
        );
        return await response.json();
      })
    `);

    clearTrace(trace);
    await clickByExpression(client, `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return false;
        const button = Array.from(dialog.querySelectorAll('button'))
          .find((node) => (node.textContent || '').includes('极好') && node.getClientRects().length > 0);
        if (!button) return false;
        button.click();
        return true;
      })()
    `);
    await waitForResponse(trace, '/api/data/emotion_diaries', 20000);
    await wait(1200);

    clearTrace(trace);
    await clickByExpression(client, `
      (() => {
        const dialog = document.querySelector('[role="dialog"]');
        if (!dialog) return false;
        const button = Array.from(dialog.querySelectorAll('button'))
          .find((node) => node.querySelector('img[alt="开心_1.png"]') && node.getClientRects().length > 0);
        if (!button) return false;
        button.click();
        return true;
      })()
    `);
    await waitForResponse(trace, '/api/data/emotion_diaries', 20000);
    await wait(1500);

    const afterUpdateFetch = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json()).then(async (sessionData) => {
        const userId = sessionData?.session?.user?.id;
        const response = await fetch(
          ${JSON.stringify(`${apiBase}/data/emotion_diaries?select=*`)} +
            '&filters=' + encodeURIComponent(JSON.stringify([
              { op: 'eq', field: 'user_id', value: userId },
              { op: 'eq', field: 'diary_date', value: ${JSON.stringify(todayKey)} }
            ])) +
            '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
            '&limit=1',
          {
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
          }
        );
        return await response.json();
      })
    `);

    const dialogState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      beforeUpdateFetch,
      afterUpdateFetch,
      dialogState,
    };
  } finally {
    await client.close();
  }
}

async function runHealingDepthScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const authState = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json())
    `);
    const userId = authState?.session?.user?.id;

    await navigate(client, `${baseUrl}#/healing`);
    await wait(2500);
    const healingLandingState = await collectPageState(client);

    await clickByExpression(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('button'))
          .filter((node) =>
            node.getClientRects().length > 0
            && node.querySelector('svg.lucide-play')
          )
          .sort((a, b) => {
            const areaA = a.getBoundingClientRect().width * a.getBoundingClientRect().height;
            const areaB = b.getBoundingClientRect().width * b.getBoundingClientRect().height;
            return areaB - areaA;
          })[0];
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'Boolean(document.querySelector("audio"))', 8000);
    await wait(1200);
    await evalInPage(client, `
      (() => {
        const audio = document.querySelector('audio');
        if (!audio) return false;
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 180;
        audio.currentTime = duration;
        audio.dispatchEvent(new Event('timeupdate', { bubbles: true }));
        audio.dispatchEvent(new Event('ended', { bubbles: true }));
        return true;
      })()
    `);
    await waitForCondition(client, 'document.body.innerText.includes("冥想完成")', 12000);
    await setInputValue(client, '#moodAfter', `自动化冥想记录 ${Date.now()}`);
    clearTrace(trace);
    await clickByText(client, 'button', '保存记录');
    await waitForResponse(trace, '/api/data/meditation_sessions', 20000);
    await wait(1500);
    const meditationState = await collectPageState(client);
    const meditationPersistence = userId ? await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/meditation_sessions?select=*`)} +
        '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: ${JSON.stringify(userId)} }])) +
        '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
        '&limit=1', {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }).then((response) => response.json())
    `) : null;

    await navigate(client, `${baseUrl}#/healing`);
    await wait(1800);
    await clickByTextContains(client, 'button', '知识');
    await wait(1800);
    const firstKnowledgeId = await evalInPage(client, `
      (() => {
        const card = Array.from(document.querySelectorAll('.grid .cursor-pointer'))
          .find((node) => node.getClientRects().length > 0);
        if (!card) return null;
        card.click();
        return true;
      })()
    `);
    if (!firstKnowledgeId) {
      throw new Error('Knowledge card unavailable');
    }
    await waitForCondition(client, 'document.body.innerText.includes("收藏")', 10000);
    const selectedKnowledge = await evalInPage(client, `
      (() => {
        const title = document.querySelector('[role="dialog"] h2')?.textContent?.trim();
        return Array.from(document.querySelectorAll('.grid .cursor-pointer'))
          .map((node) => ({
            title: node.querySelector('h3')?.textContent?.trim() || '',
            id: node.getAttribute('data-content-id') || '',
          }))
          .find((item) => item.title && item.title === title) || { title };
      })()
    `);
    clearTrace(trace);
    await clickByText(client, 'button', '收藏');
    await wait(1200);
    await clickByExpression(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('button'))
          .find((node) =>
            node.getClientRects().length > 0
            && node.querySelector('svg.lucide-x')
          );
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await wait(800);
    const knowledgeState = await collectPageState(client);
    const favoritePersistence = userId ? await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/user_favorites?select=*`)} +
        '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: ${JSON.stringify(userId)} }])) +
        '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
        '&limit=5', {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }).then((response) => response.json())
    `) : null;

    await navigate(client, `${baseUrl}#/healing`);
    await wait(1800);
    await clickByTextContains(client, 'button', '日记');
    await wait(1800);
    await clickByExpression(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('button'))
          .find((node) => (node.textContent || '').includes('不错') && node.getClientRects().length > 0);
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await setInputValue(client, 'textarea[placeholder="记录下今天的想法和感受..."]', `疗愈页日记自动化 ${Date.now()}`);
    clearTrace(trace);
    await clickByExpression(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('button'))
          .find((node) => (node.textContent || '').trim() === '保存' && node.getClientRects().length > 0);
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await waitForResponse(trace, '/api/data/emotion_diaries', 20000);
    await wait(1500);
    const diaryState = await collectPageState(client);
    const diaryPersistence = userId ? await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/data/emotion_diaries?select=*`)} +
        '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: ${JSON.stringify(userId)} }])) +
        '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'diary_date', ascending: false }])) +
        '&limit=1', {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }).then((response) => response.json())
    `) : null;

    await navigate(client, `${baseUrl}#/healing`);
    await wait(1800);
    await clickByTextContains(client, 'button', '游戏');
    await wait(1800);
    await evalInPage(client, `
      (() => {
        window.__xinyuOpenedUrl = null;
        window.open = (url) => {
          window.__xinyuOpenedUrl = url;
          return null;
        };
        return true;
      })()
    `);
    await clickByText(client, 'button', '开始游戏');
    await wait(500);
    const gameOpenUrl = await evalInPage(client, 'window.__xinyuOpenedUrl');
    const gameState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      healingLandingState,
      meditationState,
      meditationPersistence,
      selectedKnowledge,
      knowledgeState,
      favoritePersistence,
      diaryState,
      diaryPersistence,
      gameOpenUrl,
      gameState,
    };
  } finally {
    await client.close();
  }
}

async function runHealthReportScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const dataAudit = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json()).then(async (sessionData) => {
        const userId = sessionData?.session?.user?.id;
        const [assessmentsRes, diariesRes] = await Promise.all([
          fetch(
            ${JSON.stringify(`${apiBase}/data/assessments?select=*`)} +
              '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: userId }])) +
              '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
              '&limit=5',
            {
              headers: {
                Accept: 'application/json',
                Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
              },
            }
          ),
          fetch(
            ${JSON.stringify(`${apiBase}/data/emotion_diaries?select=*`)} +
              '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: userId }])) +
              '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'diary_date', ascending: false }])) +
              '&limit=7',
            {
              headers: {
                Accept: 'application/json',
                Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
              },
            }
          ),
        ]);
        return {
          sessionData,
          assessments: await assessmentsRes.json(),
          diaries: await diariesRes.json(),
        };
      })
    `);

    await navigate(client, `${baseUrl}#/profile`);
    await wait(2200);
    await clickByExpression(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('div'))
          .find((node) =>
            node.getClientRects().length > 0
            && node.className.includes('cursor-pointer')
            && (node.textContent || '').includes('查看健康报告')
          );
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'document.body.innerText.includes("生成报告中") || document.body.innerText.includes("多模态报告")', 10000);
    await waitForCondition(client, 'document.body.innerText.includes("多模态报告")', 12000);
    await waitForCondition(client, 'document.body.innerText.includes("历史记录") || document.body.innerText.includes("导出报告") || document.body.innerText.includes("导出PDF")', 12000);
    await wait(1500);
    const reportState = await collectPageState(client);
    const reportMeta = await evalInPage(client, `
      (() => {
        const bodyText = document.body.innerText || '';
        return {
          hasFallbackText: bodyText.includes('当前数据量不足') || bodyText.includes('当前系统连接受限') || bodyText.includes('暂无历史记录'),
          hasHistoryButton: bodyText.includes('历史记录'),
          hasExportButton: bodyText.includes('导出报告') || bodyText.includes('导出PDF'),
          bodyText,
        };
      })()
    `);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      dataAudit,
      reportState,
      reportMeta,
    };
  } finally {
    await client.close();
  }
}

async function runHealthReportHistoryScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const assessmentAudit = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json()).then(async (sessionData) => {
        const userId = sessionData?.session?.user?.id;
        const assessmentsRes = await fetch(
          ${JSON.stringify(`${apiBase}/data/assessments?select=*`)} +
            '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'user_id', value: userId }])) +
            '&orders=' + encodeURIComponent(JSON.stringify([{ field: 'created_at', ascending: false }])) +
            '&limit=10',
          {
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
          }
        );
        return {
          sessionData,
          assessments: await assessmentsRes.json(),
        };
      })
    `);

    await navigate(client, `${baseUrl}#/profile`);
    await wait(2200);
    await clickByExpression(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('div'))
          .find((node) =>
            node.getClientRects().length > 0
            && node.className.includes('cursor-pointer')
            && (node.textContent || '').includes('查看健康报告')
          );
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'document.body.innerText.includes("多模态报告")', 12000);
    await wait(1200);

    const beforeHistory = await evalInPage(client, `
      (() => {
        const label = Array.from(document.querySelectorAll('div'))
          .map((node) => (node.textContent || '').trim())
          .find((text) => text === '综合风险分');
        const scoreNode = label
          ? Array.from(document.querySelectorAll('div'))
              .find((node) => (node.textContent || '').trim() === label)
              ?.parentElement?.querySelector('.text-2xl')
          : null;
        return {
          bodyText: document.body.innerText,
          fusionScore: scoreNode?.textContent?.trim() || null,
        };
      })()
    `);

    await clickByText(client, 'button', '历史记录');
    await waitForCondition(client, 'document.body.innerText.includes("历史评估记录")', 10000);
    await wait(1000);

    const historyState = await evalInPage(client, `
      (() => {
        const sheet = Array.from(document.querySelectorAll('[role="dialog"]'))
          .find((node) => (node.textContent || '').includes('历史评估记录'));
        if (!sheet) return null;
        const items = Array.from(sheet.querySelectorAll('.cursor-pointer'))
          .map((node) => (node.textContent || '').trim())
          .filter(Boolean);
        return {
          itemCount: items.length,
          items: items.slice(0, 5),
          bodyText: sheet.innerText,
        };
      })()
    `);

    const switched = await evalInPage(client, `
      (() => {
        const sheet = Array.from(document.querySelectorAll('[role="dialog"]'))
          .find((node) => (node.textContent || '').includes('历史评估记录'));
        if (!sheet) return false;
        const items = Array.from(sheet.querySelectorAll('.cursor-pointer'));
        const target = items[1] || items[0];
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    if (!switched) {
      throw new Error('History list item unavailable');
    }
    await wait(2000);
    await waitForCondition(client, '!document.body.innerText.includes("历史评估记录")', 10000);

    const afterHistory = await evalInPage(client, `
      (() => {
        const label = Array.from(document.querySelectorAll('div'))
          .map((node) => (node.textContent || '').trim())
          .find((text) => text === '综合风险分');
        const scoreNode = label
          ? Array.from(document.querySelectorAll('div'))
              .find((node) => (node.textContent || '').trim() === label)
              ?.parentElement?.querySelector('.text-2xl')
          : null;
        return {
          bodyText: document.body.innerText,
          fusionScore: scoreNode?.textContent?.trim() || null,
          toasts: Array.from(document.querySelectorAll('[data-sonner-toast]')).map((node) => node.textContent?.trim()).filter(Boolean),
        };
      })()
    `);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      assessmentAudit,
      beforeHistory,
      historyState,
      afterHistory,
    };
  } finally {
    await client.close();
  }
}

async function runPersonalInfoScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const beforeFetch = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json()).then(async (sessionData) => {
        const userId = sessionData?.session?.user?.id;
        const profileRes = await fetch(
          ${JSON.stringify(`${apiBase}/data/profiles?select=*`)} +
            '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'id', value: userId }])) +
            '&limit=1',
          {
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
          }
        );
        return {
          sessionData,
          profileEnvelope: await profileRes.json(),
        };
      })
    `);

    await navigate(client, `${baseUrl}#/profile/personal`);
    await waitForCondition(client, 'Boolean(document.querySelector("#full_name"))', 12000);
    await wait(1200);

    const suffix = Date.now().toString().slice(-4);
    await setInputValue(client, '#full_name', `资料患者${suffix}`);
    await clickSelector(client, '#female');
    await wait(300);
    await clickByExpression(client, `
      (() => {
        const trigger = Array.from(document.querySelectorAll('[role="combobox"]'))
          .find((node) => node.getClientRects().length > 0);
        if (!trigger) return false;
        trigger.click();
        return true;
      })()
    `);
    await waitForCondition(client, `
      Array.from(document.querySelectorAll('[role="option"]'))
        .some((node) => (node.textContent || '').trim() === '31 岁' && node.getClientRects().length > 0)
    `, 10000);
    await clickByExpression(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('[role="option"]'))
          .find((node) => (node.textContent || '').trim() === '31 岁' && node.getClientRects().length > 0);
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await setInputValue(client, '#height', '168');
    await setInputValue(client, '#weight', '58');
    await setInputValue(client, '#phone', '13800001234');
    await setInputValue(client, '#wechat', `wx_personal_${suffix}`);
    await setInputValue(client, '#email', `${username}.personal@example.com`);

    clearTrace(trace);
    await clickByText(client, 'button', '立即保存');
    await waitForResponse(trace, '/api/data/profiles', 20000);
    await wait(1800);

    const afterFetch = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json()).then(async (sessionData) => {
        const userId = sessionData?.session?.user?.id;
        const profileRes = await fetch(
          ${JSON.stringify(`${apiBase}/data/profiles?select=*`)} +
            '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'id', value: userId }])) +
            '&limit=1',
          {
            headers: {
              Accept: 'application/json',
              Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
            },
          }
        );
        return {
          sessionData,
          profileEnvelope: await profileRes.json(),
        };
      })
    `);

    const pageState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      beforeFetch,
      afterFetch,
      pageState,
    };
  } finally {
    await client.close();
  }
}

async function runProfileDoctorLoginScenario(baseUrl, patientUsername, patientPassword, doctorUsername, doctorPassword) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    const apiBase = apiBaseFromBaseUrl(baseUrl);
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    try {
      await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))', 8000);
    } catch {
      await evalInPage(client, `
        fetch(${JSON.stringify(`${apiBase}/auth/logout`)}, {
          method: 'POST',
          headers: { Accept: 'application/json' },
        }).catch(() => null).then(() => {
          window.localStorage.clear();
          return true;
        })
      `);
      await navigate(client, `${baseUrl}#/login`);
      await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
      await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))', 10000);
    }
    await setInputValue(client, '#login-username', patientUsername);
    await setInputValue(client, '#login-password', patientPassword);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);

    await navigate(client, `${baseUrl}#/profile`);
    await wait(2200);
    await clickByExpression(client, `
      (() => {
        const target = Array.from(document.querySelectorAll('div'))
          .find((node) =>
            node.getClientRects().length > 0
            && node.className.includes('cursor-pointer')
            && (node.textContent || '').includes('医生后台登录')
          );
        if (!target) return false;
        target.click();
        return true;
      })()
    `);
    await waitForCondition(client, 'Boolean(document.querySelector("#doctor-username"))', 10000);
    await setInputValue(client, '#doctor-username', doctorUsername);
    await setInputValue(client, '#doctor-password', doctorPassword);
    clearTrace(trace);
    await clickByText(client, 'button', '登录');
    const loginResponse = await waitForResponse(trace, '/api/auth/login', 20000);
    await wait(4000);
    const authState = await evalInPage(client, `
      fetch(${JSON.stringify(`${apiBase}/auth/session`)}, {
        headers: {
          Accept: 'application/json',
          Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
        },
      }).then((response) => response.json())
    `);
    const dashboardState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      loginResponse,
      authState,
      dashboardState,
    };
  } finally {
    await client.close();
  }
}

async function runDoctorCodeDeleteScenario(baseUrl, username, password) {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();
  const trace = await setupPage(client);

  try {
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    await evalInPage(client, 'window.localStorage.clear(); true');
    await navigate(client, `${baseUrl}#/login`);
    await clickByTextContains(client, 'button', '医生端');
    await clickSelectorIfPresent(client, '[role="tab"][id$="trigger-login"]');
    await waitForCondition(client, 'Boolean(document.querySelector("#login-username"))');
    await setInputValue(client, '#login-username', username);
    await setInputValue(client, '#login-password', password);
    await clickSelector(client, 'button[type="submit"]');
    await wait(2500);
    await installAutoConfirm(client);

    const apiBase = apiBaseFromBaseUrl(baseUrl);
    const verificationCode = `DEL${Date.now().toString().slice(-6)}`;

    await navigate(client, `${baseUrl}#/doctor/patients`);
    await wait(1800);
    await clickByText(client, 'button', '验证码管理');
    await waitForCondition(client, 'Boolean(document.querySelector("#new-code"))', 10000);
    await setInputValue(client, '#new-code', verificationCode);
    await setInputValue(client, '#notes', '自动化删除验证码');
    clearTrace(trace);
    await clickByTextContains(client, 'button', '创建验证码');
    const createCodeResponse = await waitForResponse(trace, '/api/data/doctor_verification_codes', 20000);
    await wait(1500);

    const createdCodeFetch = await evalInPage(client, `
      fetch(
        ${JSON.stringify(`${apiBase}/data/doctor_verification_codes?select=*`)} +
          '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'code', value: ${JSON.stringify(verificationCode)} }])) +
          '&limit=1',
        {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }
      ).then((response) => response.json())
    `);

    clearTrace(trace);
    await clickByExpression(client, `
      (() => {
        const code = ${JSON.stringify(verificationCode)};
        const rows = Array.from(document.querySelectorAll('[role="dialog"] .border'));
        const row = rows.find((node) => (node.textContent || '').includes(code));
        if (!row) return false;
        const button = Array.from(row.querySelectorAll('button'))
          .find((node) => node.querySelector('svg.lucide-trash-2') && node.getClientRects().length > 0);
        if (!button) return false;
        button.click();
        return true;
      })()
    `);
    const deleteCodeResponse = await waitForResponse(trace, '/api/data/doctor_verification_codes', 20000);
    await wait(1500);

    const afterDeleteFetch = await evalInPage(client, `
      fetch(
        ${JSON.stringify(`${apiBase}/data/doctor_verification_codes?select=*`)} +
          '&filters=' + encodeURIComponent(JSON.stringify([{ op: 'eq', field: 'code', value: ${JSON.stringify(verificationCode)} }])) +
          '&limit=1',
        {
          headers: {
            Accept: 'application/json',
            Authorization: 'Bearer ' + window.localStorage.getItem('xinyu-care.access-token'),
          },
        }
      ).then((response) => response.json())
    `);

    const dialogState = await collectPageState(client);

    return {
      requests: trace.requests,
      responses: trace.responses,
      consoleLines: trace.consoleLines,
      verificationCode,
      createCodeResponse,
      createdCodeFetch,
      deleteCodeResponse,
      afterDeleteFetch,
      dialogState,
    };
  } finally {
    await client.close();
  }
}

async function runInspectScenario(baseUrl, mode = 'login') {
  const wsUrl = await getTargetWsUrl();
  const client = new CdpClient(wsUrl);
  await client.connect();

  try {
    await setupPage(client);
    await navigate(client, 'about:blank');
    await navigate(client, `${baseUrl}#/login`);
    if (mode === 'signup') {
      await clickSelector(client, '[role="tab"][id$="trigger-signup"]');
      await wait(1000);
    }
    const state = await evalInPage(client, `
      (() => ({
        href: window.location.href,
        bodyText: document.body.innerText,
        buttons: Array.from(document.querySelectorAll('button')).map((node) => ({
          text: (node.textContent || '').trim(),
          type: node.getAttribute('type'),
          role: node.getAttribute('role'),
          id: node.id,
          ariaSelected: node.getAttribute('aria-selected'),
          dataState: node.getAttribute('data-state'),
        })),
        inputs: Array.from(document.querySelectorAll('input')).map((node) => ({
          id: node.id,
          type: node.type,
          placeholder: node.getAttribute('placeholder'),
          value: node.value,
        })),
      }))()
    `);
    return state;
  } finally {
    await client.close();
  }
}

async function main() {
  const scenario = process.argv[2];
  const baseUrl = process.argv[3] || 'https://jp.jerrypsy.top/xinyu-care/';

  if (scenario === 'auth') {
    const result = await runAuthScenario(baseUrl);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'assessment') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('assessment scenario requires username and password');
    }
    const result = await runAssessmentScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'assessment-dialogue') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('assessment-dialogue scenario requires username and password');
    }
    const result = await runAssessmentDialogueScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'assessment-full') {
    const username = process.argv[4];
    const password = process.argv[5];
    const audioFilePath = process.argv[6];
    if (!username || !password || !audioFilePath) {
      throw new Error('assessment-full scenario requires username, password, and audio file path');
    }
    const result = await runAssessmentFullScenario(baseUrl, username, password, audioFilePath);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'assessment-expression-inspect') {
    const username = process.argv[4];
    const password = process.argv[5];
    const audioFilePath = process.argv[6];
    if (!username || !password || !audioFilePath) {
      throw new Error('assessment-expression-inspect scenario requires username, password, and audio file path');
    }
    const result = await runAssessmentExpressionInspectScenario(baseUrl, username, password, audioFilePath);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'inspect') {
    const result = await runInspectScenario(baseUrl, process.argv[4] || 'login');
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'doctor') {
    const patientId = process.argv[4];
    const result = await runDoctorScenario(baseUrl, patientId);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'patient-actions') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('patient-actions scenario requires username and password');
    }
    const result = await runPatientActionsScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'doctor-actions') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('doctor-actions scenario requires username and password');
    }
    const result = await runDoctorActionsScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'healing-favorite') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('healing-favorite scenario requires username and password');
    }
    const result = await runHealingFavoriteScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'doctor-alert-handle') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('doctor-alert-handle scenario requires username and password');
    }
    const result = await runDoctorAlertHandleScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'doctor-dashboard-audit') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('doctor-dashboard-audit scenario requires username and password');
    }
    const result = await runDoctorDashboardAuditScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'doctor-patient-tabs') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('doctor-patient-tabs scenario requires username and password');
    }
    const result = await runDoctorPatientTabsScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'doctor-knowledge-crud') {
    const username = process.argv[4];
    const password = process.argv[5];
    const uploadFilePath = process.argv[6];
    if (!username || !password || !uploadFilePath) {
      throw new Error('doctor-knowledge-crud scenario requires username, password, and upload file path');
    }
    const result = await runDoctorKnowledgeCrudScenario(baseUrl, username, password, uploadFilePath);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'profile-assets') {
    const username = process.argv[4];
    const password = process.argv[5];
    const avatarFilePath = process.argv[6];
    const backgroundFilePath = process.argv[7];
    if (!username || !password || !avatarFilePath || !backgroundFilePath) {
      throw new Error('profile-assets scenario requires username, password, avatar file path, and background file path');
    }
    const result = await runProfileAssetsScenario(baseUrl, username, password, avatarFilePath, backgroundFilePath);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'doctor-code-signup') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('doctor-code-signup scenario requires doctor username and password');
    }
    const result = await runDoctorCodeSignupScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'smartband-persistence') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('smartband-persistence scenario requires username and password');
    }
    const result = await runSmartBandPersistenceScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'knowledge-engagement') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('knowledge-engagement scenario requires username and password');
    }
    const result = await runKnowledgeEngagementScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'health-report') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('health-report scenario requires username and password');
    }
    const result = await runHealthReportScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'health-report-history') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('health-report-history scenario requires username and password');
    }
    const result = await runHealthReportHistoryScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'profile-doctor-login') {
    const patientUsername = process.argv[4];
    const patientPassword = process.argv[5];
    const doctorUsername = process.argv[6];
    const doctorPassword = process.argv[7];
    if (!patientUsername || !patientPassword || !doctorUsername || !doctorPassword) {
      throw new Error('profile-doctor-login scenario requires patient username/password and doctor username/password');
    }
    const result = await runProfileDoctorLoginScenario(baseUrl, patientUsername, patientPassword, doctorUsername, doctorPassword);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'doctor-code-delete') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('doctor-code-delete scenario requires username and password');
    }
    const result = await runDoctorCodeDeleteScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'record-update') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('record-update scenario requires username and password');
    }
    const result = await runRecordUpdateScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'healing-depth') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('healing-depth scenario requires username and password');
    }
    const result = await runHealingDepthScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'patient-profile') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('patient-profile scenario requires username and password');
    }
    const result = await runPatientProfileScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'personal-info') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('personal-info scenario requires username and password');
    }
    const result = await runPersonalInfoScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (scenario === 'doctor-management') {
    const username = process.argv[4];
    const password = process.argv[5];
    if (!username || !password) {
      throw new Error('doctor-management scenario requires username and password');
    }
    const result = await runDoctorManagementScenario(baseUrl, username, password);
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  throw new Error(`Unknown scenario: ${scenario}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

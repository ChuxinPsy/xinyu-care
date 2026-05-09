import ky from 'ky';

/**
 * 格式化 AI 回复文本
 * - 去除 * 号（Markdown 强调符号）
 * - 优化排版结构
 */
export function formatAIResponse(text: string): string {
  if (!text) return '';

  return text
    // 去除单星号和双星号（Markdown 强调）
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    // 去除多余的空行（保留最多一个空行）
    .replace(/\n{3,}/g, '\n\n')
    // 去除行首行尾的空格
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // 去除首尾空白
    .trim();
}

export interface ModelScopeMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

export interface ModelScopeResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

/**
 * ModelScope 聊天补全函数 - 用于 AI 评估聊天界面
 * 使用 MiniMax/MiniMax-M2.5 模型
 * @param payload.messages - 消息数组，包含 system prompt 和 user message
 * @param payload.stream - 是否使用流式响应（默认 true 以支持打字机效果）
 */
export async function modelScopeChatCompletion(
  payload: { messages: ModelScopeMessage[]; stream?: boolean },
  options?: { timeout?: number; signal?: AbortSignal }
) {
  const timeout = options?.timeout || 60000;
  const model = 'MiniMax/MiniMax-M2.5';
  
  try {
    const body = {
      model,
      messages: payload.messages,
      stream: payload.stream ?? true,
      temperature: 0.7,
      max_tokens: 512,
    };

    // 使用流式响应
    if (body.stream) {
      const response = await fetch('/innerapi/v1/modelscope/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: options?.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ModelScope error ${response.status}: ${errorText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('无法获取响应流');
      }

      const decoder = new TextDecoder();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // 解析 SSE 格式的数据
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed?.choices?.[0]?.delta?.content || '';
              fullText += content;
            } catch {
              // 忽略解析错误
            }
          }
        }
      }

      return { raw: { model, messages: payload.messages }, text: fullText };
    }

    // 非流式响应
    const res = await ky.post('/innerapi/v1/modelscope/chat/completions', {
      json: body,
      timeout,
      throwHttpErrors: false,
      signal: options?.signal,
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json<any>() : await res.text();

    if (!res.ok) {
      const rawMsg = isJson ? (data?.error || data?.message || data) : data;
      const msg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
      throw new Error(`ModelScope error ${res.status}: ${msg}`);
    }

    const text = data?.choices?.[0]?.message?.content || '';
    return { raw: data, text };
  } catch (err: any) {
    throw new Error(String(err?.message || err));
  }
}


export async function modelScopeChat(payload: { model: string; messages: ModelScopeMessage[] }) {
  try {
    const body = {
      model: payload.model,
      messages: payload.messages,
      stream: false,
      temperature: 0.2,
      max_tokens: 128
    };
    const res = await ky.post('/innerapi/v1/modelscope/chat/completions', {
      json: body,
      timeout: 30000,
      throwHttpErrors: false
    });

    const contentType = res.headers.get('content-type') || '';
    const isJson = contentType.includes('application/json');
    const data = isJson ? await res.json<any>() : await res.text();

    if (!res.ok) {
      const rawMsg = isJson ? (data?.error || data?.message || data) : data;
      const msg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
      const code = isJson ? (data?.code || '') : '';
      if (res.status === 400 && typeof code === 'string' && code === '-20081') {
        const smallRes = await ky.post('/innerapi/v1/modelscope/chat/completions', {
          json: { ...body, max_tokens: 64, temperature: 0 },
          timeout: 30000,
          throwHttpErrors: false
        });
        const ct = smallRes.headers.get('content-type') || '';
        const smallIsJson = ct.includes('application/json');
        const smallData = smallIsJson ? await smallRes.json<any>() : await smallRes.text();
        if (!smallRes.ok) {
          const smallMsg = smallIsJson ? (smallData?.error || smallData?.message || JSON.stringify(smallData)) : String(smallData);
          throw new Error(`ModelScope error ${smallRes.status}: ${smallMsg}`);
        }
        const text2 = smallData?.choices?.[0]?.message?.content || '';
        return { raw: smallData, text: text2 };
      }
      throw new Error(`ModelScope error ${res.status}: ${msg}`);
    }

    const text = data?.choices?.[0]?.message?.content || '';
    return { raw: data, text };
  } catch (err: any) {
    throw new Error(String(err?.message || err));
  }
}

export async function modelScopeVisionChat(
  payload: { model: string; text: string; image_url: string },
  options?: { timeout?: number; signal?: AbortSignal }
) {
  const maxRetries = 1; // 减少重试次数以加快失败响应
  let lastError: any = null;
  const timeout = options?.timeout || 90000;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const body = {
        model: payload.model,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: payload.text },
              { type: 'image_url', image_url: { url: payload.image_url } },
            ],
          },
        ],
        stream: false,
        temperature: 0,
        max_tokens: 200, // 减少token以加快响应
      };
      
      const res = await ky.post('/innerapi/v1/modelscope/chat/completions', {
        json: body,
        timeout: timeout,
        throwHttpErrors: false,
        retry: {
          limit: 0, // 我们自己控制重试
        },
        signal: options?.signal,
      });
      
      const ct = res.headers.get('content-type') || '';
      const isJson = ct.includes('application/json');
      const data = isJson ? await res.json<any>() : await res.text();
      
      if (!res.ok) {
        const msg = isJson ? (data?.error || data?.message || JSON.stringify(data)) : String(data);
        throw new Error(`ModelScope error ${res.status}: ${msg}`);
      }
      
      const text = data?.choices?.[0]?.message?.content || '';
      return { raw: data, text };
      
    } catch (err: any) {
      lastError = err;
      // 如果是用户取消的请求，直接抛出不再重试
      if (err.name === 'AbortError' || err.message?.includes('abort')) {
        throw err;
      }
      console.warn(`Vision chat attempt ${attempt + 1} failed:`, err.message);
      
      // 如果不是最后一次尝试，等待后重试
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1))); // 减少等待时间
        continue;
      }
    }
  }
  
  // 所有重试都失败
  throw new Error(`Request timed out after ${maxRetries + 1} attempts: ${lastError?.message || lastError}`);
}

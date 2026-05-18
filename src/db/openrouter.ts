import ky from 'ky';
import { innerApiPath } from './internal-api';

export interface OpenRouterMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
}

export interface OpenRouterTranscriptionResponse {
  text: string;
}

export function formatAIResponse(text: string): string {
  if (!text) return '';

  return text
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}

function audioFileNameFromMime(type?: string) {
  const mime = (type || '').toLowerCase();
  if (mime.includes('webm')) return 'audio.webm';
  if (mime.includes('ogg')) return 'audio.ogg';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'audio.mp3';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'audio.m4a';
  return 'audio.wav';
}

export async function openRouterChatCompletion(
  payload: { messages: OpenRouterMessage[]; stream?: boolean },
  options?: { timeout?: number; signal?: AbortSignal }
) {
  const body = {
    messages: payload.messages,
    stream: payload.stream ?? true,
    temperature: 0.7,
    max_tokens: 512,
  };

  if (body.stream) {
    const response = await fetch(innerApiPath('/innerapi/v1/openrouter/chat/completions'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter error ${response.status}: ${errorText}`);
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
            // Ignore malformed SSE chunks.
          }
        }
      }
    }

    return { raw: { messages: payload.messages }, text: fullText };
  }

  const res = await ky.post(innerApiPath('/innerapi/v1/openrouter/chat/completions'), {
    json: body,
    timeout: options?.timeout || 60000,
    throwHttpErrors: false,
    signal: options?.signal,
  });

  const contentType = res.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await res.json<any>() : await res.text();

  if (!res.ok) {
    const rawMsg = isJson ? (data?.error || data?.message || data) : data;
    const msg = typeof rawMsg === 'string' ? rawMsg : JSON.stringify(rawMsg);
    throw new Error(`OpenRouter error ${res.status}: ${msg}`);
  }

  const text = data?.choices?.[0]?.message?.content || '';
  return { raw: data, text };
}

export async function openRouterVisionChat(
  payload: { text: string; image_url: string },
  options?: { timeout?: number; signal?: AbortSignal }
) {
  const maxRetries = 1;
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const body = {
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
        max_tokens: 200,
      };

      const res = await ky.post(innerApiPath('/innerapi/v1/openrouter/chat/completions'), {
        json: body,
        timeout: options?.timeout || 90000,
        throwHttpErrors: false,
        retry: {
          limit: 0,
        },
        signal: options?.signal,
      });

      const ct = res.headers.get('content-type') || '';
      const isJson = ct.includes('application/json');
      const data = isJson ? await res.json<any>() : await res.text();

      if (!res.ok) {
        const msg = isJson ? (data?.error || data?.message || JSON.stringify(data)) : String(data);
        throw new Error(`OpenRouter error ${res.status}: ${msg}`);
      }

      const text = data?.choices?.[0]?.message?.content || '';
      return { raw: data, text };
    } catch (err: any) {
      lastError = err;
      if (err.name === 'AbortError' || err.message?.includes('abort')) {
        throw err;
      }
      console.warn(`Vision chat attempt ${attempt + 1} failed:`, err.message);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
      }
    }
  }

  throw new Error(`Request timed out after ${maxRetries + 1} attempts: ${lastError?.message || lastError}`);
}

export async function transcribeAudio(audioFile: File | Blob): Promise<OpenRouterTranscriptionResponse> {
  const formData = new FormData();
  const file = audioFile instanceof File
    ? audioFile
    : new File([audioFile], audioFileNameFromMime((audioFile as any)?.type), { type: (audioFile as any)?.type || 'audio/wav' });
  formData.append('file', file, file.name);

  const resp = await ky.post(innerApiPath('/innerapi/v1/openrouter/audio/transcriptions'), {
    body: formData,
    timeout: 60000,
    throwHttpErrors: false,
  });

  const ct = resp.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await resp.json<any>() : await resp.text();

  if (!resp.ok) {
    throw new Error(`OpenRouter transcription error ${resp.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
  }

  const text = (data as any)?.text || (typeof data === 'string' ? data : '');
  return { text };
}

import { invokeFunction } from '@/lib/backend-api';

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
    .replace(/^[A-Za-z]\s*(\n|$)+/, '')
    .replace(/^(hi|hello)[,，!\s]+/i, '')
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

function audioFormatFromMime(type?: string) {
  const mime = (type || '').toLowerCase();
  if (mime.includes('webm')) return 'webm';
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('mpeg') || mime.includes('mp3')) return 'mp3';
  if (mime.includes('mp4') || mime.includes('m4a')) return 'm4a';
  return 'wav';
}

async function blobToBase64(blob: Blob) {
  const buffer = await blob.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

export async function openRouterChatCompletion(
  payload: { messages: OpenRouterMessage[]; stream?: boolean },
  options?: { timeout?: number; signal?: AbortSignal }
) {
  const body = {
    messages: payload.messages,
    stream: false,
    temperature: 0.7,
    max_tokens: 512,
  };

  const data = await invokeFunction<any>('chat-completion', body);
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
      const data = await invokeFunction<any>('multimodal-analysis', body);
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
  const file = audioFile instanceof File
    ? audioFile
    : new File([audioFile], audioFileNameFromMime((audioFile as any)?.type), { type: (audioFile as any)?.type || 'audio/wav' });
  const data = await invokeFunction<any>('speech-recognition', {
    input_audio: {
      data: await blobToBase64(file),
      format: audioFormatFromMime(file.type),
    },
  });
  const text = data?.text || '';
  return { text };
}

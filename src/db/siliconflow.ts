import ky from 'ky';

export interface SiliconFlowTranscriptionResponse {
  text: string;
  // x-siliconcloud-trace-id header is available in response
}

export async function transcribeAudio(audioFile: File | Blob, model: 'TeleAI/TeleSpeechASR' | 'FunAudioLLM/SenseVoiceSmall' = 'TeleAI/TeleSpeechASR'): Promise<SiliconFlowTranscriptionResponse> {
  const formData = new FormData();
  const file = (audioFile instanceof File) ? audioFile : new File([audioFile], 'audio.wav', { type: (audioFile as any)?.type || 'audio/wav' });
  formData.append('file', file, file.name);
  formData.append('model', model);

  try {
    const resp = await ky.post('/innerapi/v1/siliconflow/audio/transcriptions', {
      body: formData,
      timeout: 60000,
      throwHttpErrors: false
    });

    const ct = resp.headers.get('content-type') || '';
    const data = ct.includes('application/json') ? await resp.json<any>() : await resp.text();

    if (!resp.ok) {
      throw new Error(`SiliconFlow ASR error ${resp.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
    }

    const text = (data as any)?.text || (typeof data === 'string' ? data : '');
    return { text } as SiliconFlowTranscriptionResponse;
  } catch (err: any) {
    // 本地开发或代理不可用时，回退为直接调用官方接口（需前端可用的 VITE_SILICONFLOW_API_KEY）
    try {
      const apiKey = (import.meta as any)?.env?.VITE_SILICONFLOW_API_KEY;
      if (!apiKey) throw err;
      const direct = await fetch('https://api.siliconflow.cn/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });
      const ct = direct.headers.get('content-type') || '';
      const data = ct.includes('application/json') ? await direct.json() : await direct.text();
      if (!direct.ok) {
        throw new Error(`SiliconFlow direct error ${direct.status}: ${typeof data === 'string' ? data : JSON.stringify(data)}`);
      }
      const text = (data as any)?.text || (typeof data === 'string' ? data : '');
      return { text } as SiliconFlowTranscriptionResponse;
    } catch (e) {
      throw new Error(String((e as any)?.message || err?.message || err));
    }
  }
}

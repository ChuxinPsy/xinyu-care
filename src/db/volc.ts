import ky from 'ky';

export interface VolcContentText { type: 'input_text'; text: string }
export interface VolcContentImage { type: 'input_image'; image_url: string }
export interface VolcMessage { role: 'user' | 'system' | 'assistant'; content: Array<VolcContentText | VolcContentImage> }

export async function volcResponses(payload: { model: string; input: VolcMessage[] }) {
  const resp = await ky.post('/innerapi/v1/volc/responses', {
    json: payload,
    timeout: 90000,
    throwHttpErrors: false
  });

  const contentType = resp.headers.get('content-type') || '';
  const isJson = contentType.includes('application/json');
  const data = isJson ? await resp.json<any>() : await resp.text();

  if (!resp.ok) {
    const msg = isJson ? (data?.error || JSON.stringify(data)) : String(data);
    throw new Error(`VolcArk error ${resp.status}: ${msg}`);
  }

  const text = isJson
    ? (
        // 优先提取 output 数组中 type=message 的 content[0].text（适配最新API）
        data?.output?.find((item: any) => item.type === 'message')?.content?.[0]?.text ||
        // 兼容直接 content 结构
        data?.content?.[0]?.text ||
        // 兼容旧版 output_text 字段
        data?.output_text || 
        // 兼容流式响应
        data?.choices?.[0]?.delta?.content || 
        // 兼容标准响应
        data?.choices?.[0]?.message?.content?.[0]?.text || 
        ''
      )
    : String(data);

  return { raw: data, text };
}

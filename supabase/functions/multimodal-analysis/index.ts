// 文心多模态输入大模型 - 用于图片情绪分析和面部表情识别
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MultimodalContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
  };
}

interface MultimodalMessage {
  role: 'system' | 'user' | 'assistant';
  content: MultimodalContent[];
}

interface MultimodalRequest {
  messages: MultimodalMessage[];
  enable_thinking?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      throw new Error('INTEGRATIONS_API_KEY未配置');
    }

    const { messages, enable_thinking = false }: MultimodalRequest = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages参数无效');
    }

    // 调用文心多模态API
    const response = await fetch(
      'https://app-97zabxvzebcx-api-k93RZBjPykEa-gateway.appmiaoda.com/v2/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages,
          enable_thinking,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('multimodal-analysis错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

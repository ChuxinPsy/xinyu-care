// 文心文本生成大模型 - 用于AI对话评估和文本情感分析
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  enable_thinking?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const apiKey = openRouterKey || Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      throw new Error('OPENROUTER_API_KEY或INTEGRATIONS_API_KEY未配置');
    }

    const { messages, enable_thinking = false }: ChatRequest = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages参数无效');
    }

    const response = await fetch(
      openRouterKey
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://app-97zabxvzebcx-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(openRouterKey
            ? {
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': Deno.env.get('OPENROUTER_SITE_URL') || 'http://localhost:5173',
                'X-Title': Deno.env.get('OPENROUTER_APP_NAME') || 'XinyuCare',
              }
            : { 'X-Gateway-Authorization': `Bearer ${apiKey}` }),
        },
        body: JSON.stringify(openRouterKey
          ? {
              model: Deno.env.get('OPENROUTER_TEXT_MODEL') || 'deepseek/deepseek-chat-v3-0324',
              messages,
              stream: false,
              max_tokens: 512,
            }
          : { messages, enable_thinking }),
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
    console.error('chat-completion错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

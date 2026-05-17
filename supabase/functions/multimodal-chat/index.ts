const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: '消息不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY');
    const apiKey = openRouterKey || Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OPENROUTER_API_KEY或INTEGRATIONS_API_KEY未配置' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const response = await fetch(
      openRouterKey
        ? 'https://openrouter.ai/api/v1/chat/completions'
        : 'https://app-97zabxvzebcx-api-k93RZBjPykEa-gateway.appmiaoda.com/v2/chat/completions',
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
              model: Deno.env.get('OPENROUTER_VISION_MODEL') || 'qwen/qwen2.5-vl-72b-instruct',
              messages,
              stream: true,
              max_tokens: 512,
            }
          : { messages }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API错误:', errorText);
      return new Response(
        JSON.stringify({ error: '多模态分析失败' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 流式响应
    const stream = response.body;
    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('处理请求失败:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

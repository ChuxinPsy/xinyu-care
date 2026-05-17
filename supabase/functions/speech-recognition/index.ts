const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { format = 'wav', rate = 16000 } = body;
    const audioBase64 = body.audioBase64 || body.speech;

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: '音频数据不能为空' }),
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

    // 计算音频字节数
    const audioData = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
    const len = Math.ceil(audioData.length * 3 / 4);

    // 生成唯一用户标识
    const cuid = crypto.randomUUID();

    const response = openRouterKey
      ? await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': Deno.env.get('OPENROUTER_SITE_URL') || 'http://localhost:5173',
            'X-Title': Deno.env.get('OPENROUTER_APP_NAME') || 'XinyuCare',
          },
          body: JSON.stringify({
            model: Deno.env.get('OPENROUTER_TRANSCRIPTION_MODEL') || 'mistralai/voxtral-small-24b-2507',
            messages: [{
              role: 'user',
              content: [
                { type: 'text', text: '请把这段音频转写成中文文本。只返回转写文本。' },
                {
                  type: 'input_audio',
                  input_audio: {
                    data: audioData,
                    format,
                  },
                },
              ],
            }],
            stream: false,
            max_tokens: 256,
          }),
        })
      : await fetch(
          'https://app-97zabxvzebcx-api-Aa2PZnjEw5NL-gateway.appmiaoda.com/server_api',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Gateway-Authorization': `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              format,
              rate,
              cuid,
              speech: audioData,
              len,
            }),
          }
        );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API错误:', errorText);
      return new Response(
        JSON.stringify({ error: '语音识别失败' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const result = await response.json();

    if (openRouterKey) {
      return new Response(
        JSON.stringify({ text: result?.choices?.[0]?.message?.content || '' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (result.err_no !== 0) {
      return new Response(
        JSON.stringify({ error: result.err_msg || '语音识别失败' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        text: result.result?.[0] || '',
        corpus_no: result.corpus_no,
        sn: result.sn,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('处理请求失败:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

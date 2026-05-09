const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBase64, format = 'wav', rate = 16000 } = await req.json();

    if (!audioBase64) {
      return new Response(
        JSON.stringify({ error: '音频数据不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API密钥未配置' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 计算音频字节数
    const audioData = audioBase64.replace(/^data:audio\/\w+;base64,/, '');
    const len = Math.ceil(audioData.length * 3 / 4);

    // 生成唯一用户标识
    const cuid = crypto.randomUUID();

    const response = await fetch(
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

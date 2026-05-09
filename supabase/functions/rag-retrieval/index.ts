// RAG知识库检索 - 用于主动式对话系统
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface RAGRequest {
  query: string;
  conversation_history?: any[];
  assessment_type?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY');
    
    if (!apiKey) {
      throw new Error('INTEGRATIONS_API_KEY未配置');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { query, conversation_history = [], assessment_type = 'PHQ-9' }: RAGRequest = await req.json();

    // 1. 从知识库检索相关内容（支持所有分类：assessment, therapy, research）
    const { data: knowledgeItems, error: kbError } = await supabase
      .from('knowledge_base')
      .select('*')
      .eq('is_active', true)
      .or(`category.eq.assessment,category.eq.therapy,category.eq.research,tags.cs.{${assessment_type}}`)
      .limit(5);

    if (kbError) {
      console.error('知识库检索失败:', kbError);
    }

    // 2. 对文档类型的知识项进行内容解析
    const enrichedItems = await Promise.all(
      (knowledgeItems || []).map(async (item) => {
        // 如果是文档类型且有文件URL，尝试下载并解析
        if (item.content_type === 'document' && item.file_url) {
          try {
            console.log(`正在解析文档: ${item.file_name || item.file_url}`);
            
            const { data: fileData, error: downloadError } = await supabase.storage
              .from('knowledge-documents')
              .download(item.file_url);
            
            if (fileData && !downloadError) {
              const arrayBuffer = await fileData.arrayBuffer();
              // 尝试将文档内容解码为文本
              const text = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
              // 过滤掉二进制字符，保留可读文本
              const cleanText = text.replace(/[^\x20-\x7E\u4E00-\u9FA5\n\r]/g, '');
              
              // 使用解析后的内容替换原content字段（限制长度为3000字符）
              return { 
                ...item, 
                content: cleanText.slice(0, 3000) || item.content 
              };
            } else {
              console.error(`文档下载失败: ${item.file_url}`, downloadError);
            }
          } catch (err) {
            console.error('文档解析失败:', err);
          }
        }
        return item;
      })
    );

    // 3. 构建RAG上下文
    const knowledgeContext = enrichedItems.length > 0
      ? enrichedItems.map(item => `【${item.title}】\n${item.content}`).join('\n\n')
      : '暂无相关知识库内容';

    // 4. 构建主动式对话系统提示词
    const systemPrompt = `你是一位专业的心理咨询师,正在进行抑郁症评估对话。

【评估量表】${assessment_type}

【知识库参考】
${knowledgeContext}

【对话策略】
1. 主动式提问:根据评估量表的维度,逐步深入了解用户状态
2. 渐进式探索:从轻松话题开始,逐渐深入敏感问题
3. 共情回应:对用户的感受表示理解和关怀
4. 洞察分析:识别用户话语中的情绪信号和风险因素
5. 多维评估:涵盖情绪、睡眠、兴趣、精力、自我评价等维度

【当前对话轮次】${conversation_history.length / 2}

【下一步行动】
${conversation_history.length === 0 
  ? '开场:温和地介绍评估目的,询问用户最近的整体感受'
  : conversation_history.length < 6
  ? '探索期:根据用户回答,选择1-2个核心维度深入询问'
  : conversation_history.length < 12
  ? '深入期:关注用户提到的困扰,探索具体表现和影响'
  : '总结期:整合信息,给予初步反馈,询问是否还有补充'
}

请以温暖、专业的方式继续对话,每次回复控制在80字以内。`;

    // 5. 调用AI生成回复
    const response = await fetch(
      'https://app-97zabxvzebcx-api-zYkZz8qovQ1L-gateway.appmiaoda.com/v2/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...conversation_history,
            { role: 'user', content: query },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`AI调用失败: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    return new Response(JSON.stringify({
      ...data,
      knowledge_used: knowledgeItems?.length || 0,
      assessment_type,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('rag-retrieval错误:', error);
    return new Response(
      JSON.stringify({ error: error.message || '服务器错误' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

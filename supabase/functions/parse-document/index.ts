// 文档解析Edge Function
// 用于从Storage下载并解析PDF、Word、Excel等文档内容

import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ParseDocumentRequest {
  file_url: string;
}

Deno.serve(async (req) => {
  // 处理CORS预检请求
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { file_url }: ParseDocumentRequest = await req.json();

    if (!file_url) {
      throw new Error('缺少file_url参数');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('开始下载文档:', file_url);

    // 从Storage下载文件
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from('knowledge-documents')
      .download(file_url);

    if (downloadError) {
      console.error('文档下载失败:', downloadError);
      throw new Error(`文档下载失败: ${downloadError.message}`);
    }

    if (!fileData) {
      throw new Error('文件数据为空');
    }

    // 获取文件扩展名
    const fileExtension = file_url.split('.').pop()?.toLowerCase();

    // 根据文件类型解析内容
    let parsedContent = '';

    if (fileExtension === 'txt') {
      // 纯文本文件，直接解码
      const arrayBuffer = await fileData.arrayBuffer();
      parsedContent = new TextDecoder('utf-8').decode(arrayBuffer);
    } else if (fileExtension === 'pdf') {
      // PDF文件
      // TODO: 未来集成pdf-parse或调用AI文档理解API
      // 当前采用临时方案：尝试提取文本
      const arrayBuffer = await fileData.arrayBuffer();
      const text = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
      
      // 简单提取可读文本（PDF内部可能有二进制数据）
      parsedContent = text.replace(/[^\x20-\x7E\u4E00-\u9FA5\n\r]/g, '');
      
      if (!parsedContent.trim()) {
        parsedContent = '[PDF文档] 内容需要专业解析库，当前返回原始数据。建议未来集成pdfjs-dist或AI文档理解API。';
      }
    } else if (fileExtension === 'doc' || fileExtension === 'docx') {
      // Word文档
      // TODO: 未来集成mammoth库
      const arrayBuffer = await fileData.arrayBuffer();
      const text = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
      parsedContent = text.replace(/[^\x20-\x7E\u4E00-\u9FA5\n\r]/g, '');
      
      if (!parsedContent.trim()) {
        parsedContent = '[Word文档] 内容需要专业解析库，当前返回原始数据。建议未来集成mammoth库。';
      }
    } else if (fileExtension === 'xls' || fileExtension === 'xlsx') {
      // Excel表格
      // TODO: 未来集成xlsx库
      parsedContent = '[Excel文档] 表格数据需要专业解析库。建议未来集成xlsx库提取单元格内容。';
    } else {
      // 其他文件类型，尝试当作文本读取
      const arrayBuffer = await fileData.arrayBuffer();
      parsedContent = new TextDecoder('utf-8', { fatal: false }).decode(arrayBuffer);
    }

    // 限制返回内容长度，避免响应过大
    const maxLength = 5000;
    const truncatedContent = parsedContent.length > maxLength 
      ? parsedContent.slice(0, maxLength) + '\n\n[内容已截断，仅返回前5000字符]'
      : parsedContent;

    console.log(`文档解析成功，内容长度: ${parsedContent.length} 字符`);

    return new Response(
      JSON.stringify({
        success: true,
        file_url,
        content: truncatedContent,
        original_length: parsedContent.length,
        truncated: parsedContent.length > maxLength,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('parse-document错误:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || '文档解析失败',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

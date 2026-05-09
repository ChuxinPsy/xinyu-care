import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !serviceKey) { 
  console.error("缺少环境变量"); 
  process.exit(1); 
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function run() {
  const { data, error } = await sb
    .from("healing_contents")
    .select("id, title, content_type, description")
    .eq('content_type', 'article')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("查询失败:", error);
    return;
  }
  
  console.log(`找到 ${data.length} 篇文章:\n`);
  data.forEach((article, index) => {
    console.log(`${index + 1}. ${article.title}`);
    console.log(`   描述长度: ${article.description?.length || 0} 字符`);
    console.log(`   描述预览: ${article.description?.substring(0, 100)}...\n`);
  });
}

run().catch(e => { 
  console.error("执行失败:", e); 
  process.exit(1); 
});

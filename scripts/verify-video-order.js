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
  console.log("验证视频顺序...\n");
  
  const { data: videos, error } = await sb
    .from("healing_contents")
    .select("title, created_at, content_type")
    .eq('content_type', 'video')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error("查询失败:", error);
    return;
  }
  
  console.log("视频列表（按显示顺序）:");
  videos.forEach((v, index) => {
    console.log(`${index + 1}. ${v.title}`);
    console.log(`   创建时间: ${v.created_at}\n`);
  });
}

run().catch(e => { 
  console.error("执行失败:", e); 
  process.exit(1); 
});

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.MIGRATE_TARGET_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const serviceKey = process.env.MIGRATE_TARGET_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !serviceKey) { 
  console.error("missing_target_env"); 
  process.exit(1); 
}
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function run() {
  console.log("开始清理无效视频数据...\n");
  
  // 查询所有视频类型的内容
  const { data: videos, error: fetchError } = await sb
    .from("healing_contents")
    .select("*")
    .eq("content_type", "video");
  
  if (fetchError) {
    console.error("查询失败:", fetchError);
    process.exit(1);
  }
  
  console.log(`找到 ${videos.length} 条视频记录\n`);
  
  // 找出没有 content_url 的记录
  const invalidVideos = videos.filter(v => !v.content_url);
  
  console.log(`其中 ${invalidVideos.length} 条没有视频文件（content_url 为空）\n`);
  
  if (invalidVideos.length === 0) {
    console.log("没有需要清理的数据");
    return;
  }
  
  // 显示将要删除的记录
  console.log("将要删除以下记录：");
  invalidVideos.forEach(v => {
    console.log(`  - ${v.title} (ID: ${v.id})`);
  });
  console.log();
  
  // 删除无效记录
  for (const video of invalidVideos) {
    const { error: deleteError } = await sb
      .from("healing_contents")
      .delete()
      .eq("id", video.id);
    
    if (deleteError) {
      console.error(`✗ 删除失败: ${video.title}`, deleteError);
    } else {
      console.log(`✓ 已删除: ${video.title}`);
    }
  }
  
  console.log("\n清理完成！");
  
  // 显示剩余的有效视频
  const { data: remainingVideos } = await sb
    .from("healing_contents")
    .select("*")
    .eq("content_type", "video");
  
  console.log(`\n剩余 ${remainingVideos.length} 条有效视频记录：`);
  remainingVideos.forEach(v => {
    console.log(`  ✓ ${v.title}`);
    console.log(`    文件: ${v.content_url}`);
    console.log(`    作者: ${v.author}`);
    console.log(`    时长: ${Math.floor(v.duration / 60)}分钟`);
    console.log();
  });
}

run().catch(e => { 
  console.error("执行失败:", e); 
  process.exit(1); 
});

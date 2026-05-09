import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!url || !serviceKey) { 
  console.error("缺少环境变量: VITE_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY"); 
  process.exit(1); 
}

const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function run() {
  console.log("开始调整视频顺序...\n");
  
  try {
    // 获取这两个视频的当前信息
    const { data: videos, error: fetchError } = await sb
      .from("healing_contents")
      .select("id, title, created_at")
      .in('title', ['睡眠与心理健康的关系', '运动如何改善心理健康'])
      .order('created_at', { ascending: true });
    
    if (fetchError) {
      console.error("获取视频失败:", fetchError);
      return;
    }
    
    if (!videos || videos.length !== 2) {
      console.error("未找到这两个视频或数量不对");
      return;
    }
    
    console.log("找到视频:");
    videos.forEach(v => console.log(`  - ${v.title} (创建时间: ${v.created_at})`));
    
    // 找到"睡眠与心理健康的关系"和"运动如何改善心理健康"
    const sleepVideo = videos.find(v => v.title === '睡眠与心理健康的关系');
    const exerciseVideo = videos.find(v => v.title === '运动如何改善心理健康');
    
    if (!sleepVideo || !exerciseVideo) {
      console.error("未找到目标视频");
      return;
    }
    
    // 交换它们的创建时间，让"睡眠"视频的创建时间晚于"运动"视频
    // 这样在默认排序（按创建时间降序）时，"睡眠"会显示在"运动"上面
    const sleepTime = new Date(sleepVideo.created_at);
    const exerciseTime = new Date(exerciseVideo.created_at);
    
    // 如果"睡眠"已经在"运动"后面（时间更早），需要调整
    if (sleepTime < exerciseTime) {
      console.log("\n需要调整顺序...");
      
      // 将"睡眠"的时间设置为比"运动"晚1秒
      const newSleepTime = new Date(exerciseTime.getTime() + 1000).toISOString();
      
      const { error: updateError } = await sb
        .from("healing_contents")
        .update({ created_at: newSleepTime })
        .eq('id', sleepVideo.id);
      
      if (updateError) {
        console.error("更新失败:", updateError);
        return;
      }
      
      console.log(`✓ 已调整: "${sleepVideo.title}" 现在会显示在 "${exerciseVideo.title}" 上面`);
    } else {
      console.log("\n顺序已经正确，无需调整");
    }
    
    console.log("\n调整完成！");
  } catch (error) {
    console.error("执行失败:", error);
  }
}

run().catch(e => { 
  console.error("执行失败:", e); 
  process.exit(1); 
});

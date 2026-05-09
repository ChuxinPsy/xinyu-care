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
  // 视频内容数据
  const videoContents = [
    {
      title: "正念冥想入门指南",
      description: "深入理解 React 18 中引入的并发特性，包括 Suspense、Transitions 等核心概念，帮助你构建更流畅的用户体验。",
      content_type: "video",
      content_url: "/srcs/video/正念冥想.mp4",
      category: "meditation",
      author: "心理健康专家",
      duration: 720, // 12分钟
      is_active: true,
      view_count: 1250,
      like_count: 89,
    },
    {
      title: "睡眠与心理健康的关系",
      description: "从零开始学习 RSC 的工作原理，以及如何在 Next.js 中高效使用服务端组件，提升应用性能和开发体验。",
      content_type: "video",
      content_url: "/srcs/video/睡眠与心理健康.mp4",
      category: "health",
      author: "睡眠研究专家",
      duration: 900, // 15分钟
      is_active: true,
      view_count: 2100,
      like_count: 156,
    },
    {
      title: "运动如何改善心理健康",
      description: "了解运动对心理健康的积极影响，学习如何通过适度运动来缓解压力、改善情绪和提升整体幸福感。",
      content_type: "video",
      content_url: "/srcs/video/运动与心理健康.mp4",
      category: "health",
      author: "运动心理学家",
      duration: 840, // 14分钟
      is_active: true,
      view_count: 1680,
      like_count: 124,
    },
  ];

  console.log("开始添加视频内容...");
  
  for (const content of videoContents) {
    const { data, error } = await sb
      .from("healing_contents")
      .insert(content)
      .select()
      .single();
    
    if (error) {
      console.error(`添加视频失败: ${content.title}`, error);
    } else {
      console.log(`✓ 已添加: ${content.title}`);
    }
  }
  
  console.log("\n视频内容添加完成！");
}

run().catch(e => { 
  console.error("执行失败:", e); 
  process.exit(1); 
});

import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.MIGRATE_TARGET_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const serviceKey = process.env.MIGRATE_TARGET_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
if (!url || !serviceKey) { console.error("missing_target_env"); process.exit(1); }
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function run() {
  const items = [
    {
      title: "PHQ-9 评估量表简介",
      content: "PHQ-9 用于评估过去两周的抑郁症状，包含9个条目，每项0-3分，总分0-27。5/10/15/20分别代表轻/中/重/极重程度。",
      category: "assessment",
      tags: ["PHQ-9","抑郁评估"],
      is_active: true,
    },
    {
      title: "认知行为疗法(CBT)核心步骤",
      content: "CBT通过识别并修正负性自动思维改善情绪。核心流程：记录事件-情绪-想法；寻找证据；生成替代性思维；行为实验验证。",
      category: "treatment",
      tags: ["CBT","治疗方法"],
      is_active: true,
    },
    {
      title: "正念冥想的科学依据",
      content: "多项研究表明正念冥想能降低压力、改善睡眠并减轻抑郁复发风险。建议从每次5-10分钟开始，逐步延长到20分钟。",
      category: "research",
      tags: ["冥想","研究资料"],
      is_active: true,
    },
    {
      title: "睡眠卫生指南",
      content: "固定作息、减少睡前屏幕、避免晚间咖啡因、建立放松仪式(呼吸/拉伸)。若失眠持续两周以上，请求专业评估。",
      category: "treatment",
      tags: ["睡眠","治疗方法"],
      is_active: true,
    },
  ];

  for (const it of items) {
    const { error } = await sb.from("knowledge_base").insert(it);
    if (error) throw error;
  }
  console.log("seeded-knowledge");
}

run().catch(e => { console.error(e); process.exit(1); });


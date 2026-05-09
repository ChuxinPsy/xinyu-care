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
  console.log("开始更新文章描述...\n");
  
  const updates = [
    {
      title: '认知行为疗法(CBT)介绍',
      description: '认知行为疗法（Cognitive Behavioral Therapy，简称CBT）是一种结构化的心理治疗方法，核心思想是：影响我们情绪的，不是事件本身，而是我们对事件的看法。CBT的基本模型可以概括为：情境—思维—情绪—行为。治疗包括三个层次的认知：自动思维（最表层的、具体情境下自动产生的想法）、中间信念（包括态度、规则和假设）、核心信念（最深层的、关于自我、他人和世界的绝对化信念）。CBT是短程、结构化的治疗，通常持续8-20次，通过识别自动思维、挑战扭曲认知、行为激活等技术帮助改变负面思维模式。'
    },
    {
      title: '家人如何支持抑郁症患者',
      description: '给家属的实用建议和沟通技巧。一、正确认识抑郁症：抑郁症是常见精神疾病，通过治疗可以康复。了解常见症状有助于更好地帮助患者，包括持续情绪低落、对事物失去兴趣、疲惫无力、睡眠障碍等。二、做好「陪伴者」：用心倾听，不急于劝解或指责，避免说"想开点""振作起来"之类的话。接纳对方的痛苦，表达愿意陪伴的态度。在对方愿意的前提下，陪伴进行简单运动如散步。通过尊重和关心，让对方感受被需要。三、做好「监督人」：观察记录饮食、睡眠、情绪等变化，异常情况及时联系医生。提醒按时服药，必要时督促药物治疗，与医生保持沟通。'
    },
    {
      title: '认识抑郁症:症状与诊断',
      description: '深入了解抑郁症的常见症状、诊断标准和治疗方法。抑郁症是一种常见的心理疾病，主要表现为持续的情绪低落、兴趣减退、精力下降等。诊断需要符合特定的标准，包括症状持续时间、严重程度等。治疗方法包括药物治疗、心理治疗和生活方式调整等多种方式，通过科学的治疗，大多数患者都能获得显著改善。'
    },
    {
      title: '如何应对焦虑情绪',
      description: '学习有效的焦虑管理技巧和应对策略。焦虑是一种常见的情绪反应，适度的焦虑有助于我们应对挑战，但过度焦虑会影响生活质量。本文介绍多种实用的焦虑管理方法，包括深呼吸练习、渐进性肌肉放松、认知重构等技术。通过系统学习和练习这些技巧，你可以更好地控制焦虑情绪，提升心理健康水平。'
    }
  ];
  
  for (const update of updates) {
    const { data, error } = await sb
      .from("healing_contents")
      .update({ description: update.description })
      .eq('title', update.title)
      .select();
    
    if (error) {
      console.error(`❌ 更新失败: ${update.title}`, error.message);
    } else if (data && data.length > 0) {
      console.log(`✓ 已更新: ${update.title}`);
    } else {
      console.log(`⚠ 未找到: ${update.title}`);
    }
  }
  
  console.log("\n文章描述更新完成！");
}

run().catch(e => { 
  console.error("执行失败:", e); 
  process.exit(1); 
});

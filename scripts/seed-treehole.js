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

async function ensureSeedUser() {
  const seedEmail = "seeduser@miaoda.com";
  const { data: list } = await sb.auth.admin.listUsers({ email: seedEmail });
  if (list?.users?.length) return list.users[0].id;
  const { data: created, error } = await sb.auth.admin.createUser({ email: seedEmail, password: "SeedUser123!", email_confirm: true, user_metadata: { username: "seeduser" } });
  if (error) throw error;
  return created?.user?.id;
}

async function ensureCategories() {
  const cats = [
    { name: "寻求支持", description: "分享困扰与求助", icon: "heart", color: "pink" },
    { name: "分享进展", description: "康复进度与变化", icon: "trending-up", color: "green" },
    { name: "提问", description: "心理健康相关提问", icon: "help-circle", color: "blue" },
    { name: "提供鼓励", description: "鼓励与支持", icon: "smile", color: "yellow" },
    { name: "康复故事", description: "完整康复经历", icon: "star", color: "purple" },
  ];
  for (const c of cats) await sb.from("post_categories").insert(c).select();
  const { data } = await sb.from("post_categories").select("id,name");
  return data || [];
}

async function seedPosts(userId, categories) {
  const idOf = (name) => (categories || []).find(c => c.name === name)?.id;
  const rows = [
    { title: "从抑郁中走出来的365天", content: "一年前被诊断为中度抑郁…现在走出来了。坚持服药、心理咨询、冥想与运动，每个小进步都值得。", category_id: idOf("康复故事"), is_recovery_story: true },
    { title: "今天是我连续冥想的第30天", content: "每天10分钟呼吸冥想让我更平静，焦虑明显减轻。", category_id: idOf("分享进展") },
    { title: "最近总是失眠，怎么办？", content: "连续一周睡不好，请求改善睡眠的建议。", category_id: idOf("提问") },
    { title: "给正在努力的朋友", content: "面对问题、寻求帮助的人都很勇敢。康复需要时间，每个进步都值得。", category_id: idOf("提供鼓励") },
    { title: "感觉又回到了原点", content: "最近情绪低落，什么都不想做。是否永远好不了？", category_id: idOf("寻求支持") },
  ];
  for (const r of rows) {
    const { error } = await sb.from("community_posts").insert({
      user_id: userId,
      anonymous_name: "匿名用户",
      anonymous_nickname: `用户${Math.random().toString(36).substring(2,8)}`,
      is_hidden: false,
      is_pinned: false,
      like_count: Math.floor(Math.random()*100),
      comment_count: Math.floor(Math.random()*30),
      ...r,
    });
    if (error) throw error;
  }
}

async function run() {
  const uid = await ensureSeedUser();
  const cats = await ensureCategories();
  await seedPosts(uid, cats);
  console.log("seeded");
}

run().catch(e => { console.error(e); process.exit(1); });

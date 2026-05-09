import { createClient } from "@supabase/supabase-js";

const srcUrl = process.env.MIGRATE_SOURCE_SUPABASE_URL || "";
const srcServiceKey = process.env.MIGRATE_SOURCE_SERVICE_ROLE_KEY || "";
const dstUrl = process.env.MIGRATE_TARGET_SUPABASE_URL || "";
const dstServiceKey = process.env.MIGRATE_TARGET_SERVICE_ROLE_KEY || "";

function client(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false } });
}

async function start() {
  const src = client(srcUrl, srcServiceKey);
  const dst = client(dstUrl, dstServiceKey);
  const tables = [
    "profiles","emotion_diaries","assessments","wearable_data","healing_contents","user_healing_records",
    "community_posts","community_comments","post_likes","doctor_patients","risk_alerts","knowledge_base",
    "meditation_sessions","user_favorites","post_categories"
  ];
  for (const t of tables) {
    const ch = src.channel(`repl_${t}`).on("postgres_changes", { event: "INSERT", schema: "public", table: t }, async payload => {
      await dst.from(t).insert(payload.new as any);
    }).on("postgres_changes", { event: "UPDATE", schema: "public", table: t }, async payload => {
      const pk = (payload.new as any).id;
      await dst.from(t).update(payload.new as any).eq("id", pk);
    }).on("postgres_changes", { event: "DELETE", schema: "public", table: t }, async payload => {
      const pk = (payload.old as any).id;
      await dst.from(t).delete().eq("id", pk);
    });
    await ch.subscribe();
  }
}

start().catch(e => { process.stderr.write(String(e)+"\n"); process.exit(1); });


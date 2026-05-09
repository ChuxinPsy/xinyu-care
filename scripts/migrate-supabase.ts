import { createClient } from "@supabase/supabase-js";

const srcUrl = process.env.MIGRATE_SOURCE_SUPABASE_URL || "";
const srcServiceKey = process.env.MIGRATE_SOURCE_SERVICE_ROLE_KEY || "";
const dstUrl = process.env.MIGRATE_TARGET_SUPABASE_URL || "";
const dstServiceKey = process.env.MIGRATE_TARGET_SERVICE_ROLE_KEY || "";

function assertEnv() {
  if (!srcUrl || !srcServiceKey || !dstUrl || !dstServiceKey) throw new Error("missing_env");
}

function client(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false } });
}

async function ensureBuckets(dst: ReturnType<typeof createClient>) {
  const existing = await dst.storage.listBuckets();
  const hasDiary = (existing.data || []).some(b => b.name === "diary-images");
  if (!hasDiary) await dst.storage.createBucket("diary-images", { public: true, allowedMimeTypes: ["image/jpeg","image/jpg","image/png","image/gif","image/webp"], fileSizeLimit: 5242880 });
}

async function copyTable(src: ReturnType<typeof createClient>, dst: ReturnType<typeof createClient>, table: string, batch = 1000) {
  let from = 0;
  for (;;) {
    const { data, error } = await src.from(table).select("*").order("created_at", { ascending: true }).range(from, from + batch - 1);
    if (error) throw error;
    const rows = data || [];
    if (rows.length === 0) break;
    for (const chunk of chunkArray(rows, 500)) {
      const { error: werr } = await dst.from(table).insert(chunk);
      if (werr) throw werr;
    }
    from += rows.length;
  }
}

function chunkArray<T>(arr: T[], size: number) {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function rewritePublicUrl(dst: ReturnType<typeof createClient>, bucket: string, path: string) {
  const r = dst.storage.from(bucket).getPublicUrl(path);
  return r.data.publicUrl;
}

async function copyDiaryImages(src: ReturnType<typeof createClient>, dst: ReturnType<typeof createClient>) {
  const { data, error } = await src.storage.from("diary-images").list("", { limit: 1000 });
  if (error) throw error;
  const files = data || [];
  for (const f of files) {
    const { data: downloaded, error: derr } = await src.storage.from("diary-images").download(f.name);
    if (derr) throw derr;
    const { error: uerr } = await dst.storage.from("diary-images").upload(f.name, downloaded, { upsert: true });
    if (uerr) throw uerr;
  }
}

async function rewriteFileUrls(dst: ReturnType<typeof createClient>) {
  const tables = ["emotion_diaries","assessments","healing_contents"]; 
  for (const t of tables) {
    const { data } = await dst.from(t).select("id, image_input_url, video_input_url, voice_input_url, content_url, thumbnail_url");
    const rows = data || [];
    for (const row of rows) {
      const updates: any = {};
      if (row.content_url && row.content_url.includes("diary-images")) updates.content_url = rewritePublicUrl(dst, "diary-images", row.content_url.split("/").pop());
      if (row.thumbnail_url && row.thumbnail_url.includes("diary-images")) updates.thumbnail_url = rewritePublicUrl(dst, "diary-images", row.thumbnail_url.split("/").pop());
      if (row.image_input_url && row.image_input_url.includes("diary-images")) updates.image_input_url = rewritePublicUrl(dst, "diary-images", row.image_input_url.split("/").pop());
      if (row.video_input_url && row.video_input_url.includes("diary-images")) updates.video_input_url = rewritePublicUrl(dst, "diary-images", row.video_input_url.split("/").pop());
      if (row.voice_input_url && row.voice_input_url.includes("diary-images")) updates.voice_input_url = rewritePublicUrl(dst, "diary-images", row.voice_input_url.split("/").pop());
      if (Object.keys(updates).length > 0) await dst.from(t).update(updates).eq("id", row.id);
    }
  }
}

async function main() {
  assertEnv();
  const src = client(srcUrl, srcServiceKey);
  const dst = client(dstUrl, dstServiceKey);
  await ensureBuckets(dst);
  const tables = [
    "profiles","emotion_diaries","assessments","wearable_data","healing_contents","user_healing_records",
    "community_posts","community_comments","post_likes","doctor_patients","risk_alerts","knowledge_base",
    "meditation_sessions","user_favorites","post_categories"
  ];
  for (const t of tables) await copyTable(src, dst, t);
  await copyDiaryImages(src, dst);
  await rewriteFileUrls(dst);
  process.stdout.write("done\n");
}

main().catch(e => { process.stderr.write(String(e)+"\n"); process.exit(1); });


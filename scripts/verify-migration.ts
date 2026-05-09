import { createClient } from "@supabase/supabase-js";

const srcUrl = process.env.MIGRATE_SOURCE_SUPABASE_URL || "";
const srcServiceKey = process.env.MIGRATE_SOURCE_SERVICE_ROLE_KEY || "";
const dstUrl = process.env.MIGRATE_TARGET_SUPABASE_URL || "";
const dstServiceKey = process.env.MIGRATE_TARGET_SERVICE_ROLE_KEY || "";

function client(url: string, key: string) {
  return createClient(url, key, { auth: { persistSession: false } });
}

async function count(c: ReturnType<typeof createClient>, t: string) {
  const { count } = await c.from(t).select("*", { count: "exact", head: true });
  return count || 0;
}

async function verifyCdn(url: string) {
  const t0 = Date.now();
  const res = await fetch(url, { method: "HEAD" });
  const t = Date.now() - t0;
  return { ok: res.ok, ms: t };
}

async function p99(samples: number[], p = 0.99) {
  const s = [...samples].sort((a, b) => a - b);
  const idx = Math.min(s.length - 1, Math.floor(s.length * p));
  return s[idx];
}

async function loadCdnSamples(dst: ReturnType<typeof createClient>, n = 50) {
  const { data } = await dst.from("healing_contents").select("thumbnail_url").limit(n);
  const samples = [] as number[];
  let ok = 0;
  for (const r of data || []) {
    if (!r.thumbnail_url) continue;
    const rtt = await verifyCdn(r.thumbnail_url);
    samples.push(rtt.ms);
    if (rtt.ok) ok++;
  }
  return { okCount: ok, p99: await p99(samples) };
}

async function main() {
  const src = client(srcUrl, srcServiceKey);
  const dst = client(dstUrl, dstServiceKey);
  const tables = [
    "profiles","emotion_diaries","assessments","wearable_data","healing_contents","user_healing_records",
    "community_posts","community_comments","post_likes","doctor_patients","risk_alerts","knowledge_base",
    "meditation_sessions","user_favorites","post_categories"
  ];
  for (const t of tables) {
    const sc = await count(src, t);
    const dc = await count(dst, t);
    if (sc !== dc) throw new Error(`count_mismatch:${t}:${sc}:${dc}`);
  }
  const cdn = await loadCdnSamples(dst, 50);
  if (cdn.p99 > 500 || cdn.okCount < 1) throw new Error("cdn_perf");
  process.stdout.write("verified\n");
}

main().catch(e => { process.stderr.write(String(e)+"\n"); process.exit(1); });


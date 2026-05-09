import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config();

const url = process.env.MIGRATE_TARGET_SUPABASE_URL || process.env.VITE_SUPABASE_URL || "";
const serviceKey = process.env.MIGRATE_TARGET_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const username = process.env.PROMOTE_USERNAME || process.argv[2];
const role = process.env.PROMOTE_ROLE || process.argv[3] || "doctor";
if (!url || !serviceKey || !username) { console.error("usage: PROMOTE_USERNAME or argv <username> [doctor|admin]"); process.exit(1); }
const sb = createClient(url, serviceKey, { auth: { persistSession: false } });

async function run() {
  const { data: profile } = await sb.from("profiles").select("id,username,role").eq("username", username).maybeSingle();
  if (!profile) { console.error("profile_not_found"); process.exit(2); }
  const { error } = await sb.from("profiles").update({ role }).eq("id", profile.id);
  if (error) throw error;
  console.log(`promoted ${username} -> ${role}`);
}

run().catch(e => { console.error(e); process.exit(1); });


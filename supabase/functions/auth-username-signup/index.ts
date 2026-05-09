import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json", ...corsHeaders },
  });
}

export default async function (req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { username, password } = await req.json();
    if (!username || !password) return json({ error: "missing_params" }, 400);
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);
    const email = `${username}@miaoda.com`;

    const { data: userList, error: listErr } = await sb.auth.admin.listUsers({ email });
    if (listErr) return json({ error: String(listErr) }, 500);
    if (userList && userList.users && userList.users.length > 0) return json({ ok: true, created: false }, 200);

    const { error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { username } });
    if (error) return json({ error: String(error) }, 500);
    return json({ ok: true, created: true }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
}

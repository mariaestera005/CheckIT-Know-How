import { createServerFn } from "@tanstack/react-start";

export const DEMO_EMAIL = "demo@ledger-demo.example";

/**
 * Prototype only: public endpoint that hands out a one-time sign-in token for the shared demo
 * account, so visitors can use the app without creating an account.
 */
export const startDemoSession = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: existing } = await supabaseAdmin.from("profiles").select("id").eq("email", DEMO_EMAIL).maybeSingle();
  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: DEMO_EMAIL,
      email_confirm: true,
      user_metadata: { display_name: "Demo User" },
    });
    if (error) throw new Error(error.message);
    userId = data.user.id;
  }
  // The demo account can use every feature (settings included); team changes are blocked separately.
  await supabaseAdmin.from("user_roles").upsert({ user_id: userId, role: "admin" }, { onConflict: "user_id,role" });

  const { data, error } = await supabaseAdmin.auth.admin.generateLink({ type: "magiclink", email: DEMO_EMAIL });
  if (error) throw new Error(error.message);
  return { tokenHash: data.properties.hashed_token };
});

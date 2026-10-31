import { supabase } from "@/integrations/supabase/client";
import { startDemoSession } from "@/backend/demo.functions";

// Set when someone chooses "Use a real account", so the app shows the sign-in page
// instead of silently signing them back into the demo (lasts for this browser tab only).
const WANTS_REAL_ACCOUNT = "checkit-wants-real-account";

export const wantsRealAccount = () => sessionStorage.getItem(WANTS_REAL_ACCOUNT) === "1";
export const setWantsRealAccount = (on: boolean) =>
  on ? sessionStorage.setItem(WANTS_REAL_ACCOUNT, "1") : sessionStorage.removeItem(WANTS_REAL_ACCOUNT);

/** Signs the browser into the shared demo account. */
export async function signInAsDemo() {
  setWantsRealAccount(false);
  const { tokenHash } = await startDemoSession();
  const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "magiclink" });
  if (error) throw error;
  return data.user;
}

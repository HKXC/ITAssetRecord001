import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { publicEnv } from "@/env";
import type { Database } from "@/lib/database.types";

/**
 * Request-scoped Supabase client using the signed-in user's cookies.
 *
 * Row Level Security applies to everything done with this client. It is used for reads
 * and for asset writes. Documents and Storage objects are written only by the
 * server-side pipeline in src/lib/services/documents.ts, which uses the admin client.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();
  const { supabaseUrl, supabasePublishableKey } = publicEnv();

  return createServerClient<Database>(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. Session refresh is handled in
          // src/proxy.ts, so swallowing this is intentional and safe.
        }
      },
    },
  });
}

/**
 * Data Access Layer: the single place that answers "who is the current user?".
 * `getUser()` revalidates the token with Supabase Auth, unlike `getSession()`.
 *
 * ── TEMP-BYPASS-LOGIN (ยังไม่ต้องล็อกอิน — ปิดชั่วคราว) ──────────────────────
 * อยากกลับมาใช้รูปแบบเดิม: ลบ try/catch ด้านล่างออก แล้วคืนบอดี้เดิม
 * (โค้ดเดิมเก็บไว้ใน comment ใต้บรรทัด `// [REVERT-LOGIN] ORIGINAL:`)
 * ────────────────────────────────────────────────────────────────────────────
 */
export async function getCurrentUser() {
  // [REVERT-LOGIN] ORIGINAL:
  // const supabase = await createServerSupabaseClient();
  // const {
  //   data: { user },
  // } = await supabase.auth.getUser();
  // return user ?? null;

  // TEMP-BYPASS-LOGIN: ถ้า Supabase ต่อไม่ติด/ไม่มี session ให้คืน null แทน throw
  // เพื่อให้ทุกหน้า preview ได้โดยไม่ต้องล็อกอิน
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    return user ?? null;
  } catch {
    return null;
  }
}

/**
 * Use in any page or Server Action that must be authenticated.
 *
 * ── TEMP-BYPASS-LOGIN (ยังไม่ต้องล็อกอิน — ปิดชั่วคราว) ──────────────────────
 * อยากกลับมาใช้รูปแบบเดิม: ลบคืนค่า preview-user ด้านล่าง แล้ว uncomment
 * โค้ดเดิมใน `// [REVERT-LOGIN] ORIGINAL:` กลับมา
 * ────────────────────────────────────────────────────────────────────────────
 */
export async function requireUser() {
  // [REVERT-LOGIN] ORIGINAL:
  // const user = await getCurrentUser();
  // if (!user) redirect("/login");
  // return user;

  // TEMP-BYPASS-LOGIN: คืนผู้ใช้จำลองเพื่อให้ preview ได้โดยไม่ต้องล็อกอิน
  const user = await getCurrentUser();
  if (!user) {
    return { id: "preview-no-login", email: "preview@local" } as Awaited<
      ReturnType<typeof getCurrentUser>
    > & { id: string; email: string };
  }
  return user;
}

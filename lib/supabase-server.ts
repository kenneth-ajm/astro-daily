import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { env } from "./env";

export const createClient = () => {
  const cookieStore = cookies();

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
setAll(
  cookiesToSet: Array<{ name: string; value: string; options?: any }>
) {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      }
    }
  });
};

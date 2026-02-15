import { createBrowserClient } from "@supabase/ssr";
import { env } from "./env";

export const createClient = () =>
  createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);

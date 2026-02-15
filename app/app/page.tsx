import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase-server";
import AppClient from "./ui";

type Profile = {
  dob: string;
  tob: string;
  place: string;
  timezone: string;
} | null;

type Reading = {
  content: string;
  created_at: string;
} | null;

export default async function ProtectedAppPage() {
  const supabase = createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("dob,tob,place,timezone")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: reading } = await supabase
    .from("readings")
    .select("content,created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return <AppClient initialProfile={profile as Profile} initialReading={reading as Reading} />;
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getAppSession } from "@/lib/session/get-app-session";

export interface ActionState {
  error: string | null;
}

export async function createBranch(_prevState: ActionState, formData: FormData): Promise<ActionState> {
  const session = await getAppSession();
  if (!session) return { error: "You must be signed in." };

  const name = String(formData.get("name") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim() || "Harare";
  const isMain = formData.get("isMain") === "on";
  if (name.length < 2) return { error: "Enter a branch name." };

  const supabase = await createClient();
  const { error } = await supabase.from("branches").insert({ name, city, is_main: isMain });
  if (error) return { error: error.message };

  revalidatePath("/administration/settings");
  return { error: null };
}

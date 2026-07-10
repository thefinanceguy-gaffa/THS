import type { Metadata } from "next";
import { getAppSession } from "@/lib/session/get-app-session";
import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "My Profile" };

export default async function ProfilePage() {
  const session = await getAppSession();
  if (!session) return null;

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <div>
        <h1 className="text-xl font-semibold">My Profile</h1>
        <p className="text-sm text-muted-foreground">Update your contact details.</p>
      </div>
      <ProfileForm profile={session.profile} />
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateOwnProfile } from "@/app/actions/profile";
import type { Tables } from "@/lib/supabase/database.types";

export function ProfileForm({ profile }: { profile: Tables<"profiles"> }) {
  const [isPending, startTransition] = useTransition();
  const { register, handleSubmit } = useForm({ defaultValues: { fullName: profile.full_name, phone: profile.phone ?? "" } });

  function onSubmit(values: { fullName: string; phone: string }) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", values.fullName);
      formData.set("phone", values.phone);
      const result = await updateOwnProfile({ error: null }, formData);
      if (result?.error) toast.error(result.error);
      else toast.success("Profile updated.");
    });
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input value={profile.email ?? ""} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Full name</Label>
            <Input {...register("fullName")} />
          </div>
          <div className="space-y-1.5">
            <Label>Phone</Label>
            <Input {...register("phone")} />
          </div>
          <div className="flex items-center justify-between">
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving…" : "Save changes"}
            </Button>
            <Link href="/forgot-password" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              Change password
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

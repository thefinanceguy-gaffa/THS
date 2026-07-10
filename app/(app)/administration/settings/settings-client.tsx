"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { createBranch } from "@/app/actions/branches";
import type { Tables } from "@/lib/supabase/database.types";

export function SettingsClient({ branches, canManage }: { branches: Tables<"branches">[]; canManage: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [name, setName] = useState("");
  const [city, setCity] = useState("Harare");
  const [isMain, setIsMain] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.set("name", name);
      formData.set("city", city);
      if (isMain) formData.set("isMain", "on");
      const result = await createBranch({ error: null }, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("Branch created.");
        setName("");
        setCity("Harare");
        setIsMain(false);
      }
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Branches</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {branches.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-lg border border-border p-2.5 text-sm">
              <span>
                {b.name} <span className="text-muted-foreground">· {b.city}</span>
              </span>
              {b.is_main && (
                <Badge variant="outline" className="border-border">
                  Main
                </Badge>
              )}
            </div>
          ))}
          {branches.length === 0 && <p className="text-sm text-muted-foreground">No branches yet.</p>}
        </div>

        {canManage && (
          <form onSubmit={onSubmit} className="space-y-3 border-t border-border pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Branch name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Bulawayo Branch" />
              </div>
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isMain} onCheckedChange={(c) => setIsMain(c === true)} />
              Main branch
            </label>
            <Button type="submit" disabled={isPending || name.trim().length < 2}>
              {isPending ? "Adding…" : "Add branch"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}

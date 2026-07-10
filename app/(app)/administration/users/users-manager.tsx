"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { MaterialIcon } from "@/components/ui/material-icon";
import { createUserSchema, updateUserSchema, userRoles, type CreateUserInput, type UpdateUserInput } from "@/lib/validation/users";
import { createUser, updateUser, setUserSuspended } from "@/app/actions/users";
import type { Tables } from "@/lib/supabase/database.types";

const ROLE_LABEL: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  bus_dev: "Business Development",
  ops_manager: "Operations Manager",
  supervisor: "Supervisor",
  cleaner: "Cleaner",
  finance: "Finance Officer",
  procurement: "Procurement Officer",
  hr: "HR Officer",
  client: "Client",
};

const emptyCreate: CreateUserInput = { fullName: "", email: "", password: "", role: "cleaner", branchId: "", jobTitle: "", department: "", reportingManagerId: "" };

function CreateUserDialog({ open, onOpenChange, branches }: { open: boolean; onOpenChange: (o: boolean) => void; branches: Tables<"branches">[] }) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<CreateUserInput>({ resolver: zodResolver(createUserSchema), defaultValues: emptyCreate });

  function onSubmit(values: CreateUserInput) {
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", values.fullName);
      formData.set("email", values.email);
      formData.set("password", values.password);
      formData.set("role", values.role);
      if (values.branchId) formData.set("branchId", values.branchId);
      if (values.jobTitle) formData.set("jobTitle", values.jobTitle);
      if (values.department) formData.set("department", values.department);

      const result = await createUser({ error: null }, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("User created.");
        form.reset(emptyCreate);
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New User</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="fullName" render={({ field }) => (
              <FormItem><FormLabel>Full name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="password" render={({ field }) => (
                <FormItem><FormLabel>Temporary password *</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {userRoles.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="branchId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? "")}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="jobTitle" render={({ field }) => (
                <FormItem><FormLabel>Job title</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem><FormLabel>Department</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>{isPending ? "Creating…" : "Create user"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

function EditUserDialog({
  user,
  branches,
  onOpenChange,
}: {
  user: Tables<"profiles"> | null;
  branches: Tables<"branches">[];
  onOpenChange: (o: boolean) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    values: user
      ? {
          fullName: user.full_name,
          role: user.role,
          branchId: user.branch_id ?? "",
          jobTitle: user.job_title ?? "",
          department: user.department ?? "",
          reportingManagerId: user.reporting_manager_id ?? "",
          approvalLimitUsd: user.approval_limit_usd,
        }
      : undefined,
  });

  function onSubmit(values: UpdateUserInput) {
    if (!user) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.set("fullName", values.fullName);
      formData.set("role", values.role);
      if (values.branchId) formData.set("branchId", values.branchId);
      if (values.jobTitle) formData.set("jobTitle", values.jobTitle);
      if (values.department) formData.set("department", values.department);
      formData.set("approvalLimitUsd", String(values.approvalLimitUsd ?? 0));

      const result = await updateUser(user.id, { error: null }, formData);
      if (result?.error) {
        toast.error(result.error);
      } else {
        toast.success("User updated.");
        onOpenChange(false);
      }
    });
  }

  return (
    <Dialog open={!!user} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit {user?.full_name}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="fullName" render={({ field }) => (
              <FormItem><FormLabel>Full name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="role" render={({ field }) => (
                <FormItem>
                  <FormLabel>Role *</FormLabel>
                  <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                      {userRoles.map((r) => <SelectItem key={r} value={r}>{ROLE_LABEL[r]}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="branchId" render={({ field }) => (
                <FormItem>
                  <FormLabel>Branch</FormLabel>
                  <Select value={field.value || undefined} onValueChange={(v) => field.onChange(v ?? "")}>
                    <FormControl><SelectTrigger className="w-full"><SelectValue placeholder="Unassigned" /></SelectTrigger></FormControl>
                    <SelectContent>
                      {branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField control={form.control} name="jobTitle" render={({ field }) => (
                <FormItem><FormLabel>Job title</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="approvalLimitUsd" render={({ field }) => (
                <FormItem>
                  <FormLabel>Approval limit (USD)</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" min="0" value={field.value} onBlur={field.onBlur} name={field.name} ref={field.ref}
                      onChange={(e) => field.onChange(e.target.valueAsNumber || 0)} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isPending}>{isPending ? "Saving…" : "Save changes"}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

export function UsersManager({ users, branches }: { users: Tables<"profiles">[]; branches: Tables<"branches">[] }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Tables<"profiles"> | null>(null);
  const [isPending, startTransition] = useTransition();

  function toggleSuspend(user: Tables<"profiles">) {
    startTransition(async () => {
      const result = await setUserSuspended(user.id, !user.is_suspended);
      if (result?.error) toast.error(result.error);
      else toast.success(user.is_suspended ? "User reactivated." : "User suspended.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="lg" onClick={() => setCreateOpen(true)}>
          <MaterialIcon name="person_add" className="text-[18px]" />
          New User
        </Button>
      </div>

      <div className="overflow-x-auto rounded-xl ring-1 ring-foreground/10">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Branch</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.full_name}</TableCell>
                <TableCell className="text-muted-foreground">{u.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className="border-border">{ROLE_LABEL[u.role]}</Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{branches.find((b) => b.id === u.branch_id)?.name ?? "—"}</TableCell>
                <TableCell>
                  {u.is_suspended ? (
                    <Badge variant="outline" className="border-red-300 bg-red-50 text-red-800">Suspended</Badge>
                  ) : (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">Active</Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon-sm" onClick={() => setEditing(u)}>
                      <MaterialIcon name="edit" className="text-[16px]" />
                    </Button>
                    <Button variant="ghost" size="sm" disabled={isPending || u.role === "owner"} onClick={() => toggleSuspend(u)}>
                      {u.is_suspended ? "Reactivate" : "Suspend"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} branches={branches} />
      <EditUserDialog user={editing} branches={branches} onOpenChange={(o) => !o && setEditing(null)} />
    </div>
  );
}

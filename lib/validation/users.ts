import { z } from "zod";

export const userRoles = ["owner", "admin", "bus_dev", "ops_manager", "supervisor", "cleaner", "finance", "procurement", "hr", "client"] as const;

export const createUserSchema = z.object({
  fullName: z.string().min(2, "Enter a full name"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(userRoles),
  branchId: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  reportingManagerId: z.string().optional(),
});

export const updateUserSchema = z.object({
  fullName: z.string().min(2, "Enter a full name"),
  role: z.enum(userRoles),
  branchId: z.string().optional(),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  reportingManagerId: z.string().optional(),
  approvalLimitUsd: z.number().min(0, "Approval limit can't be negative"),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

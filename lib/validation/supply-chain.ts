import { z } from "zod";

export const inventoryItemSchema = z.object({
  code: z.string().optional(),
  name: z.string().min(2, "Enter an item name"),
  category: z.string().optional(),
  unit: z.string().optional(),
  unit_cost_usd: z.number().min(0).optional(),
  reorder_level: z.number().min(0).optional(),
});
export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

export const supplierSchema = z.object({
  name: z.string().min(2, "Enter a supplier name"),
  category: z.string().optional(),
  suburb: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  payment_terms: z.string().optional(),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export const vehicleSchema = z.object({
  name: z.string().min(1, "Enter a vehicle name"),
  registration: z.string().min(2, "Enter a registration number"),
  kind: z.string().optional(),
  year: z.number().optional(),
  mileage_km: z.number().min(0).optional(),
});
export type VehicleInput = z.infer<typeof vehicleSchema>;

export const employeeRecordTypes = ["leave", "attendance", "training", "review", "disciplinary", "contract", "ppe", "uniform"] as const;

export const employeeRecordSchema = z.object({
  type: z.enum(employeeRecordTypes),
  title: z.string().min(1, "Enter a title"),
  detail: z.string().optional(),
  status: z.string().optional(),
  effective_on: z.string().optional(),
  expires_on: z.string().optional(),
});
export type EmployeeRecordInput = z.infer<typeof employeeRecordSchema>;

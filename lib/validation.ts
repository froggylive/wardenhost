import { z } from "zod";

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileSchema = z.object({
  name: z.string().min(2).max(80),
  phone: z.string().max(30).optional().or(z.literal("")),
  company: z.string().max(100).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  city: z.string().max(80).optional().or(z.literal("")),
  country: z.string().max(80).optional().or(z.literal("")),
  postalCode: z.string().max(20).optional().or(z.literal("")),
});

export const categorySchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().min(1).max(500),
  icon: z.string().min(1).max(50),
  image: z.string().max(500).optional().or(z.literal("")),
  displayOrder: z.coerce.number().int().min(0).max(9999),
  active: z.boolean(),
});

export const planSchema = z.object({
  categoryId: z.string().min(1, "Select a category"),
  name: z.string().min(2).max(80),
  ram: z.string().min(1).max(60),
  cpu: z.string().min(1).max(60),
  disk: z.string().min(1).max(60),
  storageType: z.string().min(1).max(60),
  bandwidth: z.string().min(1).max(60),
  networkSpeed: z.string().min(1).max(60),
  ipv4Count: z.coerce.number().int().min(0).max(100),
  price: z.coerce.number().min(0, "Price must be positive"),
  currency: z.string().min(3).max(10).toUpperCase(),
  billingPeriod: z.string().min(1).max(30),
  shortDescription: z.string().max(300).optional().or(z.literal("")),
  fullDescription: z.string().max(4000).optional().or(z.literal("")),
  features: z.array(z.string().min(1).max(150)).max(30),
  orderUrl: z.string().max(500).optional().or(z.literal("")),
  image: z.string().max(500).optional().or(z.literal("")),
  active: z.boolean(),
  inStock: z.boolean(),
  featured: z.boolean(),
  displayOrder: z.coerce.number().int().min(0).max(9999),
});

export const couponSchema = z.object({
  code: z.string().min(3).max(30).regex(/^[A-Za-z0-9_-]+$/, "Only letters, numbers, - and _"),
  type: z.enum(["PERCENT", "FIXED"]),
  value: z.coerce.number().min(1),
  maxUses: z.union([z.coerce.number().int().min(1), z.literal(""), z.null()]).optional(),
  minAmountCents: z.coerce.number().min(0),
  expiresAt: z.string().optional().or(z.literal("")),
  active: z.boolean(),
  appliesTo: z.enum(["ALL", "CATEGORIES", "PLANS"]),
  categoryIds: z.array(z.string()).optional(),
  planIds: z.array(z.string()).optional(),
});

export const ticketSchema = z.object({
  department: z.string().min(1),
  subject: z.string().min(4).max(150),
  message: z.string().min(5).max(5000),
});

export const ticketReplySchema = z.object({
  message: z.string().min(1).max(5000),
  isInternal: z.boolean().optional(),
});

export const billingPeriodSchema = z.object({
  code: z.string().min(2).max(30),
  label: z.string().min(2).max(40),
  months: z.coerce.number().int().min(1).max(120),
  multiplier: z.coerce.number().min(0.01).max(10),
  active: z.boolean(),
  displayOrder: z.coerce.number().int().min(0),
});

export const orderSchema = z.object({
  planId: z.string().min(1),
  billingPeriodId: z.string().min(1),
  cpuOptionId: z.string().max(60).optional().or(z.literal("")),
  couponCode: z.string().max(40).optional().or(z.literal("")),
});

export const checkoutSchema = z.object({
  invoiceId: z.string().min(1),
  method: z.enum(["manual", "razorpay", "stripe", "fampay"]),
  reference: z.string().max(200).optional().or(z.literal("")),
  note: z.string().max(1000).optional().or(z.literal("")),
});

export const announcementSchema = z.object({
  title: z.string().min(2).max(120),
  message: z.string().min(2).max(300),
  active: z.boolean(),
});

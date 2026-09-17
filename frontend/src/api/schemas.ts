import { z } from "zod";

export const tokenPairSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  tokenType: z.string().min(1),
  expiresIn: z.number().int().positive(),
});

export const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string().min(1),
  role: z.enum(["admin", "staff"]),
  isActive: z.boolean(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const pageMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  total: z.number().int().nonnegative(),
  pageCount: z.number().int().nonnegative(),
});

export const customerSchema = z.object({
  id: z.string().uuid(),
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  status: z.enum(["active", "archived"]),
  ownerId: z.string().uuid(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const interactionSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  userId: z.string().uuid(),
  type: z.enum(["call", "meeting", "email", "quote", "note"]),
  summary: z.string(),
  occurredAt: z.string().min(1),
  createdAt: z.string().min(1),
});

export const followUpSchema = z.object({
  customer: customerSchema,
  lastInteractionAt: z.string().nullable(),
  dueSince: z.string().nullable(),
});

export const overviewSchema = z.object({
  totalCustomers: z.number().int().nonnegative(),
  newCustomers: z.number().int().nonnegative(),
  activeCustomers: z.number().int().nonnegative(),
  interactions: z.number().int().nonnegative(),
  followUpsDue: z.number().int().nonnegative(),
  followUpRate: z.number().nullable(),
});

export const interactionTrendSchema = z.object({
  points: z.array(
    z.object({
      date: z.string().min(1),
      count: z.number().int().nonnegative(),
    }),
  ),
});

export const productCustomerCountSchema = z.object({
  productId: z.string().uuid(),
  productSku: z.string(),
  productName: z.string(),
  customerCount: z.number().int().nonnegative(),
});

export const importJobSchema = z.object({
  id: z.string().uuid(),
  fileName: z.string(),
  status: z.enum(["preview", "ready", "committed", "failed"]),
  totalRows: z.number().int().nonnegative(),
  validRows: z.number().int().nonnegative(),
  invalidRows: z.number().int().nonnegative(),
  createdAt: z.string().min(1),
  completedAt: z.string().nullable(),
});

export const importErrorSchema = z.object({
  rowNumber: z.number().int().positive(),
  fieldName: z.string(),
  message: z.string(),
});

export const importPreviewSchema = z.object({
  job: importJobSchema,
  errors: z.array(importErrorSchema),
});

export const importCommitSchema = z.object({
  job: importJobSchema,
  createdCustomerCount: z.number().int().nonnegative(),
  createdInteractionCount: z.number().int().nonnegative(),
});

export const emailDraftSchema = z.object({
  id: z.string().uuid(),
  customerId: z.string().uuid(),
  createdById: z.string().uuid(),
  purpose: z.enum(["followUp", "introduction", "reengagement"]),
  language: z.enum(["vi", "en"]),
  tone: z.enum(["professional", "friendly", "concise"]),
  subject: z.string(),
  body: z.string(),
  status: z.enum(["draft", "reviewed", "approved", "rejected"]),
  provider: z.string(),
  model: z.string(),
  promptVersion: z.string(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const ticketCommentSchema = z.object({
  id: z.string().uuid(),
  ticketId: z.string().uuid(),
  authorId: z.string().uuid(),
  body: z.string(),
  createdAt: z.string().min(1),
});

export const supportTicketSchema = z.object({
  id: z.string().uuid(),
  createdById: z.string().uuid(),
  assigneeId: z.string().nullable(),
  title: z.string(),
  description: z.string(),
  category: z.enum(["hardware", "software", "access", "other"]),
  priority: z.enum(["low", "medium", "high", "urgent"]),
  status: z.enum(["open", "in_progress", "waiting", "resolved", "closed"]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const supportTicketDetailSchema = supportTicketSchema.extend({
  comments: z.array(ticketCommentSchema),
});

export const auditLogSchema = z.object({
  id: z.string().uuid(),
  actorId: z.string().nullable(),
  action: z.string(),
  entityType: z.string(),
  entityId: z.string().nullable(),
  metadataJson: z.record(z.string(), z.unknown()),
  createdAt: z.string().min(1),
});

export const powerBIReportSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  embedUrl: z.string(),
  isAvailable: z.boolean(),
});

export const powerBIEmbedConfigSchema = z.object({
  reportId: z.string(),
  embedUrl: z.string().url(),
  accessToken: z.string().min(1),
  expiresAt: z.string().min(1),
  tokenType: z.string(),
});

export const powerBIRefreshStatusSchema = z.object({
  status: z.string(),
  lastRefreshedAt: z.string().nullable(),
  nextRefreshAt: z.string().nullable(),
  message: z.string(),
});

export type TokenPair = z.infer<typeof tokenPairSchema>;
export type UserDto = z.infer<typeof userSchema>;
export type CustomerDto = z.infer<typeof customerSchema>;
export type InteractionDto = z.infer<typeof interactionSchema>;
export type FollowUpDto = z.infer<typeof followUpSchema>;
export type OverviewDto = z.infer<typeof overviewSchema>;
export type EmailDraftDto = z.infer<typeof emailDraftSchema>;
export type SupportTicketDto = z.infer<typeof supportTicketSchema>;
export type SupportTicketDetailDto = z.infer<typeof supportTicketDetailSchema>;
export type AuditLogDto = z.infer<typeof auditLogSchema>;

import type { components } from "./api/generated";

type Schema = components["schemas"];

export type UserRole = Schema["UserRole"];

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export type CustomerStatus = Schema["CustomerStatus"];

export interface Customer {
  id: string;
  name: string;
  company: string;
  email: string;
  phone?: string;
  status: CustomerStatus;
  ownerId: string;
  ownerName: string;
  productInterests: string[];
  createdAt: string;
  updatedAt: string;
  lastInteractionAt?: string;
  followUpDue: boolean;
  followUpDate?: string;
  notes?: string;
}

export type InteractionType = Schema["InteractionType"];

export interface Interaction {
  id: string;
  customerId: string;
  type: InteractionType;
  summary: string;
  occurredAt: string;
  createdById: string;
  createdByName: string;
}

export type DraftStatus = Schema["EmailDraftStatus"];
export type DraftLanguage = Schema["EmailLanguage"];
export type DraftTone = Schema["EmailTone"];
export type EmailPurpose = Schema["EmailPurpose"];

export interface EmailDraft {
  id: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  purpose: EmailPurpose;
  language: DraftLanguage;
  tone: DraftTone;
  subject: string;
  body: string;
  status: DraftStatus;
  createdById: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  reviewedById?: string;
  reviewedByName?: string;
  rejectionReason?: string;
  providerModel: string;
  promptVersion: string;
}

export type TicketStatus = Schema["TicketStatus"];
export type TicketPriority = Schema["TicketPriority"];
export type TicketCategory = Schema["TicketCategory"];

export interface TicketComment {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  title: string;
  description: string;
  status: TicketStatus;
  priority: TicketPriority;
  category: TicketCategory;
  createdById: string;
  createdByName: string;
  assignedToId?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  comments: TicketComment[];
}

export interface AuditLog {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId: string;
  actorName: string;
  actorEmail: string;
  timestamp: string;
  metadata: Record<string, unknown>;
}

export type Page =
  | "login"
  | "dashboard"
  | "customers"
  | "customer-detail"
  | "import"
  | "email-drafts"
  | "email-draft-detail"
  | "support-tickets"
  | "ticket-detail"
  | "audit-logs"
  | "powerbi"
  | "user-management";

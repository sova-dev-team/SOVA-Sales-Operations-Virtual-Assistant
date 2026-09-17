import type {
  AuditLogDto,
  CustomerDto,
  EmailDraftDto,
  FollowUpDto,
  InteractionDto,
  SupportTicketDetailDto,
  SupportTicketDto,
  UserDto,
} from "./schemas";
import type {
  AuditLog,
  Customer,
  EmailDraft,
  Interaction,
  SupportTicket,
  User,
} from "../types";

export function toUser(dto: UserDto): User {
  return {
    id: dto.id,
    name: dto.fullName,
    email: dto.email,
    role: dto.role,
    active: dto.isActive,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  };
}

export function toCustomer(
  dto: CustomerDto,
  currentUser: User,
  users: User[] = [],
  followUps: FollowUpDto[] = [],
): Customer {
  const followUp = followUps.find((item) => item.customer.id === dto.id);
  const owner = users.find((item) => item.id === dto.ownerId);
  return {
    id: dto.id,
    name: dto.contactName,
    company: dto.companyName,
    email: dto.email ?? "",
    phone: dto.phone ?? undefined,
    status: dto.status,
    ownerId: dto.ownerId,
    ownerName:
      owner?.name ??
      (dto.ownerId === currentUser.id ? currentUser.name : "Chưa xác định"),
    productInterests: [],
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    lastInteractionAt: followUp?.lastInteractionAt ?? undefined,
    followUpDue: Boolean(followUp),
    followUpDate: followUp?.dueSince ?? undefined,
  };
}

export function toInteraction(
  dto: InteractionDto,
  currentUser: User,
  users: User[],
): Interaction {
  const author = users.find((item) => item.id === dto.userId);
  return {
    id: dto.id,
    customerId: dto.customerId,
    type: dto.type,
    summary: dto.summary,
    occurredAt: dto.occurredAt,
    createdById: dto.userId,
    createdByName:
      author?.name ??
      (dto.userId === currentUser.id ? currentUser.name : "Người dùng"),
  };
}

export function toEmailDraft(
  dto: EmailDraftDto,
  currentUser: User,
  users: User[],
  customers: Customer[],
): EmailDraft {
  const author = users.find((item) => item.id === dto.createdById);
  const customer = customers.find((item) => item.id === dto.customerId);
  return {
    id: dto.id,
    customerId: dto.customerId,
    customerName: customer?.name ?? "Khách hàng",
    customerCompany: customer?.company ?? "",
    purpose: dto.purpose,
    language: dto.language,
    tone: dto.tone,
    subject: dto.subject,
    body: dto.body,
    status: dto.status,
    createdById: dto.createdById,
    createdByName:
      author?.name ??
      (dto.createdById === currentUser.id ? currentUser.name : "Người dùng"),
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    providerModel: `${dto.provider} · ${dto.model}`,
    promptVersion: dto.promptVersion,
  };
}

export function toSupportTicket(
  dto: SupportTicketDto | SupportTicketDetailDto,
  currentUser: User,
  users: User[],
): SupportTicket {
  const creator = users.find((item) => item.id === dto.createdById);
  const assignee = dto.assigneeId
    ? users.find((item) => item.id === dto.assigneeId)
    : undefined;
  const comments = "comments" in dto ? dto.comments : [];
  return {
    id: dto.id,
    title: dto.title,
    description: dto.description,
    status: dto.status,
    priority: dto.priority,
    category: dto.category,
    createdById: dto.createdById,
    createdByName:
      creator?.name ??
      (dto.createdById === currentUser.id ? currentUser.name : "Người dùng"),
    assignedToId: dto.assigneeId ?? undefined,
    assignedToName: assignee?.name,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    comments: comments.map((comment) => ({
      id: comment.id,
      content: comment.body,
      authorId: comment.authorId,
      authorName:
        users.find((item) => item.id === comment.authorId)?.name ??
        (comment.authorId === currentUser.id ? currentUser.name : "Người dùng"),
      createdAt: comment.createdAt,
    })),
  };
}

export function toAuditLog(
  dto: AuditLogDto,
  currentUser: User,
  users: User[],
): AuditLog {
  const actor = dto.actorId
    ? users.find((item) => item.id === dto.actorId)
    : undefined;
  return {
    id: dto.id,
    action: dto.action,
    entityType: dto.entityType,
    entityId: dto.entityId ?? "—",
    actorId: dto.actorId ?? "system",
    actorName:
      actor?.name ??
      (dto.actorId === currentUser.id ? currentUser.name : "Hệ thống"),
    actorEmail:
      actor?.email ??
      (dto.actorId === currentUser.id ? currentUser.email : "—"),
    timestamp: dto.createdAt,
    metadata: dto.metadataJson,
  };
}

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  toAuditLog,
  toCustomer,
  toEmailDraft,
  toInteraction,
  toSupportTicket,
  toUser,
} from "../api/adapters";
import { sovaApi } from "../api/sovaApi";
import type { components } from "../api/generated";
import type {
  AuditLog,
  Customer,
  DraftStatus,
  EmailDraft,
  SupportTicket,
  TicketStatus,
  User,
} from "../types";

type Schema = components["schemas"];

export interface SovaDataContextValue {
  customers: Customer[];
  drafts: EmailDraft[];
  tickets: SupportTicket[];
  users: User[];
  auditLogs: AuditLog[];
  overview?: Schema["OverviewResponse"];
  trend: { month: string; interactions: number; newCustomers: number }[];
  productInterests: { product: string; count: number }[];
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  generateDraft: (
    payload: Schema["EmailDraftGenerateRequest"],
  ) => Promise<EmailDraft>;
  setDraftStatus: (
    draftId: string,
    status: DraftStatus,
    reason?: string,
  ) => Promise<void>;
  createTicket: (
    payload: Schema["SupportTicketCreateRequest"],
  ) => Promise<void>;
  setTicketStatus: (ticketId: string, status: TicketStatus) => Promise<void>;
  addComment: (ticketId: string, body: string) => Promise<void>;
  createUser: (payload: Schema["UserCreateRequest"]) => Promise<void>;
  updateUser: (
    userId: string,
    payload: Schema["UserUpdateRequest"],
  ) => Promise<void>;
}

const SovaDataContext = createContext<SovaDataContextValue | null>(null);

const queryKeys = {
  customers: ["customers"] as const,
  followUps: ["follow-ups"] as const,
  drafts: ["email-drafts"] as const,
  tickets: ["support-tickets"] as const,
  users: ["users"] as const,
  audit: ["audit-logs"] as const,
  overview: ["analytics", "overview"] as const,
  trend: ["analytics", "trend"] as const,
  products: ["analytics", "products"] as const,
};

export function SovaDataProvider({
  user,
  children,
}: {
  user: User;
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const customersQuery = useQuery({
    queryKey: queryKeys.customers,
    queryFn: () => sovaApi.customers(),
  });
  const followUpsQuery = useQuery({
    queryKey: queryKeys.followUps,
    queryFn: sovaApi.followUps,
  });
  const draftsQuery = useQuery({
    queryKey: queryKeys.drafts,
    queryFn: sovaApi.emailDrafts,
  });
  const ticketsQuery = useQuery({
    queryKey: queryKeys.tickets,
    queryFn: sovaApi.supportTickets,
  });
  const usersQuery = useQuery({
    queryKey: queryKeys.users,
    queryFn: sovaApi.users,
    enabled: user.role === "admin",
  });
  const auditQuery = useQuery({
    queryKey: queryKeys.audit,
    queryFn: sovaApi.auditLogs,
    enabled: user.role === "admin",
  });
  const overviewQuery = useQuery({
    queryKey: queryKeys.overview,
    queryFn: sovaApi.overview,
  });
  const trendQuery = useQuery({
    queryKey: queryKeys.trend,
    queryFn: sovaApi.interactionTrend,
  });
  const productsQuery = useQuery({
    queryKey: queryKeys.products,
    queryFn: sovaApi.customersByProduct,
  });

  const serverUsers = usersQuery.data?.items.map(toUser) ?? [];
  const users = serverUsers.some((item) => item.id === user.id)
    ? serverUsers
    : [user, ...serverUsers];
  const customers =
    customersQuery.data?.items.map((item) =>
      toCustomer(item, user, users, followUpsQuery.data ?? []),
    ) ?? [];
  const drafts =
    draftsQuery.data?.map((item) =>
      toEmailDraft(item, user, users, customers),
    ) ?? [];
  const tickets =
    ticketsQuery.data?.map((item) => toSupportTicket(item, user, users)) ?? [];
  const auditLogs =
    auditQuery.data?.items.map((item) => toAuditLog(item, user, users)) ?? [];

  const invalidate = (...keys: readonly (readonly unknown[])[]) =>
    Promise.all(
      keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    ).then(() => undefined);

  const generateDraftMutation = useMutation({
    mutationFn: sovaApi.generateEmailDraft,
    onSuccess: () => invalidate(queryKeys.drafts, queryKeys.audit),
  });
  const draftStatusMutation = useMutation({
    mutationFn: async ({
      draftId,
      status,
      reason,
    }: {
      draftId: string;
      status: DraftStatus;
      reason?: string;
    }) => {
      if (status === "reviewed") return sovaApi.reviewEmailDraft(draftId);
      if (status === "approved") return sovaApi.approveEmailDraft(draftId);
      if (status === "rejected")
        return sovaApi.rejectEmailDraft(draftId, reason);
      throw new Error("Không thể chuyển bản nháp về trạng thái ban đầu.");
    },
    onSuccess: () => invalidate(queryKeys.drafts, queryKeys.audit),
  });
  const createTicketMutation = useMutation({
    mutationFn: sovaApi.createSupportTicket,
    onSuccess: () => invalidate(queryKeys.tickets, queryKeys.audit),
  });
  const ticketStatusMutation = useMutation({
    mutationFn: ({
      ticketId,
      status,
    }: {
      ticketId: string;
      status: TicketStatus;
    }) => sovaApi.updateSupportTicket(ticketId, { status }),
    onSuccess: () => invalidate(queryKeys.tickets, queryKeys.audit),
  });
  const commentMutation = useMutation({
    mutationFn: ({ ticketId, body }: { ticketId: string; body: string }) =>
      sovaApi.addTicketComment(ticketId, body),
    onSuccess: (_, variables) =>
      invalidate(
        queryKeys.tickets,
        ["support-ticket", variables.ticketId],
        queryKeys.audit,
      ),
  });
  const createUserMutation = useMutation({
    mutationFn: sovaApi.createUser,
    onSuccess: () => invalidate(queryKeys.users, queryKeys.audit),
  });
  const updateUserMutation = useMutation({
    mutationFn: ({
      userId,
      payload,
    }: {
      userId: string;
      payload: Schema["UserUpdateRequest"];
    }) => sovaApi.updateUser(userId, payload),
    onSuccess: () => invalidate(queryKeys.users, queryKeys.audit),
  });

  const queries = [
    customersQuery,
    followUpsQuery,
    draftsQuery,
    ticketsQuery,
    overviewQuery,
    trendQuery,
    productsQuery,
    ...(user.role === "admin" ? [usersQuery, auditQuery] : []),
  ];

  const value = useMemo<SovaDataContextValue>(
    () => ({
      customers,
      drafts,
      tickets,
      users,
      auditLogs,
      overview: overviewQuery.data,
      trend:
        trendQuery.data?.points.map((point) => ({
          month: new Date(point.date).toLocaleDateString("vi-VN", {
            day: "2-digit",
            month: "2-digit",
          }),
          interactions: point.count,
          newCustomers: 0,
        })) ?? [],
      productInterests:
        productsQuery.data?.map((item) => ({
          product: item.productName,
          count: item.customerCount,
        })) ?? [],
      isLoading: queries.some((query) => query.isLoading),
      error:
        (queries.find((query) => query.error)?.error as Error | undefined) ??
        null,
      refresh: async () => {
        await Promise.all(queries.map((query) => query.refetch()));
      },
      generateDraft: async (payload) => {
        const created = await generateDraftMutation.mutateAsync(payload);
        return toEmailDraft(created, user, users, customers);
      },
      setDraftStatus: async (draftId, status, reason) => {
        await draftStatusMutation.mutateAsync({ draftId, status, reason });
      },
      createTicket: async (payload) => {
        await createTicketMutation.mutateAsync(payload);
      },
      setTicketStatus: async (ticketId, status) => {
        await ticketStatusMutation.mutateAsync({ ticketId, status });
      },
      addComment: async (ticketId, body) => {
        await commentMutation.mutateAsync({ ticketId, body });
      },
      createUser: async (payload) => {
        await createUserMutation.mutateAsync(payload);
      },
      updateUser: async (userId, payload) => {
        await updateUserMutation.mutateAsync({ userId, payload });
      },
    }),
    [
      auditLogs,
      customers,
      drafts,
      tickets,
      users,
      overviewQuery.data,
      trendQuery.data,
      productsQuery.data,
      queries,
      generateDraftMutation,
      draftStatusMutation,
      createTicketMutation,
      ticketStatusMutation,
      commentMutation,
      createUserMutation,
      updateUserMutation,
      user,
    ],
  );

  return (
    <SovaDataContext.Provider value={value}>
      {children}
    </SovaDataContext.Provider>
  );
}

export function useSovaData(): SovaDataContextValue {
  const context = useContext(SovaDataContext);
  if (!context)
    throw new Error("useSovaData must be used within SovaDataProvider.");
  return context;
}

export function useCustomerDetailData(
  customerId: string | null,
  user: User,
  users: User[],
) {
  const customerQuery = useQuery({
    queryKey: ["customer", customerId],
    queryFn: () => sovaApi.customer(customerId!),
    enabled: Boolean(customerId && customerId !== "new"),
  });
  const interactionsQuery = useQuery({
    queryKey: ["customer-interactions", customerId],
    queryFn: () => sovaApi.interactions(customerId!),
    enabled: Boolean(customerId && customerId !== "new"),
  });
  const followUpsQuery = useQuery({
    queryKey: queryKeys.followUps,
    queryFn: sovaApi.followUps,
  });
  return {
    customer: customerQuery.data
      ? toCustomer(customerQuery.data, user, users, followUpsQuery.data ?? [])
      : undefined,
    interactions:
      interactionsQuery.data?.map((item) => toInteraction(item, user, users)) ??
      [],
    isLoading: customerQuery.isLoading || interactionsQuery.isLoading,
    error: customerQuery.error ?? interactionsQuery.error,
  };
}

export function useTicketDetailData(
  ticketId: string | null,
  user: User,
  users: User[],
) {
  const query = useQuery({
    queryKey: ["support-ticket", ticketId],
    queryFn: () => sovaApi.supportTicket(ticketId!),
    enabled: Boolean(ticketId),
  });
  return {
    ticket: query.data ? toSupportTicket(query.data, user, users) : undefined,
    isLoading: query.isLoading,
    error: query.error,
  };
}

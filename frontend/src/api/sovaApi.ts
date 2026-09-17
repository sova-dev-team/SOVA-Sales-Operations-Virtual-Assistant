import { z } from "zod";

import type { components } from "./generated";
import { apiDownload, apiRequest, clearTokens, storeTokens } from "./client";
import {
  auditLogSchema,
  customerSchema,
  emailDraftSchema,
  followUpSchema,
  importCommitSchema,
  importPreviewSchema,
  interactionSchema,
  interactionTrendSchema,
  overviewSchema,
  pageMetaSchema,
  powerBIEmbedConfigSchema,
  powerBIRefreshStatusSchema,
  powerBIReportSchema,
  productCustomerCountSchema,
  supportTicketDetailSchema,
  supportTicketSchema,
  ticketCommentSchema,
  tokenPairSchema,
  userSchema,
} from "./schemas";

type Schema = components["schemas"];

const customerPageSchema = z.object({
  items: z.array(customerSchema),
  meta: pageMetaSchema,
});
const userPageSchema = z.object({
  items: z.array(userSchema),
  meta: pageMetaSchema,
});
const auditPageSchema = z.object({
  items: z.array(auditLogSchema),
  meta: pageMetaSchema,
});

function queryString(
  values: Record<string, string | number | undefined>,
): string {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const encoded = params.toString();
  return encoded ? `?${encoded}` : "";
}

export const sovaApi = {
  async login(payload: Schema["LoginRequest"]) {
    const tokens = tokenPairSchema.parse(
      await apiRequest("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
    storeTokens(tokens);
    return tokens;
  },

  async logout(refreshToken: string) {
    try {
      await apiRequest(
        "/api/v1/auth/logout",
        { method: "POST", body: JSON.stringify({ refreshToken }) },
        false,
      );
    } finally {
      clearTokens();
    }
  },

  async me() {
    return userSchema.parse(await apiRequest("/api/v1/auth/me"));
  },

  async customers(
    options: {
      page?: number;
      pageSize?: number;
      search?: string;
      status?: Schema["CustomerStatus"];
      ownerId?: string;
      sortBy?: string;
    } = {},
  ) {
    return customerPageSchema.parse(
      await apiRequest(
        `/api/v1/customers${queryString({
          page: options.page ?? 1,
          pageSize: options.pageSize ?? 100,
          search: options.search,
          status: options.status,
          ownerId: options.ownerId,
          sortBy: options.sortBy,
        })}`,
      ),
    );
  },

  async customer(customerId: string) {
    return customerSchema.parse(
      await apiRequest(`/api/v1/customers/${customerId}`),
    );
  },

  async createCustomer(payload: Schema["CustomerCreateRequest"]) {
    return customerSchema.parse(
      await apiRequest("/api/v1/customers", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  },

  async updateCustomer(
    customerId: string,
    payload: Schema["CustomerUpdateRequest"],
  ) {
    return customerSchema.parse(
      await apiRequest(`/api/v1/customers/${customerId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    );
  },

  async interactions(customerId: string) {
    return z
      .array(interactionSchema)
      .parse(await apiRequest(`/api/v1/customers/${customerId}/interactions`));
  },

  async addInteraction(
    customerId: string,
    payload: Schema["InteractionCreateRequest"],
  ) {
    return interactionSchema.parse(
      await apiRequest(`/api/v1/customers/${customerId}/interactions`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  },

  async followUps() {
    return z
      .array(followUpSchema)
      .parse(await apiRequest("/api/v1/analytics/follow-ups"));
  },

  async overview() {
    return overviewSchema.parse(await apiRequest("/api/v1/analytics/overview"));
  },

  async interactionTrend() {
    return interactionTrendSchema.parse(
      await apiRequest("/api/v1/analytics/interactions-trend"),
    );
  },

  async customersByProduct() {
    return z
      .array(productCustomerCountSchema)
      .parse(await apiRequest("/api/v1/analytics/customers-by-product"));
  },

  async previewImport(file: File) {
    const body = new FormData();
    body.set("file", file);
    return importPreviewSchema.parse(
      await apiRequest("/api/v1/imports/customers/preview", {
        method: "POST",
        body,
      }),
    );
  },

  async commitImport(jobId: string) {
    return importCommitSchema.parse(
      await apiRequest(`/api/v1/imports/${jobId}/commit`, { method: "POST" }),
    );
  },

  async downloadImportErrors(jobId: string) {
    return apiDownload(`/api/v1/imports/${jobId}/errors/download`);
  },

  async emailDrafts() {
    return z
      .array(emailDraftSchema)
      .parse(await apiRequest("/api/v1/email-drafts"));
  },

  async generateEmailDraft(payload: Schema["EmailDraftGenerateRequest"]) {
    return emailDraftSchema.parse(
      await apiRequest("/api/v1/email-drafts/generate", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  },

  async updateEmailDraft(
    draftId: string,
    payload: Schema["EmailDraftUpdateRequest"],
  ) {
    return emailDraftSchema.parse(
      await apiRequest(`/api/v1/email-drafts/${draftId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    );
  },

  async reviewEmailDraft(
    draftId: string,
    payload: Schema["EmailDraftReviewRequest"] = {},
  ) {
    return emailDraftSchema.parse(
      await apiRequest(`/api/v1/email-drafts/${draftId}/review`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  },

  async approveEmailDraft(draftId: string) {
    return emailDraftSchema.parse(
      await apiRequest(`/api/v1/email-drafts/${draftId}/approve`, {
        method: "POST",
      }),
    );
  },

  async rejectEmailDraft(draftId: string, reason?: string) {
    return emailDraftSchema.parse(
      await apiRequest(`/api/v1/email-drafts/${draftId}/reject`, {
        method: "POST",
        body: JSON.stringify({ reason }),
      }),
    );
  },

  async supportTickets() {
    return z
      .array(supportTicketSchema)
      .parse(await apiRequest("/api/v1/support-tickets"));
  },

  async supportTicket(ticketId: string) {
    return supportTicketDetailSchema.parse(
      await apiRequest(`/api/v1/support-tickets/${ticketId}`),
    );
  },

  async createSupportTicket(payload: Schema["SupportTicketCreateRequest"]) {
    return supportTicketSchema.parse(
      await apiRequest("/api/v1/support-tickets", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  },

  async updateSupportTicket(
    ticketId: string,
    payload: Schema["SupportTicketUpdateRequest"],
  ) {
    return supportTicketSchema.parse(
      await apiRequest(`/api/v1/support-tickets/${ticketId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    );
  },

  async addTicketComment(ticketId: string, body: string) {
    return ticketCommentSchema.parse(
      await apiRequest(`/api/v1/support-tickets/${ticketId}/comments`, {
        method: "POST",
        body: JSON.stringify({ body }),
      }),
    );
  },

  async auditLogs() {
    return auditPageSchema.parse(
      await apiRequest("/api/v1/audit-logs?page=1&pageSize=100"),
    );
  },

  async users() {
    return userPageSchema.parse(
      await apiRequest("/api/v1/users?page=1&pageSize=100"),
    );
  },

  async createUser(payload: Schema["UserCreateRequest"]) {
    return userSchema.parse(
      await apiRequest("/api/v1/users", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    );
  },

  async updateUser(userId: string, payload: Schema["UserUpdateRequest"]) {
    return userSchema.parse(
      await apiRequest(`/api/v1/users/${userId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      }),
    );
  },

  async powerBIReports() {
    return z
      .array(powerBIReportSchema)
      .parse(await apiRequest("/api/v1/power-bi/reports"));
  },

  async powerBIEmbedConfig() {
    return powerBIEmbedConfigSchema.parse(
      await apiRequest("/api/v1/power-bi/embed-config", { method: "POST" }),
    );
  },

  async powerBIRefreshStatus() {
    return powerBIRefreshStatusSchema.parse(
      await apiRequest("/api/v1/power-bi/refresh-status"),
    );
  },
};

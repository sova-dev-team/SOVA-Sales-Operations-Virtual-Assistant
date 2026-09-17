import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail,
  Phone,
  Building2,
  Tag,
  Calendar,
  Plus,
  Edit2,
  AlertCircle,
  CheckCircle,
  MessageSquare,
  Clock,
  PhoneCall,
  MailOpen,
  Users,
  FileText,
  Activity,
} from "lucide-react";
import { sovaApi } from "../api/sovaApi";
import { useCustomerDetailData, useSovaData } from "../data/SovaDataContext";
import CustomerCreatePage from "./CustomerCreatePage";
import {
  PageHeader,
  Card,
  StatusBadge,
  CUSTOMER_STATUS_MAP,
  Btn,
  Input,
} from "../components/Layout";
import { formatDate, formatDateTime, formatRelativeTime } from "../lib/utils";
import type { User, Page, InteractionType } from "../types";

const INTERACTION_ICON: Record<InteractionType, React.ReactNode> = {
  call: <PhoneCall size={13} />,
  email: <MailOpen size={13} />,
  meeting: <Users size={13} />,
  quote: <Activity size={13} />,
  note: <FileText size={13} />,
};

const INTERACTION_LABEL: Record<InteractionType, string> = {
  call: "Gọi điện",
  email: "Email",
  meeting: "Gặp mặt",
  quote: "Báo giá",
  note: "Ghi chú",
};

interface Props {
  user: User;
  customerId: string | null;
  navigate: (page: Page, id?: string) => void;
}

export default function CustomerDetailPage({
  user,
  customerId,
  navigate,
}: Props) {
  const queryClient = useQueryClient();
  const { users } = useSovaData();
  const { customer, interactions, isLoading, error } = useCustomerDetailData(
    customerId,
    user,
    users,
  );
  const [showAddInteraction, setShowAddInteraction] = useState(false);
  const [interactionType, setInteractionType] =
    useState<InteractionType>("call");
  const [interactionSummary, setInteractionSummary] = useState("");
  const [summaryError, setSummaryError] = useState("");
  const [showEditCustomer, setShowEditCustomer] = useState(false);
  const [editContactName, setEditContactName] = useState("");
  const [editCompanyName, setEditCompanyName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState("");
  const addInteractionMutation = useMutation({
    mutationFn: () =>
      sovaApi.addInteraction(customer!.id, {
        type: interactionType,
        summary: interactionSummary.trim(),
        occurredAt: new Date().toISOString(),
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["customer-interactions", customerId],
      });
    },
  });
  const updateCustomerMutation = useMutation({
    mutationFn: (payload: Parameters<typeof sovaApi.updateCustomer>[1]) =>
      sovaApi.updateCustomer(customer!.id, payload),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer", customerId] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
      ]);
    },
  });

  if (customerId === "new") return <CustomerCreatePage navigate={navigate} />;

  if (isLoading) {
    return (
      <div className="p-6 text-sm text-gray-500">
        Đang tải chi tiết khách hàng…
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="p-6">
        <PageHeader title="Chi tiết khách hàng" />
        <div className="flex flex-col items-center justify-center py-20">
          <AlertCircle
            size={32}
            style={{ color: "#DC2626" }}
            className="mb-3"
          />
          <p className="text-sm" style={{ color: "#374151" }}>
            {error ? "Không thể tải khách hàng." : "Không tìm thấy khách hàng."}
          </p>
          <Btn
            onClick={() => navigate("customers")}
            variant="secondary"
            size="sm"
            className="mt-4"
          >
            Quay lại danh sách
          </Btn>
        </div>
      </div>
    );
  }

  const canEdit = user.role === "admin" || customer.ownerId === user.id;

  const handleAddInteraction = async () => {
    if (!interactionSummary.trim()) {
      setSummaryError("Vui lòng nhập nội dung tóm tắt tương tác.");
      return;
    }
    try {
      await addInteractionMutation.mutateAsync();
      setInteractionSummary("");
      setSummaryError("");
      setInteractionType("call");
      setShowAddInteraction(false);
    } catch (mutationError) {
      setSummaryError(
        mutationError instanceof Error
          ? mutationError.message
          : "Không thể lưu tương tác.",
      );
    }
  };

  const openCustomerEditor = () => {
    setEditContactName(customer.name);
    setEditCompanyName(customer.company);
    setEditEmail(customer.email);
    setEditPhone(customer.phone ?? "");
    setEditError("");
    setShowEditCustomer(true);
  };

  const handleUpdateCustomer = async () => {
    if (!editContactName.trim() || !editCompanyName.trim()) {
      setEditError("Tên liên hệ và công ty không được để trống.");
      return;
    }
    try {
      await updateCustomerMutation.mutateAsync({
        contactName: editContactName.trim(),
        companyName: editCompanyName.trim(),
        email: editEmail.trim() || null,
        phone: editPhone.trim() || null,
      });
      setShowEditCustomer(false);
      setEditError("");
    } catch (mutationError) {
      setEditError(
        mutationError instanceof Error
          ? mutationError.message
          : "Không thể cập nhật khách hàng.",
      );
    }
  };

  const handleArchiveCustomer = async () => {
    try {
      await updateCustomerMutation.mutateAsync({ status: "archived" });
    } catch (mutationError) {
      setEditError(
        mutationError instanceof Error
          ? mutationError.message
          : "Không thể lưu trữ khách hàng.",
      );
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      <PageHeader
        title={customer.name}
        description={customer.company}
        actions={
          canEdit ? (
            <Btn size="sm" variant="secondary" onClick={openCustomerEditor}>
              <Edit2 size={13} /> Chỉnh sửa
            </Btn>
          ) : undefined
        }
      />

      {showEditCustomer && (
        <Card style={{ padding: 20, marginBottom: 20 }} className="fade-up">
          <h2 className="mb-4 text-sm font-semibold text-gray-900">
            Chỉnh sửa khách hàng
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Người liên hệ"
              value={editContactName}
              onChange={setEditContactName}
              required
            />
            <Input
              label="Công ty"
              value={editCompanyName}
              onChange={setEditCompanyName}
              required
            />
            <Input
              label="Email"
              type="email"
              value={editEmail}
              onChange={setEditEmail}
            />
            <Input
              label="Điện thoại"
              value={editPhone}
              onChange={setEditPhone}
            />
          </div>
          {editError && (
            <p className="mt-3 text-xs text-red-600">{editError}</p>
          )}
          <div className="mt-4 flex gap-2">
            <Btn
              size="sm"
              onClick={() => void handleUpdateCustomer()}
              disabled={updateCustomerMutation.isPending}
            >
              Lưu thay đổi
            </Btn>
            <Btn
              size="sm"
              variant="secondary"
              onClick={() => setShowEditCustomer(false)}
            >
              Hủy
            </Btn>
          </div>
        </Card>
      )}

      <div className="grid gap-5" style={{ gridTemplateColumns: "340px 1fr" }}>
        {/* Left column: contact summary */}
        <div className="flex flex-col gap-4">
          {/* Contact info */}
          <Card style={{ padding: 20 }}>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "#6B7280" }}
            >
              Thông tin liên hệ
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2.5">
                <Building2
                  size={14}
                  style={{ color: "#9CA3AF", flexShrink: 0 }}
                />
                <span className="text-sm" style={{ color: "#111827" }}>
                  {customer.company}
                </span>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={14} style={{ color: "#9CA3AF" }} />
                <a
                  href={`mailto:${customer.email}`}
                  className="text-sm transition-colors"
                  style={{ color: "#4338CA" }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color =
                      "#4F46E5")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLAnchorElement).style.color =
                      "#4338CA")
                  }
                >
                  {customer.email}
                </a>
              </div>
              {customer.phone && (
                <div className="flex items-center gap-2.5">
                  <Phone size={14} style={{ color: "#9CA3AF" }} />
                  <span className="text-sm" style={{ color: "#111827" }}>
                    {customer.phone}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2.5">
                <Users size={14} style={{ color: "#9CA3AF" }} />
                <span className="text-sm" style={{ color: "#111827" }}>
                  {customer.ownerName}
                </span>
              </div>
            </div>
          </Card>

          {/* Status & metadata */}
          <Card style={{ padding: 20 }}>
            <h2
              className="text-xs font-semibold uppercase tracking-wider mb-4"
              style={{ color: "#6B7280" }}
            >
              Trạng thái & phân loại
            </h2>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#6B7280" }}>
                  Trạng thái
                </span>
                <StatusBadge
                  status={customer.status}
                  map={CUSTOMER_STATUS_MAP}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: "#6B7280" }}>
                  Ngày tạo
                </span>
                <span
                  className="text-xs tabular-nums"
                  style={{ color: "#374151" }}
                >
                  {formatDate(customer.createdAt)}
                </span>
              </div>
              {customer.lastInteractionAt && (
                <div className="flex items-center justify-between">
                  <span className="text-xs" style={{ color: "#6B7280" }}>
                    Tương tác gần nhất
                  </span>
                  <span className="text-xs" style={{ color: "#374151" }}>
                    {formatRelativeTime(customer.lastInteractionAt)}
                  </span>
                </div>
              )}
              {customer.followUpDue && (
                <div
                  className="flex items-start gap-2 p-2.5 rounded-md mt-1"
                  style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
                >
                  <AlertCircle
                    size={13}
                    style={{ color: "#B45309", marginTop: 1, flexShrink: 0 }}
                  />
                  <div>
                    <div
                      className="text-xs font-medium"
                      style={{ color: "#B45309" }}
                    >
                      Cần theo dõi
                    </div>
                    {customer.followUpDate && (
                      <div
                        className="text-xs mt-0.5"
                        style={{ color: "#92400E" }}
                      >
                        Hạn: {formatDate(customer.followUpDate)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Card>

          {/* Product interests */}
          <Card style={{ padding: 20 }}>
            <div className="flex items-center gap-2 mb-4">
              <Tag size={13} style={{ color: "#6B7280" }} />
              <h2
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#6B7280" }}
              >
                Sở thích sản phẩm
              </h2>
            </div>
            {customer.productInterests.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {customer.productInterests.map((p) => (
                  <span
                    key={p}
                    className="px-2.5 py-1 rounded text-xs font-medium"
                    style={{
                      background: "#EFF6FF",
                      color: "#4338CA",
                      border: "1px solid #C7D2FE",
                    }}
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm" style={{ color: "#9CA3AF" }}>
                Chưa có thông tin.
              </p>
            )}
          </Card>

          {/* Notes */}
          {customer.notes && (
            <Card style={{ padding: 20 }}>
              <h2
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "#6B7280" }}
              >
                Ghi chú
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#374151" }}
              >
                {customer.notes}
              </p>
            </Card>
          )}
        </div>

        {/* Right column: interaction timeline */}
        <div>
          <Card style={{ padding: 0 }}>
            <div
              className="flex items-center justify-between px-5 py-4 border-b"
              style={{ borderColor: "#E5E7EB" }}
            >
              <div className="flex items-center gap-2">
                <MessageSquare size={15} style={{ color: "#6B7280" }} />
                <h2
                  className="text-sm font-semibold"
                  style={{ color: "#111827" }}
                >
                  Lịch sử tương tác
                </h2>
                <span
                  className="px-1.5 py-0.5 rounded text-xs font-medium"
                  style={{ background: "#F9FAFB", color: "#6B7280" }}
                >
                  {interactions.length}
                </span>
              </div>
              {canEdit && (
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowAddInteraction((v) => !v)}
                >
                  <Plus size={13} /> Thêm
                </Btn>
              )}
            </div>

            {/* Add interaction form */}
            {showAddInteraction && (
              <div
                className="px-5 py-4 border-b fade-up"
                style={{ background: "#F9FAFB", borderColor: "#E5E7EB" }}
              >
                <h3
                  className="text-sm font-medium mb-3"
                  style={{ color: "#111827" }}
                >
                  Ghi nhận tương tác mới
                </h3>
                {/* Type selector */}
                <div className="mb-3">
                  <label
                    className="block text-xs font-medium mb-1.5"
                    style={{ color: "#374151" }}
                  >
                    Loại tương tác
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {(Object.keys(INTERACTION_LABEL) as InteractionType[]).map(
                      (t) => (
                        <button
                          key={t}
                          onClick={() => setInteractionType(t)}
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded text-xs transition-colors"
                          style={{
                            background:
                              interactionType === t ? "#4F46E5" : "#fff",
                            color: interactionType === t ? "#fff" : "#374151",
                            border: `1px solid ${
                              interactionType === t ? "#4F46E5" : "#D1D5DB"
                            }`,
                            borderRadius: 5,
                          }}
                        >
                          {INTERACTION_ICON[t]}
                          {INTERACTION_LABEL[t]}
                        </button>
                      ),
                    )}
                  </div>
                </div>
                <Input
                  label="Nội dung tóm tắt"
                  value={interactionSummary}
                  onChange={(v) => {
                    setInteractionSummary(v);
                    setSummaryError("");
                  }}
                  placeholder="Mô tả ngắn về nội dung tương tác…"
                  required
                  error={summaryError}
                />
                <div className="flex gap-2 mt-3">
                  <Btn
                    size="sm"
                    onClick={() => void handleAddInteraction()}
                    disabled={addInteractionMutation.isPending}
                  >
                    <CheckCircle size={13} /> Lưu
                  </Btn>
                  <Btn
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setShowAddInteraction(false);
                      setSummaryError("");
                      setInteractionSummary("");
                    }}
                  >
                    Hủy
                  </Btn>
                </div>
              </div>
            )}

            {/* Timeline */}
            {interactions.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <Clock
                  size={24}
                  style={{ color: "#9CA3AF", margin: "0 auto 8px" }}
                />
                <p className="text-sm" style={{ color: "#6B7280" }}>
                  Chưa có tương tác nào. Hãy ghi nhận lần đầu tiên.
                </p>
              </div>
            ) : (
              <div className="px-5 py-4 flex flex-col gap-0">
                {interactions.map((interaction, idx) => (
                  <div key={interaction.id} className="relative flex gap-4">
                    {/* Timeline connector */}
                    <div
                      className="flex flex-col items-center"
                      style={{ width: 32, flexShrink: 0 }}
                    >
                      <div
                        className="flex items-center justify-center rounded-full z-10"
                        style={{
                          width: 28,
                          height: 28,
                          background: "#EFF6FF",
                          color: "#4338CA",
                          border: "2px solid #C7D2FE",
                          marginTop: 2,
                        }}
                      >
                        {INTERACTION_ICON[interaction.type]}
                      </div>
                      {idx < interactions.length - 1 && (
                        <div
                          style={{
                            width: 1,
                            flex: 1,
                            background: "#E5E7EB",
                            marginTop: 4,
                            marginBottom: 4,
                            minHeight: 20,
                          }}
                        />
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 pb-4 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-xs font-medium px-1.5 py-0.5 rounded"
                          style={{ background: "#F9FAFB", color: "#374151" }}
                        >
                          {INTERACTION_LABEL[interaction.type]}
                        </span>
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>
                          {formatRelativeTime(interaction.occurredAt)}
                        </span>
                        <span className="text-xs" style={{ color: "#9CA3AF" }}>
                          · {interaction.createdByName}
                        </span>
                      </div>
                      <p
                        className="text-sm leading-relaxed"
                        style={{ color: "#374151" }}
                        title={formatDateTime(interaction.occurredAt)}
                      >
                        {interaction.summary}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick actions */}
          <div className="flex gap-3 mt-4">
            <Btn
              size="sm"
              variant="secondary"
              onClick={() => navigate("email-drafts")}
            >
              <Mail size={13} /> Tạo email nháp AI
            </Btn>
            {user.role === "admin" && customer.status !== "archived" && (
              <Btn
                size="sm"
                variant="ghost"
                onClick={() => void handleArchiveCustomer()}
                disabled={updateCustomerMutation.isPending}
              >
                <Calendar size={13} /> Lưu trữ khách hàng
              </Btn>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

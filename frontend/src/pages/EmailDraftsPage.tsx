import { useState } from "react";
import {
  Mail,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  Eye,
  Loader,
  ShieldAlert,
  MessageSquare,
} from "lucide-react";
import { sovaApi } from "../api/sovaApi";
import { useSovaData } from "../data/SovaDataContext";
import {
  PageHeader,
  Card,
  StatusBadge,
  DRAFT_STATUS_MAP,
  Btn,
  Input,
  EmptyState,
} from "../components/Layout";
import { formatDateTime, formatRelativeTime } from "../lib/utils";
import type {
  User,
  Page,
  EmailDraft,
  DraftStatus,
  EmailPurpose,
  DraftLanguage,
  DraftTone,
} from "../types";

const PURPOSE_LABELS: Record<EmailPurpose, string> = {
  followUp: "Theo dõi",
  introduction: "Giới thiệu",
  reengagement: "Kết nối lại",
};

const TONE_LABELS: Record<DraftTone, string> = {
  professional: "Chuyên nghiệp",
  friendly: "Thân thiện",
  concise: "Ngắn gọn",
};

interface Props {
  user: User;
  navigate: (page: Page, id?: string) => void;
}

export default function EmailDraftsPage({ user, navigate: _navigate }: Props) {
  const { drafts, customers, generateDraft, setDraftStatus, isLoading, error } =
    useSovaData();
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectError, setRejectError] = useState("");

  // New draft form state
  const [newCustomerId, setNewCustomerId] = useState("");
  const [newPurpose, setNewPurpose] = useState<EmailPurpose>("followUp");
  const [newLanguage, setNewLanguage] = useState<DraftLanguage>("vi");
  const [newTone, setNewTone] = useState<DraftTone>("professional");
  const [generateError, setGenerateError] = useState("");

  const myDrafts =
    user.role === "staff"
      ? drafts.filter((d) => d.createdById === user.id)
      : drafts;

  const handleGenerate = async (sourceDraft?: EmailDraft) => {
    const customerId = sourceDraft?.customerId ?? newCustomerId;
    if (!customerId) {
      setGenerateError("Vui lòng chọn khách hàng.");
      return;
    }
    setGenerateError("");
    setGenerating(true);
    try {
      const created = await generateDraft({
        customerId,
        purpose: sourceDraft?.purpose ?? newPurpose,
        language: sourceDraft?.language ?? newLanguage,
        tone: sourceDraft?.tone ?? newTone,
      });
      setSelectedDraft(created);
      setShowNewForm(false);
      setNewCustomerId("");
    } catch (generationError) {
      setGenerateError(
        generationError instanceof Error
          ? generationError.message
          : "Không thể tạo email nháp.",
      );
    } finally {
      setGenerating(false);
    }
  };

  const updateDraftStatus = async (
    id: string,
    status: DraftStatus,
    reason?: string,
  ) => {
    try {
      if (selectedDraft?.id === id && selectedDraft.status === "draft") {
        await sovaApi.updateEmailDraft(id, {
          subject: selectedDraft.subject,
          body: selectedDraft.body,
        });
      }
      await setDraftStatus(id, status, reason);
      setSelectedDraft((previous) =>
        previous?.id === id
          ? { ...previous, status, rejectionReason: reason }
          : previous,
      );
      setShowRejectForm(false);
      setRejectReason("");
    } catch (statusError) {
      setRejectError(
        statusError instanceof Error
          ? statusError.message
          : "Không thể cập nhật trạng thái.",
      );
    }
  };

  const draft = selectedDraft;

  return (
    <div className="p-6 max-w-7xl">
      <PageHeader
        title="Email nháp AI"
        description="AI hỗ trợ soạn thảo. Mỗi email phải được con người xem xét và phê duyệt trước khi sử dụng."
        actions={
          !showNewForm ? (
            <Btn
              size="sm"
              onClick={() => {
                setShowNewForm(true);
                setSelectedDraft(null);
              }}
            >
              <Plus size={14} /> Tạo email nháp
            </Btn>
          ) : undefined
        }
      />

      {/* Draft-only notice */}
      <div
        className="flex items-center gap-3 p-3 rounded-lg mb-6"
        style={{ background: "#FEECEB", border: "1px solid #FECACA" }}
      >
        <ShieldAlert size={16} style={{ color: "#DC2626", flexShrink: 0 }} />
        <p className="text-sm font-medium" style={{ color: "#7F1D1D" }}>
          ĐÂY LÀ EMAIL NHÁP — Hệ thống không tự động gửi email. Mọi nháp phải
          được phê duyệt bởi người có thẩm quyền.
        </p>
      </div>

      <div className="grid gap-5" style={{ gridTemplateColumns: "320px 1fr" }}>
        {/* Left: list */}
        <div>
          {/* New draft form */}
          {showNewForm && (
            <Card style={{ padding: 18, marginBottom: 12 }} className="fade-up">
              <h3
                className="text-sm font-semibold mb-3"
                style={{ color: "#111827" }}
              >
                Tạo email nháp mới
              </h3>
              <div className="flex flex-col gap-3">
                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "#374151" }}
                  >
                    Khách hàng <span style={{ color: "#DC2626" }}>*</span>
                  </label>
                  <select
                    value={newCustomerId}
                    onChange={(e) => {
                      setNewCustomerId(e.target.value);
                      setGenerateError("");
                    }}
                    className="w-full text-sm rounded outline-none"
                    style={{
                      border: `1px solid ${
                        generateError ? "#DC2626" : "#D1D5DB"
                      }`,
                      padding: "7px 10px",
                      borderRadius: 5,
                      color: newCustomerId ? "#111827" : "#6B7280",
                      background: "#fff",
                    }}
                  >
                    <option value="">Chọn khách hàng…</option>
                    {customers
                      .filter((c) =>
                        user.role === "staff" ? c.ownerId === user.id : true,
                      )
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} – {c.company}
                        </option>
                      ))}
                  </select>
                  {generateError && (
                    <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                      {generateError}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    className="block text-xs font-medium mb-1"
                    style={{ color: "#374151" }}
                  >
                    Mục đích
                  </label>
                  <select
                    value={newPurpose}
                    onChange={(e) =>
                      setNewPurpose(e.target.value as EmailPurpose)
                    }
                    className="w-full text-sm rounded outline-none"
                    style={{
                      border: "1px solid #D1D5DB",
                      padding: "7px 10px",
                      borderRadius: 5,
                      color: "#111827",
                      background: "#fff",
                    }}
                  >
                    {(Object.keys(PURPOSE_LABELS) as EmailPurpose[]).map(
                      (p) => (
                        <option key={p} value={p}>
                          {PURPOSE_LABELS[p]}
                        </option>
                      ),
                    )}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: "#374151" }}
                    >
                      Ngôn ngữ
                    </label>
                    <select
                      value={newLanguage}
                      onChange={(e) =>
                        setNewLanguage(e.target.value as DraftLanguage)
                      }
                      className="w-full text-sm rounded outline-none"
                      style={{
                        border: "1px solid #D1D5DB",
                        padding: "7px 10px",
                        borderRadius: 5,
                        color: "#111827",
                        background: "#fff",
                      }}
                    >
                      <option value="vi">Tiếng Việt</option>
                      <option value="en">Tiếng Anh</option>
                    </select>
                  </div>
                  <div>
                    <label
                      className="block text-xs font-medium mb-1"
                      style={{ color: "#374151" }}
                    >
                      Văn phong
                    </label>
                    <select
                      value={newTone}
                      onChange={(e) => setNewTone(e.target.value as DraftTone)}
                      className="w-full text-sm rounded outline-none"
                      style={{
                        border: "1px solid #D1D5DB",
                        padding: "7px 10px",
                        borderRadius: 5,
                        color: "#111827",
                        background: "#fff",
                      }}
                    >
                      {(Object.keys(TONE_LABELS) as DraftTone[]).map((t) => (
                        <option key={t} value={t}>
                          {TONE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Btn
                    onClick={() => void handleGenerate()}
                    disabled={generating}
                    size="sm"
                  >
                    {generating ? (
                      <>
                        <Loader size={12} className="spin-anim" /> Đang tạo…
                      </>
                    ) : (
                      "Tạo nháp bằng AI"
                    )}
                  </Btn>
                  <Btn
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowNewForm(false)}
                  >
                    Hủy
                  </Btn>
                </div>
              </div>
            </Card>
          )}

          {/* Draft list */}
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Đang tải email nháp…
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-600">
              Không thể tải email nháp.
            </div>
          ) : myDrafts.length === 0 ? (
            <EmptyState
              icon={<Mail size={20} />}
              title="Chưa có email nháp nào"
              description="Tạo email nháp đầu tiên bằng cách nhấn nút Tạo email nháp."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {myDrafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => {
                    setSelectedDraft(d);
                    setShowNewForm(false);
                  }}
                  className="w-full text-left rounded-lg p-3 transition-colors"
                  style={{
                    background: selectedDraft?.id === d.id ? "#EFF6FF" : "#fff",
                    border: `1px solid ${
                      selectedDraft?.id === d.id ? "#A5B4FC" : "#E5E7EB"
                    }`,
                    borderRadius: 8,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedDraft?.id !== d.id)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "#F9FAFB";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedDraft?.id !== d.id)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "#fff";
                  }}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span
                      className="text-xs font-medium truncate"
                      style={{ color: "#111827" }}
                    >
                      {d.customerName}
                    </span>
                    <StatusBadge status={d.status} map={DRAFT_STATUS_MAP} />
                  </div>
                  <div
                    className="text-xs mb-1 truncate"
                    style={{ color: "#6B7280" }}
                  >
                    {d.subject}
                  </div>
                  <div className="text-xs" style={{ color: "#9CA3AF" }}>
                    {PURPOSE_LABELS[d.purpose]} ·{" "}
                    {formatRelativeTime(d.createdAt)}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: draft detail */}
        {draft ? (
          <Card style={{ padding: 0 }} className="fade-up">
            {/* Header */}
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: "#E5E7EB" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={draft.status} map={DRAFT_STATUS_MAP} />
                    <span className="text-xs" style={{ color: "#6B7280" }}>
                      {PURPOSE_LABELS[draft.purpose]} ·{" "}
                      {draft.language === "vi" ? "Tiếng Việt" : "Tiếng Anh"} ·{" "}
                      {TONE_LABELS[draft.tone]}
                    </span>
                  </div>
                  <h2
                    className="text-base font-semibold"
                    style={{ color: "#111827" }}
                  >
                    {draft.subject}
                  </h2>
                  <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
                    {draft.customerName} · {draft.customerCompany}
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  {draft.status === "draft" && (
                    <button
                      onClick={() => void handleGenerate(draft)}
                      className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded"
                      style={{
                        border: "1px solid #D1D5DB",
                        color: "#374151",
                        borderRadius: 5,
                      }}
                    >
                      <RefreshCw size={11} /> Tạo lại
                    </button>
                  )}
                </div>
              </div>

              {/* State machine visualization */}
              <div
                className="flex items-center gap-2 mt-3 pt-3"
                style={{ borderTop: "1px solid #E5E7EB" }}
              >
                {(["draft", "reviewed", "approved"] as DraftStatus[]).map(
                  (s, i, arr) => (
                    <div key={s} className="flex items-center gap-2">
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{
                            background:
                              draft.status === s
                                ? "#4F46E5"
                                : ["approved", "reviewed"].includes(
                                      draft.status,
                                    ) &&
                                    i <
                                      arr.indexOf(
                                        draft.status as
                                          "draft" | "reviewed" | "approved",
                                      )
                                  ? "#16A34A"
                                  : "#E5E7EB",
                            color:
                              draft.status === s ||
                              (["approved", "reviewed"].includes(
                                draft.status,
                              ) &&
                                i <
                                  arr.indexOf(
                                    draft.status as
                                      "draft" | "reviewed" | "approved",
                                  ))
                                ? "#fff"
                                : "#6B7280",
                          }}
                        >
                          {["approved", "reviewed"].includes(draft.status) &&
                          i <
                            arr.indexOf(
                              draft.status as "draft" | "reviewed" | "approved",
                            ) ? (
                            <CheckCircle size={12} />
                          ) : (
                            <span style={{ fontSize: 9, fontWeight: 700 }}>
                              {i + 1}
                            </span>
                          )}
                        </div>
                        <span
                          className="text-xs font-medium"
                          style={{
                            color: draft.status === s ? "#111827" : "#6B7280",
                          }}
                        >
                          {s === "draft"
                            ? "Nháp"
                            : s === "reviewed"
                              ? "Đã xem xét"
                              : "Phê duyệt"}
                        </span>
                      </div>
                      {i < arr.length - 1 && (
                        <ChevronRight size={12} style={{ color: "#D1D5DB" }} />
                      )}
                    </div>
                  ),
                )}
                {draft.status === "rejected" && (
                  <>
                    <ChevronRight size={12} style={{ color: "#D1D5DB" }} />
                    <div className="flex items-center gap-1.5">
                      <XCircle size={16} style={{ color: "#DC2626" }} />
                      <span
                        className="text-xs font-medium"
                        style={{ color: "#DC2626" }}
                      >
                        Từ chối
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Rejection reason */}
            {draft.status === "rejected" && draft.rejectionReason && (
              <div
                className="mx-6 mt-4 flex items-start gap-2.5 p-3 rounded-lg"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
              >
                <XCircle size={14} style={{ color: "#DC2626", marginTop: 1 }} />
                <div>
                  <p
                    className="text-xs font-semibold mb-0.5"
                    style={{ color: "#DC2626" }}
                  >
                    Lý do từ chối
                  </p>
                  <p className="text-sm" style={{ color: "#7F1D1D" }}>
                    {draft.rejectionReason}
                  </p>
                  {draft.reviewedByName && (
                    <p className="text-xs mt-1" style={{ color: "#9CA3AF" }}>
                      Từ chối bởi {draft.reviewedByName} ·{" "}
                      {draft.reviewedAt ? formatDateTime(draft.reviewedAt) : ""}
                    </p>
                  )}
                </div>
              </div>
            )}

            {draft.status === "approved" && (
              <div
                className="mx-6 mt-4 flex items-center gap-2 p-3 rounded-lg"
                style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
              >
                <CheckCircle size={14} style={{ color: "#16A34A" }} />
                <p className="text-sm font-medium" style={{ color: "#14532D" }}>
                  Đã phê duyệt bởi {draft.reviewedByName} ·{" "}
                  {draft.reviewedAt ? formatDateTime(draft.reviewedAt) : ""}
                </p>
              </div>
            )}

            {/* Email body */}
            <div className="px-6 py-4">
              <div className="mb-3">
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "#6B7280" }}
                >
                  Tiêu đề email
                </label>
                <div
                  className="text-sm rounded-md px-3 py-2"
                  style={{
                    border: "1px solid #E5E7EB",
                    background:
                      draft.status === "approved" ? "#F9FAFB" : "#fff",
                    color: "#111827",
                    borderRadius: 5,
                  }}
                >
                  {draft.subject}
                </div>
              </div>
              <div>
                <label
                  className="block text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "#6B7280" }}
                >
                  Nội dung email
                </label>
                {draft.status === "approved" || draft.status === "rejected" ? (
                  <pre
                    className="text-sm leading-relaxed whitespace-pre-wrap"
                    style={{
                      fontFamily: "inherit",
                      background: "#F9FAFB",
                      border: "1px solid #E5E7EB",
                      padding: "12px 14px",
                      borderRadius: 5,
                      color: "#374151",
                    }}
                  >
                    {draft.body}
                  </pre>
                ) : (
                  <textarea
                    value={draft.body}
                    onChange={(event) =>
                      setSelectedDraft({ ...draft, body: event.target.value })
                    }
                    rows={12}
                    readOnly={draft.status !== "draft"}
                    className="w-full text-sm rounded-md outline-none resize-y"
                    style={{
                      border: "1px solid #D1D5DB",
                      padding: "10px 12px",
                      color: "#111827",
                      background: "#fff",
                      fontFamily: "inherit",
                      lineHeight: 1.7,
                      borderRadius: 5,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
                    onBlur={(e) => (e.target.style.borderColor = "#D1D5DB")}
                  />
                )}
              </div>

              {/* Metadata */}
              <div
                className="flex items-center gap-4 mt-3 pt-3 text-xs"
                style={{ borderTop: "1px solid #E5E7EB", color: "#9CA3AF" }}
              >
                <span className="flex items-center gap-1">
                  <Clock size={11} /> {formatDateTime(draft.createdAt)}
                </span>
                <span>·</span>
                <span>AI: {draft.providerModel}</span>
                <span>·</span>
                <span>Phiên bản prompt: {draft.promptVersion}</span>
              </div>
            </div>

            {/* Actions */}
            {(draft.status === "draft" || draft.status === "reviewed") && (
              <div
                className="flex items-center justify-between px-6 pb-5 pt-2"
                style={{ borderTop: "1px solid #E5E7EB" }}
              >
                <div className="flex gap-2">
                  {draft.status === "draft" && (
                    <Btn
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        void updateDraftStatus(draft.id, "reviewed")
                      }
                    >
                      <Eye size={13} /> Đánh dấu đã xem xét
                    </Btn>
                  )}
                  {draft.status === "reviewed" && user.role === "admin" && (
                    <Btn
                      size="sm"
                      onClick={() =>
                        void updateDraftStatus(draft.id, "approved")
                      }
                    >
                      <CheckCircle size={13} /> Phê duyệt nháp
                    </Btn>
                  )}
                </div>
                <div className="flex gap-2">
                  {!showRejectForm ? (
                    <Btn
                      size="sm"
                      variant="danger"
                      onClick={() => setShowRejectForm(true)}
                    >
                      <XCircle size={13} /> Từ chối
                    </Btn>
                  ) : (
                    <div className="flex flex-col gap-2 w-72">
                      <Input
                        value={rejectReason}
                        onChange={(v) => {
                          setRejectReason(v);
                          setRejectError("");
                        }}
                        placeholder="Lý do từ chối (bắt buộc)…"
                        error={rejectError}
                      />
                      <div className="flex gap-2">
                        <Btn
                          size="sm"
                          variant="danger"
                          onClick={() => {
                            if (!rejectReason.trim()) {
                              setRejectError("Vui lòng nhập lý do từ chối.");
                              return;
                            }
                            void updateDraftStatus(
                              draft.id,
                              "rejected",
                              rejectReason.trim(),
                            );
                          }}
                        >
                          Xác nhận từ chối
                        </Btn>
                        <Btn
                          size="sm"
                          variant="secondary"
                          onClick={() => setShowRejectForm(false)}
                        >
                          Hủy
                        </Btn>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        ) : (
          !showNewForm && (
            <EmptyState
              icon={<MessageSquare size={20} />}
              title="Chọn email nháp để xem"
              description="Hoặc tạo email nháp mới bằng cách nhấn nút Tạo email nháp."
            />
          )
        )}
      </div>
    </div>
  );
}

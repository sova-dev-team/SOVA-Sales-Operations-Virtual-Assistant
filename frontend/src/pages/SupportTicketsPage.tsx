import { useEffect, useState } from "react";
import {
  Plus,
  Search,
  TicketCheck,
  MessageSquare,
  CheckCircle,
  Lock,
  Send,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useSovaData, useTicketDetailData } from "../data/SovaDataContext";
import {
  PageHeader,
  Card,
  StatusBadge,
  TICKET_STATUS_MAP,
  TICKET_PRIORITY_MAP,
  Btn,
  EmptyState,
} from "../components/Layout";
import { formatDateTime, formatRelativeTime } from "../lib/utils";
import type { User, Page, SupportTicket, TicketStatus } from "../types";

const CATEGORY_LABELS: Record<string, string> = {
  access: "Quyền truy cập",
  hardware: "Phần cứng",
  software: "Phần mềm",
  other: "Khác",
};

interface Props {
  user: User;
  navigate: (page: Page, id?: string) => void;
  initialTicketId?: string | null;
}

export default function SupportTicketsPage({
  user,
  navigate: _navigate,
  initialTicketId,
}: Props) {
  const {
    tickets,
    users,
    createTicket: createTicketRequest,
    setTicketStatus,
    addComment: addCommentRequest,
    isLoading,
    error,
  } = useSovaData();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(
    null,
  );
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "all">("all");
  const [comment, setComment] = useState("");
  const [commentError, setCommentError] = useState("");
  const [showNewTicket, setShowNewTicket] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newTitleError, setNewTitleError] = useState("");

  useEffect(() => {
    if (!initialTicketId) return;
    const initialTicket = tickets.find((item) => item.id === initialTicketId);
    if (initialTicket) setSelectedTicket(initialTicket);
  }, [initialTicketId, tickets]);

  const filtered = tickets.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.title.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const detail = useTicketDetailData(selectedTicket?.id ?? null, user, users);

  const addComment = async () => {
    if (!comment.trim()) {
      setCommentError("Vui lòng nhập nội dung bình luận.");
      return;
    }
    if (!selectedTicket) return;
    try {
      await addCommentRequest(selectedTicket.id, comment.trim());
      setComment("");
      setCommentError("");
    } catch (commentFailure) {
      setCommentError(
        commentFailure instanceof Error
          ? commentFailure.message
          : "Không thể gửi bình luận.",
      );
    }
  };

  const updateStatus = async (ticketId: string, status: TicketStatus) => {
    await setTicketStatus(ticketId, status);
    setSelectedTicket((previous) =>
      previous?.id === ticketId ? { ...previous, status } : previous,
    );
  };

  const createTicket = async () => {
    if (!newTitle.trim()) {
      setNewTitleError("Vui lòng nhập tiêu đề yêu cầu.");
      return;
    }
    try {
      await createTicketRequest({
        title: newTitle.trim(),
        description: newDesc.trim() || "Chưa có mô tả chi tiết.",
        priority: "medium",
        category: "other",
      });
      setShowNewTicket(false);
      setNewTitle("");
      setNewDesc("");
    } catch (createFailure) {
      setNewTitleError(
        createFailure instanceof Error
          ? createFailure.message
          : "Không thể tạo yêu cầu.",
      );
    }
  };

  const ticket = detail.ticket ?? selectedTicket;

  return (
    <div className="p-6 max-w-7xl">
      <PageHeader
        title="Yêu cầu hỗ trợ IT"
        description="Theo dõi và xử lý các yêu cầu hỗ trợ kỹ thuật nội bộ."
        actions={
          <Btn
            size="sm"
            onClick={() => {
              setShowNewTicket(true);
              setSelectedTicket(null);
            }}
          >
            <Plus size={14} /> Tạo yêu cầu
          </Btn>
        }
      />

      <div className="grid gap-5" style={{ gridTemplateColumns: "340px 1fr" }}>
        {/* Left: list */}
        <div>
          {/* Create ticket form */}
          {showNewTicket && (
            <Card style={{ padding: 16, marginBottom: 12 }} className="fade-up">
              <h3
                className="text-sm font-semibold mb-3"
                style={{ color: "#111827" }}
              >
                Yêu cầu mới
              </h3>
              <div className="mb-2">
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "#374151" }}
                >
                  Tiêu đề <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <input
                  value={newTitle}
                  onChange={(e) => {
                    setNewTitle(e.target.value);
                    setNewTitleError("");
                  }}
                  placeholder="Mô tả ngắn vấn đề cần hỗ trợ…"
                  className="w-full text-sm outline-none"
                  style={{
                    border: `1px solid ${
                      newTitleError ? "#DC2626" : "#D1D5DB"
                    }`,
                    padding: "7px 10px",
                    borderRadius: 5,
                    color: "#111827",
                  }}
                />
                {newTitleError && (
                  <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                    {newTitleError}
                  </p>
                )}
              </div>
              <div className="mb-3">
                <label
                  className="block text-xs font-medium mb-1"
                  style={{ color: "#374151" }}
                >
                  Mô tả chi tiết
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  rows={3}
                  placeholder="Mô tả chi tiết vấn đề, các bước tái hiện lỗi…"
                  className="w-full text-sm outline-none resize-none"
                  style={{
                    border: "1px solid #D1D5DB",
                    padding: "7px 10px",
                    borderRadius: 5,
                    color: "#111827",
                    fontFamily: "inherit",
                  }}
                />
              </div>
              <div className="flex gap-2">
                <Btn size="sm" onClick={() => void createTicket()}>
                  Tạo yêu cầu
                </Btn>
                <Btn
                  size="sm"
                  variant="secondary"
                  onClick={() => setShowNewTicket(false)}
                >
                  Hủy
                </Btn>
              </div>
            </Card>
          )}

          {/* Search + filter */}
          <div className="mb-3">
            <div className="relative mb-2">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "#6B7280" }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm kiếm yêu cầu…"
                className="w-full text-sm outline-none"
                style={{
                  border: "1px solid #D1D5DB",
                  padding: "7px 10px 7px 28px",
                  borderRadius: 6,
                  color: "#111827",
                  background: "#fff",
                }}
              />
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {(
                ["all", "open", "in_progress", "resolved", "closed"] as const
              ).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className="px-2.5 py-1 rounded text-xs transition-colors"
                  style={{
                    background: statusFilter === s ? "#4F46E5" : "#F9FAFB",
                    color: statusFilter === s ? "#fff" : "#374151",
                    border: `1px solid ${
                      statusFilter === s ? "#4F46E5" : "#D1D5DB"
                    }`,
                    borderRadius: 5,
                  }}
                >
                  {s === "all"
                    ? "Tất cả"
                    : s === "open"
                      ? "Mở"
                      : s === "in_progress"
                        ? "Đang xử lý"
                        : s === "resolved"
                          ? "Đã giải quyết"
                          : "Đã đóng"}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket list */}
          {isLoading ? (
            <div className="p-8 text-center text-sm text-gray-500">
              Đang tải yêu cầu hỗ trợ…
            </div>
          ) : error ? (
            <div className="p-8 text-center text-sm text-red-600">
              Không thể tải yêu cầu hỗ trợ.
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<TicketCheck size={20} />}
              title="Không có yêu cầu nào"
              description="Thử thay đổi bộ lọc."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => {
                    setSelectedTicket(t);
                    setShowNewTicket(false);
                  }}
                  className="w-full text-left rounded-lg p-3 transition-colors"
                  style={{
                    background:
                      selectedTicket?.id === t.id ? "#EFF6FF" : "#fff",
                    border: `1px solid ${
                      selectedTicket?.id === t.id ? "#A5B4FC" : "#E5E7EB"
                    }`,
                    borderRadius: 8,
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTicket?.id !== t.id)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "#F9FAFB";
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTicket?.id !== t.id)
                      (e.currentTarget as HTMLButtonElement).style.background =
                        "#fff";
                  }}
                >
                  <div className="flex items-start gap-2 mb-1">
                    <StatusBadge
                      status={t.priority}
                      map={TICKET_PRIORITY_MAP}
                    />
                    <StatusBadge status={t.status} map={TICKET_STATUS_MAP} />
                  </div>
                  <p
                    className="text-sm font-medium text-left mb-1"
                    style={{ color: "#111827" }}
                  >
                    {t.title}
                  </p>
                  <p className="text-xs" style={{ color: "#9CA3AF" }}>
                    {t.createdByName} · {formatRelativeTime(t.createdAt)}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right: ticket detail */}
        {ticket ? (
          <Card style={{ padding: 0 }} className="fade-up">
            {/* Header */}
            <div
              className="px-6 py-5 border-b"
              style={{ borderColor: "#E5E7EB" }}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <h2
                  className="text-base font-semibold"
                  style={{ color: "#111827" }}
                >
                  {ticket.title}
                </h2>
                {ticket.status === "closed" && (
                  <span
                    className="flex items-center gap-1 text-xs shrink-0"
                    style={{ color: "#6B7280" }}
                  >
                    <Lock size={12} /> Đã đóng
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={ticket.status} map={TICKET_STATUS_MAP} />
                <StatusBadge
                  status={ticket.priority}
                  map={TICKET_PRIORITY_MAP}
                />
                <span
                  className="px-2 py-0.5 rounded text-xs"
                  style={{
                    background: "#F9FAFB",
                    color: "#374151",
                    border: "1px solid #E5E7EB",
                  }}
                >
                  {CATEGORY_LABELS[ticket.category]}
                </span>
              </div>
              <div
                className="flex flex-wrap gap-4 mt-3 text-xs"
                style={{ color: "#6B7280" }}
              >
                <span className="flex items-center gap-1">
                  <Clock size={11} /> Tạo: {formatDateTime(ticket.createdAt)}
                </span>
                <span>Bởi: {ticket.createdByName}</span>
                {ticket.assignedToName && (
                  <span>
                    Phụ trách:{" "}
                    <strong style={{ color: "#374151" }}>
                      {ticket.assignedToName}
                    </strong>
                  </span>
                )}
                {ticket.resolvedAt && (
                  <span>Giải quyết: {formatDateTime(ticket.resolvedAt)}</span>
                )}
              </div>
            </div>

            {/* Description */}
            <div
              className="px-6 py-4 border-b"
              style={{ borderColor: "#E5E7EB" }}
            >
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "#6B7280" }}
              >
                Mô tả
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#374151" }}
              >
                {ticket.description}
              </p>
            </div>

            {/* Admin controls */}
            {user.role === "admin" && ticket.status !== "closed" && (
              <div
                className="px-6 py-3 border-b flex items-center gap-2"
                style={{ background: "#F9FAFB", borderColor: "#E5E7EB" }}
              >
                <span
                  className="text-xs font-medium"
                  style={{ color: "#6B7280" }}
                >
                  Chuyển trạng thái:
                </span>
                {ticket.status === "open" && (
                  <Btn
                    size="sm"
                    variant="secondary"
                    onClick={() => void updateStatus(ticket.id, "in_progress")}
                  >
                    Bắt đầu xử lý
                  </Btn>
                )}
                {(ticket.status === "open" ||
                  ticket.status === "in_progress") && (
                  <Btn
                    size="sm"
                    onClick={() => void updateStatus(ticket.id, "resolved")}
                  >
                    <CheckCircle size={12} /> Đánh dấu đã giải quyết
                  </Btn>
                )}
                {ticket.status === "resolved" && (
                  <Btn
                    size="sm"
                    variant="danger"
                    onClick={() => void updateStatus(ticket.id, "closed")}
                  >
                    <Lock size={12} /> Đóng yêu cầu
                  </Btn>
                )}
              </div>
            )}

            {/* Staff: mark in progress */}
            {user.role === "staff" &&
              ticket.status === "open" &&
              ticket.createdById === user.id && (
                <div
                  className="px-6 py-3 border-b flex items-center gap-2"
                  style={{ background: "#F9FAFB", borderColor: "#E5E7EB" }}
                >
                  <AlertTriangle size={13} style={{ color: "#B45309" }} />
                  <span className="text-xs" style={{ color: "#6B7280" }}>
                    Chỉ quản trị viên có thể giải quyết hoặc đóng yêu cầu.
                  </span>
                </div>
              )}

            {/* Comments */}
            <div className="px-6 py-4 flex-1">
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2"
                style={{ color: "#6B7280" }}
              >
                <MessageSquare size={12} /> Bình luận ({ticket.comments.length})
              </h3>
              {ticket.comments.length === 0 ? (
                <p className="text-sm mb-4" style={{ color: "#9CA3AF" }}>
                  Chưa có bình luận nào.
                </p>
              ) : (
                <div className="flex flex-col gap-3 mb-4">
                  {ticket.comments.map((c) => (
                    <div key={c.id} className="flex gap-3">
                      <div
                        className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                        style={{ background: "#EFF6FF", color: "#4338CA" }}
                      >
                        {c.authorName.split(" ").pop()?.[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="text-xs font-medium"
                            style={{ color: "#111827" }}
                          >
                            {c.authorName}
                          </span>
                          <span
                            className="text-xs"
                            style={{ color: "#9CA3AF" }}
                          >
                            {formatRelativeTime(c.createdAt)}
                          </span>
                        </div>
                        <p
                          className="text-sm rounded-lg px-3 py-2"
                          style={{
                            background: "#F9FAFB",
                            color: "#374151",
                            border: "1px solid #E5E7EB",
                            borderRadius: 8,
                          }}
                        >
                          {c.content}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Add comment */}
              {ticket.status !== "closed" ? (
                <div>
                  <textarea
                    value={comment}
                    onChange={(e) => {
                      setComment(e.target.value);
                      setCommentError("");
                    }}
                    rows={3}
                    placeholder="Thêm bình luận…"
                    className="w-full text-sm outline-none resize-none rounded-lg"
                    style={{
                      border: `1px solid ${
                        commentError ? "#DC2626" : "#D1D5DB"
                      }`,
                      padding: "10px 12px",
                      color: "#111827",
                      fontFamily: "inherit",
                      borderRadius: 8,
                    }}
                    onFocus={(e) => (e.target.style.borderColor = "#4F46E5")}
                    onBlur={(e) =>
                      (e.target.style.borderColor = commentError
                        ? "#DC2626"
                        : "#D1D5DB")
                    }
                  />
                  {commentError && (
                    <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                      {commentError}
                    </p>
                  )}
                  <div className="flex justify-end mt-2">
                    <Btn size="sm" onClick={() => void addComment()}>
                      <Send size={12} /> Gửi bình luận
                    </Btn>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 p-3 rounded-lg"
                  style={{ background: "#F9FAFB", border: "1px solid #E5E7EB" }}
                >
                  <Lock size={13} style={{ color: "#6B7280" }} />
                  <p className="text-sm" style={{ color: "#6B7280" }}>
                    Yêu cầu đã đóng. Không thể thêm bình luận mới.
                  </p>
                </div>
              )}
            </div>
          </Card>
        ) : (
          !showNewTicket && (
            <EmptyState
              icon={<TicketCheck size={20} />}
              title="Chọn yêu cầu để xem"
              description="Hoặc tạo yêu cầu hỗ trợ mới."
              action={
                <Btn size="sm" onClick={() => setShowNewTicket(true)}>
                  <Plus size={13} /> Tạo yêu cầu
                </Btn>
              }
            />
          )
        )}
      </div>
    </div>
  );
}

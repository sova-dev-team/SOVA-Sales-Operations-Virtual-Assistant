import { useState, Fragment } from "react";
import {
  ShieldOff,
  Search,
  ChevronDown,
  ChevronUp,
  Filter,
} from "lucide-react";
import { useSovaData } from "../data/SovaDataContext";
import { PageHeader, Card, EmptyState } from "../components/Layout";
import { formatDateTime } from "../lib/utils";
import type { User } from "../types";

const ACTION_LABELS: Record<string, string> = {
  "customer.created": "Tạo khách hàng",
  "customer.updated": "Cập nhật khách hàng",
  "customer.archived": "Lưu trữ khách hàng",
  "import.committed": "Nhập dữ liệu",
  "draft.approved": "Phê duyệt email nháp",
  "draft.rejected": "Từ chối email nháp",
  "ticket.resolved": "Giải quyết yêu cầu",
  "ticket.closed": "Đóng yêu cầu",
  "user.created": "Tạo người dùng",
  "user.deactivated": "Vô hiệu hóa người dùng",
};

const ENTITY_LABELS: Record<string, string> = {
  Customer: "Khách hàng",
  EmailDraft: "Email nháp",
  ImportJob: "Nhập dữ liệu",
  SupportTicket: "Yêu cầu hỗ trợ",
  User: "Người dùng",
};

const ACTION_COLORS: Record<string, string> = {
  "customer.created": "#16A34A",
  "customer.updated": "#1D4ED8",
  "customer.archived": "#6B7280",
  "import.committed": "#1D4ED8",
  "draft.approved": "#16A34A",
  "draft.rejected": "#DC2626",
  "ticket.resolved": "#16A34A",
  "ticket.closed": "#6B7280",
  "user.created": "#1D4ED8",
  "user.deactivated": "#DC2626",
};

interface Props {
  user: User;
}

export default function AuditLogsPage({ user }: Props) {
  const { auditLogs, isLoading, error, refresh } = useSovaData();
  const [search, setSearch] = useState("");
  const [entityFilter, setEntityFilter] = useState("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (user.role !== "admin") {
    return (
      <div className="p-6">
        <PageHeader title="Nhật ký kiểm toán" />
        <Card style={{ padding: 40, textAlign: "center" }}>
          <ShieldOff
            size={32}
            style={{ color: "#9CA3AF", margin: "0 auto 12px" }}
          />
          <h2
            className="text-base font-semibold mb-2"
            style={{ color: "#374151" }}
          >
            Không có quyền truy cập
          </h2>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            Chỉ quản trị viên mới có thể xem nhật ký kiểm toán.
          </p>
        </Card>
      </div>
    );
  }

  const filtered = auditLogs.filter((log) => {
    if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        log.actorName.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.entityType.toLowerCase().includes(q) ||
        log.entityId.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const entityTypes = Array.from(new Set(auditLogs.map((l) => l.entityType)));

  return (
    <div className="p-6 max-w-6xl">
      <PageHeader
        title="Nhật ký kiểm toán"
        description="Toàn bộ hoạt động quan trọng trong hệ thống, theo thứ tự thời gian."
      />

      {/* Filters */}
      <Card style={{ padding: "12px 16px", marginBottom: 16 }}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1" style={{ minWidth: 220 }}>
            <Search
              size={13}
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
              style={{ color: "#6B7280" }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo người dùng, hành động, đối tượng…"
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
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} style={{ color: "#6B7280" }} />
            <button
              onClick={() => setEntityFilter("all")}
              className="px-2.5 py-1.5 rounded text-xs"
              style={{
                background: entityFilter === "all" ? "#4F46E5" : "#F9FAFB",
                color: entityFilter === "all" ? "#fff" : "#374151",
                border: `1px solid ${
                  entityFilter === "all" ? "#4F46E5" : "#D1D5DB"
                }`,
                borderRadius: 5,
              }}
            >
              Tất cả
            </button>
            {entityTypes.map((et) => (
              <button
                key={et}
                onClick={() => setEntityFilter(et)}
                className="px-2.5 py-1.5 rounded text-xs"
                style={{
                  background: entityFilter === et ? "#4F46E5" : "#F9FAFB",
                  color: entityFilter === et ? "#fff" : "#374151",
                  border: `1px solid ${
                    entityFilter === et ? "#4F46E5" : "#D1D5DB"
                  }`,
                  borderRadius: 5,
                }}
              >
                {ENTITY_LABELS[et] ?? et}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card style={{ padding: 0 }}>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-gray-500">
            Đang tải nhật ký…
          </div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">
            Không thể tải nhật ký.{" "}
            <button className="underline" onClick={() => void refresh()}>
              Thử lại
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={20} />}
            title="Không tìm thấy kết quả"
            description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr
                  style={{
                    background: "#F9FAFB",
                    borderBottom: "1px solid #E5E7EB",
                  }}
                >
                  {[
                    "Thời gian",
                    "Người thực hiện",
                    "Hành động",
                    "Đối tượng",
                    "Chi tiết",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => {
                  const isExpanded = expandedId === log.id;
                  return (
                    <Fragment key={log.id}>
                      <tr
                        onClick={() =>
                          setExpandedId(isExpanded ? null : log.id)
                        }
                        className="cursor-pointer transition-colors"
                        style={{ borderBottom: "1px solid #E5E7EB" }}
                        onMouseEnter={(e) =>
                          ((
                            e.currentTarget as HTMLTableRowElement
                          ).style.background = "#F9FAFB")
                        }
                        onMouseLeave={(e) => {
                          if (!isExpanded)
                            (
                              e.currentTarget as HTMLTableRowElement
                            ).style.background = "transparent";
                        }}
                      >
                        <td
                          className="px-4 py-3 tabular-nums text-xs"
                          style={{ color: "#6B7280", whiteSpace: "nowrap" }}
                        >
                          {formatDateTime(log.timestamp)}
                        </td>
                        <td className="px-4 py-3">
                          <div
                            className="text-sm font-medium"
                            style={{ color: "#111827" }}
                          >
                            {log.actorName}
                          </div>
                          <div className="text-xs" style={{ color: "#6B7280" }}>
                            {log.actorEmail}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              background:
                                (ACTION_COLORS[log.action] ?? "#6B7280") + "18",
                              color: ACTION_COLORS[log.action] ?? "#6B7280",
                              border: `1px solid ${(ACTION_COLORS[log.action] ?? "#6B7280") + "30"}`,
                            }}
                          >
                            {ACTION_LABELS[log.action] ?? log.action}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm" style={{ color: "#111827" }}>
                            {ENTITY_LABELS[log.entityType] ?? log.entityType}
                          </div>
                          <div
                            className="text-xs font-mono"
                            style={{ color: "#9CA3AF" }}
                          >
                            {log.entityId}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="flex items-center gap-1 text-xs"
                            style={{ color: "#4338CA" }}
                          >
                            {isExpanded ? (
                              <ChevronUp size={12} />
                            ) : (
                              <ChevronDown size={12} />
                            )}
                            {isExpanded ? "Thu gọn" : "Xem chi tiết"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr
                          key={`${log.id}_detail`}
                          style={{ background: "#F9FAFB" }}
                        >
                          <td colSpan={5} className="px-6 pb-4 pt-2">
                            <div
                              className="rounded-lg p-4"
                              style={{
                                background: "#fff",
                                border: "1px solid #E5E7EB",
                              }}
                            >
                              <p
                                className="text-xs font-semibold uppercase tracking-wider mb-3"
                                style={{ color: "#6B7280" }}
                              >
                                Metadata
                              </p>
                              <div
                                className="grid gap-2"
                                style={{
                                  gridTemplateColumns:
                                    "repeat(auto-fill, minmax(220px, 1fr))",
                                }}
                              >
                                {Object.entries(log.metadata).map(
                                  ([key, value]) => (
                                    <div key={key}>
                                      <span
                                        className="text-xs font-medium"
                                        style={{ color: "#6B7280" }}
                                      >
                                        {key}:{" "}
                                      </span>
                                      <span
                                        className="text-xs"
                                        style={{ color: "#111827" }}
                                      >
                                        {String(value)}
                                      </span>
                                    </div>
                                  ),
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {filtered.length > 0 && (
          <div
            className="px-4 py-3 border-t text-xs"
            style={{ borderColor: "#E5E7EB", color: "#6B7280" }}
          >
            {filtered.length} / {auditLogs.length} sự kiện
          </div>
        )}
      </Card>
    </div>
  );
}

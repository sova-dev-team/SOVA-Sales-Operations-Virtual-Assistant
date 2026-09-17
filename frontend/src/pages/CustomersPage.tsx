import { useState, useMemo } from "react";
import {
  Search,
  Plus,
  Filter,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Phone,
  Mail,
  AlertCircle,
} from "lucide-react";
import { useSovaData } from "../data/SovaDataContext";
import {
  PageHeader,
  Card,
  StatusBadge,
  CUSTOMER_STATUS_MAP,
  Btn,
  EmptyState,
} from "../components/Layout";
import { formatDate } from "../lib/utils";
import type { User, Page, CustomerStatus } from "../types";

interface Props {
  user: User;
  navigate: (page: Page, id?: string) => void;
}

const STATUS_FILTER_OPTIONS: {
  value: CustomerStatus | "all";
  label: string;
}[] = [
  { value: "all", label: "Tất cả" },
  { value: "active", label: "Đang hoạt động" },
  { value: "archived", label: "Đã lưu trữ" },
];

const PAGE_SIZE = 6;

export default function CustomersPage({ user, navigate }: Props) {
  const { customers, isLoading, error, refresh } = useSovaData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<CustomerStatus | "all">(
    "all",
  );
  const [sortField, setSortField] = useState<"name" | "company" | "createdAt">(
    "createdAt",
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);

  const visibleCustomers = useMemo(() => {
    return user.role === "staff"
      ? customers.filter((c) => c.ownerId === user.id)
      : customers;
  }, [customers, user]);

  const filtered = useMemo(() => {
    let list = visibleCustomers;
    if (statusFilter !== "all")
      list = list.filter((c) => c.status === statusFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.company.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q),
      );
    }
    list = [...list].sort((a, b) => {
      const av = a[sortField] ?? "";
      const bv = b[sortField] ?? "";
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return list;
  }, [visibleCustomers, search, statusFilter, sortField, sortDir]);

  const pageCount = Math.ceil(filtered.length / PAGE_SIZE);
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (field: "name" | "company" | "createdAt") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const SortBtn = ({
    field,
    label,
  }: {
    field: "name" | "company" | "createdAt";
    label: string;
  }) => (
    <button
      onClick={() => toggleSort(field)}
      className="inline-flex items-center gap-1 font-semibold tracking-wider"
      style={{ color: "#6B7280", fontSize: 11 }}
    >
      {label}
      <ArrowUpDown
        size={10}
        style={{ color: sortField === field ? "#4F46E5" : "#9CA3AF" }}
      />
    </button>
  );

  const INTERACTION_TYPE_LABEL: Record<string, string> = {
    call: "Gọi điện",
    email: "Email",
    meeting: "Gặp mặt",
    quote: "Báo giá",
    note: "Ghi chú",
  };
  void INTERACTION_TYPE_LABEL;

  if (error) {
    return (
      <div className="p-6">
        <PageHeader title="Khách hàng" />
        <div className="flex flex-col items-center justify-center py-20 gap-3">
          <AlertCircle size={32} style={{ color: "#DC2626" }} />
          <p className="text-sm">Không thể tải dữ liệu khách hàng.</p>
          <Btn size="sm" onClick={() => void refresh()}>
            Thử lại
          </Btn>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl">
      <PageHeader
        title="Khách hàng"
        description={
          user.role === "staff"
            ? "Khách hàng được phân công cho bạn"
            : `Toàn bộ ${customers.length} khách hàng trong hệ thống`
        }
        actions={
          <Btn onClick={() => navigate("customer-detail", "new")} size="sm">
            <Plus size={14} /> Thêm khách hàng
          </Btn>
        }
      />

      {/* Filters */}
      <Card style={{ padding: "12px 16px", marginBottom: 16 }}>
        <div className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1" style={{ minWidth: 220 }}>
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "#6B7280" }}
            />
            <input
              type="text"
              placeholder="Tìm theo tên, công ty, email…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full text-sm outline-none"
              style={{
                border: "1px solid #D1D5DB",
                borderRadius: 6,
                padding: "7px 12px 7px 32px",
                color: "#111827",
                background: "#fff",
              }}
            />
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter size={13} style={{ color: "#6B7280" }} />
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  setStatusFilter(opt.value);
                  setPage(1);
                }}
                className="px-3 py-1.5 rounded text-xs font-medium transition-colors"
                style={{
                  background:
                    statusFilter === opt.value ? "#4F46E5" : "#F9FAFB",
                  color: statusFilter === opt.value ? "#fff" : "#374151",
                  border: "1px solid",
                  borderColor:
                    statusFilter === opt.value ? "#4F46E5" : "#D1D5DB",
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Table */}
      <Card style={{ padding: 0 }}>
        {isLoading ? (
          <div
            className="p-10 text-center text-sm"
            style={{ color: "#6B7280" }}
          >
            Đang tải khách hàng…
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Search size={20} />}
            title="Không tìm thấy khách hàng"
            description="Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr
                    style={{
                      background: "#F9FAFB",
                      borderBottom: "1px solid #E5E7EB",
                    }}
                  >
                    <th
                      className="px-4 py-3 text-left uppercase"
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                      }}
                    >
                      <SortBtn field="name" label="Khách hàng" />
                    </th>
                    <th
                      className="px-4 py-3 text-left uppercase"
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Trạng thái
                    </th>
                    <th
                      className="px-4 py-3 text-left uppercase"
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Sở thích sản phẩm
                    </th>
                    {user.role === "admin" && (
                      <th
                        className="px-4 py-3 text-left uppercase"
                        style={{
                          fontSize: 11,
                          color: "#6B7280",
                          fontWeight: 600,
                          letterSpacing: "0.05em",
                        }}
                      >
                        Phụ trách
                      </th>
                    )}
                    <th
                      className="px-4 py-3 text-left uppercase"
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                      }}
                    >
                      <SortBtn field="createdAt" label="Ngày tạo" />
                    </th>
                    <th
                      className="px-4 py-3 text-left uppercase"
                      style={{
                        fontSize: 11,
                        color: "#6B7280",
                        fontWeight: 600,
                        letterSpacing: "0.05em",
                      }}
                    >
                      Theo dõi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => navigate("customer-detail", c.id)}
                      className="cursor-pointer transition-colors"
                      style={{ borderBottom: "1px solid #E5E7EB" }}
                      onMouseEnter={(e) =>
                        ((
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = "#F9FAFB")
                      }
                      onMouseLeave={(e) =>
                        ((
                          e.currentTarget as HTMLTableRowElement
                        ).style.background = "transparent")
                      }
                    >
                      <td className="px-4 py-3">
                        <div
                          className="font-medium"
                          style={{ color: "#111827" }}
                        >
                          {c.name}
                        </div>
                        <div
                          className="text-xs mt-0.5"
                          style={{ color: "#6B7280" }}
                        >
                          {c.company}
                        </div>
                        <div className="flex items-center gap-3 mt-1">
                          {c.email && (
                            <span
                              className="flex items-center gap-1 text-xs"
                              style={{ color: "#9CA3AF" }}
                            >
                              <Mail size={10} /> {c.email}
                            </span>
                          )}
                          {c.phone && (
                            <span
                              className="flex items-center gap-1 text-xs"
                              style={{ color: "#9CA3AF" }}
                            >
                              <Phone size={10} /> {c.phone}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          status={c.status}
                          map={CUSTOMER_STATUS_MAP}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {c.productInterests.slice(0, 2).map((p) => (
                            <span
                              key={p}
                              className="px-2 py-0.5 rounded text-xs"
                              style={{
                                background: "#F9FAFB",
                                color: "#374151",
                                border: "1px solid #E5E7EB",
                              }}
                            >
                              {p}
                            </span>
                          ))}
                          {c.productInterests.length > 2 && (
                            <span
                              className="text-xs"
                              style={{ color: "#6B7280" }}
                            >
                              +{c.productInterests.length - 2}
                            </span>
                          )}
                          {c.productInterests.length === 0 && (
                            <span
                              className="text-xs"
                              style={{ color: "#9CA3AF" }}
                            >
                              —
                            </span>
                          )}
                        </div>
                      </td>
                      {user.role === "admin" && (
                        <td
                          className="px-4 py-3 text-sm"
                          style={{ color: "#374151" }}
                        >
                          {c.ownerName}
                        </td>
                      )}
                      <td
                        className="px-4 py-3 text-sm tabular-nums"
                        style={{ color: "#6B7280" }}
                      >
                        {formatDate(c.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        {c.followUpDue ? (
                          <span
                            className="flex items-center gap-1 text-xs font-medium"
                            style={{ color: "#B45309" }}
                          >
                            <AlertCircle size={11} /> Cần theo dõi
                          </span>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: "#9CA3AF" }}
                          >
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pageCount > 1 && (
              <div
                className="flex items-center justify-between px-4 py-3 border-t"
                style={{ borderColor: "#E5E7EB" }}
              >
                <span className="text-xs" style={{ color: "#6B7280" }}>
                  {(page - 1) * PAGE_SIZE + 1}–
                  {Math.min(page * PAGE_SIZE, filtered.length)} /{" "}
                  {filtered.length} kết quả
                </span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => p - 1)}
                    disabled={page === 1}
                    className="p-1.5 rounded transition-colors disabled:opacity-40"
                    style={{ border: "1px solid #D1D5DB", borderRadius: 5 }}
                    onMouseEnter={(e) =>
                      !e.currentTarget.disabled &&
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "#F9FAFB")
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        "transparent")
                    }
                  >
                    <ChevronLeft size={14} style={{ color: "#6B7280" }} />
                  </button>
                  {Array.from({ length: pageCount }).map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className="w-7 h-7 text-xs rounded flex items-center justify-center transition-colors"
                      style={{
                        background: page === i + 1 ? "#4F46E5" : "transparent",
                        color: page === i + 1 ? "#fff" : "#374151",
                        border:
                          page === i + 1
                            ? "1px solid #4F46E5"
                            : "1px solid #D1D5DB",
                        borderRadius: 5,
                      }}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => p + 1)}
                    disabled={page === pageCount}
                    className="p-1.5 rounded transition-colors disabled:opacity-40"
                    style={{ border: "1px solid #D1D5DB", borderRadius: 5 }}
                  >
                    <ChevronRight size={14} style={{ color: "#6B7280" }} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

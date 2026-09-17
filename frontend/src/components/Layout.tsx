import { useState } from "react";
import {
  LayoutDashboard,
  Users,
  Upload,
  Mail,
  TicketCheck,
  ClipboardList,
  BarChart2,
  UserCog,
  LogOut,
  Bell,
  ChevronRight,
  Menu,
  ChevronLeft,
} from "lucide-react";
import type { User, Page } from "../types";
import { initials } from "../lib/utils";

interface NavItem {
  label: string;
  page: Page;
  icon: React.ReactNode;
  adminOnly?: boolean;
}

const NAV_GROUPS: { group: string; items: NavItem[] }[] = [
  {
    group: "CHÍNH",
    items: [
      {
        label: "Tổng quan",
        page: "dashboard",
        icon: <LayoutDashboard size={16} />,
      },
      { label: "Khách hàng", page: "customers", icon: <Users size={16} /> },
      { label: "Nhập dữ liệu", page: "import", icon: <Upload size={16} /> },
    ],
  },
  {
    group: "VẬN HÀNH",
    items: [
      {
        label: "Email nháp AI",
        page: "email-drafts",
        icon: <Mail size={16} />,
      },
      {
        label: "Yêu cầu hỗ trợ",
        page: "support-tickets",
        icon: <TicketCheck size={16} />,
      },
    ],
  },
  {
    group: "PHÂN TÍCH",
    items: [
      {
        label: "Nhật ký kiểm toán",
        page: "audit-logs",
        icon: <ClipboardList size={16} />,
        adminOnly: true,
      },
      { label: "Power BI", page: "powerbi", icon: <BarChart2 size={16} /> },
    ],
  },
  {
    group: "QUẢN TRỊ",
    items: [
      {
        label: "Quản lý người dùng",
        page: "user-management",
        icon: <UserCog size={16} />,
        adminOnly: true,
      },
    ],
  },
];

const PAGE_LABELS: Partial<Record<Page, string>> = {
  dashboard: "Tổng quan",
  customers: "Khách hàng",
  "customer-detail": "Chi tiết khách hàng",
  import: "Nhập dữ liệu",
  "email-drafts": "Email nháp AI",
  "email-draft-detail": "Chi tiết email nháp",
  "support-tickets": "Yêu cầu hỗ trợ",
  "ticket-detail": "Chi tiết yêu cầu",
  "audit-logs": "Nhật ký kiểm toán",
  powerbi: "Power BI Analytics",
  "user-management": "Quản lý người dùng",
};

interface LayoutProps {
  user: User;
  currentPage: Page;
  navigate: (page: Page, id?: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function Layout({
  user,
  currentPage,
  navigate,
  onLogout,
  children,
}: LayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const parentPage = (page: Page): Page => {
    if (page === "customer-detail") return "customers";
    if (page === "email-draft-detail") return "email-drafts";
    if (page === "ticket-detail") return "support-tickets";
    return page;
  };

  const activePage = parentPage(currentPage);

  const breadcrumbs = () => {
    const parent = parentPage(currentPage);
    if (parent !== currentPage) {
      return [
        { label: PAGE_LABELS[parent] ?? parent, page: parent as Page },
        { label: PAGE_LABELS[currentPage] ?? currentPage, page: currentPage },
      ];
    }
    return [
      { label: PAGE_LABELS[currentPage] ?? currentPage, page: currentPage },
    ];
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className="flex items-center gap-3 px-4 py-5 border-b shrink-0"
        style={{ borderColor: "#E5E7EB" }}
      >
        <div
          className="shrink-0 flex items-center justify-center rounded font-bold text-sm"
          style={{
            width: 32,
            height: 32,
            background: "#C0392B",
            color: "#fff",
            letterSpacing: "-0.5px",
          }}
        >
          SO
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <div
              className="font-semibold text-sm leading-tight truncate"
              style={{ color: "#111827" }}
            >
              SOVA
            </div>
            <div
              className="text-xs leading-tight truncate"
              style={{ color: "#9CA3AF" }}
            >
              Sales & Operations AI
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.adminOnly || user.role === "admin",
          );
          if (!visibleItems.length) return null;
          return (
            <div key={group.group} className="mb-4">
              {!collapsed && (
                <div
                  className="px-2 mb-1 text-xs font-semibold tracking-wider"
                  style={{ color: "#9CA3AF" }}
                >
                  {group.group}
                </div>
              )}
              {visibleItems.map((item) => {
                const isActive = activePage === item.page;
                return (
                  <button
                    key={item.page}
                    onClick={() => {
                      navigate(item.page);
                      setMobileOpen(false);
                    }}
                    title={collapsed ? item.label : undefined}
                    className="w-full flex items-center gap-2.5 rounded px-2 py-2 text-sm transition-colors mb-0.5 relative"
                    style={{
                      background: isActive ? "#EEF2FF" : "transparent",
                      color: isActive ? "#3730A3" : "#6B7280",
                      borderLeft: isActive
                        ? "3px solid #4F46E5"
                        : "3px solid transparent",
                      fontWeight: isActive ? 500 : 400,
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "#F5F3FF";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "transparent";
                    }}
                  >
                    <span className="shrink-0">{item.icon}</span>
                    {!collapsed && (
                      <span className="truncate">{item.label}</span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* User area */}
      <div
        className="shrink-0 border-t p-3"
        style={{ borderColor: "#E5E7EB", background: "#F9FAFB" }}
      >
        {!collapsed ? (
          <div className="flex items-center gap-2.5">
            <div
              className="shrink-0 rounded-full flex items-center justify-center text-xs font-semibold"
              style={{
                width: 32,
                height: 32,
                background: "#EEF2FF",
                color: "#4F46E5",
              }}
            >
              {initials(user.name)}
            </div>
            <div className="min-w-0 flex-1">
              <div
                className="text-sm font-medium truncate"
                style={{ color: "#111827" }}
              >
                {user.name}
              </div>
              <div className="text-xs truncate" style={{ color: "#9CA3AF" }}>
                {user.role === "admin" ? "Quản trị viên" : "Nhân viên"}
              </div>
            </div>
            <button
              onClick={onLogout}
              title="Đăng xuất"
              className="shrink-0 p-1.5 rounded transition-colors"
              style={{ color: "#9CA3AF" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#6B7280")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.color = "#9CA3AF")
              }
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button
            onClick={onLogout}
            title="Đăng xuất"
            className="w-full flex justify-center p-2 rounded transition-colors"
            style={{ color: "#9CA3AF" }}
          >
            <LogOut size={15} />
          </button>
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="hidden md:flex items-center justify-center h-8 w-full border-t transition-colors"
        style={{
          borderColor: "#E5E7EB",
          color: "#9CA3AF",
          background: "transparent",
        }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background = "#F9FAFB")
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLButtonElement).style.background =
            "transparent")
        }
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </div>
  );

  const crumbs = breadcrumbs();

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "#F5F7FA" }}
    >
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 md:hidden"
          style={{ background: "rgba(0,0,0,0.25)" }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar – mobile */}
      <aside
        className="fixed inset-y-0 left-0 z-40 md:hidden flex flex-col transition-transform duration-200"
        style={{
          width: 240,
          background: "#FFFFFF",
          borderRight: "1px solid #E5E7EB",
          transform: mobileOpen ? "translateX(0)" : "translateX(-100%)",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Sidebar – desktop */}
      <aside
        className="hidden md:flex flex-col shrink-0 transition-all duration-200"
        style={{
          width: collapsed ? 64 : 240,
          background: "#FFFFFF",
          borderRight: "1px solid #E5E7EB",
        }}
      >
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Topbar */}
        <header
          className="shrink-0 flex items-center justify-between px-5 border-b"
          style={{
            height: 56,
            background: "#fff",
            borderColor: "#E5E7EB",
          }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <button
              className="md:hidden p-1.5 rounded"
              onClick={() => setMobileOpen(true)}
              style={{ color: "#6B7280" }}
            >
              <Menu size={18} />
            </button>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1 text-sm">
              {crumbs.map((crumb, i) => (
                <span key={crumb.page} className="flex items-center gap-1">
                  {i > 0 && (
                    <ChevronRight size={12} style={{ color: "#D1D5DB" }} />
                  )}
                  {i < crumbs.length - 1 ? (
                    <button
                      onClick={() => navigate(crumb.page)}
                      className="transition-colors"
                      style={{ color: "#4F46E5" }}
                      onMouseEnter={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.color =
                          "#3730A3")
                      }
                      onMouseLeave={(e) =>
                        ((e.currentTarget as HTMLButtonElement).style.color =
                          "#4F46E5")
                      }
                    >
                      {crumb.label}
                    </button>
                  ) : (
                    <span className="font-medium" style={{ color: "#111827" }}>
                      {crumb.label}
                    </span>
                  )}
                </span>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Role badge */}
            <span
              className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
              style={{
                background: user.role === "admin" ? "#FEF2F2" : "#EEF2FF",
                color: user.role === "admin" ? "#C0392B" : "#4F46E5",
              }}
            >
              {user.role === "admin" ? "Quản trị viên" : "Nhân viên"}
            </span>

            {/* Notification bell */}
            <button
              className="relative p-2 rounded-full transition-colors"
              style={{ color: "#6B7280" }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "#F9FAFB")
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLButtonElement).style.background =
                  "transparent")
              }
            >
              <Bell size={17} />
              <span
                className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                style={{ background: "#C0392B" }}
              />
            </button>

            {/* Avatar */}
            <div
              className="rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer"
              style={{
                width: 34,
                height: 34,
                background: "#4F46E5",
                color: "#fff",
              }}
            >
              {initials(user.name)}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

/* Shared UI primitives used across pages */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h1 className="text-xl font-semibold" style={{ color: "#111827" }}>
          {title}
        </h1>
        {description && (
          <p className="text-sm mt-0.5" style={{ color: "#6B7280" }}>
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="shrink-0 flex items-center gap-2">{actions}</div>
      )}
    </div>
  );
}

export function StatusBadge({
  status,
  map,
}: {
  status: string;
  map: Record<string, { label: string; color: string; bg: string }>;
}) {
  const cfg = map[status] ?? { label: status, color: "#6B7280", bg: "#F3F4F6" };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ background: cfg.color }}
      />
      {cfg.label}
    </span>
  );
}

export const CUSTOMER_STATUS_MAP: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
  }
> = {
  active: { label: "Đang hoạt động", color: "#16A34A", bg: "#F0FDF4" },
  prospect: { label: "Tiềm năng", color: "#2563EB", bg: "#EFF6FF" },
  inactive: { label: "Không hoạt động", color: "#D97706", bg: "#FFFBEB" },
  archived: { label: "Đã lưu trữ", color: "#6B7280", bg: "#F3F4F6" },
};

export const TICKET_STATUS_MAP: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
  }
> = {
  open: { label: "Mở", color: "#D97706", bg: "#FFFBEB" },
  in_progress: { label: "Đang xử lý", color: "#2563EB", bg: "#EFF6FF" },
  waiting: { label: "Đang chờ", color: "#7C3AED", bg: "#F5F3FF" },
  resolved: { label: "Đã giải quyết", color: "#16A34A", bg: "#F0FDF4" },
  closed: { label: "Đã đóng", color: "#6B7280", bg: "#F3F4F6" },
};

export const TICKET_PRIORITY_MAP: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
  }
> = {
  low: { label: "Thấp", color: "#16A34A", bg: "#F0FDF4" },
  medium: { label: "Trung bình", color: "#D97706", bg: "#FFFBEB" },
  high: { label: "Cao", color: "#EA580C", bg: "#FFF7ED" },
  urgent: { label: "Khẩn cấp", color: "#DC2626", bg: "#FEF2F2" },
};

export const DRAFT_STATUS_MAP: Record<
  string,
  {
    label: string;
    color: string;
    bg: string;
  }
> = {
  draft: { label: "Nháp", color: "#D97706", bg: "#FFFBEB" },
  reviewed: { label: "Đã duyệt nội dung", color: "#2563EB", bg: "#EFF6FF" },
  approved: { label: "Đã phê duyệt", color: "#16A34A", bg: "#F0FDF4" },
  rejected: { label: "Đã từ chối", color: "#DC2626", bg: "#FEF2F2" },
};

export function Card({
  children,
  className,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={className}
      style={{
        background: "#fff",
        border: "1px solid #E5E7EB",
        borderRadius: 8,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Btn({
  children,
  variant = "primary",
  size = "md",
  onClick,
  disabled,
  type = "button",
  className,
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md";
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const styles: Record<string, React.CSSProperties> = {
    primary: {
      background: "#4F46E5",
      color: "#fff",
      border: "1px solid #4F46E5",
    },
    secondary: {
      background: "#fff",
      color: "#374151",
      border: "1px solid #D1D5DB",
    },
    danger: {
      background: "#DC2626",
      color: "#fff",
      border: "1px solid #DC2626",
    },
    ghost: {
      background: "transparent",
      color: "#4F46E5",
      border: "1px solid transparent",
    },
  };
  const pad = size === "sm" ? "4px 10px" : "8px 16px";
  const fontSize = size === "sm" ? 12 : 14;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1.5 font-medium rounded transition-opacity ${className ?? ""}`}
      style={{
        ...styles[variant],
        padding: pad,
        fontSize,
        borderRadius: 6,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

export function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  error,
  required,
  disabled,
  hint,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
}) {
  return (
    <div>
      {label && (
        <label
          className="block text-sm font-medium mb-1"
          style={{ color: "#374151" }}
        >
          {label}
          {required && <span style={{ color: "#C0392B" }}> *</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="block w-full rounded text-sm outline-none transition-colors"
        style={{
          border: `1px solid ${error ? "#DC2626" : "#D1D5DB"}`,
          padding: "8px 12px",
          background: disabled ? "#F9FAFB" : "#fff",
          color: "#111827",
          borderRadius: 6,
        }}
        onFocus={(e) => {
          if (!error) e.target.style.borderColor = "#4F46E5";
        }}
        onBlur={(e) => {
          if (!error) e.target.style.borderColor = "#D1D5DB";
        }}
      />
      {error && (
        <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
      <div
        className="flex items-center justify-center w-12 h-12 rounded-full mb-4"
        style={{ background: "#F3F4F6", color: "#6B7280" }}
      >
        {icon}
      </div>
      <h3 className="text-sm font-semibold mb-1" style={{ color: "#374151" }}>
        {title}
      </h3>
      {description && (
        <p className="text-sm max-w-xs" style={{ color: "#6B7280" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function TableSkeleton({
  rows = 5,
  cols = 5,
}: {
  rows?: number;
  cols?: number;
}) {
  return (
    <>
      {Array.from({ length: rows }).map((_, r) => (
        <tr key={r}>
          {Array.from({ length: cols }).map((_, c) => (
            <td
              key={c}
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid #E5E7EB",
              }}
            >
              <div
                className="skeleton-animate rounded"
                style={{
                  height: 14,
                  width: c === 0 ? "80%" : c === cols - 1 ? "40%" : "60%",
                  background: "#E5E7EB",
                }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

import type { ReactNode } from "react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleAlert,
  Clock3,
  FileUp,
  Headphones,
  MessageSquareText,
  Plus,
  RefreshCw,
  Sparkles,
  TrendingUp,
  UserPlus,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  Card,
  StatusBadge,
  TICKET_PRIORITY_MAP,
  TICKET_STATUS_MAP,
} from "../../components/Layout";
import { useSovaData } from "../../data/SovaDataContext";
import { formatDate, initials } from "../../lib/utils";
import type { Customer, Page, User } from "../../types";

const CHART_TOOLTIP_STYLE = {
  background: "#111827",
  border: "none",
  borderRadius: 10,
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.18)",
  fontSize: 12,
  color: "#fff",
};

interface Props {
  user: User;
  navigate: (page: Page, id?: string) => void;
}

interface KpiCardProps {
  label: string;
  value: string | number;
  description: string;
  icon: ReactNode;
  tone: "indigo" | "blue" | "emerald" | "amber";
  isLoading: boolean;
}

const KPI_TONES = {
  indigo: {
    icon: "bg-indigo-50 text-indigo-600",
    line: "bg-indigo-500",
  },
  blue: { icon: "bg-blue-50 text-blue-600", line: "bg-blue-500" },
  emerald: {
    icon: "bg-emerald-50 text-emerald-600",
    line: "bg-emerald-500",
  },
  amber: { icon: "bg-amber-50 text-amber-700", line: "bg-amber-500" },
} as const;

function KpiCard({
  label,
  value,
  description,
  icon,
  tone,
  isLoading,
}: KpiCardProps) {
  const colors = KPI_TONES[tone];
  return (
    <Card className="relative overflow-hidden p-5 shadow-sm transition-transform duration-200 hover:-translate-y-0.5">
      <span className={`absolute inset-x-0 top-0 h-1 ${colors.line}`} />
      {isLoading ? (
        <div className="space-y-3 pt-1">
          <div className="skeleton-animate h-4 w-24 rounded bg-gray-200" />
          <div className="skeleton-animate h-9 w-20 rounded bg-gray-200" />
          <div className="skeleton-animate h-3 w-32 rounded bg-gray-200" />
        </div>
      ) : (
        <>
          <div className="mb-4 flex items-center justify-between gap-3">
            <span className="text-sm font-medium text-gray-500">{label}</span>
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.icon}`}
            >
              {icon}
            </span>
          </div>
          <p className="tabular-nums text-3xl font-semibold tracking-tight text-gray-900">
            {value}
          </p>
          <p className="mt-1.5 text-xs text-gray-500">{description}</p>
        </>
      )}
    </Card>
  );
}

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-gray-100 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

function TextLink({
  children,
  onClick,
}: {
  children: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex shrink-0 items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800"
    >
      {children} <ChevronRight size={13} aria-hidden="true" />
    </button>
  );
}

function EmptyPanel({
  icon,
  children,
}: {
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-48 flex-col items-center justify-center gap-2 px-6 text-center text-sm text-gray-500">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        {icon}
      </span>
      {children}
    </div>
  );
}

function followUpLabel(customer: Customer): string {
  if (!customer.followUpDate) return "Cần liên hệ lại";
  const due = new Date(customer.followUpDate);
  const today = new Date();
  due.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000);
  if (days < 0) return `Quá hạn ${Math.abs(days)} ngày`;
  if (days === 0) return "Đến hạn hôm nay";
  return `Còn ${days} ngày`;
}

export default function DashboardOverview({ user, navigate }: Props) {
  const {
    customers,
    tickets,
    overview,
    trend,
    productInterests,
    isLoading,
    error,
    refresh,
  } = useSovaData();

  const today = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());
  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? "Chào buổi sáng"
      : hour < 18
        ? "Chào buổi chiều"
        : "Chào buổi tối";
  const firstName = user.name.trim().split(/\s+/).at(-1) ?? user.name;
  const scopeLabel =
    user.role === "admin" ? "Toàn bộ hệ thống" : "Danh mục được phân công";

  const followUps = customers
    .filter((customer) => customer.followUpDue)
    .sort((left, right) =>
      (left.followUpDate ?? "9999").localeCompare(right.followUpDate ?? "9999"),
    )
    .slice(0, 4);
  const openTickets = tickets
    .filter((ticket) => !["resolved", "closed"].includes(ticket.status))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4);
  const followUpRate = overview?.followUpRate;
  const followUpPercent =
    followUpRate == null ? null : Math.round(followUpRate * 100);
  const activePercent = overview?.totalCustomers
    ? Math.round((overview.activeCustomers / overview.totalCustomers) * 100)
    : 0;

  const kpis: Omit<KpiCardProps, "isLoading">[] = [
    {
      label: "Tổng khách hàng",
      value: overview?.totalCustomers ?? 0,
      description: scopeLabel,
      icon: <Users size={19} aria-hidden="true" />,
      tone: "indigo",
    },
    {
      label: "Khách hàng mới",
      value: overview?.newCustomers ?? 0,
      description: "Phát sinh trong kỳ hiện tại",
      icon: <UserPlus size={19} aria-hidden="true" />,
      tone: "blue",
    },
    {
      label: "Tương tác trong kỳ",
      value: overview?.interactions ?? 0,
      description: `${activePercent}% khách hàng có hoạt động gần đây`,
      icon: <Activity size={19} aria-hidden="true" />,
      tone: "emerald",
    },
    {
      label: "Cần theo dõi",
      value: overview?.followUpsDue ?? 0,
      description:
        (overview?.followUpsDue ?? 0) > 0
          ? "Ưu tiên xử lý để không bỏ lỡ cơ hội"
          : "Không có công việc quá hạn",
      icon: <CircleAlert size={19} aria-hidden="true" />,
      tone: "amber",
    },
  ];

  if (error) {
    return (
      <div className="flex min-h-full items-center justify-center p-6">
        <Card className="w-full max-w-lg p-10 text-center shadow-sm">
          <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
            <AlertCircle size={24} aria-hidden="true" />
          </span>
          <h1 className="text-lg font-semibold text-gray-900">
            Chưa thể tải tổng quan
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Kết nối dữ liệu đang gián đoạn. Vui lòng thử tải lại.
          </p>
          <button
            onClick={() => void refresh()}
            className="mx-auto mt-5 flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
          >
            <RefreshCw size={15} aria-hidden="true" /> Tải lại dữ liệu
          </button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-screen-2xl p-4 sm:p-6 lg:p-8">
      <header className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-indigo-600">
            <Sparkles size={13} aria-hidden="true" /> Trung tâm điều hành
          </p>
          <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
            {greeting}, {firstName}
          </h1>
          <p className="mt-1 flex items-center gap-1.5 text-sm capitalize text-gray-500">
            <CalendarDays size={14} aria-hidden="true" /> {today}
          </p>
        </div>
        <button
          onClick={() => void refresh()}
          disabled={isLoading}
          className="flex w-fit items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw
            size={14}
            className={isLoading ? "spin-anim" : undefined}
            aria-hidden="true"
          />
          Làm mới
        </button>
      </header>

      <section className="relative mb-6 overflow-hidden rounded-2xl bg-indigo-950 px-6 py-6 text-white shadow-lg sm:px-8 sm:py-7">
        <div className="absolute -right-16 -top-24 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute -bottom-24 left-1/3 h-52 w-52 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="relative grid gap-7 lg:grid-cols-3 lg:items-center">
          <div className="lg:col-span-2">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-medium text-indigo-100">
              {scopeLabel}
            </span>
            <h2 className="mt-4 max-w-2xl text-xl font-semibold leading-snug sm:text-2xl">
              Tập trung vào khách hàng cần hành động ngay hôm nay.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-indigo-200">
              Theo dõi cơ hội, cập nhật tương tác và xử lý yêu cầu hỗ trợ từ một
              không gian thống nhất.
            </p>
            <div className="mt-5 flex flex-wrap gap-2.5">
              <button
                onClick={() => navigate("customer-detail", "new")}
                className="flex items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-indigo-950 shadow-sm transition-colors hover:bg-indigo-50"
              >
                <Plus size={15} aria-hidden="true" /> Thêm khách hàng
              </button>
              <button
                onClick={() => navigate("import")}
                className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
              >
                <FileUp size={15} aria-hidden="true" /> Nhập dữ liệu
              </button>
            </div>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-indigo-200">
                  Tỷ lệ theo dõi đúng hạn
                </p>
                <p className="mt-2 text-4xl font-semibold tabular-nums">
                  {followUpPercent == null ? "—" : `${followUpPercent}%`}
                </p>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300">
                <TrendingUp size={20} aria-hidden="true" />
              </span>
            </div>
            <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/15">
              <div
                className="h-full rounded-full bg-emerald-400 transition-all"
                style={{ width: `${followUpPercent ?? 0}%` }}
              />
            </div>
            <p className="mt-3 text-xs leading-5 text-indigo-200">
              {overview?.activeCustomers ?? 0}/{overview?.totalCustomers ?? 0}{" "}
              khách hàng có tương tác trong 90 ngày gần nhất.
            </p>
          </div>
        </div>
      </section>

      <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((kpi) => (
          <KpiCard key={kpi.label} {...kpi} isLoading={isLoading} />
        ))}
      </section>

      <section className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card className="overflow-hidden shadow-sm xl:col-span-2">
          <SectionHeading
            title="Nhịp tương tác"
            description="Xu hướng hoạt động với khách hàng theo thời gian"
            action={
              <span className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
                <span className="h-2 w-2 rounded-full bg-indigo-500" /> Tương
                tác
              </span>
            }
          />
          {isLoading ? (
            <div className="m-5 h-72 skeleton-animate rounded-xl bg-gray-100" />
          ) : trend.length === 0 ? (
            <EmptyPanel icon={<Activity size={18} aria-hidden="true" />}>
              Chưa có dữ liệu tương tác trong kỳ.
            </EmptyPanel>
          ) : (
            <figure
              className="px-3 pb-4 pt-5"
              role="img"
              aria-label="Biểu đồ xu hướng số lượt tương tác theo ngày"
            >
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart
                  data={trend}
                  margin={{ top: 8, right: 18, bottom: 0, left: -18 }}
                >
                  <defs>
                    <linearGradient
                      id="interactionGradient"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop offset="0%" stopColor="#6366F1" stopOpacity={0.3} />
                      <stop
                        offset="95%"
                        stopColor="#6366F1"
                        stopOpacity={0.02}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    stroke="#EEF2F7"
                    strokeDasharray="4 4"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={18}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 11, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value) => [value, "Tương tác"]}
                    labelFormatter={(label) => `Ngày ${label}`}
                    cursor={{ stroke: "#C7D2FE", strokeWidth: 1 }}
                  />
                  <Area
                    type="monotone"
                    dataKey="interactions"
                    stroke="#4F46E5"
                    strokeWidth={2.5}
                    fill="url(#interactionGradient)"
                    dot={false}
                    activeDot={{
                      r: 4,
                      fill: "#4F46E5",
                      stroke: "#fff",
                      strokeWidth: 2,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </figure>
          )}
        </Card>

        <Card className="overflow-hidden shadow-sm">
          <SectionHeading
            title="Quan tâm sản phẩm"
            description="Số khách hàng theo danh mục"
          />
          {isLoading ? (
            <div className="m-5 h-72 skeleton-animate rounded-xl bg-gray-100" />
          ) : productInterests.length === 0 ? (
            <EmptyPanel icon={<Building2 size={18} aria-hidden="true" />}>
              Chưa có dữ liệu sở thích sản phẩm.
            </EmptyPanel>
          ) : (
            <figure
              className="px-3 pb-4 pt-5"
              role="img"
              aria-label="Biểu đồ số khách hàng quan tâm theo sản phẩm"
            >
              <ResponsiveContainer width="100%" height={280}>
                <BarChart
                  data={productInterests.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 4, right: 22, bottom: 0, left: 12 }}
                >
                  <CartesianGrid
                    stroke="#EEF2F7"
                    strokeDasharray="4 4"
                    horizontal={false}
                  />
                  <XAxis
                    type="number"
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="product"
                    width={105}
                    tick={{ fontSize: 10, fill: "#475569" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={CHART_TOOLTIP_STYLE}
                    formatter={(value) => [value, "Khách hàng"]}
                    cursor={{ fill: "#F8FAFC" }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#6366F1"
                    radius={[0, 6, 6, 0]}
                    barSize={13}
                  />
                </BarChart>
              </ResponsiveContainer>
            </figure>
          )}
        </Card>
      </section>

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="overflow-hidden shadow-sm">
          <SectionHeading
            title="Ưu tiên theo dõi"
            description="Khách hàng cần được liên hệ sớm"
            action={
              <TextLink onClick={() => navigate("customers")}>
                Xem tất cả
              </TextLink>
            }
          />
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="skeleton-animate h-14 rounded-lg bg-gray-100"
                />
              ))}
            </div>
          ) : followUps.length === 0 ? (
            <EmptyPanel icon={<Clock3 size={18} aria-hidden="true" />}>
              Tuyệt vời — không có khách hàng nào đang quá hạn theo dõi.
            </EmptyPanel>
          ) : (
            <div className="divide-y divide-gray-100">
              {followUps.map((customer) => (
                <button
                  key={customer.id}
                  onClick={() => navigate("customer-detail", customer.id)}
                  className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-amber-50/50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-semibold text-indigo-700">
                    {initials(customer.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {customer.name}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {customer.company}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-xs font-semibold text-amber-700">
                      {followUpLabel(customer)}
                    </span>
                    {customer.followUpDate && (
                      <span className="block text-xs text-gray-400">
                        {formatDate(customer.followUpDate)}
                      </span>
                    )}
                  </span>
                  <ArrowRight
                    size={14}
                    className="text-gray-300 transition-transform group-hover:translate-x-0.5 group-hover:text-indigo-600"
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="overflow-hidden shadow-sm">
          <SectionHeading
            title="Yêu cầu hỗ trợ đang mở"
            description="Các vấn đề cần phối hợp xử lý"
            action={
              <TextLink onClick={() => navigate("support-tickets")}>
                Xem tất cả
              </TextLink>
            }
          />
          {isLoading ? (
            <div className="space-y-3 p-5">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="skeleton-animate h-14 rounded-lg bg-gray-100"
                />
              ))}
            </div>
          ) : openTickets.length === 0 ? (
            <EmptyPanel icon={<Headphones size={18} aria-hidden="true" />}>
              Không có yêu cầu hỗ trợ nào đang mở.
            </EmptyPanel>
          ) : (
            <div className="divide-y divide-gray-100">
              {openTickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => navigate("support-tickets", ticket.id)}
                  className="group flex w-full items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-gray-50"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                    <MessageSquareText size={16} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">
                      {ticket.title}
                    </span>
                    <span className="block truncate text-xs text-gray-500">
                      {ticket.createdByName} · {formatDate(ticket.updatedAt)}
                    </span>
                  </span>
                  <span className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
                    <StatusBadge
                      status={ticket.priority}
                      map={TICKET_PRIORITY_MAP}
                    />
                    <StatusBadge
                      status={ticket.status}
                      map={TICKET_STATUS_MAP}
                    />
                  </span>
                </button>
              ))}
            </div>
          )}
        </Card>
      </section>
    </div>
  );
}

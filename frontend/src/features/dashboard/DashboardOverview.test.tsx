import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  useSovaData,
  type SovaDataContextValue,
} from "../../data/SovaDataContext";
import type { User } from "../../types";
import DashboardOverview from "./DashboardOverview";

vi.mock("../../data/SovaDataContext", () => ({
  useSovaData: vi.fn(),
}));

vi.mock("recharts", () => ({
  ResponsiveContainer: ({ children }: { children: ReactNode }) => (
    <div>{children}</div>
  ),
  AreaChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Area: () => null,
  BarChart: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  Bar: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  XAxis: () => null,
  YAxis: () => null,
}));

const user: User = {
  id: "user-1",
  name: "Demo Staff",
  email: "staff.demo@example.test",
  role: "staff",
  active: true,
  createdAt: "2026-09-01T00:00:00Z",
  updatedAt: "2026-09-01T00:00:00Z",
};

function dashboardData(
  overrides: Partial<SovaDataContextValue> = {},
): SovaDataContextValue {
  return {
    customers: [],
    drafts: [],
    tickets: [],
    users: [],
    auditLogs: [],
    overview: {
      totalCustomers: 12,
      newCustomers: 3,
      activeCustomers: 9,
      interactions: 24,
      followUpsDue: 2,
      followUpRate: 0.8,
    },
    trend: [{ month: "14-09", interactions: 5, newCustomers: 0 }],
    productInterests: [{ product: "Analytics", count: 4 }],
    isLoading: false,
    error: null,
    refresh: vi.fn(async () => undefined),
    generateDraft: vi.fn(),
    setDraftStatus: vi.fn(async () => undefined),
    createTicket: vi.fn(async () => undefined),
    setTicketStatus: vi.fn(async () => undefined),
    addComment: vi.fn(async () => undefined),
    createUser: vi.fn(async () => undefined),
    updateUser: vi.fn(async () => undefined),
    ...overrides,
  };
}

describe("DashboardOverview", () => {
  beforeEach(() => {
    vi.mocked(useSovaData).mockReturnValue(dashboardData());
  });

  it("renders live KPIs and opens the customer creation flow", () => {
    const navigate = vi.fn();
    render(<DashboardOverview user={user} navigate={navigate} />);

    expect(screen.getByText("Tổng khách hàng")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Thêm khách hàng" }));
    expect(navigate).toHaveBeenCalledWith("customer-detail", "new");
  });

  it("shows the failure state and retries data loading", () => {
    const refresh = vi.fn(async () => undefined);
    vi.mocked(useSovaData).mockReturnValue(
      dashboardData({ error: new Error("network unavailable"), refresh }),
    );

    render(<DashboardOverview user={user} navigate={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Tải lại dữ liệu" }));

    expect(screen.getByText("Chưa thể tải tổng quan")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });
});

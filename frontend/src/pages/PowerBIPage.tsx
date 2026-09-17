import { useQuery } from "@tanstack/react-query";
import { PowerBIEmbed } from "powerbi-client-react";
import { models } from "powerbi-client";
import {
  BarChart2,
  RefreshCw,
  AlertTriangle,
  ShieldOff,
  WifiOff,
  ExternalLink,
  Clock,
} from "lucide-react";
import { PageHeader, Card, Btn } from "../components/Layout";
import { ApiError } from "../api/client";
import { sovaApi } from "../api/sovaApi";
import type { User } from "../types";

type EmbedState =
  "loading" | "ready" | "expired" | "auth_error" | "unavailable";

export default function PowerBIPage({ user }: { user: User }) {
  const reportsQuery = useQuery({
    queryKey: ["power-bi", "reports"],
    queryFn: sovaApi.powerBIReports,
  });
  const statusQuery = useQuery({
    queryKey: ["power-bi", "status"],
    queryFn: sovaApi.powerBIRefreshStatus,
  });
  const report = reportsQuery.data?.find((item) => item.isAvailable);
  const embedQuery = useQuery({
    queryKey: ["power-bi", "embed", report?.id],
    queryFn: sovaApi.powerBIEmbedConfig,
    enabled: Boolean(report),
    staleTime: 45 * 60 * 1000,
  });
  const refreshing =
    reportsQuery.isFetching || statusQuery.isFetching || embedQuery.isFetching;
  const embedError = embedQuery.error;
  const embedState: EmbedState =
    refreshing && !embedQuery.data
      ? "loading"
      : embedError instanceof ApiError && embedError.status === 403
        ? "auth_error"
        : embedQuery.data && new Date(embedQuery.data.expiresAt) <= new Date()
          ? "expired"
          : embedQuery.data
            ? "ready"
            : "unavailable";

  const handleRefresh = async () => {
    await Promise.all([
      reportsQuery.refetch(),
      statusQuery.refetch(),
      embedQuery.refetch(),
    ]);
  };

  const STATE_CONFIGS: Record<
    EmbedState,
    {
      icon: React.ReactNode;
      title: string;
      description: string;
      action?: React.ReactNode;
      color: string;
    }
  > = {
    loading: {
      icon: <RefreshCw size={28} className="spin-anim" />,
      title: "Đang tải báo cáo…",
      description: "Đang xác thực và lấy cấu hình nhúng từ Power BI.",
      color: "#4F46E5",
    },
    ready: {
      icon: <BarChart2 size={28} />,
      title: "",
      description: "",
      color: "#16A34A",
    },
    expired: {
      icon: <Clock size={28} />,
      title: "Phiên xem báo cáo đã hết hạn",
      description:
        "Token nhúng đã hết hiệu lực. Vui lòng làm mới để tiếp tục xem báo cáo.",
      action: (
        <Btn onClick={handleRefresh} disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? "spin-anim" : ""} />
          Làm mới kết nối
        </Btn>
      ),
      color: "#B45309",
    },
    auth_error: {
      icon: <ShieldOff size={28} />,
      title: "Không có quyền truy cập báo cáo",
      description:
        "Tài khoản của bạn chưa được cấp quyền xem báo cáo Power BI này. Vui lòng liên hệ quản trị viên.",
      color: "#DC2626",
    },
    unavailable: {
      icon: <WifiOff size={28} />,
      title: "Dịch vụ Power BI không khả dụng",
      description:
        "Không thể kết nối đến dịch vụ Power BI. Vui lòng thử lại sau hoặc liên hệ bộ phận IT.",
      action: (
        <Btn onClick={handleRefresh} variant="secondary" disabled={refreshing}>
          <RefreshCw size={13} className={refreshing ? "spin-anim" : ""} />
          Thử lại
        </Btn>
      ),
      color: "#DC2626",
    },
  };

  const cfg = STATE_CONFIGS[embedState];

  return (
    <div className="p-6 max-w-6xl">
      <PageHeader
        title="Power BI Analytics"
        description="Báo cáo phân tích chuyên sâu được nhúng trực tiếp từ Microsoft Power BI."
        actions={
          embedState === "ready" ? (
            <Btn
              size="sm"
              variant="secondary"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={13} className={refreshing ? "spin-anim" : ""} />
              {refreshing ? "Đang làm mới…" : "Làm mới token"}
            </Btn>
          ) : undefined
        }
      />

      {/* Info banner distinguishing operational vs BI */}
      <div
        className="flex items-start gap-3 p-3 rounded-lg mb-5"
        style={{ background: "#EEF2FF", border: "1px solid #C7D2FE" }}
      >
        <BarChart2
          size={15}
          style={{ color: "#4F46E5", marginTop: 1, flexShrink: 0 }}
        />
        <div>
          <p className="text-sm font-medium" style={{ color: "#3730A3" }}>
            Báo cáo phân tích sâu (Power BI) vs. Tổng quan vận hành
          </p>
          <p className="text-xs mt-0.5" style={{ color: "#4F46E5" }}>
            Trang Tổng quan hiển thị dữ liệu vận hành thời gian thực từ hệ
            thống. Trang này nhúng báo cáo Power BI độc lập phục vụ phân tích
            chuyên sâu và lịch sử dài hạn.
          </p>
        </div>
      </div>

      {/* Embed area */}
      <Card style={{ padding: 0, overflow: "hidden" }}>
        {/* Embed header */}
        <div
          className="flex items-center justify-between px-5 py-3 border-b"
          style={{ borderColor: "#E5E7EB", background: "#F9FAFB" }}
        >
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-semibold"
              style={{ color: "#374151" }}
            >
              Báo cáo: {report?.name ?? "Chưa được cấu hình"}
            </span>
            {embedState === "ready" && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
                style={{ background: "#F0FDF4", color: "#16A34A" }}
              >
                <span
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: "#16A34A" }}
                />
                Đã kết nối
              </span>
            )}
          </div>
          <div
            className="flex items-center gap-2 text-xs"
            style={{ color: "#6B7280" }}
          >
            <Clock size={11} />
            Token: {embedState === "expired" ? "Đã hết hạn" : "Còn 58 phút"}
            <button
              className="flex items-center gap-1 ml-2"
              style={{ color: "#4F46E5" }}
            >
              <ExternalLink size={11} /> Mở Power BI
            </button>
          </div>
        </div>

        {/* Embed content */}
        {embedState === "ready" && embedQuery.data ? (
          <div
            style={{ height: 520, background: "#F9FAFB", position: "relative" }}
          >
            <PowerBIEmbed
              embedConfig={{
                type: "report",
                id: embedQuery.data.reportId,
                embedUrl: embedQuery.data.embedUrl,
                accessToken: embedQuery.data.accessToken,
                tokenType: models.TokenType.Embed,
                settings: {
                  panes: { filters: { expanded: false, visible: true } },
                },
              }}
              cssClassName="h-full w-full"
            />

            {/* Watermark note */}
            <div
              style={{
                position: "absolute",
                bottom: 12,
                right: 16,
                display: "flex",
                alignItems: "center",
                gap: 4,
                fontSize: 11,
                color: "#9CA3AF",
              }}
            >
              <BarChart2 size={11} /> Powered by Microsoft Power BI
            </div>
          </div>
        ) : (
          <div
            className="flex flex-col items-center justify-center text-center"
            style={{ height: 520, padding: 40 }}
          >
            <div
              className="flex items-center justify-center w-16 h-16 rounded-full mb-5"
              style={{ background: cfg.color + "14", color: cfg.color }}
            >
              {cfg.icon}
            </div>
            <h2
              className="text-base font-semibold mb-2"
              style={{ color: "#111827" }}
            >
              {cfg.title}
            </h2>
            <p className="text-sm max-w-sm mb-5" style={{ color: "#6B7280" }}>
              {cfg.description}
            </p>
            {cfg.action}

            {embedState === "auth_error" && user.role !== "admin" && (
              <div
                className="flex items-center gap-2 mt-4 px-4 py-3 rounded-lg"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
              >
                <AlertTriangle size={13} style={{ color: "#DC2626" }} />
                <p className="text-xs" style={{ color: "#7F1D1D" }}>
                  Liên hệ quản trị viên để được cấp quyền: hieu.le@delta.vn
                </p>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Security notice */}
      <p className="text-xs mt-3 text-center" style={{ color: "#9CA3AF" }}>
        Token nhúng được tạo phía máy chủ. Không có thông tin xác thực nào được
        gửi đến trình duyệt.
      </p>
    </div>
  );
}

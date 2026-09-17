import { useState } from "react";
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  RefreshCw,
  ChevronRight,
  ArrowRight,
  Info,
} from "lucide-react";
import { sovaApi } from "../api/sovaApi";
import { PageHeader, Card, Btn } from "../components/Layout";
import type { components } from "../api/generated";
import type { User } from "../types";
import type { Page } from "../types";

type Stage = "upload" | "preview" | "result";
type ImportPreview = components["schemas"]["ImportPreviewResponse"];
type ImportCommit = components["schemas"]["ImportCommitResponse"];

const STAGE_LABELS: Record<Stage, string> = {
  upload: "Tải file",
  preview: "Kiểm tra dữ liệu",
  result: "Kết quả",
};
const STAGES: Stage[] = ["upload", "preview", "result"];

interface Props {
  user: User;
  navigate: (page: Page, id?: string) => void;
}

export default function ImportWizardPage({ user: _user, navigate }: Props) {
  const [stage, setStage] = useState<Stage>("upload");
  const [uploading, setUploading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [commitResult, setCommitResult] = useState<ImportCommit | null>(null);
  const [apiError, setApiError] = useState("");
  const [dragging, setDragging] = useState(false);
  const errorsByRow = new Map<number, ImportPreview["errors"]>();
  preview?.errors.forEach((error) => {
    errorsByRow.set(error.rowNumber, [
      ...(errorsByRow.get(error.rowNumber) ?? []),
      error,
    ]);
  });
  const rows: Array<{
    rowNumber: number;
    name: string;
    company: string;
    email: string;
    status: string;
    errors: { field: string; message: string }[];
    rowStatus: "valid" | "invalid" | "duplicate";
  }> = Array.from(errorsByRow, ([rowNumber, errors]) => ({
    rowNumber,
    name: "",
    company: "",
    email: "",
    status: "",
    errors: errors.map((error) => ({
      field: error.fieldName,
      message: error.message,
    })),
    rowStatus: errors.some((error) =>
      /duplicate|already exists|trùng/i.test(error.message),
    )
      ? ("duplicate" as const)
      : ("invalid" as const),
  }));
  const invalidRows = rows.filter((r) => r.rowStatus === "invalid");
  const dupRows = rows.filter((r) => r.rowStatus === "duplicate");
  const validCount = preview?.job.validRows ?? 0;
  const invalidCount = preview?.job.invalidRows ?? 0;

  const uploadFile = async (file: File) => {
    setSelectedFile(file);
    setUploading(true);
    setApiError("");
    try {
      setPreview(await sovaApi.previewImport(file));
      setStage("preview");
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Không thể phân tích file.",
      );
    } finally {
      setUploading(false);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void uploadFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void uploadFile(f);
  };

  const handleCommit = async () => {
    if (!preview || validCount === 0) return;
    setCommitting(true);
    setApiError("");
    try {
      setCommitResult(await sovaApi.commitImport(preview.job.id));
      setStage("result");
    } catch (error) {
      setApiError(
        error instanceof Error ? error.message : "Không thể nhập dữ liệu.",
      );
      setStage("result");
    } finally {
      setCommitting(false);
    }
  };

  const reset = () => {
    setStage("upload");
    setSelectedFile(null);
    setPreview(null);
    setCommitResult(null);
    setApiError("");
  };

  const stageIndex = STAGES.indexOf(stage);

  return (
    <div className="p-6 max-w-4xl">
      <PageHeader
        title="Nhập dữ liệu khách hàng"
        description="Tải lên file CSV hoặc XLSX để thêm nhiều khách hàng cùng lúc."
      />

      {/* Progress stepper */}
      <div className="flex items-center gap-0 mb-8">
        {STAGES.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className="flex items-center gap-2">
              <div
                className="flex items-center justify-center rounded-full text-xs font-semibold"
                style={{
                  width: 28,
                  height: 28,
                  background:
                    i < stageIndex
                      ? "#16A34A"
                      : i === stageIndex
                        ? "#4F46E5"
                        : "#E5E7EB",
                  color: i <= stageIndex ? "#fff" : "#6B7280",
                }}
              >
                {i < stageIndex ? <CheckCircle size={14} /> : i + 1}
              </div>
              <span
                className="text-sm font-medium"
                style={{ color: i === stageIndex ? "#111827" : "#6B7280" }}
              >
                {STAGE_LABELS[s]}
              </span>
            </div>
            {i < STAGES.length - 1 && (
              <ChevronRight
                size={16}
                style={{ color: "#D1D5DB", margin: "0 12px" }}
              />
            )}
          </div>
        ))}
      </div>

      {/* STAGE 1: Upload */}
      {stage === "upload" && (
        <div className="fade-up">
          {/* Drop zone */}
          <Card
            style={{
              padding: 0,
              border: `2px dashed ${dragging ? "#4F46E5" : "#D1D5DB"}`,
              background: dragging ? "#F5F9FD" : "#F9FAFB",
              transition: "all 0.15s",
            }}
          >
            <div
              className="flex flex-col items-center justify-center py-14 px-8 text-center"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
            >
              {uploading ? (
                <>
                  <RefreshCw
                    size={32}
                    className="spin-anim mb-4"
                    style={{ color: "#4F46E5" }}
                  />
                  <p
                    className="text-sm font-medium"
                    style={{ color: "#111827" }}
                  >
                    Đang tải và phân tích file…
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#6B7280" }}>
                    {selectedFile?.name}
                  </p>
                </>
              ) : (
                <>
                  <div
                    className="flex items-center justify-center w-14 h-14 rounded-xl mb-4"
                    style={{ background: "#EFF6FF", color: "#4338CA" }}
                  >
                    <Upload size={24} />
                  </div>
                  <p
                    className="text-sm font-semibold mb-1"
                    style={{ color: "#111827" }}
                  >
                    Kéo thả file vào đây
                  </p>
                  <p className="text-sm mb-4" style={{ color: "#6B7280" }}>
                    hoặc nhấn để chọn file từ máy tính
                  </p>
                  <label
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-medium"
                    style={{
                      background: "#4F46E5",
                      color: "#fff",
                      borderRadius: 6,
                    }}
                  >
                    <FileText size={14} /> Chọn file CSV / XLSX
                    <input
                      type="file"
                      accept=".csv,.xlsx"
                      className="sr-only"
                      onChange={handleFileInput}
                    />
                  </label>
                  {apiError && (
                    <p className="mt-3 text-xs" style={{ color: "#DC2626" }}>
                      {apiError}
                    </p>
                  )}
                </>
              )}
            </div>
          </Card>

          {/* Requirements */}
          <Card style={{ padding: 20, marginTop: 16 }}>
            <div className="flex items-start gap-3">
              <Info
                size={15}
                style={{ color: "#4338CA", marginTop: 1, flexShrink: 0 }}
              />
              <div>
                <h3
                  className="text-sm font-semibold mb-2"
                  style={{ color: "#111827" }}
                >
                  Yêu cầu file
                </h3>
                <div
                  className="grid gap-3"
                  style={{ gridTemplateColumns: "1fr 1fr" }}
                >
                  <div>
                    <p
                      className="text-xs font-medium mb-1"
                      style={{ color: "#374151" }}
                    >
                      Định dạng & giới hạn
                    </p>
                    <ul
                      className="text-xs flex flex-col gap-1"
                      style={{ color: "#6B7280" }}
                    >
                      <li>• Định dạng: CSV (UTF-8) hoặc XLSX</li>
                      <li>• Kích thước tối đa: 5 MB</li>
                      <li>• Số dòng tối đa: 5,000 dòng</li>
                      <li>• Hàng đầu tiên phải là tên cột</li>
                    </ul>
                  </div>
                  <div>
                    <p
                      className="text-xs font-medium mb-1"
                      style={{ color: "#374151" }}
                    >
                      Cột bắt buộc
                    </p>
                    <ul
                      className="text-xs flex flex-col gap-1"
                      style={{ color: "#6B7280" }}
                    >
                      <li>
                        •{" "}
                        <code
                          className="font-mono"
                          style={{
                            background: "#F9FAFB",
                            padding: "1px 4px",
                            borderRadius: 3,
                          }}
                        >
                          company_name
                        </code>
                      </li>
                      <li>
                        •{" "}
                        <code
                          className="font-mono"
                          style={{
                            background: "#F9FAFB",
                            padding: "1px 4px",
                            borderRadius: 3,
                          }}
                        >
                          contact_name
                        </code>
                      </li>
                    </ul>
                    <p
                      className="text-xs font-medium mt-2 mb-1"
                      style={{ color: "#374151" }}
                    >
                      Cột tùy chọn
                    </p>
                    <p className="text-xs" style={{ color: "#6B7280" }}>
                      <code
                        className="font-mono"
                        style={{
                          background: "#F9FAFB",
                          padding: "1px 4px",
                          borderRadius: 3,
                        }}
                      >
                        email
                      </code>
                      ,{" "}
                      <code
                        className="font-mono"
                        style={{
                          background: "#F9FAFB",
                          padding: "1px 4px",
                          borderRadius: 3,
                        }}
                      >
                        phone
                      </code>
                      ,{" "}
                      <code
                        className="font-mono"
                        style={{
                          background: "#F9FAFB",
                          padding: "1px 4px",
                          borderRadius: 3,
                        }}
                      >
                        product_sku
                      </code>
                      ,{" "}
                      <code
                        className="font-mono"
                        style={{
                          background: "#F9FAFB",
                          padding: "1px 4px",
                          borderRadius: 3,
                        }}
                      >
                        interaction_type
                      </code>
                    </p>
                  </div>
                </div>
                <a
                  href="/customer-import-template.csv"
                  download
                  className="flex items-center gap-1 text-xs mt-3 font-medium"
                  style={{ color: "#4338CA" }}
                >
                  <Download size={12} /> Tải file mẫu (CSV)
                </a>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* STAGE 2: Preview */}
      {stage === "preview" && (
        <div className="fade-up">
          {/* Summary bar */}
          <div
            className="grid gap-3 mb-5"
            style={{ gridTemplateColumns: "repeat(4, 1fr)" }}
          >
            {[
              {
                label: "Tổng dòng",
                value: preview?.job.totalRows ?? 0,
                color: "#111827",
                bg: "#fff",
              },
              {
                label: "Hợp lệ",
                value: validCount,
                color: "#16A34A",
                bg: "#F0FDF4",
              },
              {
                label: "Lỗi",
                value: invalidCount,
                color: "#DC2626",
                bg: "#FEF2F2",
              },
              {
                label: "Trùng lặp",
                value: dupRows.length,
                color: "#B45309",
                bg: "#FFFBEB",
              },
            ].map((s) => (
              <Card
                key={s.label}
                style={{
                  padding: "14px 16px",
                  background: s.bg,
                  border: `1px solid ${
                    s.bg === "#fff" ? "#E5E7EB" : s.color + "30"
                  }`,
                }}
              >
                <div
                  className="text-2xl font-semibold tabular-nums"
                  style={{ color: s.color }}
                >
                  {s.value}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                  {s.label}
                </div>
              </Card>
            ))}
          </div>

          {/* File info + download errors */}
          <div className="flex items-center justify-between mb-3">
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: "#374151" }}
            >
              <FileText size={14} style={{ color: "#6B7280" }} />
              <span>{selectedFile?.name}</span>
              <span style={{ color: "#9CA3AF" }}>
                {selectedFile
                  ? `${Math.ceil(selectedFile.size / 1024)} KB`
                  : ""}
              </span>
            </div>
            {(invalidRows.length > 0 || dupRows.length > 0) && (
              <button
                onClick={() => {
                  if (!preview) return;
                  void sovaApi
                    .downloadImportErrors(preview.job.id)
                    .then((blob) => {
                      const url = URL.createObjectURL(blob);
                      const anchor = document.createElement("a");
                      anchor.href = url;
                      anchor.download = "import-errors.csv";
                      anchor.click();
                      URL.revokeObjectURL(url);
                    });
                }}
                className="flex items-center gap-1.5 text-xs font-medium"
                style={{ color: "#DC2626" }}
              >
                <Download size={12} /> Tải danh sách lỗi (CSV)
              </button>
            )}
          </div>

          {/* Table */}
          <Card style={{ padding: 0 }}>
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
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280", width: 56 }}
                    >
                      #
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280" }}
                    >
                      Trường dữ liệu
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280" }}
                    >
                      Chi tiết lỗi
                    </th>
                    <th
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: "#6B7280" }}
                    >
                      Phân loại
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="px-4 py-8 text-center text-sm"
                        style={{ color: "#16A34A" }}
                      >
                        Không phát hiện lỗi dữ liệu.
                      </td>
                    </tr>
                  ) : (
                    rows.flatMap((row) =>
                      row.errors.map((error, index) => {
                        const bg =
                          row.rowStatus === "invalid"
                            ? "#FFF5F5"
                            : row.rowStatus === "duplicate"
                              ? "#FFFBEB"
                              : "#fff";
                        return (
                          <tr
                            key={`${row.rowNumber}-${error.field}-${index}`}
                            style={{
                              borderBottom: "1px solid #E5E7EB",
                              background: bg,
                            }}
                          >
                            <td
                              className="px-4 py-3 tabular-nums text-xs"
                              style={{ color: "#6B7280" }}
                            >
                              {row.rowNumber}
                            </td>
                            <td
                              className="px-4 py-3 text-xs"
                              style={{ color: "#374151" }}
                            >
                              <code>{error.field}</code>
                            </td>
                            <td
                              className="px-4 py-3 text-xs"
                              style={{ color: "#DC2626" }}
                            >
                              {error.message}
                            </td>
                            <td className="px-4 py-3">
                              {row.rowStatus === "duplicate" ? (
                                <span
                                  className="flex items-center gap-1 text-xs"
                                  style={{ color: "#B45309" }}
                                >
                                  <AlertTriangle size={12} />
                                  Trùng lặp
                                </span>
                              ) : (
                                <span
                                  className="flex items-center gap-1 text-xs"
                                  style={{ color: "#DC2626" }}
                                >
                                  <XCircle size={11} /> Không hợp lệ
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      }),
                    )
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Commit warning */}
          {invalidRows.length > 0 && (
            <div
              className="flex items-start gap-2.5 p-3 rounded-lg mt-4"
              style={{ background: "#FFFBEB", border: "1px solid #FDE68A" }}
            >
              <AlertTriangle
                size={14}
                style={{ color: "#B45309", marginTop: 1 }}
              />
              <p className="text-sm" style={{ color: "#92400E" }}>
                <strong>{invalidRows.length} dòng lỗi</strong> và{" "}
                <strong>{dupRows.length} dòng trùng lặp</strong> sẽ bị bỏ qua.
                Chỉ <strong>{validCount} dòng hợp lệ</strong> sẽ được nhập vào
                hệ thống.
              </p>
            </div>
          )}

          <div className="flex gap-3 mt-5">
            <Btn variant="secondary" onClick={reset}>
              ← Tải lại file khác
            </Btn>
            <Btn
              onClick={() => void handleCommit()}
              disabled={validCount === 0 || committing}
            >
              {committing ? (
                <>
                  <RefreshCw size={13} className="spin-anim" /> Đang nhập…
                </>
              ) : (
                <>
                  Xác nhận nhập {validCount} dòng hợp lệ{" "}
                  <ArrowRight size={13} />
                </>
              )}
            </Btn>
          </div>
        </div>
      )}

      {/* STAGE 3: Result */}
      {stage === "result" && (
        <div className="fade-up">
          {commitResult ? (
            <Card style={{ padding: 40, textAlign: "center" }}>
              <div
                className="flex items-center justify-center w-16 h-16 rounded-full mx-auto mb-5"
                style={{ background: "#F0FDF4" }}
              >
                <CheckCircle size={32} style={{ color: "#16A34A" }} />
              </div>
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: "#111827" }}
              >
                Nhập dữ liệu thành công
              </h2>
              <p className="text-sm mb-1" style={{ color: "#374151" }}>
                <strong style={{ color: "#16A34A" }}>
                  {commitResult.createdCustomerCount} khách hàng
                </strong>{" "}
                đã được thêm vào hệ thống.
              </p>
              {(invalidRows.length > 0 || dupRows.length > 0) && (
                <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
                  {invalidCount} dòng bị bỏ qua (lỗi dữ liệu hoặc trùng lặp).
                </p>
              )}
              <div className="flex gap-3 justify-center">
                <Btn onClick={() => navigate("customers")}>
                  Xem danh sách khách hàng
                </Btn>
                <Btn variant="secondary" onClick={reset}>
                  Nhập thêm dữ liệu
                </Btn>
              </div>
            </Card>
          ) : (
            <Card style={{ padding: 40, textAlign: "center" }}>
              <XCircle
                size={32}
                style={{ color: "#DC2626", margin: "0 auto 16px" }}
              />
              <h2
                className="text-xl font-semibold mb-2"
                style={{ color: "#111827" }}
              >
                Nhập dữ liệu thất bại
              </h2>
              <p className="text-sm mb-6" style={{ color: "#6B7280" }}>
                {apiError ||
                  "Đã có lỗi xảy ra trong quá trình xử lý. Không có dữ liệu nào được ghi vào hệ thống."}
              </p>
              <Btn variant="secondary" onClick={reset}>
                Thử lại
              </Btn>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import {
  ShieldOff,
  Plus,
  Edit2,
  User as UserIcon,
  CheckCircle,
  XCircle,
  Search,
} from "lucide-react";
import { useSovaData } from "../data/SovaDataContext";
import { PageHeader, Card, Btn, Input, EmptyState } from "../components/Layout";
import { formatDate } from "../lib/utils";
import type { User, UserRole } from "../types";

interface Props {
  user: User;
}

type EditMode =
  | { type: "none" }
  | { type: "create" }
  | {
      type: "edit";
      userId: string;
    };

export default function UserManagementPage({ user }: Props) {
  const { users, createUser, updateUser, isLoading, error } = useSovaData();
  const [editMode, setEditMode] = useState<EditMode>({ type: "none" });
  const [search, setSearch] = useState("");

  // Form state
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formRole, setFormRole] = useState<UserRole>("staff");
  const [formActive, setFormActive] = useState(true);
  const [formPassword, setFormPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [emailConflict, setEmailConflict] = useState(false);
  const [saved, setSaved] = useState(false);

  if (user.role !== "admin") {
    return (
      <div className="p-6">
        <PageHeader title="Quản lý người dùng" />
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
            Chỉ quản trị viên mới có thể quản lý người dùng.
          </p>
        </Card>
      </div>
    );
  }

  const openCreate = () => {
    setFormName("");
    setFormEmail("");
    setFormRole("staff");
    setFormActive(true);
    setFormPassword("");
    setErrors({});
    setEmailConflict(false);
    setSaved(false);
    setEditMode({ type: "create" });
  };

  const openEdit = (u: User) => {
    setFormName(u.name);
    setFormEmail(u.email);
    setFormRole(u.role);
    setFormActive(u.active);
    setFormPassword("");
    setErrors({});
    setEmailConflict(false);
    setSaved(false);
    setEditMode({ type: "edit", userId: u.id });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!formName.trim()) errs.name = "Tên không được để trống.";
    if (!formEmail.trim()) errs.email = "Email không được để trống.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formEmail))
      errs.email = "Email không đúng định dạng.";
    if (editMode.type === "create" && formPassword.length < 8)
      errs.password = "Mật khẩu phải có ít nhất 8 ký tự.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setEmailConflict(false);
    setSaved(false);

    if (editMode.type === "create") {
      try {
        await createUser({
          fullName: formName.trim(),
          email: formEmail.trim().toLowerCase(),
          password: formPassword,
          role: formRole,
        });
      } catch (saveError) {
        if (
          saveError instanceof Error &&
          saveError.message.toLowerCase().includes("email")
        )
          setEmailConflict(true);
        else
          setErrors({
            form:
              saveError instanceof Error
                ? saveError.message
                : "Không thể tạo người dùng.",
          });
        return;
      }
    } else if (editMode.type === "edit") {
      try {
        await updateUser(editMode.userId, {
          fullName: formName.trim(),
          role: formRole,
          isActive: formActive,
          ...(formPassword ? { password: formPassword } : {}),
        });
      } catch (saveError) {
        setErrors({
          form:
            saveError instanceof Error
              ? saveError.message
              : "Không thể cập nhật người dùng.",
        });
        return;
      }
    }
    setSaved(true);
    setTimeout(() => {
      setEditMode({ type: "none" });
      setSaved(false);
    }, 1200);
  };

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    );
  });

  const isEditing = editMode.type !== "none";

  return (
    <div className="p-6 max-w-6xl">
      <PageHeader
        title="Quản lý người dùng"
        description={`${users.length} người dùng trong hệ thống`}
        actions={
          !isEditing ? (
            <Btn size="sm" onClick={openCreate}>
              <Plus size={14} /> Thêm người dùng
            </Btn>
          ) : undefined
        }
      />

      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: isEditing ? "1fr 360px" : "1fr" }}
      >
        {/* Table */}
        <div>
          <div className="mb-3">
            <div className="relative">
              <Search
                size={13}
                className="absolute left-2.5 top-1/2 -translate-y-1/2"
                style={{ color: "#6B7280" }}
              />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm theo tên hoặc email…"
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
          </div>

          <Card style={{ padding: 0 }}>
            {isLoading ? (
              <div className="p-8 text-center text-sm text-gray-500">
                Đang tải người dùng…
              </div>
            ) : error ? (
              <div className="p-8 text-center text-sm text-red-600">
                Không thể tải người dùng.
              </div>
            ) : filteredUsers.length === 0 ? (
              <EmptyState
                icon={<UserIcon size={20} />}
                title="Không tìm thấy người dùng"
                description="Thử thay đổi từ khóa tìm kiếm."
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
                        "Người dùng",
                        "Vai trò",
                        "Trạng thái",
                        "Ngày tạo",
                        "Đăng nhập cuối",
                        "",
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
                    {filteredUsers.map((u) => (
                      <tr
                        key={u.id}
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
                          <div className="flex items-center gap-2.5">
                            <div
                              className="shrink-0 rounded-full flex items-center justify-center text-xs font-semibold"
                              style={{
                                width: 32,
                                height: 32,
                                background: u.active ? "#EFF6FF" : "#F9FAFB",
                                color: u.active ? "#4338CA" : "#6B7280",
                              }}
                            >
                              {u.name.split(" ").pop()?.[0]}
                            </div>
                            <div>
                              <div
                                className="font-medium"
                                style={{
                                  color: u.active ? "#111827" : "#6B7280",
                                }}
                              >
                                {u.name}
                                {u.id === user.id && (
                                  <span
                                    className="ml-1.5 text-xs"
                                    style={{ color: "#4338CA" }}
                                  >
                                    (bạn)
                                  </span>
                                )}
                              </div>
                              <div
                                className="text-xs"
                                style={{ color: "#6B7280" }}
                              >
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="px-2 py-0.5 rounded text-xs font-medium"
                            style={{
                              background:
                                u.role === "admin" ? "#FEECEB" : "#EFF6FF",
                              color: u.role === "admin" ? "#DC2626" : "#4338CA",
                            }}
                          >
                            {u.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {u.active ? (
                            <span
                              className="flex items-center gap-1 text-xs"
                              style={{ color: "#16A34A" }}
                            >
                              <CheckCircle size={12} /> Hoạt động
                            </span>
                          ) : (
                            <span
                              className="flex items-center gap-1 text-xs"
                              style={{ color: "#DC2626" }}
                            >
                              <XCircle size={12} /> Vô hiệu hóa
                            </span>
                          )}
                        </td>
                        <td
                          className="px-4 py-3 text-xs tabular-nums"
                          style={{ color: "#6B7280" }}
                        >
                          {formatDate(u.createdAt)}
                        </td>
                        <td
                          className="px-4 py-3 text-xs tabular-nums"
                          style={{ color: "#6B7280" }}
                        >
                          {u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {u.id !== user.id && (
                            <button
                              onClick={() => openEdit(u)}
                              className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded transition-colors"
                              style={{
                                color: "#4338CA",
                                border: "1px solid #C7D2FE",
                                borderRadius: 5,
                              }}
                              onMouseEnter={(e) =>
                                ((
                                  e.currentTarget as HTMLButtonElement
                                ).style.background = "#EFF6FF")
                              }
                              onMouseLeave={(e) =>
                                ((
                                  e.currentTarget as HTMLButtonElement
                                ).style.background = "transparent")
                              }
                            >
                              <Edit2 size={11} /> Chỉnh sửa
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Form panel */}
        {isEditing && (
          <Card style={{ padding: 24, alignSelf: "start" }} className="fade-up">
            <h2
              className="text-sm font-semibold mb-5"
              style={{ color: "#111827" }}
            >
              {editMode.type === "create"
                ? "Thêm người dùng mới"
                : "Chỉnh sửa người dùng"}
            </h2>

            {saved && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg mb-4"
                style={{ background: "#F0FDF4", border: "1px solid #BBF7D0" }}
              >
                <CheckCircle size={14} style={{ color: "#16A34A" }} />
                <p className="text-sm font-medium" style={{ color: "#14532D" }}>
                  Đã lưu thành công!
                </p>
              </div>
            )}

            {emailConflict && (
              <div
                className="flex items-center gap-2 p-3 rounded-lg mb-4"
                style={{ background: "#FEF2F2", border: "1px solid #FECACA" }}
              >
                <XCircle size={14} style={{ color: "#DC2626" }} />
                <p className="text-sm" style={{ color: "#7F1D1D" }}>
                  Email này đã tồn tại trong hệ thống.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-4">
              <Input
                label="Họ và tên"
                value={formName}
                onChange={setFormName}
                placeholder="Nguyễn Văn A"
                required
                error={errors.name}
              />
              <Input
                label="Địa chỉ email"
                type="email"
                value={formEmail}
                onChange={(v) => {
                  setFormEmail(v);
                  setEmailConflict(false);
                }}
                placeholder="ten@delta.vn"
                required
                error={errors.email}
                disabled={editMode.type === "edit"}
                hint={
                  editMode.type === "edit"
                    ? "Không thể thay đổi email sau khi tạo."
                    : undefined
                }
              />
              <Input
                label={editMode.type === "create" ? "Mật khẩu" : "Mật khẩu mới"}
                type="password"
                value={formPassword}
                onChange={setFormPassword}
                required={editMode.type === "create"}
                error={errors.password}
                hint={
                  editMode.type === "edit"
                    ? "Để trống nếu không muốn đổi mật khẩu."
                    : undefined
                }
              />
              {errors.form && (
                <p className="text-xs" style={{ color: "#DC2626" }}>
                  {errors.form}
                </p>
              )}
              <div>
                <label
                  className="block text-sm font-medium mb-1.5"
                  style={{ color: "#374151" }}
                >
                  Vai trò <span style={{ color: "#DC2626" }}>*</span>
                </label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as UserRole)}
                  className="w-full text-sm rounded outline-none"
                  style={{
                    border: "1px solid #D1D5DB",
                    padding: "8px 10px",
                    borderRadius: 6,
                    color: "#111827",
                    background: "#fff",
                  }}
                >
                  <option value="staff">Nhân viên</option>
                  <option value="admin">Quản trị viên</option>
                </select>
              </div>
              {editMode.type === "edit" && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setFormActive((v) => !v)}
                    className="relative rounded-full transition-colors shrink-0"
                    style={{
                      width: 40,
                      height: 22,
                      background: formActive ? "#4F46E5" : "#D1D5DB",
                    }}
                  >
                    <span
                      className="absolute top-1 rounded-full transition-transform"
                      style={{
                        width: 14,
                        height: 14,
                        background: "#fff",
                        left: formActive ? 23 : 3,
                      }}
                    />
                  </button>
                  <span className="text-sm" style={{ color: "#374151" }}>
                    {formActive
                      ? "Tài khoản đang hoạt động"
                      : "Tài khoản vô hiệu hóa"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-6">
              <Btn onClick={() => void handleSave()} disabled={saved}>
                {saved ? (
                  <>
                    <CheckCircle size={13} /> Đã lưu
                  </>
                ) : (
                  "Lưu"
                )}
              </Btn>
              <Btn
                variant="secondary"
                onClick={() => setEditMode({ type: "none" })}
              >
                Hủy
              </Btn>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

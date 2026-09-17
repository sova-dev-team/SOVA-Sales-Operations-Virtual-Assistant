import { useState } from "react";
import { Eye, EyeOff, AlertCircle, Loader } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "../auth/AuthContext";

const DEMO_CREDENTIALS = [
  {
    email: "staff.demo@example.test",
    password: "DemoPass123!",
    label: "Nhân viên (Staff)",
  },
  {
    email: "admin.demo@example.test",
    password: "DemoPass123!",
    label: "Quản trị (Admin)",
  },
] as const;

const loginSchema = z.object({
  email: z.string().trim().email("Địa chỉ email không đúng định dạng."),
  password: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự."),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const submitLogin = async (values: LoginForm) => {
    setError(null);
    try {
      await login(values.email, values.password);
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Không thể đăng nhập.",
      );
    }
  };

  const quickLogin = (userEmail: string) => {
    const cred = DEMO_CREDENTIALS.find((c) => c.email === userEmail)!;
    setValue("email", cred.email, { shouldValidate: true });
    setValue("password", cred.password, { shouldValidate: true });
    setError(null);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: "#F5F7FA" }}
    >
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center rounded-lg mb-4 font-bold text-xl"
            style={{
              width: 52,
              height: 52,
              background: "#4F46E5",
              color: "#fff",
            }}
          >
            <span style={{ letterSpacing: "-1px" }}>SO</span>
          </div>
          <h1 className="text-2xl font-semibold" style={{ color: "#111827" }}>
            SOVA
          </h1>
          <p className="text-sm mt-1" style={{ color: "#6B7280" }}>
            AI Sales & Operations Assistant
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-xl p-8"
          style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
          }}
        >
          <h2
            className="text-base font-semibold mb-6"
            style={{ color: "#111827" }}
          >
            Đăng nhập
          </h2>

          {/* Global error */}
          {error && (
            <div
              className="flex items-start gap-2.5 rounded-lg p-3 mb-5 text-sm"
              style={{
                background: "#FEF2F2",
                color: "#DC2626",
                border: "1px solid #FECACA",
              }}
            >
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(submitLogin)} noValidate>
            <div className="mb-4">
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#374151" }}
              >
                Email
              </label>
              <input
                type="email"
                autoComplete="email"
                {...register("email")}
                placeholder="staff.demo@example.test"
                className="block w-full rounded-md text-sm outline-none"
                style={{
                  border: `1px solid ${errors.email ? "#DC2626" : "#D1D5DB"}`,
                  padding: "9px 12px",
                  color: "#111827",
                  borderRadius: 6,
                  transition: "border-color 0.15s",
                }}
                onFocus={(e) => {
                  if (!errors.email) e.target.style.borderColor = "#4F46E5";
                  e.target.style.boxShadow = "0 0 0 3px rgba(13,27,42,0.08)";
                }}
                onBlur={(e) => {
                  if (!errors.email) e.target.style.borderColor = "#D1D5DB";
                  e.target.style.boxShadow = "none";
                }}
              />
              {errors.email && (
                <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="mb-6">
              <label
                className="block text-sm font-medium mb-1.5"
                style={{ color: "#374151" }}
              >
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  {...register("password")}
                  placeholder="••••••••"
                  className="block w-full rounded-md text-sm outline-none pr-10"
                  style={{
                    border: `1px solid ${
                      errors.password ? "#DC2626" : "#D1D5DB"
                    }`,
                    padding: "9px 12px",
                    color: "#111827",
                    borderRadius: 6,
                  }}
                  onFocus={(e) => {
                    if (!errors.password)
                      e.target.style.borderColor = "#4F46E5";
                    e.target.style.boxShadow = "0 0 0 3px rgba(13,27,42,0.08)";
                  }}
                  onBlur={(e) => {
                    if (!errors.password)
                      e.target.style.borderColor = "#D1D5DB";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "#6B7280" }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs mt-1" style={{ color: "#DC2626" }}>
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-md text-sm font-semibold transition-opacity"
              style={{
                background: "#4F46E5",
                color: "#fff",
                padding: "10px 0",
                borderRadius: 6,
                opacity: isSubmitting ? 0.7 : 1,
                cursor: isSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader size={15} className="spin-anim" />
                  Đang đăng nhập…
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>
        </div>

        {/* Demo credentials */}
        <div
          className="mt-4 rounded-lg p-4"
          style={{ background: "#EEF2FF", border: "1px solid #C7D2FE" }}
        >
          <p
            className="text-xs font-semibold mb-2"
            style={{ color: "#4F46E5" }}
          >
            Tài khoản demo
          </p>
          <div className="flex flex-col gap-1.5">
            {DEMO_CREDENTIALS.map((cred) => (
              <button
                key={cred.email}
                onClick={() => quickLogin(cred.email)}
                className="flex items-center justify-between rounded px-3 py-2 text-xs text-left transition-colors"
                style={{
                  background: "#fff",
                  border: "1px solid #C7D2FE",
                  color: "#111827",
                  borderRadius: 5,
                }}
                onMouseEnter={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "#F5F9FD")
                }
                onMouseLeave={(e) =>
                  ((e.currentTarget as HTMLButtonElement).style.background =
                    "#fff")
                }
              >
                <span className="font-medium">{cred.label}</span>
                <span style={{ color: "#A5B4FC" }}>{cred.email}</span>
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "#A5B4FC" }}>
            Mật khẩu: <code className="font-mono">DemoPass123!</code>
          </p>
        </div>
      </div>
    </div>
  );
}

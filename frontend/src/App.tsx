import { lazy, Suspense, useState } from "react";
import type { Page } from "./types";
import { useAuth } from "./auth/AuthContext";
import { SovaDataProvider } from "./data/SovaDataContext";
import LoginPage from "./pages/LoginPage";
import Layout from "./components/Layout";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const CustomersPage = lazy(() => import("./pages/CustomersPage"));
const CustomerDetailPage = lazy(() => import("./pages/CustomerDetailPage"));
const ImportWizardPage = lazy(() => import("./pages/ImportWizardPage"));
const EmailDraftsPage = lazy(() => import("./pages/EmailDraftsPage"));
const SupportTicketsPage = lazy(() => import("./pages/SupportTicketsPage"));
const AuditLogsPage = lazy(() => import("./pages/AuditLogsPage"));
const PowerBIPage = lazy(() => import("./pages/PowerBIPage"));
const UserManagementPage = lazy(() => import("./pages/UserManagementPage"));

interface NavState {
  page: Page;
  selectedId: string | null;
}

export default function App() {
  const { user, isInitializing, logout } = useAuth();
  const [nav, setNav] = useState<NavState>({
    page: "dashboard",
    selectedId: null,
  });

  const navigate = (page: Page, id?: string) => {
    setNav({ page, selectedId: id ?? null });
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Đang khôi phục phiên đăng nhập…
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (nav.page) {
      case "dashboard":
        return <DashboardPage user={user} navigate={navigate} />;
      case "customers":
        return <CustomersPage user={user} navigate={navigate} />;
      case "customer-detail":
        return (
          <CustomerDetailPage
            user={user}
            customerId={nav.selectedId}
            navigate={navigate}
          />
        );
      case "import":
        return <ImportWizardPage user={user} navigate={navigate} />;
      case "email-drafts":
        return <EmailDraftsPage user={user} navigate={navigate} />;
      case "support-tickets":
        return (
          <SupportTicketsPage
            user={user}
            navigate={navigate}
            initialTicketId={nav.selectedId}
          />
        );
      case "audit-logs":
        return <AuditLogsPage user={user} />;
      case "powerbi":
        return <PowerBIPage user={user} />;
      case "user-management":
        return <UserManagementPage user={user} />;
      default:
        return <DashboardPage user={user} navigate={navigate} />;
    }
  };

  return (
    <SovaDataProvider user={user}>
      <Layout
        user={user}
        currentPage={nav.page}
        navigate={navigate}
        onLogout={() => {
          void logout().finally(() =>
            setNav({ page: "dashboard", selectedId: null }),
          );
        }}
      >
        <Suspense
          fallback={
            <div className="p-8 text-sm text-gray-500">Đang tải màn hình…</div>
          }
        >
          {renderPage()}
        </Suspense>
      </Layout>
    </SovaDataProvider>
  );
}

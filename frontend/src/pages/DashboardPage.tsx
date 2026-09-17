import DashboardOverview from "../features/dashboard/DashboardOverview";
import type { Page, User } from "../types";

interface Props {
  user: User;
  navigate: (page: Page, id?: string) => void;
}

export default function DashboardPage(props: Props) {
  return <DashboardOverview {...props} />;
}

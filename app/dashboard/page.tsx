import { Dashboard } from '@/components/Dashboard';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { MobileMenu } from '@/components/MobileMenu';

export const metadata = {
  title: 'Analytics Dashboard | EC26 Nodal Technical Consultancy',
};

export default function DashboardPage() {
  return (
    <div className="app-shell">
      <TopBar activeTab="dashboard" />
      <Sidebar active="dashboard" />
      <MobileMenu active="dashboard" />
      <Dashboard />
    </div>
  );
}

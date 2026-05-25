import { AllSheetsPage } from '@/components/AllSheetsPage';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';

export default function Page() {
  return (
    <div className="app-shell">
      <TopBar activeTab="sheets" />
      <Sidebar active="sheets" />
      <AllSheetsPage />
    </div>
  );
}

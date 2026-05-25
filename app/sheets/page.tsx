import { AllSheetsPage } from '@/components/AllSheetsPage';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import { MobileMenu } from '@/components/MobileMenu';

export const metadata = {
  title: 'All Sheets | EC26 Nodal Technical Consultancy',
};

export default function SheetsPage() {
  return (
    <div className="app-shell">
      <TopBar activeTab="sheets" />
      <Sidebar active="sheets" />
      <MobileMenu active="sheets" />
      <AllSheetsPage />
    </div>
  );
}

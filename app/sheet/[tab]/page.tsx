import { notFound } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { SheetPage } from '@/components/SheetPage';
import { TopBar } from '@/components/TopBar';
import { MobileMenu } from '@/components/MobileMenu';
import { EMBEDDED_SHEET_DATA, TAB_NAMES } from '@/lib/sheet-data';

type Params = { tab: string };
type TabName = keyof typeof EMBEDDED_SHEET_DATA;

export function generateStaticParams() {
  return TAB_NAMES.map((tab) => ({ tab }));
}

export default function Page({ params }: { params: Params }) {
  const decoded = decodeURIComponent(params.tab) as TabName;
  if (!TAB_NAMES.includes(decoded as any)) notFound();
  return (
    <div className="app-shell">
      <TopBar activeTab={decoded} />
      <Sidebar active={decoded} />
      <MobileMenu active={decoded} />
      <SheetPage tab={decoded} />
    </div>
  );
}

import { NextResponse } from 'next/server';
import { EMBEDDED_SHEET_DATA, SHEET_ID, TAB_NAMES } from '@/lib/sheet-data';
import { readSheetRange } from '@/lib/google-sheets';

export const dynamic = 'force-dynamic';

type TabName = typeof TAB_NAMES[number];

export async function GET(_request: Request, { params }: { params: { tab: string } }) {
  const tab = decodeURIComponent(params.tab) as TabName;
  if (!TAB_NAMES.includes(tab)) {
    return NextResponse.json({ error: 'Unknown tab' }, { status: 404 });
  }

  const sheetId = process.env.GOOGLE_SHEET_ID || SHEET_ID;
  const range = `'${tab.replace(/'/g, "''")}'!A1:Z1000`;

  try {
    if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
      const values = await readSheetRange(sheetId, range);
      return NextResponse.json({ sheetId, tab, range, live: true, values });
    }
  } catch (error) {
    return NextResponse.json({ sheetId, tab, range, live: false, error: String(error), data: EMBEDDED_SHEET_DATA[tab] });
  }

  return NextResponse.json({ sheetId, tab, range, live: false, data: EMBEDDED_SHEET_DATA[tab] });
}

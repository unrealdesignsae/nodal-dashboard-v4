import { NextResponse } from 'next/server';
import { EMBEDDED_SHEET_DATA, SHEET_ID, TAB_NAMES } from '@/lib/sheet-data';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    sheetId: SHEET_ID,
    tabs: TAB_NAMES,
    embedded: true,
    data: EMBEDDED_SHEET_DATA,
  });
}

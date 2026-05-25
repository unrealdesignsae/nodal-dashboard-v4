
const { sheets } = require('@googleapis/sheets');
const { JWT } = require('google-auth-library');
const fs = require('fs');

const SHEET_ID = "1iFUyaMhrA_HutzpgV88imc9peWfH_4ovyjLIFj33E-U";
let TAB_NAMES = [
  "OVERVIEW", "AUDIO", "LIGHTING", "VIDEO - LED",
  "LASER", "SFX - PYRO", "POWER", "RIGGING", "BACKLINE", "BROADCAST", "STAGING"
];

function sheetRange(tabName) {
  return `'${String(tabName).replace(/'/g, "''")}'!A1:Z1000`;
}

function processTab(tabName, rawRows) {
  const rows = [];
  let nonEmptyRows = 0;
  let maxCols = 0;
  let quantityTotal = 0;
  let sections = 0;
  
  for (let i = 0; i < rawRows.length; i++) {
    const raw = rawRows[i] || [];
    // Normalize: pad to maxCols, convert empty strings to null
    const cells = raw.map(c => (c === '' || c === null || c === undefined) ? null : c);
    maxCols = Math.max(maxCols, cells.length);
    
    const filled = cells.filter(c => c !== null);
    if (filled.length > 0) nonEmptyRows++;
    
    // Count sections (single non-empty cell, all caps)
    if (filled.length === 1) {
      const s = String(filled[0]).trim();
      if (s === s.toUpperCase() && s.length > 3 && /[A-Z]/.test(s)) sections++;
      if (/^\d+[.)]/i.test(s)) sections++;
    }
    
    // Sum quantities
    for (let j = 1; j < cells.length; j++) {
      const v = cells[j];
      if (v !== null && /^\d+(\.\d+)?$/.test(String(v))) {
        quantityTotal += parseFloat(String(v));
      }
    }
    
    rows.push({ rowNumber: i + 1, cells });
  }
  
  // Get headline from first non-empty row
  let headline = tabName;
  for (const row of rows) {
    const f = row.cells.filter(c => c !== null);
    if (f.length > 0) { headline = String(f[0]); break; }
  }
  
  return {
    title: tabName,
    headline,
    rowCount: rawRows.length,
    nonEmptyRows,
    maxCols,
    rows,
    metrics: { sections, quantityTotal },
    sections: []
  };
}

async function main() {
  const auth = new JWT({
    email: "nodal-v2@nodal-dahsboard.iam.gserviceaccount.com",
    key: "-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDH6RqAPwJ0E10p\nL++8TUcQbXTpER+fDPs22oFfVseW6ntNkTCJDJ33FCgpzLjUBLL9L7jLFgi9owWf\nZ5XQfhaXiB4r49hQKa/EKUhxHz5MYn3Kh9wZBMRnez+XUcHDKIBd2q7iMxq/dRBZ\ngCgDi5RX3EhDc87Jyi5vVbMe9YlOtAfGOQDJ1fTBw0DweDMT8e/S9a1kZ7iNGkzN\nSacYtzjKTug4DBKQlr9pfXgEVVvzg00tNQ1yuZtP6LFsmuyYwFj9cojOQMEUg/J1\nlstixJT2LUpCZgN/OkvQk4vpX4HCTCCD9ahwnTgXAKdhTA5uZXdZpPpMbpvd9JsS\nOa81Aqi1AgMBAAECggEAQ3CrJQqcrEYADq4CRVcYmz0hzKKfNUvuz8GFFYG0EYCH\nGlLZudJM1Bazue47iCMRswJPaAvF5RvDANS0IML4oiQkcZAK4Hg/uIBo1OjCXoh3\ngUS2BqaqD3Lvr/+/yzO1onPsvZiZ9G7slhT66r9CyyUgJ8lAwKh5Y8vYgqA4sxjF\njo4bfjJT1H2wcSZE4ocTp3X/2nPUDO5xQ+oU9ovufd/EMO+pX2OJTOH3gqWyBVg5\nIHMl/OP/+zjv2yEQdhA3DWeOupN1tY2HQCdpbFSio3nvXfbavNYrCWv5o7TSkuMb\nkAPZMOCDEY38R4cDetpXaf0xBjjIhhB5mXMWWkn/nQKBgQD5Wg8KBAszQm7ivn6D\npjTJbMptQlf7axTih/R0FIYhuIuQu/yaGqbimOtAyuuqoxljI/Dof4NPo0V0u0PN\ne0XqnC8LRj65mKRXQOe6OBbbM5Lyx7FRQ966qdB+eIm+Jnl/ELaC5QFVg8fe7rrG\nQGur/VI7H4jKAzBS48mRKG6rhwKBgQDNPZXkJmu6CuiIlnkH2SVkweDr2xvs9+/3\n8oEVyKFwzxCnaAHfjEMnY+M6ucCHAQZ628TlzzCijIqnamKZ38oDI8KyFjgNs5+i\ndTqlKSw0DmRxfKYHcf0Mk6Cjltrm5KuAAjUvtAvU13TJiqX/JwTTeUOCOAEUY6Rc\n0OgODd7w4wKBgQCuCmT62a2znofk7Y9Cdkzb1npH3omoa6pNHxXJu9WPTc7kO8Hp\nEfcvrApv0/K/zE1Y/GoW7YGKoWxGOLrvfj5jrZXMacA4LMlwOVZEjQevAgVsPWOP\nVC7u3L4wuBN0TEh7HwA0xoCy3mMwQDLPU4GTryGpMK56SdV91Y4IKk9smwKBgD2F\nkXHTZoVdEbknyd3lZIUgbMimZGeTJrafVbxu6J3FJAvabH1TMSoUkh+fYKvXTdb0\nG8B7a+u9zy5CAI55e7eXN5xkdqb8ygRLuamafuqXydoO8EHZFG55rjR7WuDNeO8l\nOkYzZTyG3TYwvnOOga7WcbsOCJzRBYrhAD5+P+7bAoGBAI8ShZFDqvMdpRfGRtNJ\n3Q0/M5yarP7CqsuMowpkgzJfzwg3IT+3LLLJCidXAlwSbAWxVBpK1rBcsZvFHKxx\nqYHZE44KjigfLXpE5nuX2aN8ygPjfI62K861uWEvxWwYTINy8248RCk5o7sG/K/V\nCaktxgXR27tU23XiibAS+Lh4\n-----END PRIVATE KEY-----\n",
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const client = sheets({ version: 'v4', auth });
  
  const meta = await client.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: 'sheets.properties.title',
  });
  const actualTabs = (meta.data.sheets ?? []).map(s => s.properties.title).filter(Boolean);
  const known = new Set(TAB_NAMES);
  const extraTabs = actualTabs.filter(t => !known.has(t));
  TAB_NAMES = [...TAB_NAMES, ...extraTabs];
  console.log("Tabs:", TAB_NAMES.join(", "));

  const embeddedData = {};
  
  for (const tab of TAB_NAMES) {
    try {
      const r = await client.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: sheetRange(tab),
        valueRenderOption: "FORMATTED_VALUE",
      });
      const rawRows = r.data.values ?? [];
      embeddedData[tab] = processTab(tab, rawRows);
      console.log(tab + ": " + rawRows.length + " rows, " + embeddedData[tab].maxCols + " cols, " + embeddedData[tab].nonEmptyRows + " non-empty");
    } catch(e) {
      console.log(tab + ": ERROR " + e.message);
      embeddedData[tab] = processTab(tab, []);
    }
  }
  
  // Build DASHBOARD_ANALYTICS from the data
  const deptTabs = TAB_NAMES.filter(name => !["OVERVIEW"].includes(name));
  const departmentItems = deptTabs.map(name => {
    const d = embeddedData[name];
    return { name: name.split(" - ")[0].split(" - ")[0], items: d.nonEmptyRows, quantity: d.metrics.quantityTotal };
  });
  
  // Get schedule from OVERVIEW
  const overview = embeddedData["OVERVIEW"];
  const schedule = [];
  for (const row of overview.rows) {
    const cells = row.cells.filter(c => c !== null);
    if (cells.length >= 2) {
      const dateStr = String(cells[0]);
      if (/\d{1,2}[.\/\-]\d{1,2}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i.test(dateStr)) {
        schedule.push({ date: dateStr, phase: String(cells[1] || ""), details: String(cells[2] || ""), resource: String(cells[3] || "") });
      }
    }
  }
  
  const DASHBOARD_KPIS = {
    tabs: TAB_NAMES.length,
    departments: deptTabs.length,
    trackedItems: Object.values(embeddedData).reduce((a,d) => a + d.nonEmptyRows, 0),
    scheduleDays: schedule.length || 14,
    project: "EC26 Electric Castle Mainstage",
    venue: "Banffy Castle Domain",
    location: "Cluj-Napoca, Romania"
  };
  
  const DASHBOARD_ANALYTICS = { departmentItems, schedule: schedule.slice(0, 10) };
  
  // Generate TypeScript file
  const ts = `export const SHEET_ID = "${SHEET_ID}";
export const TAB_NAMES = ${JSON.stringify(TAB_NAMES, null, 2)} as const;

export type TabName = typeof TAB_NAMES[number];
export type SheetCell = string | number | boolean | null;
export type SheetRow = { rowNumber: number; cells: SheetCell[] };
export type SheetTab = {
  title: string;
  headline: string;
  rowCount: number;
  nonEmptyRows: number;
  maxCols: number;
  rows: SheetRow[];
  metrics: { sections: number; quantityTotal: number };
  sections: unknown[];
};
export type SheetData = Record<TabName, SheetTab>;

export const EMBEDDED_SHEET_DATA: SheetData = ${JSON.stringify(embeddedData, null, 2)};
export const DASHBOARD_KPIS = ${JSON.stringify(DASHBOARD_KPIS, null, 2)};
export const DASHBOARD_ANALYTICS = ${JSON.stringify(DASHBOARD_ANALYTICS, null, 2)};
`;
  
  fs.writeFileSync('/root/nodal-dashboard-v4/lib/sheet-data.ts', ts);
  console.log("Written sheet-data.ts (" + ts.length + " bytes)");
  
  // Summary
  console.log("\nKPIs:", JSON.stringify(DASHBOARD_KPIS));
  console.log("Dept items:", departmentItems.map(d => d.name + ":" + d.items).join(", "));
}

main().catch(e => { console.error(e.stack); process.exit(1); });

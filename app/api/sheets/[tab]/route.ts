import { NextResponse } from 'next/server';
import { EMBEDDED_SHEET_DATA, SHEET_ID, TAB_NAMES } from '@/lib/sheet-data';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

type TabName = (typeof TAB_NAMES)[number];

/* ─── Service-account credentials (same as build-sheet-data.cjs) ────── */
const SERVICE_ACCOUNT_EMAIL = 'nodal-v2@nodal-dahsboard.iam.gserviceaccount.com';
const PRIVATE_KEY = `-----BEGIN PRIVATE KEY-----
MIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDH6RqAPwJ0E10p
L++8TUcQbXTpER+fDPs22oFfVseW6ntNkTCJDJ33FCgpzLjUBLL9L7jLFgi9owWf
Z5XQfhaXiB4r49hQKa/EKUhxHz5MYn3Kh9wZBMRnez+XUcHDKIBd2q7iMxq/dRBZ
gCgDi5RX3EhDc87Jyi5vVbMe9YlOtAfGOQDJ1fTBw0DweDMT8e/S9a1kZ7iNGkzN
SacYtzjKTug4DBKQlr9pfXgEVVvzg00tNQ1yuZtP6LFsmuyYwFj9cojOQMEUg/J1
lstixJT2LUpCZgN/OkvQk4vpX4HCTCCD9ahwnTgXAKdhTA5uZXdZpPpMbpvd9JsS
Oa81Aqi1AgMBAAECggEAQ3CrJQqcrEYADq4CRVcYmz0hzKKfNUvuz8GFFYG0EYCH
GlLZudJM1Bazue47iCMRswJPaAvF5RvDANS0IML4oiQkcZAK4Hg/uIBo1OjCXoh3
gUS2BqaqD3Lvr/+/yzO1onPsvZiZ9G7slhT66r9CyyUgJ8lAwKh5Y8vYgqA4sxjF
jo4bfjJT1H2wcSZE4ocTp3X/2nPUDO5xQ+oU9ovufd/EMO+pX2OJTOH3gqWyBVg5
IHMl/OP/+zjv2yEQdhA3DWeOupN1tY2HQCdpbFSio3nvXfbavNYrCWv5o7TSkuMb
kAPZMOCDEY38R4cDetpXaf0xBjjIhhB5mXMWWkn/nQKBgQD5Wg8KBAszQm7ivn6D
pjTJbMptQlf7axTih/R0FIYhuIuQu/yaGqbimOtAyuuqoxljI/Dof4NPo0V0u0PN
e0XqnC8LRj65mKRXQOe6OBbbM5Lyx7FRQ966qdB+eIm+Jnl/ELaC5QFVg8fe7rrG
QGur/VI7H4jKAzBS48mRKG6rhwKBgQDNPZXkJmu6CuiIlnkH2SVkweDr2xvs9+/3
8oEVyKFwzxCnaAHfjEMnY+M6ucCHAQZ628TlzzCijIqnamKZ38oDI8KyFjgNs5+i
dTqlKSw0DmRxfKYHcf0Mk6Cjltrm5KuAAjUvtAvU13TJiqX/JwTTeUOCOAEUY6Rc
0OgODd7w4wKBgQCuCmT62a2znofk7Y9Cdkzb1npH3omoa6pNHxXJu9WPTc7kO8Hp
EfcvrApv0/K/zE1Y/GoW7YGKoWxGOLrvfj5jrZXMacA4LMlwOVZEjQevAgVsPWOP
VC7u3L4wuBN0TEh7HwA0xoCy3mMwQDLPU4GTryGpMK56SdV91Y4IKk9smwKBgD2F
kXHTZoVdEbknyd3lZIUgbMimZGeTJrafVbxu6J3FJAvabH1TMSoUkh+fYKvXTdb0
G8B7a+u9zy5CAI55e7eXN5xkdqb8ygRLuamafuqXydoO8EHZFG55rjR7WuDNeO8l
OkYzZTyG3TYwvnOOga7WcbsOCJzRBYrhAD5+P+7bAoGBAI8ShZFDqvMdpRfGRtNJ
3Q0/M5yarP7CqsuMowpkgzJfzwg3IT+3LLLJCidXAlwSbAWxVBpK1rBcsZvFHKxx
qYHZE44KjigfLXpE5nuX2aN8ygPjfI62K861uWEvxWwYTINy8248RCk5o7sG/K/V
CaktxgXR27tU23XiibAS+Lh4
-----END PRIVATE KEY-----`;

/* ─── JWT auth via Web Crypto (proven in V3) ──────────────────────────── */
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: object) =>
    Buffer.from(JSON.stringify(obj)).toString('base64url');
  const unsigned = `${enc(header)}.${enc(payload)}`;

  const keyStr = PRIVATE_KEY
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '');
  const keyBuf = Buffer.from(keyStr, 'base64');
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuf,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsigned)
  );
  const jwt = `${unsigned}.${Buffer.from(sig).toString('base64url')}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/* ─── Fetch one tab from Google Sheets REST API ───────────────────────── */
async function fetchTab(tab: string, token: string) {
  const range = encodeURIComponent(`'${tab}'!A1:Z1000`);
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?valueRenderOption=FORMATTED_VALUE`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) return [];
  const json = (await res.json()) as { values?: string[][] };
  return json.values ?? [];
}

/* ─── Route handler ───────────────────────────────────────────────────── */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tab: string }> }
) {
  const { tab: rawTab } = await params;
  const tab = decodeURIComponent(rawTab) as TabName;

  if (!TAB_NAMES.includes(tab)) {
    return NextResponse.json({ error: 'Unknown tab' }, { status: 404 });
  }

  const sheetId = SHEET_ID;
  const range = `'${tab.replace(/'/g, "''")}'!A1:Z1000`;

  try {
    const token = await getAccessToken();
    const values = await fetchTab(tab, token);
    return NextResponse.json({ sheetId, tab, range, live: true, values });
  } catch (error) {
    console.error(`[sheets/${tab}] Live fetch failed:`, error);
    return NextResponse.json({
      sheetId,
      tab,
      range,
      live: false,
      error: String(error),
      data: EMBEDDED_SHEET_DATA[tab],
    });
  }
}

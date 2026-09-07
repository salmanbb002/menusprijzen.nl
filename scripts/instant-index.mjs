#!/usr/bin/env node
/**
 * Instant Indexing script
 * Submits URLs to:
 *   1) IndexNow (fans out to Bing, Yandex, Naver, Seznam, Yep, etc.)
 *   2) Google's Indexing API (via a service account that is an Owner on the
 *      Search Console property for this URL's domain)
 *
 * No npm dependencies required (uses only Node.js built-ins: crypto + fetch).
 *
 * Usage:
 *   node scripts/instant-index.mjs https://example.com/a https://example.com/b
 *   node scripts/instant-index.mjs --sitemap https://example.com/sitemap.xml
 *
 * Required env vars:
 *   SITE_URL                     e.g. https://example.com
 *   INDEXNOW_KEY                 your shared IndexNow key (hex string)
 *   GOOGLE_SERVICE_ACCOUNT_JSON  full JSON string of the service account key
 *
 * Optional env vars:
 *   SKIP_GOOGLE=1     skip Google Indexing API calls
 *   SKIP_INDEXNOW=1   skip IndexNow calls
 */

import crypto from 'node:crypto';

const SITE_URL = (process.env.SITE_URL || '').replace(/\/$/, '');
const INDEXNOW_KEY = process.env.INDEXNOW_KEY;
const GOOGLE_SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function getUrlsFromArgsOrSitemap() {
  const args = process.argv.slice(2);
  const sitemapIdx = args.indexOf('--sitemap');
  if (sitemapIdx !== -1) {
    const sitemapUrl = args[sitemapIdx + 1] || `${SITE_URL}/sitemap.xml`;
    const res = await fetch(sitemapUrl);
    if (!res.ok) throw new Error(`Failed to fetch sitemap ${sitemapUrl}: HTTP ${res.status}`);
    const xml = await res.text();
    return [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1].trim());
  }
  return args.filter((a) => a.startsWith('http'));
}

async function submitIndexNow(urls) {
  if (process.env.SKIP_INDEXNOW === '1') return;
  if (!INDEXNOW_KEY || !SITE_URL) {
    console.warn('[indexnow] Missing INDEXNOW_KEY or SITE_URL, skipping.');
    return;
  }
  const host = new URL(SITE_URL).host;
  const body = {
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList: urls,
  };
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  });
  console.log(`[indexnow] submitted ${urls.length} url(s) -> HTTP ${res.status}`);
  if (!res.ok) {
    console.error('[indexnow] response body:', await res.text().catch(() => ''));
  }
}

async function getGoogleAccessToken(credentials) {
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: credentials.client_email,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  };
  const unsigned = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(claimSet))}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(unsigned);
  signer.end();
  const signature = signer
    .sign(credentials.private_key)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`Google token exchange failed: ${JSON.stringify(data)}`);
  return data.access_token;
}

async function submitGoogle(urls) {
  if (process.env.SKIP_GOOGLE === '1') return;
  if (!GOOGLE_SA_JSON) {
    console.warn('[google] Missing GOOGLE_SERVICE_ACCOUNT_JSON, skipping.');
    return;
  }
  const credentials = JSON.parse(GOOGLE_SA_JSON);
  const accessToken = await getGoogleAccessToken(credentials);

  for (const url of urls) {
    try {
      const res = await fetch('https://indexing.googleapis.com/v3/urlNotifications:publish', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, type: 'URL_UPDATED' }),
      });
      const text = await res.text();
      console.log(`[google] ${url} -> HTTP ${res.status}`);
      if (!res.ok) console.error('[google] response:', text);
    } catch (err) {
      console.error(`[google] ${url} failed:`, err.message);
    }
    // gentle pacing to stay well within Google's default quota
    await new Promise((r) => setTimeout(r, 300));
  }
}

async function main() {
  const urls = await getUrlsFromArgsOrSitemap();
  if (urls.length === 0) {
    console.error('No URLs provided. Pass URLs as args or use --sitemap <url>.');
    process.exit(1);
  }
  console.log(`Submitting ${urls.length} URL(s) for ${SITE_URL || '(unknown site)'}`);
  await Promise.all([submitIndexNow(urls), submitGoogle(urls)]);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

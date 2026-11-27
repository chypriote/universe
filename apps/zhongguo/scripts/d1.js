// The flight searches live in the `zhongguo` D1 database. The site is static, so china.js and the
// build reach it through the D1 REST API with a D1 token (D1_API_TOKEN), not through a binding.
import { existsSync, readFileSync } from 'node:fs';

const wranglerConfig = new URL('../wrangler.jsonc', import.meta.url);
const envFile = new URL('../.env', import.meta.url);

function configValue(key) {
  const value = readFileSync(wranglerConfig, 'utf8').match(
    new RegExp(`"${key}":\\s*"([^"]+)"`),
  )?.[1];
  if (!value) throw new Error(`${key} is missing from wrangler.jsonc.`);
  return value;
}

export async function d1Query(sql, params = []) {
  if (!process.env.D1_API_TOKEN && existsSync(envFile)) process.loadEnvFile(envFile);
  const token = process.env.D1_API_TOKEN;
  if (!token) {
    throw new Error(
      'D1_API_TOKEN is not set. It is the Cloudflare API token with D1 access (README.md).',
    );
  }
  const url = `https://api.cloudflare.com/client/v4/accounts/${configValue('account_id')}/d1/database/${configValue('database_id')}/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ sql, params }),
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(`D1 query failed (${res.status}): ${JSON.stringify(body.errors)}`);
  }
  return body.result[0].results;
}

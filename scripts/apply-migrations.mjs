// Applies the production migrations to the new `gymdesk-next` project via the
// Management API. Safe: only touches vybzakdbifmnruponyzl.
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const REF = 'vybzakdbifmnruponyzl';
if (!PAT) { console.error('Set SUPABASE_ACCESS_TOKEN.'); process.exit(1); }

const API = `https://api.supabase.com/v1/projects/${REF}/database`;

async function query(sql) {
  const res = await fetch(`${API}/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${text.slice(0, 500)}`);
  return text;
}

async function enableExtension() {
  // Not used — pg_cron is enabled via SQL query instead.
}

async function main() {
  const dir = '/Users/spiros/Desktop/members-9d7929df16dd237747c644c1be0469ab204e345e/supabase/migrations';
  const files = readdirSync(dir).filter(f => f.endsWith('.sql')).sort();

  // pg_cron required by cron jobs + expire-members migration.
  const ext = await query("select extname from pg_extension where extname = 'pg_cron'");
  if (ext.indexOf('pg_cron') === -1) {
    console.log('Enabling pg_cron…');
    await query('create extension if not exists pg_cron with schema pg_cron;');
    console.log('pg_cron enabled.');
  } else {
    console.log('pg_cron already present.');
  }

  for (const f of files) {
    console.log(`Applying ${f} …`);
    const sql = readFileSync(join(dir, f), 'utf8');
    await query(sql);
    console.log(`OK: ${f}`);
  }
  console.log('All migrations applied.');
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

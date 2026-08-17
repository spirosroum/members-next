// Seeds the isolated gymdesk-next project with realistic test data.
// Uses the Management API (postgres role), so it bypasses RLS. Idempotent:
// safe to re-run (upserts by primary key / deletes first).
import { readFileSync } from 'node:fs';

const PAT = process.env.SUPABASE_ACCESS_TOKEN;
const REF = 'vybzakdbifmnruponyzl';
if (!PAT) { console.error('Set SUPABASE_ACCESS_TOKEN.'); process.exit(1); }
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`;

async function query(sql) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql })
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`SQL failed (${res.status}): ${text.slice(0, 400)}`);
  return text;
}

const today = new Date();
function iso(daysFromNow) {
  const d = new Date(today);
  d.setDate(d.getDate() + daysFromNow);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const daysAgoIso = iso; // same math

async function main() {
  // Clean slate (idempotent re-run).
  await query(`
    delete from public.class_checkins; delete from public.visits; delete from public.payments;
    delete from public.member_private; delete from public.members; delete from public.plans;
    delete from public.schedules; delete from public.schedule_slots; delete from public.settings;
    delete from public.notifications; delete from public.member_pins;
  `);

  // ---- PLANS ----
  await query(`
    insert into public.plans (id, name, description, days, sessions, price, color, is_public, starred, is_trial) values
      ('plan-monthly',   'Monthly Unlimited',    'Full access for 30 days.', 30, null, 45.00, '#2563eb', true, true,  false),
      ('plan-8x',        '8 Sessions',           '8 drop-in sessions.',     null, 8,  32.00, '#16a34a', true, false, false),
      ('plan-4x',        '4 Sessions',           '4 drop-in sessions.',     null, 4,  18.00, '#0891b2', true, false, false),
      ('plan-trial',     'Free Trial',           '1 week trial.',           7,  null, 0.00,  '#f59e0b', true, false, true)
    on conflict (id) do update set name = excluded.name, days = excluded.days, sessions = excluded.sessions,
      price = excluded.price, color = excluded.color, is_public = excluded.is_public, is_trial = excluded.is_trial;
  `);

  // ---- SCHEDULES + SLOTS ----
  await query(`
    insert into public.schedules (id, name, description, color, capacity, is_public, available_from) values
      ('sch-gi',    'Gi Class',    'Traditional gi grappling.',     '#2563eb', 20, true,  '${daysAgoIso(-60)}'),
      ('sch-nogi',  'No-Gi Class', 'Submission grappling, no gi.',  '#dc2626', 18, true,  '${daysAgoIso(-60)}'),
      ('sch-open',  'Open Mat',    'Free rolling session.',         '#16a34a', 25, true,  '${daysAgoIso(-60)}')
    on conflict (id) do update set name = excluded.name, color = excluded.color, capacity = excluded.capacity, is_public = excluded.is_public;
  `);
  await query(`
    insert into public.schedule_slots (id, schedule_id, day, start, "end") values
      ('slot-gi-mon',   'sch-gi',   'Monday',    '18:00', '19:30'),
      ('slot-gi-wed',   'sch-gi',   'Wednesday', '18:00', '19:30'),
      ('slot-nogi-tue', 'sch-nogi', 'Tuesday',   '19:30', '21:00'),
      ('slot-nogi-thu', 'sch-nogi', 'Thursday',  '19:30', '21:00'),
      ('slot-open-sat', 'sch-open', 'Saturday',  '11:00', '12:30')
    on conflict (id) do nothing;
  `);

  // ---- MEMBERS (various states) ----
  await query(`
    insert into public.members (id, first_name, last_name, gender, belt, expiration_date, account_status, sessions_total, sessions_left, plan_days, hide_from_leaderboard, trial_participant, trial_converted) values
      ('1001', 'Yiannis',  'Papadopoulos', 'Male',   'Purple', '${iso(20)}',  'active',   false, 0, 30, false, false, false),
      ('1002', 'Maria',    'Kontou',       'Female', 'Blue',   null,          'active',   true,  6, null, false, false, false),
      ('1003', 'Giorgos',  'Nikolaou',     'Male',   'White',  '${iso(-3)}',  'inactive', false, 0, 30, false, false, false),
      ('1004', 'Eleni',    'Vasilaki',     'Female', 'White',  '${iso(-30)}', 'inactive', false, 0, null, false, false, false),
      ('1005', 'Dimitris', 'Alexandrou',   'Male',   'Brown',  '${iso(45)}',  'frozen',   false, 0, 30, false, false, false),
      ('1006', 'Sofia',    'Roussou',      'Female', 'Black',  null,          'active',   true,  0, null, false, false, true)
    on conflict (id) do update set first_name = excluded.first_name, last_name = excluded.last_name, belt = excluded.belt,
      expiration_date = excluded.expiration_date, account_status = excluded.account_status, sessions_total = excluded.sessions_total,
      sessions_left = excluded.sessions_left, plan_days = excluded.plan_days, hide_from_leaderboard = excluded.hide_from_leaderboard;
  `);

  // Private data (admin-only via RLS)
  await query(`
    insert into public.member_private (member_id, email, phone, dob, notes) values
      ('1001', 'yiannis@example.gr', '+306912345678', '1990-04-12', 'Prefers morning class.'),
      ('1002', 'maria@example.gr',   '+306987654321', '1995-09-03', null),
      ('1004', 'eleni@example.gr',   null,            '2001-01-20', 'Trial interest.'),
      ('1006', 'sofia@example.gr',   '+306900000001', '1988-11-30', 'Belt test scheduled.')
    on conflict (member_id) do update set email = excluded.email, phone = excluded.phone, notes = excluded.notes;
  `);

  // ---- PAYMENTS (so the ledger + reconciliation have data) ----
  await query(`
    insert into public.payments (id, member_id, date, amount, note, plan_id, sessions_granted, applied_expiration, applied_start_date) values
      ('pay-1001-1', '1001', '${daysAgoIso(-20)}', 45.00, 'System: Applied Plan Monthly Unlimited', 'plan-monthly', null, '${iso(10)}',  '${daysAgoIso(-20)}'),
      ('pay-1002-1', '1002', '${daysAgoIso(-10)}', 32.00, 'System: Applied Plan 8 Sessions',       'plan-8x',      8,    null,          '${daysAgoIso(-10)}'),
      ('pay-1006-1', '1006', '${daysAgoIso(-40)}', 32.00, 'System: Applied Plan 8 Sessions',       'plan-8x',      8,    null,          '${daysAgoIso(-40)}'),
      ('pay-1001-2', '1001', '${daysAgoIso(10)}',  45.00, 'Renewal Monthly',                      'plan-monthly', null, '${iso(20)}',   '${iso(10)}')
    on conflict (id) do nothing;
  `);

  // ---- SETTINGS ----
  await query(`
    insert into public.settings (key, value) values
      ('portal_name',           '"🥋 SSG BJJ"'),
      ('currency',              '"€"'),
      ('checkin_notice',        '"Welcome! Please check in with your member ID."'),
      ('checkin_notice_color',  '"#fde68a"'),
      ('show_class_checkins',   'true'),
      ('hidden_belts',          '[]')
    on conflict (key) do update set value = excluded.value;
  `);

  console.log('Seeded plans, schedules, members, payments, settings.');
}

main().catch(e => { console.error('FAILED:', e.message); process.exit(1); });

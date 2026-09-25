import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, mocks = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, { exports, Date, URL, URLSearchParams, require: (name) => { if (!(name in mocks)) throw new Error(`Unexpected import ${name}`); return mocks[name]; } });
  return exports;
}
const types = load('src/lib/types.ts');
function setup({ appliedAt = null, failure = null, signedIn = true } = {}) {
  const writes = [], refreshed = [];
  const client = { auth: { getUser: async () => ({ data: { user: signedIn ? { id: 'user' } : null }, error: null }) }, from(table) {
    let op = 'read', value;
    const chain = {
      select() { return chain; }, eq() { return chain; }, order() { return chain; },
      update(data) { op = 'update'; value = data; return chain; }, insert(data) { op = 'insert'; value = data; return chain; }, delete() { op = 'delete'; return chain; },
      upsert(data) { op = 'upsert'; value = data; return chain; },
      single() { return chain; }, maybeSingle() { return chain; },
      then(resolve, reject) {
        if (op !== 'read') writes.push({ table, op, value });
        return Promise.resolve({ data: table === 'jobs' ? { id: 'job', applied_at: appliedAt } : [], error: op === 'read' ? null : failure }).then(resolve, reject);
      },
    }; return chain;
  }};
  return { api: load('src/app/actions.ts', { 'next/cache': { revalidatePath: (path) => refreshed.push(path) }, '@/lib/supabase/server': { createClient: async () => client }, '@/lib/types': types, '@/lib/mutation': load('src/lib/mutation.ts') }), writes, refreshed };
}
function form(values) { const data = new FormData(); Object.entries(values).forEach(([k, v]) => data.set(k, v)); return data; }
test('status changes preserve the original application date', async () => {
  const { api, writes } = setup({ appliedAt: '2025-01-01T00:00:00Z' });
  await api.updateJobStatus('job', form({ status: 'applied' }));
  assert.equal(Object.hasOwn(writes[0].value, 'applied_at'), false);
});
test('first application records its date and refreshes affected pages', async () => {
  const { api, writes, refreshed } = setup();
  await api.updateJobStatus('job', form({ status: 'applied' }));
  assert.ok(!Number.isNaN(Date.parse(writes[0].value.applied_at)));
  for (const path of ['/', '/applications', '/documents', '/jobs/job']) assert.ok(refreshed.includes(path));
});
test('invalid status cannot write', async () => {
  const { api, writes } = setup();
  assert.ok((await api.updateJobStatus('job', form({ status: 'invented' }))).error);
  assert.equal(writes.length, 0);
});
test('failed deletion returns an error without redirect or refresh', async () => {
  const { api, refreshed } = setup({ failure: { message: 'Offline' } });
  const result = await api.deleteJob('job');
  assert.equal(result.error, 'Offline'); assert.equal(result.redirectTo, undefined); assert.equal(refreshed.length, 0);
});
test('failed autosaves are observable and can be retried', async () => {
  const { api } = setup({ failure: { message: 'Please retry' } });
  assert.equal((await api.updateNote('note', { body: '[ ] Keep draft' })).error, 'Please retry');
  assert.equal((await api.setSkillList('skill', ['Biology'])).error, 'Please retry');
});
test('mutations require authentication', async () => {
  const { api, writes } = setup({ signedIn: false });
  await assert.rejects(api.deleteNote('note'), /Sign in/); assert.equal(writes.length, 0);
});
test('missing job fields return focusable field errors', async () => {
  const { api, writes } = setup();
  const result = await api.createJob(form({ company: ' ', title: '' }));
  assert.ok(result.fieldErrors.company); assert.ok(result.fieldErrors.title); assert.equal(writes.length, 0);
});
test('serial saves cannot finish out of order and a failed save does not block retry', async () => {
  const { createSerialSave } = load('src/lib/serial-save.ts');
  const queue = createSerialSave(), events = [];
  let release;
  const wait = new Promise((resolve) => { release = resolve; });
  const first = queue(async () => { events.push('first start'); await wait; events.push('first end'); });
  const second = queue(async () => { events.push('second'); throw new Error('offline'); });
  const caught = second.catch(() => {});
  const third = queue(async () => { events.push('retry'); });
  await Promise.resolve(); assert.deepEqual(events, ['first start']); release();
  await Promise.all([first, caught, third]); assert.deepEqual(events, ['first start', 'first end', 'second', 'retry']);
});
test('deadlines use calendar days even late in the day and across DST', () => {
  const { calendarDaysUntil } = load('src/lib/mutation.ts');
  assert.equal(calendarDaysUntil('2026-09-09', new Date(2026, 8, 9, 23, 59)), 0);
  assert.equal(calendarDaysUntil('2026-09-08', new Date(2026, 8, 9, 0, 1)), -1);
  assert.equal(calendarDaysUntil('2026-03-09', new Date(2026, 2, 8, 12)), 1);
});
test('return navigation retains application filters and rejects external destinations', () => {
  const { applicationReturn } = load('src/lib/mutation.ts');
  assert.equal(applicationReturn('/applications?view=jobs&q=Bio&status=saved'), '/applications?view=jobs&q=Bio&status=saved');
  for (const value of ['https://evil.test', '//evil.test', '/applications-evil', null]) assert.equal(applicationReturn(value), '/applications');
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, mocks) {
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, URL, Response, require: (name) => {
    if (!(name in mocks)) throw new Error(`Unexpected import: ${name}`);
    return mocks[name];
  }});
  return exports;
}
function actions(auth, origin = 'https://career.example') {
  return load('src/app/auth-actions.ts', {
    'next/navigation': { redirect: (url) => { throw new Error(`REDIRECT:${url}`); } },
    'next/headers': { headers: async () => new Headers(origin ? { origin } : {}) },
    '@/lib/supabase/server': { createClient: async () => ({ auth }) },
    '@/lib/supabase/service': { createServiceClient: () => { throw new Error('Recovery must not use admin credentials'); } },
  });
}

test('reset request validates email before contacting Supabase', async () => {
  assert.match((await actions({}).requestPasswordReset('bad')).error, /valid email/);
});
test('reset request uses same-origin callback and trims email', async () => {
  let called = false;
  const result = await actions({ resetPasswordForEmail: async (email, options) => {
    called = true;
    assert.equal(email, 'max@example.com');
    assert.equal(options.redirectTo, 'https://career.example/auth/callback');
    return { error: null };
  }}).requestPasswordReset(' max@example.com ');
  assert.equal(called, true);
  assert.equal(result.error, undefined);
});
test('missing origin cannot produce a recovery redirect', async () => {
  assert.match((await actions({}, null).requestPasswordReset('max@example.com')).error, /Refresh/);
});
test('rate limits have actionable feedback', async () => {
  const result = await actions({ resetPasswordForEmail: async () => ({ error: { status: 429 } }) }).requestPasswordReset('max@example.com');
  assert.match(result.error, /Wait a few minutes/);
});
test('unknown and existing accounts get the same successful response', async () => {
  const api = actions({ resetPasswordForEmail: async () => ({ error: null }) });
  assert.equal(JSON.stringify(await api.requestPasswordReset('known@example.com')), JSON.stringify(await api.requestPasswordReset('unknown@example.com')));
});
test('short and mismatched passwords are rejected before auth calls', async () => {
  const api = actions({});
  assert.match((await api.updatePassword('short', 'short')).error, /8 characters/);
  assert.match((await api.updatePassword('long-password', 'different-password')).error, /don’t match/);
});
test('expired session cannot update a password', async () => {
  const api = actions({ getUser: async () => ({ data: { user: null }, error: null }) });
  assert.match((await api.updatePassword('long-password', 'long-password')).error, /expired/);
});
test('Supabase password policy errors are shown without signing out', async () => {
  const api = actions({ getUser: async () => ({ data: { user: { id: 'u' } }, error: null }), updateUser: async () => ({ error: { message: 'Use a different password.' } }) });
  assert.equal((await api.updatePassword('long-password', 'long-password')).error, 'Use a different password.');
});
test('successful update ends recovery session and redirects to login confirmation', async () => {
  const calls = [];
  const api = actions({ getUser: async () => ({ data: { user: { id: 'u' } }, error: null }), updateUser: async ({ password }) => { calls.push(password); return { error: null }; }, signOut: async ({ scope }) => { calls.push(scope); return { error: null }; } });
  await assert.rejects(api.updatePassword('long-password', 'long-password'), /REDIRECT:\/login\?password=updated/);
  assert.deepEqual(calls, ['long-password', 'local']);
});
function callback(exchangeCodeForSession) {
  return load('src/app/auth/callback/route.ts', {
    'next/server': { NextResponse: { redirect: (url) => url.toString() } },
    '@/lib/supabase/server': { createClient: async () => ({ auth: { exchangeCodeForSession } }) },
  }).GET;
}
function request(path) { const url = new URL(path, 'https://career.example'); return { url: url.toString(), nextUrl: url }; }
test('valid callback exchanges code and ignores untrusted redirect destinations', async () => {
  const handler = callback(async (code) => { assert.equal(code, 'valid'); return { error: null }; });
  assert.equal((await handler(request('/auth/callback?code=valid&next=https://evil.example'))).headers.get('location'), '/reset-password');
});
test('expired and reused links route back to recovery with useful feedback', async () => {
  const handler = callback(async () => ({ error: { message: 'expired' } }));
  assert.equal((await handler(request('/auth/callback?code=expired'))).headers.get('location'), '/forgot-password?error=invalid_link');
});
test('missing code or provider error never exchanges a session', async () => {
  const handler = callback(() => { throw new Error('Must not exchange'); });
  for (const path of ['/auth/callback', '/auth/callback?error=access_denied&code=bad']) {
    assert.equal((await handler(request(path))).headers.get('location'), '/forgot-password?error=invalid_link');
  }
});

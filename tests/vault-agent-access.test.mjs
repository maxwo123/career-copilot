import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { createCipheriv, randomBytes } from 'node:crypto';
import * as nodeCrypto from 'node:crypto';

function load(serviceClient) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync('src/lib/vault-agent-access.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports, Buffer, process: { env: { MCP_TOKEN: 'test-token-long-enough-for-key-wrapping-123456' } },
    require: (name) => {
      if (name === 'node:crypto') return nodeCrypto;
      if (name === '@/lib/supabase/service') return { createServiceClient: () => serviceClient };
      throw new Error(`Unexpected import ${name}`);
    },
  });
  return exports;
}

function encrypted(key, text) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(text), cipher.final(), cipher.getAuthTag()]);
  return { iv: iv.toString('base64'), ciphertext: ciphertext.toString('base64') };
}

test('agent access lists login metadata, retrieves a password, then stops after access is removed', async () => {
  const rawKey = randomBytes(32);
  const login = { site: 'Employer', url: 'https://employer.example/login', email: 'user@example.com', password: 'secret' };
  const itemId = '4915463b-f077-4321-ad5c-e248f9aae58d';
  let enabled = true;
  const items = [{ id: itemId, ...encrypted(rawKey, Buffer.from(JSON.stringify(login))) }];
  const serviceClient = { from(table) {
    let inserted = null;
    const chain = {
      select() { return chain; }, limit() { return chain; }, eq() { return chain; }, order() { return chain; },
      insert(value) { inserted = value; return chain; },
      async single() {
        const id = '6de1fe07-3dc0-4aaa-9bd9-54ba91e18340';
        items.push({ id, ...inserted });
        return { data: { id }, error: null };
      },
      then(resolve, reject) {
        return Promise.resolve(table === 'credential_vault_agent_access'
          ? { data: enabled ? [{ user_id: 'user-id', wrapped_key_iv: wrapped.iv, wrapped_key_ciphertext: wrapped.ciphertext }] : [], error: null }
          : { data: items, error: null }
        ).then(resolve, reject);
      },
    };
    return chain;
  }};
  const { wrapVaultKey, verifyVaultKey, listAgentVaultLogins, getAgentVaultLogin, saveAgentVaultLogin } = load(serviceClient);
  const wrapped = wrapVaultKey(rawKey);
  const verifier = encrypted(rawKey, Buffer.from('Career Copilot credential vault v1'));
  assert.equal(verifyVaultKey(rawKey, verifier.iv, verifier.ciphertext), true);
  assert.equal(verifyVaultKey(randomBytes(32), verifier.iv, verifier.ciphertext), false);

  const listed = await listAgentVaultLogins();
  assert.deepEqual({ ...listed[0] }, { login_id: itemId, site: login.site, url: login.url, email: login.email });
  assert.equal(Object.hasOwn(listed[0], 'password'), false);
  assert.deepEqual({ ...await getAgentVaultLogin(itemId) }, login);
  const newLogin = { site: 'Other', url: 'https://other.example/login', email: 'new@example.com', password: 'new-secret' };
  const saved = await saveAgentVaultLogin(newLogin);
  assert.deepEqual({ ...await getAgentVaultLogin(saved.login_id) }, newLogin);
  assert.equal(Object.hasOwn(items[1], 'password'), false);
  enabled = false;
  await assert.rejects(getAgentVaultLogin(itemId), /access is off/);
});

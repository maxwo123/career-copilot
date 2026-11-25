import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(file, mocks = {}, env = { MCP_TOKEN: 'test-token' }) {
  const exports = {};
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    exports,
    process: { env },
    require: (name) => {
      if (!(name in mocks)) throw new Error(`Unexpected import ${name}`);
      return mocks[name];
    },
  });
  return exports;
}

const writes = [];
const client = { from(table) {
  let op = 'read', value, columns = '*';
  const chain = {
    select(selected) { columns = selected; return chain; },
    order() { return chain; }, eq() { return chain; },
    update(data) { op = 'update'; value = data; return chain; },
    insert(data) { op = 'insert'; value = data; return chain; },
    maybeSingle() {
      if (table === 'profile' && columns === 'id') return Promise.resolve({ data: { id: 'profile' }, error: null });
      if (table === 'profile') return Promise.resolve({ data: {
        id: 'profile', email: 'resume@example.com', gpa: null,
        us_work_authorized: null, requires_sponsorship: null,
        general_availability: null, preferred_application_email: null,
      }, error: null });
      return Promise.resolve({ data: null, error: null });
    },
    then(resolve, reject) {
      if (op !== 'read') writes.push({ table, op, value });
      return Promise.resolve({ data: [], error: null }).then(resolve, reject);
    },
  };
  return chain;
}};
const profileParser = load('src/lib/application-profile.ts');
const { mcpPost, dispatchMcp } = load('src/lib/mcp-server.ts', {
  'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
  '@/lib/supabase/service': { createServiceClient: () => client },
  '@/lib/types': load('src/lib/types.ts'),
  '@/lib/application-profile': profileParser,
  '@/lib/vault-agent-access': {
    listAgentVaultLogins: async () => [],
    getAgentVaultLogin: async () => { throw new Error('not used in profile tests'); },
    saveAgentVaultLogin: async () => { throw new Error('not used in profile tests'); },
  },
});
const request = (method, params = {}) => ({
  headers: { get: (name) => name === 'authorization' ? 'Bearer test-token' : null },
  json: async () => ({ jsonrpc: '2.0', id: 1, method, params }),
});

test('personal context MCP requires its own token and limits reads to shared owner sections', async () => {
  const owner = '12345678-1234-1234-1234-123456789abc';
  const personalToken = 'p'.repeat(64);
  const careerToken = 'c'.repeat(64);
  const env = {
    PERSONAL_CONTEXT_OWNER_ID: owner,
    PERSONAL_CONTEXT_MCP_TOKENS: [personalToken, careerToken].join(','),
    MCP_TOKEN: careerToken,
  };
  const filters = [];
  const query = {
    select(columns) { assert.equal(columns, 'section, markdown, updated_at'); return query; },
    eq(field, value) { filters.push([field, value]); return query; },
    neq(field, value) { assert.equal(field, 'markdown'); assert.equal(value, ''); return query; },
    order() { return query; },
    then(resolve) { return Promise.resolve({ data: [] }).then(resolve); },
  };
  const { POST } = load('src/app/api/mcp/personal/route.ts', {
    'node:crypto': await import('node:crypto'),
    'next/server': { NextResponse: { json: (body, options) => ({ body, status: options?.status ?? 200 }) } },
    '@/lib/mcp-server': { dispatchMcp },
    '@/lib/personal-context': load('src/lib/personal-context.ts'),
    '@/lib/supabase/service': { createServiceClient: () => ({ from(table) {
      assert.equal(table, 'personal_context_sections');
      return query;
    } }) },
  }, env);
  const call = (token, method, params) => POST({
    ...request(method, params),
    headers: { get: () => 'Bearer ' + token },
  });
  assert.equal((await call(careerToken, 'tools/list')).status, 401);
  const tools = await call(personalToken, 'tools/list');
  assert.deepEqual(Array.from(tools.body.result.tools, ({ name }) => name), ['get_personal_context']);
  assert.equal((await call(personalToken, 'tools/call', { name: 'get_vault_login' })).body.result.isError, true);
  const response = await call(personalToken, 'tools/call', {
    name: 'get_personal_context', arguments: { section: 'goals' },
  });
  assert.equal(response.body.result.isError, false);
  assert.deepEqual(filters, [['user_id', owner], ['shared', true], ['section', 'goals']]);
  env.PERSONAL_CONTEXT_MCP_TOKENS = '';
  assert.equal((await call(personalToken, 'tools/list')).status, 401);
});

test('MCP profile schema keeps resume email and application email separate', async () => {
  const response = await mcpPost(request('tools/list'));
  const update = response.body.result.tools.find((tool) => tool.name === 'update_profile');
  assert.ok(update.inputSchema.properties.email);
  assert.ok(update.inputSchema.properties.preferred_application_email);
  for (const field of profileParser.APPLICATION_PROFILE_FIELDS) assert.ok(update.inputSchema.properties[field]);
  assert.equal(update.inputSchema.properties.password, undefined);
});

test('MCP instructions exclude ordinary courses and non-employment interviews', async () => {
  const response = await mcpPost(request('initialize', { protocolVersion: '2025-03-26' }));
  const instructions = response.body.result.instructions;
  assert.match(instructions, /primary intent is employment/);
  assert.match(instructions, /Do not use it for ordinary coursework/);
  assert.match(instructions, /research, user, journalistic, or other non-employment interviews/);
  assert.match(instructions, /If a request is ambiguous or can be answered without stored career context, do not call this server/);
  assert.doesNotMatch(instructions, /before answering any career question/);
});

test('career narrative loading is sequencing guidance, not a broad selection trigger', async () => {
  const response = await mcpPost(request('tools/list'));
  const narrative = response.body.result.tools.find((tool) => tool.name === 'get_career_narrative');
  assert.match(narrative.description, /only after Career Copilot has already been selected/);
  assert.match(narrative.description, /ordinary course, academic, or non-employment interview request/);
  assert.doesNotMatch(narrative.description, /ALWAYS CALL THIS FIRST/);
});

test('MCP opportunity schema exposes career and graduate-school types to the agent', async () => {
  const response = await mcpPost(request('tools/list'));
  const add = response.body.result.tools.find((tool) => tool.name === 'add_job');
  const update = response.body.result.tools.find((tool) => tool.name === 'update_job');
  for (const type of ['full_time', 'internship', 'undergraduate_research', 'masters_program', 'doctoral_program', 'professional_school']) {
    assert.ok(add.inputSchema.properties.opportunity_type.enum.includes(type), type);
    assert.ok(update.inputSchema.properties.opportunity_type.enum.includes(type), type);
  }
  assert.ok(add.inputSchema.required.includes('opportunity_type'));
  assert.equal(add.inputSchema.properties.job_type, undefined);
});

test('MCP refuses to create an untagged opportunity', async () => {
  writes.length = 0;
  const response = await mcpPost(request('tools/call', {
    name: 'add_job', arguments: { company: 'UCI', title: 'Research role' },
  }));
  assert.equal(response.body.result.isError, true);
  assert.match(response.body.result.content[0].text, /opportunity_type is required/);
  assert.equal(writes.length, 0);
});

test('MCP agent can tag an opportunity with a graduate-school type', async () => {
  writes.length = 0;
  const response = await mcpPost(request('tools/call', {
    name: 'update_job', arguments: { job_id: 'job', opportunity_type: 'doctoral_program' },
  }));
  assert.equal(response.body.result.isError, false);
  assert.equal(writes.find((write) => write.table === 'jobs').value.job_type, 'doctoral_program');
});

test('MCP update_profile writes only supplied application details', async () => {
  writes.length = 0;
  const response = await mcpPost(request('tools/call', {
    name: 'update_profile', arguments: {
      gpa: 3.875, us_work_authorized: true, requires_sponsorship: false,
      general_availability: 'June 2027', preferred_application_email: 'apply@example.com',
    },
  }));
  assert.equal(response.body.result.isError, false);
  const profileWrite = writes.find((write) => write.table === 'profile');
  assert.equal(profileWrite.value.gpa, 3.875);
  assert.equal(profileWrite.value.us_work_authorized, true);
  assert.equal(profileWrite.value.requires_sponsorship, false);
  assert.equal(profileWrite.value.preferred_application_email, 'apply@example.com');
  assert.equal(Object.hasOwn(profileWrite.value, 'email'), false);
});

test('MCP get_profile returns application details outside resume contact header', async () => {
  const response = await mcpPost(request('tools/call', { name: 'get_profile', arguments: {} }));
  assert.equal(response.body.result.isError, false);
  const profile = JSON.parse(response.body.result.content[0].text);
  assert.equal(profile.header.email, 'resume@example.com');
  assert.equal(profile.application_profile.preferred_application_email, null);
  assert.equal(Object.hasOwn(profile.header, 'preferred_application_email'), false);
});

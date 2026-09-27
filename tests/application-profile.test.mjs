import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const exports = {};
const source = ts.transpileModule(fs.readFileSync('src/lib/application-profile.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, { exports });

test('application profile accepts optional structured values without touching resume email', () => {
  const { patch, fieldErrors } = exports.parseApplicationProfilePatch({
    gpa: 3.875,
    us_work_authorized: false,
    requires_sponsorship: true,
    general_availability: '  Starts June 2027  ',
    preferred_application_email: '  apply@example.com  ',
    email: 'resume@example.com',
    password: 'never store this',
  });
  assert.equal(Object.keys(fieldErrors).length, 0);
  assert.equal(patch.gpa, 3.875);
  assert.equal(patch.us_work_authorized, false);
  assert.equal(patch.requires_sponsorship, true);
  assert.equal(patch.general_availability, 'Starts June 2027');
  assert.equal(patch.preferred_application_email, 'apply@example.com');
  assert.equal(Object.hasOwn(patch, 'email'), false);
  assert.equal(Object.hasOwn(patch, 'password'), false);
});

test('application profile rejects invalid values and supports clearing', () => {
  for (const input of [
    { gpa: '3.1234' }, { gpa: 10.001 }, { us_work_authorized: 'maybe' },
    { general_availability: 'a'.repeat(501) }, { preferred_application_email: 'not-an-email' },
  ]) {
    const { fieldErrors } = exports.parseApplicationProfilePatch(input);
    assert.equal(Object.keys(fieldErrors).length, 1);
  }
  const { patch, fieldErrors } = exports.parseApplicationProfilePatch({
    gpa: null, us_work_authorized: null, requires_sponsorship: null,
    general_availability: '', preferred_application_email: null,
  });
  assert.equal(Object.keys(fieldErrors).length, 0);
  assert.equal(Object.values(patch).every((value) => value === null), true);
});

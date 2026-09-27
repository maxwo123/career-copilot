import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const source = ts.transpileModule(fs.readFileSync('src/lib/job-search.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const exports = {};
vm.runInNewContext(source, { exports });

const job = { title: 'Research Associate', company: 'Acme Biotech', location: 'Irvine, CA' };

test('job search matches partial words across role, company, and location as the user types', () => {
  for (const query of ['res', 'BIOTECH', 'irv', 'research acme', '  acme   ca  ']) {
    assert.equal(exports.matchesJobSearch(job, query), true, query);
  }
  for (const query of ['designer', 'research remote']) {
    assert.equal(exports.matchesJobSearch(job, query), false, query);
  }
});

test('job type filter distinguishes each type and legacy jobs without one', () => {
  assert.equal(exports.matchesJobType({ job_type: 'internship' }, 'internship'), true);
  assert.equal(exports.matchesJobType({ job_type: 'internship' }, 'full_time'), false);
  assert.equal(exports.matchesJobType({ job_type: null }, 'unspecified'), true);
  assert.equal(exports.matchesJobType({ job_type: null }, 'part_time'), false);
  assert.equal(exports.matchesJobType({ job_type: null }, ''), true);
});

#!/usr/bin/env node
// Runs every tests/*.test.js, one file at a time. New test files are picked up on their own, so adding
// one never touches package.json (and never conflicts with someone else adding theirs).
//
//   npm test                                   everything
//   npm test -- tests/peering.test.js          just these files (other arguments go to node --test)
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const dir = path.join(__dirname, '..', 'tests');
const args = process.argv.slice(2);
const files = args.some((a) => a.endsWith('.test.js')) ? [] :
  fs.readdirSync(dir).filter((f) => f.endsWith('.test.js')).sort().map((f) => path.join('tests', f));
const r = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...args, ...files], { stdio: 'inherit', cwd: path.join(__dirname, '..') });
process.exit(r.status ?? 1);

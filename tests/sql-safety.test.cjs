// Regression guards for confirmed SQL-construction defects.
//
// These are source-level guards (not route integration tests) on purpose:
// the routes import `next/server` + `@/lib/db`, so exercising them for real
// would require booting Next and a database. The defects below were all
// "string built in JS, then handed to sql.query()", so asserting the built
// string is the right unit. Dependency-free: runs via `node --test`.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');

const root = resolve(__dirname, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

test('events API escapes prefecture / type before SQL interpolation', () => {
  const src = read('app/api/events/route.ts');
  // Public, unauthenticated GET. Both filters must be escaped like organizer,
  // otherwise `?prefecture=x' OR '1'='1` breaks out of the WHERE clause.
  assert.doesNotMatch(src, /prefecture = '\$\{prefecture\}'/, 'prefecture must not be interpolated raw');
  assert.doesNotMatch(src, /event_type = '\$\{eventType\}'/, 'eventType must not be interpolated raw');
  assert.match(src, /prefecture = '\$\{prefecture\.replace\(\/'\/g, "''"\)\}'/);
  assert.match(src, /event_type = '\$\{eventType\.replace\(\/'\/g, "''"\)\}'/);
});

test('public photobooks API uses a valid placeholder for publisher filter', () => {
  const src = read('app/api/photobooks/route.ts');
  // `$${params.length + 2}` produced $3 while only 1 param was passed → 500.
  assert.doesNotMatch(src, /params\.length \+ 2/, 'publisher placeholder must not overshoot the param count');
  assert.match(src, /conds\.push\(`publisher = \$\$\{params\.length\}`\)/);
});

test('admin photobooks API uses a valid LIMIT placeholder for status=all', () => {
  const src = read('app/api/admin/photobooks/route.ts');
  // status=all sends 1 param but the query hard-coded $2 → 500 on the "全部" tab.
  assert.match(src, /LIMIT \$\$\{filter === 'all' \? '1' : '2'\}/);
});

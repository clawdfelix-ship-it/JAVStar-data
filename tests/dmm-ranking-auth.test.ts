import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

test('dmm-ranking POST keeps the admin guard in front of writes', () => {
  const routePath = path.join(process.cwd(), 'app/api/dmm-ranking/route.ts');
  const source = fs.readFileSync(routePath, 'utf8');

  assert.match(source, /export async function POST\(request: NextRequest\)/);
  assert.match(source, /const unauthorized = authorizeDmmRankingWrite\(request\)/);
  assert.match(source, /if \(unauthorized\) return unauthorized;/);
});

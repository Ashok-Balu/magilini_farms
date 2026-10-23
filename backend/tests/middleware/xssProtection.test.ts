import assert from 'node:assert/strict'
import test from 'node:test'
import { xssProtection } from '../../src/middleware/xssProtection.js'

test('xssProtection sanitizes nested strings in body, query, and params while preserving data', () => {
  const request: any = {
    body: { comment: '<script>alert(1)</script><b>Hello</b>', tags: ['<img src=x onerror=alert(1)>', 'safe'] },
    query: { search: '<svg onload=alert(1)>result' },
    params: { slug: '<i>item</i>' }
  }
  let nextCalls = 0

  xssProtection(request, {}, () => { nextCalls += 1 })

  assert.equal(nextCalls, 1)
  assert.equal(request.body.comment, 'Hello')
  assert.deepEqual(request.body.tags, ['', 'safe'])
  assert.equal(request.query.search, 'result')
  assert.equal(request.params.slug, 'item')
})

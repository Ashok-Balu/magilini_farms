import assert from 'node:assert/strict'
import test from 'node:test'
import { z } from 'zod'
import { validateRequest } from '../../src/middleware/validate.js'

const makeResponse = () => {
  const response: any = {
    statusCode: 200,
    body: undefined,
    status(code: number) { this.statusCode = code; return this },
    json(body: unknown) { this.body = body; return this }
  }
  return response
}

test('validateRequest replaces validated request parts and calls next', async () => {
  const request: any = { body: { name: '  Ada  ' }, query: { page: '2' }, params: { id: 'x' } }
  const response = makeResponse()
  let nextCalls = 0

  await validateRequest(z.object({
    body: z.object({ name: z.string().trim() }),
    query: z.object({ page: z.coerce.number() }),
    params: z.object({ id: z.string() })
  }))(request, response, () => { nextCalls += 1 })

  assert.equal(nextCalls, 1)
  assert.deepEqual(request.body, { name: 'Ada' })
  assert.deepEqual(request.query, { page: 2 })
  assert.deepEqual(request.params, { id: 'x' })
})

test('validateRequest formats Zod issues and returns 422 without calling next', async () => {
  const request: any = { body: { email: 'bad' }, query: {}, params: {} }
  const response = makeResponse()
  let nextCalls = 0

  await validateRequest(z.object({ body: z.object({ email: z.string().email() }) }))(
    request, response, () => { nextCalls += 1 }
  )

  assert.equal(response.statusCode, 422)
  assert.deepEqual(response.body, {
    success: false,
    message: 'Validation failed',
    errors: ['body.email: Invalid email address']
  })
  assert.equal(nextCalls, 0)
})

test('validateRequest forwards non-Zod errors to next', async () => {
  const failure = new Error('unexpected')
  const request: any = { body: {}, query: {}, params: {} }
  let forwarded: unknown

  await validateRequest({ parseAsync: async () => { throw failure } } as any)(
    request, makeResponse(), (err: unknown) => { forwarded = err }
  )
  assert.equal(forwarded, failure)
})

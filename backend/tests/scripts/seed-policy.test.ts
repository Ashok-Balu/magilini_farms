import assert from 'node:assert/strict'
import test from 'node:test'

import { assertSeedAdminCredentials, assertSeedPolicy } from '../../src/scripts/seed-policy.js'

test('allows seeding in a non-production environment when explicitly enabled and forced', () => {
  assert.doesNotThrow(() => {
    assertSeedPolicy({ nodeEnv: 'development', enableSeed: true, hasForce: true })
  })
})

test('rejects seeding in production', () => {
  assert.throws(
    () => assertSeedPolicy({ nodeEnv: 'production', enableSeed: true, hasForce: true }),
    /Production database cannot be seeded\./
  )
})

test('rejects the production override flag even in non-production mode', () => {
  assert.throws(
    () => assertSeedPolicy({ nodeEnv: 'test', enableSeed: true, hasForce: true, hasAllowProd: true }),
    /Production seed override is not allowed\./
  )
})

test('requires ENABLE_SEED and --force', () => {
  assert.throws(
    () => assertSeedPolicy({ nodeEnv: 'development', enableSeed: false, hasForce: true }),
    /Set ENABLE_SEED=true before running\./
  )

  assert.throws(
    () => assertSeedPolicy({ nodeEnv: 'development', enableSeed: true, hasForce: false }),
    /Use --force to execute database seeding\./
  )
})

test('seed administrator credentials must be explicit, valid, and strong', () => {
  assert.deepEqual(
    assertSeedAdminCredentials({ email: ' ADMIN@example.com ', password: 'a-secure-seed-password' }),
    { email: 'admin@example.com', password: 'a-secure-seed-password' }
  )
  assert.throws(() => assertSeedAdminCredentials({ password: 'a-secure-seed-password' }), /SEED_ADMIN_EMAIL/)
  assert.throws(() => assertSeedAdminCredentials({ email: 'admin@example.com', password: 'short' }), /at least 16/)
})

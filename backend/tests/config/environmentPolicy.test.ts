import assert from 'node:assert/strict'
import test from 'node:test'
import { assertEnvironmentPolicy } from '../../src/config/environmentPolicy.js'

test('environment policy binds each runtime to its intended database', () => {
  assert.doesNotThrow(() => assertEnvironmentPolicy('development', 'magilinifarms_dev'))
  assert.doesNotThrow(() => assertEnvironmentPolicy('test', 'magilinifarms_test'))
  assert.doesNotThrow(() => assertEnvironmentPolicy('production', 'magilinifarms_prod'))
  assert.throws(
    () => assertEnvironmentPolicy('test', 'magilinifarms_dev'),
    /NODE_ENV=test must use DB_NAME=magilinifarms_test/
  )
})

test('environment policy prevents Razorpay test/live credential crossover', () => {
  assert.doesNotThrow(() => assertEnvironmentPolicy('test', 'magilinifarms_test', 'rzp_test_example'))
  assert.doesNotThrow(() => assertEnvironmentPolicy('production', 'magilinifarms_prod', 'rzp_live_example'))
  assert.throws(
    () => assertEnvironmentPolicy('production', 'magilinifarms_prod', 'rzp_test_example'),
    /Production must not use Razorpay test credentials/
  )
  assert.throws(
    () => assertEnvironmentPolicy('development', 'magilinifarms_dev', 'rzp_live_example'),
    /Development and test environments must not use Razorpay live credentials/
  )
})

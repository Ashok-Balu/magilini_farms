import assert from 'node:assert/strict'
import test from 'node:test'
import { sendEmail, sendPasswordResetEmail } from '../../../src/services/email/emailService.js'

test('email service uses the console fallback outside production', async () => {
  const oldEnv = process.env.NODE_ENV
  const oldUser = process.env.EMAIL_USER
  const oldPass = process.env.EMAIL_PASS
  const oldLog = console.log
  const lines: unknown[][] = []
  process.env.NODE_ENV = 'test'
  delete process.env.EMAIL_USER
  delete process.env.EMAIL_PASS
  console.log = (...args: unknown[]) => { lines.push(args) }

  try {
    assert.equal(await sendEmail({ to: 'sam@example.com', subject: 'Notice', text: 'Test content' }), true)
    assert.ok(lines.some(args => args.join(' ').includes('sam@example.com')))
    assert.ok(lines.some(args => args.join(' ').includes('Test content')))
  } finally {
    console.log = oldLog
    if (oldEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = oldEnv
    if (oldUser === undefined) delete process.env.EMAIL_USER
    else process.env.EMAIL_USER = oldUser
    if (oldPass === undefined) delete process.env.EMAIL_PASS
    else process.env.EMAIL_PASS = oldPass
  }
})

test('password reset email builds a link-bearing message through the fallback sender', async () => {
  const oldEnv = process.env.NODE_ENV
  const oldLog = console.log
  const lines: unknown[][] = []
  process.env.NODE_ENV = 'test'
  console.log = (...args: unknown[]) => { lines.push(args) }

  try {
    assert.equal(await sendPasswordResetEmail('sam@example.com', 'https://example.test/reset/abc'), true)
    assert.ok(lines.some(args => args.includes('PASSWORD RESET')))
    assert.ok(lines.some(args => args.some(value => String(value).includes('https://example.test/reset/abc'))))
    assert.ok(lines.some(args => args.some(value => String(value).includes('Expires: 30 minutes'))))
  } finally {
    console.log = oldLog
    if (oldEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = oldEnv
  }
})

test('production email fallback never writes password-reset links to logs', async () => {
  const oldEnv = process.env.NODE_ENV
  const oldUser = process.env.EMAIL_USER
  const oldPass = process.env.EMAIL_PASS
  const oldLog = console.log
  const lines: unknown[][] = []
  process.env.NODE_ENV = 'production'
  delete process.env.EMAIL_USER
  delete process.env.EMAIL_PASS
  console.log = (...args: unknown[]) => { lines.push(args) }

  try {
    assert.equal(await sendPasswordResetEmail('sam@example.com', 'https://example.test/reset/secret-token'), false)
    assert.equal(lines.some(args => args.some(value => String(value).includes('secret-token'))), false)
  } finally {
    console.log = oldLog
    if (oldEnv === undefined) delete process.env.NODE_ENV
    else process.env.NODE_ENV = oldEnv
    if (oldUser === undefined) delete process.env.EMAIL_USER
    else process.env.EMAIL_USER = oldUser
    if (oldPass === undefined) delete process.env.EMAIL_PASS
    else process.env.EMAIL_PASS = oldPass
  }
})

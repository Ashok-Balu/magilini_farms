export type SeedPolicyInput = {
  nodeEnv: 'development' | 'test' | 'production'
  enableSeed: boolean
  hasForce: boolean
  hasAllowProd?: boolean
}

export const assertSeedPolicy = ({ nodeEnv, enableSeed, hasForce, hasAllowProd = false }: SeedPolicyInput): void => {
  if (nodeEnv === 'production') {
    throw new Error('Production database cannot be seeded.')
  }

  if (hasAllowProd) {
    throw new Error('Production seed override is not allowed.')
  }

  if (!enableSeed) {
    throw new Error('Set ENABLE_SEED=true before running.')
  }

  if (!hasForce) {
    throw new Error('Use --force to execute database seeding.')
  }
}

export const assertSeedAdminCredentials = ({ email, password }: { email?: string; password?: string }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    throw new Error('SEED_ADMIN_EMAIL must be a valid email address.')
  }
  if (typeof password !== 'string' || password.length < 16) {
    throw new Error('SEED_ADMIN_PASSWORD must contain at least 16 characters.')
  }
  return { email: normalizedEmail, password }
}

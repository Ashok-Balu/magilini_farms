export type AppEnvironment = 'development' | 'test' | 'production'

const DATABASE_BY_ENVIRONMENT: Record<AppEnvironment, string> = {
  development: 'magilinifarms_dev',
  test: 'magilinifarms_test',
  production: 'magilinifarms_prod'
}

export const assertEnvironmentPolicy = (
  nodeEnv: AppEnvironment,
  dbName: string,
  razorpayKeyId?: string
): void => {
  if (dbName !== DATABASE_BY_ENVIRONMENT[nodeEnv]) {
    throw new Error(`NODE_ENV=${nodeEnv} must use DB_NAME=${DATABASE_BY_ENVIRONMENT[nodeEnv]}.`)
  }

  if (razorpayKeyId && !/^rzp_(test|live)_/.test(razorpayKeyId)) {
    throw new Error('RAZORPAY_KEY_ID must use a recognized Razorpay test or live key prefix.')
  }
  if (razorpayKeyId?.startsWith('rzp_test_') && nodeEnv === 'production') {
    throw new Error('Production must not use Razorpay test credentials.')
  }
  if (razorpayKeyId?.startsWith('rzp_live_') && nodeEnv !== 'production') {
    throw new Error('Development and test environments must not use Razorpay live credentials.')
  }
}

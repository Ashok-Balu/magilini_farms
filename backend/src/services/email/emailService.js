import { logger } from '../../utils/logger.js'

const hasSmtpConfig = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS)

// Development / unconfigured fallback — never sends real email.
const sendViaConsole = async ({ to, subject, text }) => {
  console.log('====================================')
  console.log(subject)
  console.log(`Email: ${to}`)
  console.log('')
  console.log(text)
  console.log('====================================')
  return true
}

const sendViaSmtp = async ({ to, subject, text, html }) => {
  const nodemailer = await import('nodemailer')
  const transporter = nodemailer.default.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === 'true',
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  })

  await transporter.sendMail({
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject,
    text,
    html
  })
  return true
}

export const sendEmail = async (options) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      if (!hasSmtpConfig()) {
        logger.error('Email send failed because SMTP is not configured.')
        return false
      }
      return await sendViaSmtp(options)
    }
    return await sendViaConsole(options)
  } catch (err) {
    logger.error('Email send failed', { errorName: err?.name || 'EmailError' })
    return false
  }
}

export const sendPasswordResetEmail = async (email, resetLink) => {
  return sendEmail({
    to: email,
    subject: 'PASSWORD RESET',
    text: `Reset Link:\n${resetLink}\n\nExpires: 30 minutes`,
    html: `<p>You requested a password reset.</p><p><a href="${resetLink}">${resetLink}</a></p><p>This link expires in 30 minutes.</p>`
  })
}

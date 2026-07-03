import { ZodError } from 'zod'

const formatIssue = (issue) => {
  const path = issue.path?.length ? issue.path.join('.') : 'body'
  return `${path}: ${issue.message}`
}

export const validateRequest = (schema) => async (req, res, next) => {
  try {
    const parsed = await schema.parseAsync({
      body: req.body,
      query: req.query,
      params: req.params
    })

    req.body = parsed.body ?? req.body
    req.query = parsed.query ?? req.query
    req.params = parsed.params ?? req.params
    next()
  } catch (err) {
    if (err instanceof ZodError) {
      return res.status(422).json({
        success: false,
        message: 'Validation failed',
        errors: err.issues.map(formatIssue)
      })
    }
    next(err)
  }
}

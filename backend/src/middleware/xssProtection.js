import xss from 'xss'

const sanitizeValue = (value) => {
  if (Array.isArray(value)) return value.map(sanitizeValue)
  if (value && typeof value === 'object') {
    const out = {}
    for (const [key, val] of Object.entries(value)) {
      out[key] = sanitizeValue(val)
    }
    return out
  }
  if (typeof value === 'string') {
    return xss(value, {
      whiteList: {},
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    })
  }
  return value
}

export const xssProtection = (req, _res, next) => {
  req.body = sanitizeValue(req.body)
  req.query = sanitizeValue(req.query)
  req.params = sanitizeValue(req.params)
  next()
}

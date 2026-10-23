// Shared client-side validation helpers used across all forms.
export const isRequired  = (v) => !!String(v ?? '').trim()
export const isEmail     = (v) => /^\S+@\S+\.\S+$/.test(String(v ?? '').trim())
export const isPhone10   = (v) => /^\d{10}$/.test(String(v ?? '').replace(/\D/g, ''))
export const isPincode6  = (v) => /^[1-9]\d{5}$/.test(String(v ?? '').trim())
export const minLen      = (v, n) => String(v ?? '').length >= n
export const isPositiveNumber = (v) => Number.isFinite(Number(v)) && Number(v) > 0

/**
 * Runs a set of { field: [validatorFn, message][] } rules against values
 * and returns an errors object keyed by field name (only failing fields included).
 */
export const runValidation = (values, rules) => {
  const errors = {}
  for (const [field, checks] of Object.entries(rules)) {
    for (const [check, message] of checks) {
      if (!check(values[field])) { errors[field] = message; break }
    }
  }
  return errors
}

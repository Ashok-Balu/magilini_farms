export const weightToKg = (weight) => {
  const match = String(weight ?? '').match(/(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|g|grams?)\b/i)
  if (!match) return 0

  const amount = Number(match[1])
  return /^g/i.test(match[2]) ? amount / 1000 : amount
}
export const weightToKg = (weight) => {
  const label = String(weight ?? '').trim()
  const unitFirst = label.match(/^\s*(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|g|grams?)\s*(?:\(\s*\d+(?:\s*[-–]\s*\d+)?\s*(?:pieces?|pcs)\s*\))?\s*$/i)
  const pieceFirst = label.match(/^\s*\d+\s*(?:pieces?|pcs)\s*\(\s*~?\s*(\d+(?:\.\d+)?)\s*(kg|kgs|kilograms?|g|grams?)\s*\)\s*$/i)
  const match = unitFirst || pieceFirst
  if (!match) return 0

  const amount = Number(match[1])
  if (!Number.isFinite(amount) || amount <= 0) return 0
  const kilograms = /^g/i.test(match[2]) ? amount / 1000 : amount
  return Number.isFinite(kilograms) ? kilograms : 0
}
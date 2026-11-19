// Unconfirmed prices stay blank rather than showing a guess.
export function formatPrice(value: number | null | undefined, currency = "Rs.") {
  if (typeof value !== "number") return ""
  return currency + new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)
}

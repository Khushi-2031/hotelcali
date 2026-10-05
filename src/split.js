// Splitwise-style maths for Settle Up. Everything is done in paise (integers)
// so totals never drift from floating point rounding.

export const toPaise = (rupees) => Math.round(Number(rupees || 0) * 100)
export const toRupees = (paise) => paise / 100

export function fmtINR(rupees) {
  const n = Math.abs(Number(rupees || 0))
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })
}

/**
 * Work out what each person owes for one expense.
 * type: 'equal' | 'exact' | 'percent'
 * inputs: { name: value } used for exact (rupees) and percent (0-100)
 * Returns { shares: { name: rupees }, error }
 */
export function computeShares(amount, people, type, inputs = {}) {
  const total = toPaise(amount)
  if (!total || total <= 0) return { shares: {}, error: 'Enter an amount' }
  if (!people.length) return { shares: {}, error: 'Pick who to split with' }

  const paise = {}
  if (type === 'equal') {
    const base = Math.floor(total / people.length)
    let leftover = total - base * people.length
    people.forEach(p => { paise[p] = base + (leftover-- > 0 ? 1 : 0) })
  } else if (type === 'exact') {
    let sum = 0
    people.forEach(p => { paise[p] = toPaise(inputs[p]); sum += paise[p] })
    if (sum !== total) {
      const diff = toRupees(total - sum)
      return { shares: {}, error: diff > 0 ? `${fmtINR(diff)} left to assign` : `${fmtINR(-diff)} over the total` }
    }
  } else if (type === 'percent') {
    let pct = 0
    people.forEach(p => { pct += Number(inputs[p] || 0) })
    if (Math.abs(pct - 100) > 0.001) return { shares: {}, error: `Percentages add up to ${+pct.toFixed(2)}%, need 100%` }
    let assigned = 0
    people.forEach((p, i) => {
      paise[p] = i === people.length - 1 ? total - assigned : Math.round(total * Number(inputs[p] || 0) / 100)
      assigned += paise[p]
    })
  }

  const shares = {}
  Object.entries(paise).forEach(([p, v]) => { if (v) shares[p] = toRupees(v) })
  return { shares, error: null }
}

/**
 * Net balance per person across the group, in paise.
 * Positive = the group owes them. Negative = they owe the group.
 */
export function netBalances(expenses, settlements) {
  const bal = {}
  const add = (p, v) => { bal[p] = (bal[p] || 0) + v }
  expenses.forEach(e => {
    add(e.paid_by, toPaise(e.amount))
    Object.entries(e.shares || {}).forEach(([p, v]) => add(p, -toPaise(v)))
  })
  settlements.forEach(s => {
    add(s.from_name, toPaise(s.amount))
    add(s.to_name, -toPaise(s.amount))
  })
  Object.keys(bal).forEach(p => { if (bal[p] === 0) delete bal[p] })
  return bal
}

/**
 * Turn net balances into the fewest "X pays Y" transfers (Splitwise's
 * "simplify debts"). Greedy: biggest debtor pays biggest creditor.
 */
export function simplifyDebts(bal) {
  const debtors = [], creditors = []
  Object.entries(bal).forEach(([p, v]) => {
    if (v < 0) debtors.push([p, -v])
    else if (v > 0) creditors.push([p, v])
  })
  debtors.sort((a, b) => b[1] - a[1])
  creditors.sort((a, b) => b[1] - a[1])
  const out = []
  let i = 0, j = 0
  while (i < debtors.length && j < creditors.length) {
    const pay = Math.min(debtors[i][1], creditors[j][1])
    if (pay > 0) out.push({ from: debtors[i][0], to: creditors[j][0], amount: toRupees(pay) })
    debtors[i][1] -= pay
    creditors[j][1] -= pay
    if (debtors[i][1] === 0) i++
    if (creditors[j][1] === 0) j++
  }
  return out
}

/** How one expense looks from one person's side, in rupees. */
export function myLine(expense, me) {
  if (!me) return null
  const owe = Number(expense.shares?.[me] || 0)
  if (expense.paid_by === me) {
    const lent = Number(expense.amount) - owe
    return lent > 0 ? { kind: 'lent', amount: lent } : null
  }
  return owe > 0 ? { kind: 'owe', amount: owe } : null
}

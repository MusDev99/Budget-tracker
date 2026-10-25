const moneyFormatter = new Intl.NumberFormat('en-MY', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Round to 2 decimals without the classic 1.005 → 1.00 float error. */
export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** @param {number} amount @param {{symbol: string}} currency */
export const formatMoney = (amount, currency) => `${currency.symbol} ${moneyFormatter.format(round2(amount))}`;

/** Sum a numeric field across a list, rounded to cents. */
export const sumBy = (list, key) => round2(list.reduce((sum, item) => sum + item[key], 0));

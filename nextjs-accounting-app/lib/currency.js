export const CURRENCY_SYMBOLS = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'CA$',
  AUD: 'A$',
  AED: 'AED ',
  PKR: '₨',
  INR: '₹',
  SGD: 'S$',
}

export const getCurrencySymbol = (code) => CURRENCY_SYMBOLS[code] || code || '$'

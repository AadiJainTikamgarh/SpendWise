export function paiseToRupees(paise: number): number {
  return (paise || 0) / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round((rupees || 0) * 100);
}

// Hoisted formatters to avoid expensive Intl instantiation on every render/list item
const inrWithDecimals = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const inrWithoutDecimals = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatINR(
  paise: number,
  options?: {
    showSign?: boolean;
    showDecimals?: boolean;
    compact?: boolean;
  }
): string {
  const rupees = paiseToRupees(Math.abs(paise || 0));
  const isNegative = (paise || 0) < 0;

  const showDecimals = options?.showDecimals ?? rupees % 1 !== 0;
  const formatter = showDecimals ? inrWithDecimals : inrWithoutDecimals;
  const formattedNumber = formatter.format(rupees);

  let prefix = '₹';
  if (options?.showSign) {
    prefix = isNegative ? '- ₹' : '+ ₹';
  } else if (isNegative) {
    prefix = '-₹';
  }

  return `${prefix}${formattedNumber}`;
}

export function parseCurrencyInput(text: string): number {
  const clean = text.replace(/[^0-9.]/g, '');
  if (!clean) return 0;

  const parts = clean.split('.');
  if (parts.length > 2) {
    return rupeesToPaise(parseFloat(`${parts[0]}.${parts[1]}`));
  }

  const num = parseFloat(clean);
  if (isNaN(num)) return 0;
  return rupeesToPaise(num);
}

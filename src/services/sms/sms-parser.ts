import { rupeesToPaise } from '@/utils/money';
import { RawSms, ParsedSmsTransaction } from './types';
import { matchCategory } from './category-matcher';
import { TransactionType } from '@/types/finance';

const BANK_MAPPINGS: { pattern: RegExp; name: string }[] = [
  { pattern: /hdfc/i, name: 'HDFC Bank' },
  { pattern: /sbi|sbin/i, name: 'State Bank of India' },
  { pattern: /icici/i, name: 'ICICI Bank' },
  { pattern: /axis/i, name: 'Axis Bank' },
  { pattern: /kotak/i, name: 'Kotak Bank' },
  { pattern: /pnb|punjab national/i, name: 'Punjab National Bank' },
  { pattern: /bob|baroda/i, name: 'Bank of Baroda' },
  { pattern: /canara|cnrb/i, name: 'Canara Bank' },
  { pattern: /indus/i, name: 'IndusInd Bank' },
  { pattern: /yes\s*bank|yesbnk/i, name: 'Yes Bank' },
  { pattern: /idfc/i, name: 'IDFC FIRST Bank' },
  { pattern: /paytm/i, name: 'Paytm Payments Bank' },
  { pattern: /federal/i, name: 'Federal Bank' },
  { pattern: /union\s*bank|unionb/i, name: 'Union Bank' },
  { pattern: /rbl/i, name: 'RBL Bank' },
  { pattern: /aubank|au\s*small/i, name: 'AU Small Finance Bank' },
  { pattern: /equitas/i, name: 'Equitas Small Finance Bank' },
  { pattern: /ujjivan/i, name: 'Ujjivan Small Finance Bank' },
  { pattern: /postbk|ippb/i, name: 'India Post Payments Bank' },
  { pattern: /bandhan/i, name: 'Bandhan Bank' },
  { pattern: /citi/i, name: 'Citi Bank' },
  { pattern: /hsbc/i, name: 'HSBC' },
  { pattern: /scb|standard\s*chartered/i, name: 'Standard Chartered' },
  { pattern: /phonepe/i, name: 'PhonePe' },
  { pattern: /gpay|google\s*pay/i, name: 'Google Pay' },
  { pattern: /bhim/i, name: 'BHIM UPI' },
  { pattern: /cred/i, name: 'CRED' },
  { pattern: /slice/i, name: 'Slice' },
  { pattern: /jupiter/i, name: 'Jupiter' },
  { pattern: /fi\s*money|fibank/i, name: 'Fi Money' },
];

// Personal phone numbers (e.g. 10 to 13 digits) are never official bank SMS senders
const PERSONAL_NUMBER_REGEX = /^\+?[0-9]{10,13}$/;

// Known marketing, retail, entertainment, and non-financial senders
const PROMOTIONAL_SENDER_REGEX =
  /(?:swiggy|zomato|zepto|blinkit|bigbsk|dunzo|flipkt|amazon|myntra|ajio|meesho|nykaa|tata|lenskt|domino|pizza|kfc|mcdon|rummy|poker|dream11|winzo|casino|jio|airtel|vodafone|idea|bsnl|actfib|hathway|uber|ola|rapido|makemytrip|goibibo|yatra|indigo|spicejet|irctc|bms|bookmyshow|hotstar|netflix|prime|loan|kredit|cashe|dhani|moneyl)/i;

// Verified bank and UPI sender tokens
const FINANCIAL_SENDER_REGEX =
  /(?:hdfc|sbi|sbin|icici|axis|kotak|pnb|bob|canara|cnrb|indus|yes|idfc|fed|union|rbl|iob|uco|cbi|bom|bandhan|aubank|equitas|ujjivan|ippb|postbk|paytm|gpay|phonepe|bhim|cred|slice|jupit|fibank|mobikw|amex|rupay|visa)/i;

// Comprehensive negative keywords for promotional, bill reminders, failed transactions, and OTPs
const IGNORE_PATTERNS = [
  // 1. OTPs and verification codes
  /\b(?:otp|one[- ]time[- ]password|verification code|secret code|auth(?:entication)? code|security code)\b/i,
  /\b(?:do not share|valid for \d+ (?:min|second|sec)|never share your otp)\b/i,

  // 2. Promotional discounts, cashback offers, and vouchers
  /\b(?:flat\s+(?:rs\.?|inr|₹)?\s*\d+\s*(?:off|cashback)|scratch and win|spin the wheel)\b/i,
  /\b(?:use code|apply coupon|promo code|coupon code|discount code|voucher code)\b/i,
  /\b(?:deal of the day|limited period offer|special discount|claim your offer|click here to claim)\b/i,
  /\b(?:win\s+(?:up to|cash|prizes?|lottery|jackpot|bounty)|lucky winner|congratulations)\b/i,
  /\b(?:earn\s+(?:up to|cashback|reward points?)|points? earned|loyalty points?)\b/i,
  /\b(?:gift card|bonus cash|cashback of up to|cashback up to|cash back of up to)\b/i,
  /\b(?:save up to|get up to|avail discount|avail offer|exclusive offer)\b/i,

  // 3. Loan & credit card marketing
  /\b(?:pre[- ]?approved|pre[- ]?qualified|instant loan|apply for (?:a )?loan|apply now|get loan)\b/i,
  /\b(?:credit limit (?:increased|upgrade)|upgrade your card|free credit card|no annual fee)\b/i,
  /\b(?:zero down payment|no cost emi|interest free emi|loan offer|personal loan up to)\b/i,

  // 4. Bill generation & due reminders (NOT completed transactions yet)
  /\b(?:bill (?:has been )?generated|e-bill|statement (?:has been )?generated|e-statement)\b/i,
  /\b(?:due on|due date|pay before|pay by|last date to pay|overdue|amount payable)\b/i,
  /\b(?:minimum amount due|total amount due|amt due|payment due)\b/i,
  /\b(?:recharge is due|recharge now|pack expired|plan expires|validity expiring|low balance)\b/i,
  /\b(?:reminder to pay|payment reminder|upcoming bill|bill payment reminder)\b/i,

  // 5. Payment requests & UPI collect requests (pending, not debited)
  /\b(?:requested money|collect request|has requested|payment request|approve on|request to pay)\b/i,

  // 6. Failed, declined, or timed-out transactions
  /\b(?:transaction (?:was )?declined|payment failed|transaction failed|could not be processed)\b/i,
  /\b(?:insufficient (?:balance|funds)|exceeded limit|limit exceeded|transaction cancelled)\b/i,
  /\b(?:payment declined|timed out)\b/i,

  // 7. Account alerts, KYC, and security notices
  /\b(?:kyc (?:update|pending|expiring|expired)|pan linking|link aadhaar|mandate (?:created|registered|successfully))\b/i,
  /\b(?:login alert|successful login|password changed|profile updated)\b/i,
  /\b(?:balance enquiry|available bal(?:ance)? is|clear bal(?:ance)? is)\b/i,
];

// Strict contextual expense patterns grammatically tied to the amount or account
const STRICT_EXPENSE_PATTERNS = [
  /\b(?:debited|deducted|withdrawn)\s+(?:by|with|for)?\s*(?:rs\.?|inr|\u20B9)?\s*[0-9,]+/i,
  /(?:rs\.?|inr|\u20B9)\.?\s*[0-9,]+(?:\.[0-9]{1,2})?\s*(?:has been\s+)?(?:debited|deducted|withdrawn)/i,
  /\b(?:paid|spent|sent)[:.]?\s*(?:rs\.?|inr|\u20B9)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s+(?:from|to|at|for|via|on)\b/i,
  /(?:rs\.?|inr|\u20B9)\.?\s*[0-9,]+(?:\.[0-9]{1,2})?\s+(?:paid|spent|transferred)\s+(?:to|at|for|via|on)\b/i,
  /\bused\s+(?:for\s+purchase\s+of|at\s+[A-Za-z0-9._\s]+\s+for)\s+(?:rs\.?|inr|\u20B9)?\s*[0-9,]+/i,
  /\btransfer\s+(?:of\s+)?(?:rs\.?|inr|\u20B9)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s+to\b/i,
];

// Strict contextual income patterns grammatically tied to the amount or account
const STRICT_INCOME_PATTERNS = [
  /\b(?:credited|deposited)\s+(?:by|with|for|to)?\s*(?:rs\.?|inr|\u20B9)?\s*[0-9,]+/i,
  /(?:rs\.?|inr|\u20B9)\.?\s*[0-9,]+(?:\.[0-9]{1,2})?\s*(?:has been\s+)?(?:credited|deposited)/i,
  /\breceived\s+(?:rs\.?|inr|\u20B9)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s+(?:from|via|in)\b/i,
  /\bsalary\s+(?:of\s+)?(?:rs\.?|inr|\u20B9)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s+(?:credited|deposited|transferred)/i,
  /\brefund\s+(?:of\s+)?(?:rs\.?|inr|\u20B9)?\s*[0-9,]+(?:\.[0-9]{1,2})?\s+(?:is\s+)?(?:credited|processed|completed)/i,
];

export function isAllowedSender(address: string, body: string): boolean {
  if (!address) return false;
  const cleanAddress = address.trim();

  // 1. Never allow personal phone numbers
  if (PERSONAL_NUMBER_REGEX.test(cleanAddress)) {
    return false;
  }

  // 2. Reject known promo / commerce / retail senders
  if (PROMOTIONAL_SENDER_REGEX.test(cleanAddress)) {
    return false;
  }

  // 3. If it contains a recognized financial sender code, allow
  if (FINANCIAL_SENDER_REGEX.test(cleanAddress)) {
    return true;
  }

  // 4. Fallback: If address is a standard TRAI alphanumeric header and the body
  // explicitly names a bank AND an account/card, allow
  if (detectBankName(address, body) !== 'Bank' && extractAccountLast4(body)) {
    return true;
  }

  return false;
}

export function detectBankName(address: string, body: string): string {
  const combined = `${address} ${body}`;
  for (const item of BANK_MAPPINGS) {
    if (item.pattern.test(combined)) {
      return item.name;
    }
  }
  return 'Bank';
}

export function isNonTransactionalSms(body: string): boolean {
  for (const pattern of IGNORE_PATTERNS) {
    if (pattern.test(body)) {
      return true;
    }
  }
  return false;
}

export function hasTransactionAnchors(body: string): boolean {
  // 1. Account or card anchor
  const hasAccount =
    /(?:a\/c|acct|account|card)\s*(?:no\.?)?\s*(?:ending\s*)?[*Xx]*\d{3,4}/i.test(body) ||
    /(?:ending\s*(?:with\s*)?)\d{3,4}/i.test(body) ||
    /[*Xx]+\d{3,4}\b/.test(body);

  // 2. Reference / RRN / UPI ID anchor
  const hasReference =
    /(?:ref(?:erence)?\s*(?:no\.?)?|rrn|upi\s*ref|txn\s*(?:id|no)|transaction\s*id)\s*[:.]?\s*[0-9A-Za-z]{6,25}/i.test(body) ||
    /\bupi\/[0-9]{8,18}\b/i.test(body);

  // 3. Balance statement anchor
  const hasBalance =
    /\b(?:avl(?:able)?\s*bal|available\s*balance|bal\s*(?:is|inr|rs)|total\s*bal(?:ance)?)\b/i.test(body);

  return hasAccount || hasReference || hasBalance;
}

export function detectTransactionType(body: string): TransactionType | null {
  const isExpense = STRICT_EXPENSE_PATTERNS.some((p) => p.test(body));
  const isIncome = STRICT_INCOME_PATTERNS.some((p) => p.test(body));

  if (isExpense && !isIncome) return 'expense';
  if (isIncome && !isExpense) return 'income';
  if (isExpense && isIncome) {
    // Determine which pattern appears first in the message
    const expenseIdx = Math.min(
      ...STRICT_EXPENSE_PATTERNS.map((p) => body.search(p)).filter((i) => i >= 0)
    );
    const incomeIdx = Math.min(
      ...STRICT_INCOME_PATTERNS.map((p) => body.search(p)).filter((i) => i >= 0)
    );
    return expenseIdx < incomeIdx ? 'expense' : 'income';
  }
  return null;
}

export function extractAmount(body: string): number | null {
  // Matches "Rs. 500", "Rs 1,250.50", "INR 500", "₹500.00", "Rs.500"
  const regex = /(?:(?:rs|inr|\u20B9)\.?\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i;
  const match = body.match(regex);

  if (!match || !match[1]) {
    // Fallback: amount followed by currency: "500.00 INR" or "100 Rs"
    const fallbackRegex = /([0-9,]+(?:\.[0-9]{1,2})?)\s*(?:rs|inr)/i;
    const fallbackMatch = body.match(fallbackRegex);
    if (!fallbackMatch || !fallbackMatch[1]) return null;
    const cleanStr = fallbackMatch[1].replace(/,/g, '');
    const amountVal = parseFloat(cleanStr);
    return isNaN(amountVal) || amountVal <= 0 ? null : rupeesToPaise(amountVal);
  }

  const clean = match[1].replace(/,/g, '');
  const parsed = parseFloat(clean);
  if (isNaN(parsed) || parsed <= 0) return null;

  return rupeesToPaise(parsed);
}

export function extractAccountLast4(body: string): string | undefined {
  const patterns = [
    /(?:a\/c|acct|account|card)\s*(?:no\.?)?\s*(?:ending\s*)?[*Xx]*(\d{3,4})/i,
    /(?:ending\s*(?:with\s*)?)(\d{3,4})/i,
    /[*Xx]+(\d{3,4})\b/,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return undefined;
}

export function extractMerchant(body: string, type: TransactionType): string {
  const merchantPatterns = [
    /(?:to|at|info\/)\s+([A-Za-z0-9._&'\-\s]{2,30}?)(?:\s+(?:on|via|ref|upi|avl|bal|not|if|using|\.|\,)|$)/i,
    /(?:for\s+(?:purchase of\s+)?)([A-Za-z0-9._&'\-\s]{2,30}?)(?:\s+(?:on|via|ref|upi|avl|bal|\.|\,)|$)/i,
    /(?:vpa\s+)([A-Za-z0-9._@\-]+)/i,
    /(?:upi\/[0-9]+\/)([A-Za-z0-9._\s]+)/i,
  ];

  for (const pattern of merchantPatterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      const candidate = match[1].trim().replace(/^[._\-]+|[._\-]+$/g, '');
      if (
        candidate.length > 2 &&
        !/^(account|a\/c|bank|card|rs|inr|upi|your|dear|transfer|spent|paid|credited|debited)$/i.test(
          candidate
        )
      ) {
        return cleanTitle(candidate);
      }
    }
  }

  if (type === 'income') {
    return 'Deposit / Received';
  }
  return 'Bank Expense';
}

function cleanTitle(str: string): string {
  return str
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export function extractReferenceNumber(body: string): string | undefined {
  const patterns = [
    /(?:ref(?:erence)?\s*(?:no\.?)?|rrn|upi\s*ref(?:erence)?)\s*[:.]?\s*([0-9A-Za-z]{6,20})/i,
    /\bupi\/([0-9]{8,16})\b/i,
  ];

  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return undefined;
}

export function parseSms(sms: RawSms): ParsedSmsTransaction | null {
  const address = sms.address || '';
  const body = sms.body || '';

  // 1. Layer 1: Filter out personal numbers and known promotional/retail senders
  if (!isAllowedSender(address, body)) {
    return null;
  }

  // 2. Layer 2: Filter out non-transactional messages, promotions, bill dues, OTPs, failed txns
  if (isNonTransactionalSms(body)) {
    return null;
  }

  // 3. Layer 3: Require at least one verified financial anchor (Account, Reference, or Balance)
  if (!hasTransactionAnchors(body)) {
    return null;
  }

  // 4. Layer 4: Identify strict transaction direction (Expense vs Income)
  const type = detectTransactionType(body);
  if (!type) {
    return null;
  }

  // 5. Layer 5: Extract transaction amount
  const amount = extractAmount(body);
  if (!amount || amount <= 0) {
    return null;
  }

  // 6. Extract metadata
  const bankName = detectBankName(address, body);
  const accountLast4 = extractAccountLast4(body);
  const merchant = extractMerchant(body, type);
  const referenceNo = extractReferenceNumber(body);

  // 7. Match category
  const { categoryId, category } = matchCategory(`${merchant} ${body}`);

  // 8. Build consistent sync ID
  const dateIso = new Date(sms.date).toISOString();
  const syncHash = `${accountLast4 || 'x'}_${amount}_${Math.floor(sms.date / (1000 * 60))}`;

  return {
    id: syncHash,
    smsId: sms.id,
    amount,
    type,
    title: merchant,
    categoryId,
    suggestedCategory: category,
    date: dateIso,
    bankName,
    accountLast4,
    referenceNo,
    originalSms: body,
  };
}

export function parseSmsList(messages: RawSms[]): ParsedSmsTransaction[] {
  const results: ParsedSmsTransaction[] = [];
  const seenIds = new Set<string>();

  for (const sms of messages) {
    const parsed = parseSms(sms);
    if (parsed && !seenIds.has(parsed.id)) {
      seenIds.add(parsed.id);
      results.push(parsed);
    }
  }

  return results;
}

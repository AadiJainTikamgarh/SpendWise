import { matchCategory } from '@/services/sms/category-matcher';
import { TransactionSource, TransactionType } from '@/types/finance';
import { rupeesToPaise } from '@/utils/money';

function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `stmt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export interface ParsedStatementTransaction {
  id: string;
  amount: number; // in paise
  type: TransactionType;
  title: string;
  categoryId: string;
  date: string; // ISO 8601 string
  notes?: string;
  referenceNo?: string;
  source: TransactionSource;
  rawLine: string;
  isDuplicate?: boolean;
}

/**
 * Parses flexible date strings (DD/MM/YYYY, DD-MM-YYYY, DD-MMM-YYYY, YYYY-MM-DD) into ISO string.
 */
export function parseFlexibleDate(dateStr: string): string {
  const clean = dateStr.trim();

  // 1. ISO format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}/.test(clean)) {
    const d = new Date(clean);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  // 2. Format: DD-MMM-YYYY or DD-MMM-YY (e.g. 09-Nov-2026 or 09-NOV-26)
  const monthMap: Record<string, string> = {
    jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06',
    jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12',
  };
  const mmmMatch = clean.match(/^(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})/);
  if (mmmMatch) {
    const day = mmmMatch[1].padStart(2, '0');
    const mon = monthMap[mmmMatch[2].toLowerCase()] || '01';
    let year = mmmMatch[3];
    if (year.length === 2) year = `20${year}`;
    const d = new Date(`${year}-${mon}-${day}T12:00:00.000Z`);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  // 3. Format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const mon = dmyMatch[2].padStart(2, '0');
    let year = dmyMatch[3];
    if (year.length === 2) year = `20${year}`;
    const d = new Date(`${year}-${mon}-${day}T12:00:00.000Z`);
    return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }

  return new Date().toISOString();
}

/**
 * Cleans Indian bank narration / description into a readable merchant title.
 */
export function cleanBankNarration(narration: string): string {
  let cleaned = narration.trim();

  // Strip common bank prefixes: "UPI/12345/MERCHANT/...", "POS 12345 MERCHANT", "NEFT/..."
  cleaned = cleaned.replace(/^UPI\/\d+\/([^/]+).*/i, '$1');
  cleaned = cleaned.replace(/^POS\s+\d+\s+([^/]+).*/i, '$1');
  cleaned = cleaned.replace(/^IMPS\/\d+\/([^/]+).*/i, '$1');
  cleaned = cleaned.replace(/^NEFT\s+[^/]+\s+([^/]+).*/i, '$1');
  cleaned = cleaned.replace(/^(?:ACH|ATM|CMS|INB|MB)\s*[-/]\s*/i, '');

  // Strip VPA domains and clean up punctuation
  cleaned = cleaned.replace(/@[a-z0-9_-]+/i, '');
  cleaned = cleaned.replace(/[^a-zA-Z0-9\s&'-]/g, ' ');
  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  if (!cleaned || cleaned.length < 2) {
    return 'Bank Transaction';
  }

  return cleaned
    .split(' ')
    .slice(0, 4)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Tokenizes a CSV line according to RFC 4180 rules, respecting quotes.
 */
export function tokenizeCsvLine(line: string, defaultDelimiter: string = ','): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;

  let delim = defaultDelimiter;
  if (!line.includes(',') && (line.includes(';') || line.includes('\t'))) {
    delim = line.includes('\t') ? '\t' : ';';
  }

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delim && !inQuotes) {
      tokens.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  tokens.push(current.trim().replace(/^["']|["']$/g, ''));
  return tokens;
}

/**
 * Parses raw CSV statement lines into structured transactions.
 */
export function parseCsvStatement(rawText: string): ParsedStatementTransaction[] {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];

  const results: ParsedStatementTransaction[] = [];

  // Parse header line
  const headerTokens = tokenizeCsvLine(lines[0]).map((h) => h.toLowerCase().trim().replace(/["']/g, ''));

  const dateIdx = headerTokens.findIndex((h) => h.includes('date'));
  const descIdx = headerTokens.findIndex((h) => h.includes('desc') || h.includes('narration') || h.includes('particular'));
  const debitIdx = headerTokens.findIndex((h) => h.includes('debit') || h.includes('withdrawal') || h === 'dr');
  const creditIdx = headerTokens.findIndex((h) => h.includes('credit') || h.includes('deposit') || h === 'cr');
  const amountIdx = headerTokens.findIndex((h) => h.includes('amount') || h === 'amt');
  const refIdx = headerTokens.findIndex((h) => h.includes('ref') || h.includes('chq') || h.includes('utr') || h.includes('rrn'));

  for (let i = 1; i < lines.length; i++) {
    const row = tokenizeCsvLine(lines[i]);
    if (row.length < 2) continue;

    const rawDate = dateIdx >= 0 ? row[dateIdx] : row[0];
    const rawDesc = descIdx >= 0 ? row[descIdx] : row[1] || 'Bank Transaction';

    let debitStr = debitIdx >= 0 ? row[debitIdx] : '';
    let creditStr = creditIdx >= 0 ? row[creditIdx] : '';
    let type: TransactionType = 'expense';
    let amountStr = '';

    if (debitIdx >= 0 && creditIdx >= 0) {
      if (debitStr && parseFloat(debitStr.replace(/,/g, '')) > 0) {
        type = 'expense';
        amountStr = debitStr;
      } else if (creditStr && parseFloat(creditStr.replace(/,/g, '')) > 0) {
        type = 'income';
        amountStr = creditStr;
      }
    } else if (amountIdx >= 0) {
      amountStr = row[amountIdx];
      // Check for type column or sign
      const typeCol = row.find((c) => /^(dr|cr|debit|credit)$/i.test(c));
      if (typeCol && /^(cr|credit)$/i.test(typeCol)) {
        type = 'income';
      }
    }

    const cleanNum = amountStr.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleanNum);
    if (isNaN(num) || num <= 0) continue;

    const dateIso = parseFlexibleDate(rawDate);
    const title = cleanBankNarration(rawDesc);
    const { categoryId } = matchCategory(`${title} ${rawDesc}`);
    const refNo = refIdx >= 0 ? row[refIdx] : undefined;

    results.push({
      id: generateId(),
      amount: rupeesToPaise(num),
      type,
      title,
      categoryId,
      date: dateIso,
      notes: rawDesc,
      referenceNo: refNo || undefined,
      source: 'statement',
      rawLine: lines[i],
    });
  }

  return results;
}

/**
 * Parses digital email receipts (Swiggy, Zomato, Uber, Amazon, Flipkart, etc.).
 */
export function parseEmailReceipt(rawText: string): ParsedStatementTransaction | null {
  const text = rawText.trim();
  if (!text || text.length < 10) return null;

  // 1. Extract Amount
  // Matches "Total: ₹340.00", "Order Total: Rs. 450", "Grand Total INR 1,299", "Amount Paid: ₹500"
  const amountRegex =
    /(?:total|grand\s+total|amount\s+paid|order\s+total|fare|bill\s+amount|net\s+amount|paid)[:\s]*(?:rs\.?|inr|\u20B9)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i;
  const amountMatch = text.match(amountRegex);

  if (!amountMatch || !amountMatch[1]) {
    // Fallback: look for currency figure on lines containing total/paid
    const fallbackMatch = text.match(/(?:(?:rs\.?|inr|\u20B9)\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i);
    if (!fallbackMatch || !fallbackMatch[1]) return null;
  }

  const rawAmountStr = (amountMatch && amountMatch[1]) || text.match(/(?:(?:rs\.?|inr|\u20B9)\s*)([0-9,]+(?:\.[0-9]{1,2})?)/i)?.[1] || '';
  const num = parseFloat(rawAmountStr.replace(/,/g, ''));
  if (isNaN(num) || num <= 0) return null;

  // 2. Identify Merchant
  let title = 'Digital Receipt';
  let categoryId = 'other';

  if (/swiggy/i.test(text)) {
    title = 'Swiggy';
    categoryId = 'food';
    const restMatch = text.match(/(?:restaurant|from|at)\s*[:]\s*([A-Za-z0-9\s&'-]{3,25})/i);
    if (restMatch && restMatch[1]) title = `Swiggy (${cleanBankNarration(restMatch[1])})`;
  } else if (/zomato/i.test(text)) {
    title = 'Zomato';
    categoryId = 'food';
  } else if (/uber/i.test(text)) {
    title = 'Uber Ride';
    categoryId = 'transport';
  } else if (/ola/i.test(text)) {
    title = 'Ola Cab';
    categoryId = 'transport';
  } else if (/amazon/i.test(text)) {
    title = 'Amazon Order';
    categoryId = 'shopping';
  } else if (/flipkart/i.test(text)) {
    title = 'Flipkart Order';
    categoryId = 'shopping';
  } else if (/bookmyshow/i.test(text)) {
    title = 'BookMyShow';
    categoryId = 'entertainment';
  } else if (/blinkit|zepto|instamart|bigbasket/i.test(text)) {
    title = 'Groceries Online';
    categoryId = 'groceries';
  } else {
    // Try merchant pattern
    const mMatch = text.match(/(?:merchant|paid\s+to|vendor|store|biller)\s*[:]\s*([A-Za-z0-9\s&'-]{3,30})/i);
    if (mMatch && mMatch[1]) {
      title = cleanBankNarration(mMatch[1]);
      categoryId = matchCategory(title).categoryId;
    }
  }

  // 3. Extract Date
  const dateMatch = text.match(/(?:date|ordered\s+on|trip\s+on|time)\s*[:]\s*([A-Za-z0-9,/ -]{6,25})/i);
  const dateIso = dateMatch ? parseFlexibleDate(dateMatch[1]) : new Date().toISOString();

  // 4. Extract Reference / Order ID
  const refMatch = text.match(/(?:order\s*#?|order\s*id|invoice\s*#?|receipt\s*#?|txn\s*id)\s*[:#]?\s*([0-9A-Za-z_-]{4,25})/i);
  const refNo = refMatch ? refMatch[1] : undefined;

  return {
    id: generateId(),
    amount: rupeesToPaise(num),
    type: 'expense',
    title,
    categoryId,
    date: dateIso,
    notes: text.slice(0, 250),
    referenceNo: refNo,
    source: 'email',
    rawLine: text.slice(0, 200),
  };
}

/**
 * Universal auto-detection parser: Accepts either CSV tabular data or freeform digital receipts.
 */
export function parseStatementOrReceipt(rawInput: string): ParsedStatementTransaction[] {
  const trimmed = rawInput.trim();
  if (!trimmed) return [];

  // If input contains multiple commas/tabs with a date keyword, treat as CSV
  const firstLine = trimmed.split(/\r?\n/)[0] || '';
  if ((firstLine.includes(',') || firstLine.includes(';') || firstLine.includes('\t')) && /date|narration|amount|debit/i.test(firstLine)) {
    const csvResult = parseCsvStatement(trimmed);
    if (csvResult.length > 0) return csvResult;
  }

  // Try parsing as single email receipt
  const receiptResult = parseEmailReceipt(trimmed);
  if (receiptResult) {
    return [receiptResult];
  }

  // Fallback: check if each line is a receipt summary
  const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 10);
  const multiReceipts: ParsedStatementTransaction[] = [];
  for (const line of lines) {
    const single = parseEmailReceipt(line);
    if (single) multiReceipts.push(single);
  }

  return multiReceipts;
}

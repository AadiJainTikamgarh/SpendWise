/**
 * Official Indian Bank & Financial Institution SMS Sender IDs (TRAI DLT Registry).
 *
 * In India, TRAI (Telecom Regulatory Authority of India) mandates a DLT header architecture:
 * [2-letter Operator/Circle Prefix]-[6-character Entity Header]-[Optional Category Suffix]
 * Examples:
 * - JK-UNIONB-S (Jammu & Kashmir circle, Union Bank of India, Service implicit)
 * - VM-HDFCBK-T (Vodafone Mumbai, HDFC Bank, Transactional)
 * - AD-SBINBS-T (Airtel Delhi, State Bank of India Internet Banking, Transactional)
 * - AX-ICICIB (Airtel, ICICI Bank)
 * - BP-CANBNK-S (BSNL Pune, Canara Bank)
 * - AD-AIRBNK-T (Airtel Payments Bank)
 */

export interface BankHeaderEntry {
  readonly code: string;
  readonly bankName: string;
  readonly category: 'public' | 'private' | 'foreign' | 'sfb' | 'payments' | 'fintech';
}

export const TRAI_BANK_HEADERS: readonly BankHeaderEntry[] = [
  // ==========================================
  // 1. PUBLIC SECTOR BANKS (PSBs)
  // ==========================================
  { code: 'SBIBNK', bankName: 'State Bank of India', category: 'public' },
  { code: 'SBINBS', bankName: 'State Bank of India', category: 'public' },
  { code: 'SBIINB', bankName: 'State Bank of India', category: 'public' },
  { code: 'SBIN', bankName: 'State Bank of India', category: 'public' },
  { code: 'SBI', bankName: 'State Bank of India', category: 'public' },
  { code: 'SBYONO', bankName: 'State Bank of India', category: 'public' },
  { code: 'SBIUPI', bankName: 'State Bank of India', category: 'public' },
  { code: 'SBICRD', bankName: 'SBI Card', category: 'public' },
  { code: 'SBIATM', bankName: 'State Bank of India', category: 'public' },
  { code: 'SBIOTP', bankName: 'State Bank of India', category: 'public' },
  { code: 'SBISMS', bankName: 'State Bank of India', category: 'public' },
  { code: 'SBIPAY', bankName: 'State Bank of India', category: 'public' },
  { code: 'SBIDGT', bankName: 'State Bank of India', category: 'public' },

  { code: 'PNBSMS', bankName: 'Punjab National Bank', category: 'public' },
  { code: 'PNBBNK', bankName: 'Punjab National Bank', category: 'public' },
  { code: 'PUNJAB', bankName: 'Punjab National Bank', category: 'public' },
  { code: 'PNBONL', bankName: 'Punjab National Bank', category: 'public' },

  { code: 'BOBBNK', bankName: 'Bank of Baroda', category: 'public' },
  { code: 'BOBTXN', bankName: 'Bank of Baroda', category: 'public' },
  { code: 'BARODA', bankName: 'Bank of Baroda', category: 'public' },
  { code: 'BOBBOB', bankName: 'Bank of Baroda', category: 'public' },
  { code: 'BOBCRD', bankName: 'Bank of Baroda', category: 'public' },

  { code: 'CANBNK', bankName: 'Canara Bank', category: 'public' },
  { code: 'CNRBMS', bankName: 'Canara Bank', category: 'public' },
  { code: 'CANARA', bankName: 'Canara Bank', category: 'public' },

  { code: 'UNIONB', bankName: 'Union Bank of India', category: 'public' },
  { code: 'UBIBNK', bankName: 'Union Bank of India', category: 'public' },
  { code: 'UBIALT', bankName: 'Union Bank of India', category: 'public' },
  { code: 'UNIONM', bankName: 'Union Bank of India', category: 'public' },

  { code: 'BOIBNK', bankName: 'Bank of India', category: 'public' },
  { code: 'BOISMS', bankName: 'Bank of India', category: 'public' },
  { code: 'BKIDTX', bankName: 'Bank of India', category: 'public' },
  { code: 'BOIIND', bankName: 'Bank of India', category: 'public' },

  { code: 'INDBNK', bankName: 'Indian Bank', category: 'public' },
  { code: 'INDIAN', bankName: 'Indian Bank', category: 'public' },
  { code: 'ALBKMS', bankName: 'Indian Bank', category: 'public' },
  { code: 'IDIBNK', bankName: 'Indian Bank', category: 'public' },

  { code: 'CBIBNK', bankName: 'Central Bank of India', category: 'public' },
  { code: 'CENTBK', bankName: 'Central Bank of India', category: 'public' },
  { code: 'CBISMS', bankName: 'Central Bank of India', category: 'public' },
  { code: 'CENTRL', bankName: 'Central Bank of India', category: 'public' },

  { code: 'IOBBNK', bankName: 'Indian Overseas Bank', category: 'public' },
  { code: 'IOBSMS', bankName: 'Indian Overseas Bank', category: 'public' },
  { code: 'IOBTXN', bankName: 'Indian Overseas Bank', category: 'public' },

  { code: 'UCOBNK', bankName: 'UCO Bank', category: 'public' },
  { code: 'UCOSMS', bankName: 'UCO Bank', category: 'public' },
  { code: 'UCOBNX', bankName: 'UCO Bank', category: 'public' },

  { code: 'BOMBNK', bankName: 'Bank of Maharashtra', category: 'public' },
  { code: 'MAHABK', bankName: 'Bank of Maharashtra', category: 'public' },
  { code: 'BOMSMS', bankName: 'Bank of Maharashtra', category: 'public' },

  { code: 'PSBBNK', bankName: 'Punjab & Sind Bank', category: 'public' },
  { code: 'PSBSMS', bankName: 'Punjab & Sind Bank', category: 'public' },
  { code: 'PSBNDL', bankName: 'Punjab & Sind Bank', category: 'public' },

  // ==========================================
  // 2. PRIVATE SECTOR BANKS
  // ==========================================
  { code: 'HDFCBK', bankName: 'HDFC Bank', category: 'private' },
  { code: 'HDFCCC', bankName: 'HDFC Bank', category: 'private' },
  { code: 'HDFCAL', bankName: 'HDFC Bank', category: 'private' },
  { code: 'HDFCU', bankName: 'HDFC Bank', category: 'private' },

  { code: 'ICICIB', bankName: 'ICICI Bank', category: 'private' },
  { code: 'ICICIC', bankName: 'ICICI Bank', category: 'private' },
  { code: 'ICICIS', bankName: 'ICICI Bank', category: 'private' },
  { code: 'ICICIT', bankName: 'ICICI Bank', category: 'private' },

  { code: 'AXISBK', bankName: 'Axis Bank', category: 'private' },
  { code: 'AXISCC', bankName: 'Axis Bank', category: 'private' },
  { code: 'AXISBN', bankName: 'Axis Bank', category: 'private' },
  { code: 'AXISTX', bankName: 'Axis Bank', category: 'private' },

  { code: 'KOTAKB', bankName: 'Kotak Bank', category: 'private' },
  { code: 'KOTAKC', bankName: 'Kotak Bank', category: 'private' },
  { code: 'KMBLTX', bankName: 'Kotak Bank', category: 'private' },
  { code: 'KOTAK', bankName: 'Kotak Bank', category: 'private' },

  { code: 'INDUSB', bankName: 'IndusInd Bank', category: 'private' },
  { code: 'INDUSD', bankName: 'IndusInd Bank', category: 'private' },
  { code: 'INDUSI', bankName: 'IndusInd Bank', category: 'private' },

  { code: 'YESBNK', bankName: 'Yes Bank', category: 'private' },
  { code: 'YESALT', bankName: 'Yes Bank', category: 'private' },
  { code: 'YESPAY', bankName: 'Yes Bank', category: 'private' },
  { code: 'YESTXN', bankName: 'Yes Bank', category: 'private' },

  { code: 'IDFCFB', bankName: 'IDFC FIRST Bank', category: 'private' },
  { code: 'IDFCBK', bankName: 'IDFC FIRST Bank', category: 'private' },
  { code: 'IDFCCC', bankName: 'IDFC FIRST Bank', category: 'private' },
  { code: 'IDFCNB', bankName: 'IDFC FIRST Bank', category: 'private' },

  { code: 'FEDBNK', bankName: 'Federal Bank', category: 'private' },
  { code: 'FEDRAL', bankName: 'Federal Bank', category: 'private' },
  { code: 'FEDTXN', bankName: 'Federal Bank', category: 'private' },
  { code: 'FEDSEC', bankName: 'Federal Bank', category: 'private' },

  { code: 'RBLBNK', bankName: 'RBL Bank', category: 'private' },
  { code: 'RBLCRD', bankName: 'RBL Bank', category: 'private' },
  { code: 'RBLTXN', bankName: 'RBL Bank', category: 'private' },
  { code: 'RATBNK', bankName: 'RBL Bank', category: 'private' },

  { code: 'BANDHN', bankName: 'Bandhan Bank', category: 'private' },
  { code: 'BNDHAN', bankName: 'Bandhan Bank', category: 'private' },
  { code: 'BANDBK', bankName: 'Bandhan Bank', category: 'private' },

  { code: 'SIBLBN', bankName: 'South Indian Bank', category: 'private' },
  { code: 'SIBBNK', bankName: 'South Indian Bank', category: 'private' },
  { code: 'SIBALT', bankName: 'South Indian Bank', category: 'private' },

  { code: 'CUBBNK', bankName: 'City Union Bank', category: 'private' },
  { code: 'CUBTXN', bankName: 'City Union Bank', category: 'private' },
  { code: 'CITYUB', bankName: 'City Union Bank', category: 'private' },

  { code: 'KVBANK', bankName: 'Karur Vysya Bank', category: 'private' },
  { code: 'KVBSMS', bankName: 'Karur Vysya Bank', category: 'private' },
  { code: 'KVBNET', bankName: 'Karur Vysya Bank', category: 'private' },

  { code: 'KTKBNK', bankName: 'Karnataka Bank', category: 'private' },
  { code: 'KBLBNK', bankName: 'Karnataka Bank', category: 'private' },
  { code: 'KARBNK', bankName: 'Karnataka Bank', category: 'private' },

  { code: 'IDBIBK', bankName: 'IDBI Bank', category: 'private' },
  { code: 'IDBIMS', bankName: 'IDBI Bank', category: 'private' },
  { code: 'IDBITX', bankName: 'IDBI Bank', category: 'private' },

  { code: 'TMBLBK', bankName: 'Tamilnad Mercantile Bank', category: 'private' },
  { code: 'TMBLTX', bankName: 'Tamilnad Mercantile Bank', category: 'private' },
  { code: 'TMBBNK', bankName: 'Tamilnad Mercantile Bank', category: 'private' },

  { code: 'CSBBNK', bankName: 'CSB Bank', category: 'private' },
  { code: 'CSBSMS', bankName: 'CSB Bank', category: 'private' },

  { code: 'DCBBNK', bankName: 'DCB Bank', category: 'private' },
  { code: 'DCBALT', bankName: 'DCB Bank', category: 'private' },

  { code: 'DLXBNK', bankName: 'Dhanlaxmi Bank', category: 'private' },
  { code: 'DHANBK', bankName: 'Dhanlaxmi Bank', category: 'private' },

  { code: 'NTBLBK', bankName: 'Nainital Bank', category: 'private' },
  { code: 'NTBLBN', bankName: 'Nainital Bank', category: 'private' },

  { code: 'JKBANK', bankName: 'Jammu & Kashmir Bank', category: 'private' },
  { code: 'JKBSMS', bankName: 'Jammu & Kashmir Bank', category: 'private' },

  // ==========================================
  // 3. FOREIGN BANKS IN INDIA
  // ==========================================
  { code: 'SCBBNK', bankName: 'Standard Chartered', category: 'foreign' },
  { code: 'SCBIN', bankName: 'Standard Chartered', category: 'foreign' },
  { code: 'SCBTXN', bankName: 'Standard Chartered', category: 'foreign' },
  { code: 'STANCHAR', bankName: 'Standard Chartered', category: 'foreign' },

  { code: 'HSBCIN', bankName: 'HSBC', category: 'foreign' },
  { code: 'HSBCBK', bankName: 'HSBC', category: 'foreign' },
  { code: 'HSBCRD', bankName: 'HSBC', category: 'foreign' },

  { code: 'CITIBK', bankName: 'Citi Bank', category: 'foreign' },
  { code: 'CITICR', bankName: 'Citi Bank', category: 'foreign' },
  { code: 'CITIAL', bankName: 'Citi Bank', category: 'foreign' },

  { code: 'DEUSTB', bankName: 'Deutsche Bank', category: 'foreign' },
  { code: 'DBIND', bankName: 'Deutsche Bank', category: 'foreign' },

  { code: 'DBSBNK', bankName: 'DBS Bank', category: 'foreign' },
  { code: 'DIGIBK', bankName: 'DBS Bank', category: 'foreign' },
  { code: 'DBSIN', bankName: 'DBS Bank', category: 'foreign' },

  { code: 'BARCBK', bankName: 'Barclays', category: 'foreign' },
  { code: 'BARC', bankName: 'Barclays', category: 'foreign' },

  // ==========================================
  // 4. SMALL FINANCE BANKS (SFBs)
  // ==========================================
  { code: 'AUBANK', bankName: 'AU Small Finance Bank', category: 'sfb' },
  { code: 'AUSFB', bankName: 'AU Small Finance Bank', category: 'sfb' },
  { code: 'AUBKCR', bankName: 'AU Small Finance Bank', category: 'sfb' },

  { code: 'EQSFBK', bankName: 'Equitas Small Finance Bank', category: 'sfb' },
  { code: 'EQUITB', bankName: 'Equitas Small Finance Bank', category: 'sfb' },
  { code: 'EQSFB', bankName: 'Equitas Small Finance Bank', category: 'sfb' },

  { code: 'UJJIVN', bankName: 'Ujjivan Small Finance Bank', category: 'sfb' },
  { code: 'UJJIVAN', bankName: 'Ujjivan Small Finance Bank', category: 'sfb' },
  { code: 'USFB', bankName: 'Ujjivan Small Finance Bank', category: 'sfb' },

  { code: 'JANABK', bankName: 'Jana Small Finance Bank', category: 'sfb' },
  { code: 'JANASFB', bankName: 'Jana Small Finance Bank', category: 'sfb' },
  { code: 'JANAB', bankName: 'Jana Small Finance Bank', category: 'sfb' },

  { code: 'UTKBNK', bankName: 'Utkarsh Small Finance Bank', category: 'sfb' },
  { code: 'UTKARSH', bankName: 'Utkarsh Small Finance Bank', category: 'sfb' },
  { code: 'USFBK', bankName: 'Utkarsh Small Finance Bank', category: 'sfb' },

  { code: 'SURYOD', bankName: 'Suryoday Small Finance Bank', category: 'sfb' },
  { code: 'SURYODAY', bankName: 'Suryoday Small Finance Bank', category: 'sfb' },
  { code: 'SSFB', bankName: 'Suryoday Small Finance Bank', category: 'sfb' },

  { code: 'ESAFSF', bankName: 'ESAF Small Finance Bank', category: 'sfb' },
  { code: 'ESAFBK', bankName: 'ESAF Small Finance Bank', category: 'sfb' },

  { code: 'CSFBKN', bankName: 'Capital Small Finance Bank', category: 'sfb' },
  { code: 'CAPSFB', bankName: 'Capital Small Finance Bank', category: 'sfb' },

  { code: 'FINCAR', bankName: 'Fincare Small Finance Bank', category: 'sfb' },
  { code: 'FINSFB', bankName: 'Fincare Small Finance Bank', category: 'sfb' },

  { code: 'SHIVLK', bankName: 'Shivalik Small Finance Bank', category: 'sfb' },
  { code: 'SSFBIN', bankName: 'Shivalik Small Finance Bank', category: 'sfb' },

  { code: 'UNITYB', bankName: 'Unity Small Finance Bank', category: 'sfb' },
  { code: 'UNITYSFB', bankName: 'Unity Small Finance Bank', category: 'sfb' },

  { code: 'NESFBK', bankName: 'North East Small Finance Bank', category: 'sfb' },
  { code: 'NESFB', bankName: 'North East Small Finance Bank', category: 'sfb' },

  // ==========================================
  // 5. PAYMENTS BANKS
  // ==========================================
  { code: 'IPPBMS', bankName: 'India Post Payments Bank', category: 'payments' },
  { code: 'POSTBK', bankName: 'India Post Payments Bank', category: 'payments' },
  { code: 'DOPBNK', bankName: 'India Post Payments Bank', category: 'payments' },
  { code: 'IPPB', bankName: 'India Post Payments Bank', category: 'payments' },

  { code: 'PAYTMB', bankName: 'Paytm Payments Bank', category: 'payments' },
  { code: 'PYTM', bankName: 'Paytm Payments Bank', category: 'payments' },
  { code: 'PAYTM', bankName: 'Paytm Payments Bank', category: 'payments' },

  { code: 'AIRBNK', bankName: 'Airtel Payments Bank', category: 'payments' },
  { code: 'AIRTELPB', bankName: 'Airtel Payments Bank', category: 'payments' },
  { code: 'AIRPBK', bankName: 'Airtel Payments Bank', category: 'payments' },
  { code: 'APBL', bankName: 'Airtel Payments Bank', category: 'payments' },

  { code: 'FINOPB', bankName: 'Fino Payments Bank', category: 'payments' },
  { code: 'FINOBK', bankName: 'Fino Payments Bank', category: 'payments' },

  { code: 'JIOPBK', bankName: 'Jio Payments Bank', category: 'payments' },
  { code: 'JIOBNK', bankName: 'Jio Payments Bank', category: 'payments' },

  { code: 'NSDLPB', bankName: 'NSDL Payments Bank', category: 'payments' },
  { code: 'NSDLBK', bankName: 'NSDL Payments Bank', category: 'payments' },

  // ==========================================
  // 6. CREDIT CARDS & FINTECH APPS
  // ==========================================
  { code: 'ONECRD', bankName: 'OneCard', category: 'fintech' },
  { code: 'FPLCRD', bankName: 'OneCard', category: 'fintech' },
  { code: '1CARD', bankName: 'OneCard', category: 'fintech' },

  { code: 'UNICRD', bankName: 'Uni Cards', category: 'fintech' },
  { code: 'UNIPAY', bankName: 'Uni Cards', category: 'fintech' },

  { code: 'SLICEC', bankName: 'Slice', category: 'fintech' },
  { code: 'SLICEP', bankName: 'Slice', category: 'fintech' },
  { code: 'SLICE', bankName: 'Slice', category: 'fintech' },

  { code: 'JUPITR', bankName: 'Jupiter', category: 'fintech' },
  { code: 'JUPTR', bankName: 'Jupiter', category: 'fintech' },
  { code: 'JUPITER', bankName: 'Jupiter', category: 'fintech' },

  { code: 'FIBANK', bankName: 'Fi Money', category: 'fintech' },
  { code: 'FIMNY', bankName: 'Fi Money', category: 'fintech' },
  { code: 'EPIFI', bankName: 'Fi Money', category: 'fintech' },

  { code: 'CRED', bankName: 'CRED', category: 'fintech' },
  { code: 'CREDTX', bankName: 'CRED', category: 'fintech' },
  { code: 'DREAMPLUG', bankName: 'CRED', category: 'fintech' },

  { code: 'GPAY', bankName: 'Google Pay', category: 'fintech' },
  { code: 'GOOGLP', bankName: 'Google Pay', category: 'fintech' },
  { code: 'GPAYIN', bankName: 'Google Pay', category: 'fintech' },

  { code: 'PHONEPE', bankName: 'PhonePe', category: 'fintech' },
  { code: 'PHNPE', bankName: 'PhonePe', category: 'fintech' },
  { code: 'PPINTX', bankName: 'PhonePe', category: 'fintech' },

  { code: 'BHIM', bankName: 'BHIM UPI', category: 'fintech' },
  { code: 'NPCITX', bankName: 'BHIM UPI', category: 'fintech' },
  { code: 'NPCI', bankName: 'BHIM UPI', category: 'fintech' },

  { code: 'AMZPAY', bankName: 'Amazon Pay', category: 'fintech' },
  { code: 'AMAZONP', bankName: 'Amazon Pay', category: 'fintech' },

  { code: 'BAJAJF', bankName: 'Bajaj Finserv', category: 'fintech' },
  { code: 'BAJAJFIN', bankName: 'Bajaj Finserv', category: 'fintech' },
  { code: 'BFIN', bankName: 'Bajaj Finserv', category: 'fintech' },

  { code: 'NAVIFN', bankName: 'Navi', category: 'fintech' },
  { code: 'NAVITX', bankName: 'Navi', category: 'fintech' },

  { code: 'MOBIKW', bankName: 'MobiKwik', category: 'fintech' },
  { code: 'MBKWIK', bankName: 'MobiKwik', category: 'fintech' },

  { code: 'FREECH', bankName: 'Freecharge', category: 'fintech' },
  { code: 'FREECHARGE', bankName: 'Freecharge', category: 'fintech' },

  { code: 'TATAPY', bankName: 'Tata Pay', category: 'fintech' },
  { code: 'TATAPAY', bankName: 'Tata Pay', category: 'fintech' },
];

/** Fast O(1) header code lookup table (all codes in uppercase) */
const HEADER_LOOKUP_MAP: Map<string, BankHeaderEntry> = new Map(
  TRAI_BANK_HEADERS.map((entry) => [entry.code.toUpperCase(), entry])
);

/**
 * Normalizes a TRAI DLT SMS sender address to extract the core 3-8 character header.
 *
 * TRAI Header formats:
 * 1. Full with suffix: "JK-UNIONB-S", "VM-HDFCBK-T", "AD-SBINBS-T", "AD-AIRBNK-T"
 * 2. Prefix only: "AX-ICICIB", "BP-CANBNK", "DM-YESBNK"
 * 3. Suffix only: "UNIONB-S", "HDFCBK-T"
 * 4. Bare header: "UNIONB", "HDFCBK", "ICICIB", "ONECRD"
 *
 * @param address Raw sender address string
 * @returns Clean uppercase alphanumeric core header, or trimmed uppercase string
 */
export function extractTraiCoreHeader(address: string): string {
  if (!address) return '';
  const trimmed = address.trim().toUpperCase();

  // Pattern 1: TRAI 2-letter circle prefix + 3-8 char header + 1-2 char category suffix
  // e.g. "JK-UNIONB-S", "VM-HDFCBK-T", "AD-SBINBS-T"
  const fullTraiMatch = trimmed.match(/^[A-Z]{2}-([A-Z0-9]{3,8})-[A-Z0-9]{1,2}$/);
  if (fullTraiMatch && fullTraiMatch[1]) {
    return fullTraiMatch[1];
  }

  // Pattern 2: TRAI 2-letter circle prefix + 3-8 char header (no suffix)
  // e.g. "AX-ICICIB", "BP-CANBNK", "DM-YESBNK", "BW-CRED"
  const prefixTraiMatch = trimmed.match(/^[A-Z]{2}-([A-Z0-9]{3,8})$/);
  if (prefixTraiMatch && prefixTraiMatch[1]) {
    return prefixTraiMatch[1];
  }

  // Pattern 3: Header + category suffix
  // e.g. "UNIONB-S", "HDFCBK-T"
  const suffixMatch = trimmed.match(/^([A-Z0-9]{3,8})-[A-Z0-9]{1,2}$/);
  if (suffixMatch && suffixMatch[1]) {
    return suffixMatch[1];
  }

  // Pattern 4: Bare alphanumeric header or unhyphenated circle prefix + header (e.g. "VMSBIN", "JMUNIONB", "ADSBIN")
  const bareMatch = trimmed.match(/^([A-Z0-9]{3,11})$/);
  if (bareMatch && bareMatch[1]) {
    const raw = bareMatch[1];
    if (HEADER_LOOKUP_MAP.has(raw)) {
      return raw;
    }
    // Check if stripping the standard 2-letter circle prefix matches a known bank
    if (raw.length >= 5) {
      const strippedCircle = raw.slice(2);
      if (HEADER_LOOKUP_MAP.has(strippedCircle)) {
        return strippedCircle;
      }
    }
    return raw;
  }

  return trimmed;
}

/**
 * Checks if a sender address corresponds to a known TRAI financial header.
 */
export function isKnownTraiFinancialHeader(address: string): boolean {
  if (!address) return false;
  const core = extractTraiCoreHeader(address);
  return HEADER_LOOKUP_MAP.has(core);
}

/**
 * Returns the canonical bank or financial institution name from a TRAI sender address,
 * or null if not identified in the registry.
 */
export function getBankNameFromTraiHeader(address: string): string | null {
  if (!address) return null;
  const core = extractTraiCoreHeader(address);
  const entry = HEADER_LOOKUP_MAP.get(core);
  return entry ? entry.bankName : null;
}

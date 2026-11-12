import { parseSms, parseSmsList } from '../sms-parser';
import { RawSms } from '../types';

export interface TestResult {
  passed: boolean;
  total: number;
  successes: number;
  failures: string[];
}

export interface LegitimateCase {
  name: string;
  sms: RawSms;
  expectedAmountPaise: number;
  expectedType: 'expense' | 'income';
  expectedTitle?: string;
  expectedAccountLast4?: string;
  expectedReferenceNo?: string;
  expectedCategoryId?: string;
  expectedBankName?: string;
}

export interface SpamCase {
  name: string;
  sms: RawSms;
  reason: string;
}

export function runParserTests(): TestResult {
  const legitimateCases: LegitimateCase[] = [
    {
      name: 'HDFC UPI Debit (Swiggy)',
      sms: {
        id: 'legit-1',
        address: 'AD-HDFCBK',
        body: 'Sent: Rs.450.00 from HDFC Bank A/C *1234 to SWIGGY on 09-NOV-26 via UPI. Ref 4314241241. Not you? Call 1800...',
        date: 1794218000000,
      },
      expectedAmountPaise: 45000,
      expectedType: 'expense',
      expectedTitle: 'Swiggy',
      expectedAccountLast4: '1234',
      expectedReferenceNo: '4314241241',
      expectedCategoryId: 'food',
      expectedBankName: 'HDFC Bank',
    },
    {
      name: 'SBI Debit (Blinkit)',
      sms: {
        id: 'legit-2',
        address: 'VM-SBIN',
        body: 'Dear SBI User, your A/C ending 4321 debited by Rs 250.00 on 09Nov26 transfer to Blinkit UPI Ref No 4315352352. If not done by you call 1800...',
        date: 1794218100000,
      },
      expectedAmountPaise: 25000,
      expectedType: 'expense',
      expectedTitle: 'Blinkit',
      expectedAccountLast4: '4321',
      expectedReferenceNo: '4315352352',
      expectedCategoryId: 'groceries',
      expectedBankName: 'State Bank of India',
    },
    {
      name: 'ICICI Credit Card Purchase (Starbucks)',
      sms: {
        id: 'legit-3',
        address: 'VK-ICICIB',
        body: 'Dear Customer, ICICI Bank Card XX4002 has been used for purchase of INR 850.00 at STARBUCKS on 07-NOV-26. Avl Limit INR 45,000.',
        date: 1794218200000,
      },
      expectedAmountPaise: 85000,
      expectedType: 'expense',
      expectedTitle: 'Starbucks',
      expectedAccountLast4: '4002',
      expectedCategoryId: 'food',
      expectedBankName: 'ICICI Bank',
    },
    {
      name: 'Axis Bank Debit (Uber)',
      sms: {
        id: 'legit-4',
        address: 'AD-AXISBK',
        body: 'Axis Bank: INR 320.00 debited from A/c no. XX1234 on 09-11-2026 for Uber via UPI. Avl Bal INR 12,000.00.',
        date: 1794218300000,
      },
      expectedAmountPaise: 32000,
      expectedType: 'expense',
      expectedTitle: 'Uber',
      expectedAccountLast4: '1234',
      expectedCategoryId: 'transport',
      expectedBankName: 'Axis Bank',
    },
    {
      name: 'Kotak Bank Paid via UPI',
      sms: {
        id: 'legit-5',
        address: 'BP-KOTAKB',
        body: 'Paid Rs.120.00 to Chai Point from Kotak Bank A/C 9876 via UPI Ref 928374928. Avl Bal Rs 5,400.00.',
        date: 1794218350000,
      },
      expectedAmountPaise: 12000,
      expectedType: 'expense',
      expectedTitle: 'Bank Expense',
      expectedAccountLast4: '9876',
      expectedReferenceNo: '928374928',
      expectedCategoryId: 'food',
      expectedBankName: 'Kotak Bank',
    },
    {
      name: 'Salary Credit (Income)',
      sms: {
        id: 'legit-6',
        address: 'AD-HDFCBK',
        body: 'Rs 85,000.00 credited to HDFC Bank A/c xx1234 on 01-Nov-26 by Salary. Avl Bal: Rs 92,000.00.',
        date: 1794218400000,
      },
      expectedAmountPaise: 8500000,
      expectedType: 'income',
      expectedAccountLast4: '1234',
      expectedBankName: 'HDFC Bank',
    },
    {
      name: 'ATM Cash Withdrawal',
      sms: {
        id: 'legit-7',
        address: 'VM-SBIN',
        body: 'Your A/C ending 4321 with withdrawn for Rs 2,000.00 at SBI ATM on 08-Nov-26. Avl Bal Rs 15,200.00.',
        date: 1794218450000,
      },
      expectedAmountPaise: 200000,
      expectedType: 'expense',
      expectedTitle: 'Sbi Atm',
      expectedAccountLast4: '4321',
      expectedBankName: 'State Bank of India',
    },
    // --- Verbatim Legitimate Sample from ORIGINAL_REQUEST.md ---
    {
      name: 'Verbatim R3: Legitimate SBI Bank Debit (Swiggy)',
      sms: {
        id: 'req-legit-sbi-4',
        address: 'VM-SBIN',
        body: 'Dear SBI User, A/C 9876 debited by Rs 250.00 on 12-Nov-26 by UPI to Swiggy. Ref No 431602819231. Bal: Rs 14,230.50',
        date: 1794477600000,
      },
      expectedAmountPaise: 25000,
      expectedType: 'expense',
      expectedTitle: 'Swiggy',
      expectedAccountLast4: '9876',
      expectedReferenceNo: '431602819231',
      expectedCategoryId: 'food',
      expectedBankName: 'State Bank of India',
    },
    // --- Edge Case: Header Fallback for Legitimate Transaction ---
    {
      name: 'Edge Case: Legitimate SBI Debit with Unrecognized Sender Header',
      sms: {
        id: 'req-legit-fallback-5',
        address: 'AX-UNKNOWN',
        body: 'Dear SBI User, A/C 9876 debited by Rs 250.00 on 12-Nov-26 by UPI to Swiggy. Ref No 431602819231. Bal: Rs 14,230.50',
        date: 1794477600000,
      },
      expectedAmountPaise: 25000,
      expectedType: 'expense',
      expectedTitle: 'Swiggy',
      expectedAccountLast4: '9876',
      expectedReferenceNo: '431602819231',
      expectedCategoryId: 'food',
      expectedBankName: 'State Bank of India',
    },
    // --- Major Bank Debits & Adversarial Edge Cases from Challenger 2 Suite ---
    {
      name: 'HDFC Card Spend at Amazon',
      sms: {
        id: 'hdfc-spent',
        address: 'AD-HDFCBK',
        body: 'Rs 1,299.00 spent on your HDFC Bank Card ending 5678 at AMAZON on 10-NOV-26. Avl Limit: Rs 34,000.',
        date: 1794218050000,
      },
      expectedAmountPaise: 129900,
      expectedType: 'expense',
      expectedTitle: 'Amazon',
      expectedAccountLast4: '5678',
      expectedBankName: 'HDFC Bank',
    },
    {
      name: 'ICICI Bank UPI Debit',
      sms: {
        id: 'icici-upi',
        address: 'AD-ICICIB',
        body: 'Your A/C ending 1029 is debited for INR 1,500.00 on 11-Nov-26. Info: UPI/331234567890/Merchant. Avl Bal: INR 25,000.00.',
        date: 1794218250000,
      },
      expectedAmountPaise: 150000,
      expectedType: 'expense',
      expectedBankName: 'ICICI Bank',
      expectedAccountLast4: '1029',
    },
    {
      name: 'Punjab National Bank UPI Debit',
      sms: {
        id: 'pnb-debit',
        address: 'AD-PNBSMS',
        body: 'PNB Alert: Your A/C ending with 4567 has been debited by Rs 1,000.00 on 10-Nov-26 through UPI txn ref 123456789. Avl Bal: Rs 8,500.00.',
        date: 1794218400000,
      },
      expectedAmountPaise: 100000,
      expectedType: 'expense',
      expectedBankName: 'Punjab National Bank',
      expectedAccountLast4: '4567',
    },
    {
      name: 'Adversarial: Passive Auxiliary "was debited" (HDFC Bank)',
      sms: {
        id: 'adv-was-debited',
        address: 'AD-HDFCBK',
        body: 'Rs 500.00 was debited from your HDFC Bank A/c 1234 on 10-Nov-26. Ref 12345678. Bal Rs 1000.',
        date: 1794477600000,
      },
      expectedAmountPaise: 50000,
      expectedType: 'expense',
      expectedAccountLast4: '1234',
      expectedBankName: 'HDFC Bank',
    },
    {
      name: 'Adversarial: Passive Auxiliary "was spent" (HDFC Card at Amazon)',
      sms: {
        id: 'adv-was-spent',
        address: 'AD-HDFCBK',
        body: 'Rs 1,299.00 was spent on your HDFC Bank Card 5678 at AMAZON on 10-NOV-26. Bal: Rs 34,000.',
        date: 1794477600000,
      },
      expectedAmountPaise: 129900,
      expectedType: 'expense',
      expectedAccountLast4: '5678',
      expectedBankName: 'HDFC Bank',
    },
    {
      name: 'Adversarial: Contextual Amount with Leading Balance Statement (SBI)',
      sms: {
        id: 'adv-bal-first',
        address: 'VM-SBIN',
        body: 'Avl Bal: Rs 14,230.50. Dear SBI User, A/C 9876 debited by Rs 250.00 on 12-Nov-26 by UPI to Swiggy. Ref No 431602819231.',
        date: 1794477600000,
      },
      expectedAmountPaise: 25000,
      expectedType: 'expense',
      expectedTitle: 'Swiggy',
      expectedAccountLast4: '9876',
      expectedBankName: 'State Bank of India',
    },
    {
      name: 'Adversarial: Dot Masked Account "...1234" (Bank of Baroda)',
      sms: {
        id: 'adv-bob-dots',
        address: 'AD-BOBTXN',
        body: 'Dear BOB Customer, your A/C ...1234 is debited by Rs.750.00 on 11-Nov-2026 by UPI:Swiggy. Total Bal: Rs 15,000.00.',
        date: 1794477600000,
      },
      expectedAmountPaise: 75000,
      expectedType: 'expense',
      expectedAccountLast4: '1234',
      expectedBankName: 'Bank of Baroda',
    },
    {
      name: 'Adversarial: Postfix Currency Formatting "350.00 INR debited" (Axis Bank)',
      sms: {
        id: 'adv-postfix-curr',
        address: 'AD-AXISBK',
        body: '350.00 INR debited from Axis Bank A/C *1234 on 10-Nov-26 for Swiggy. Ref 9876543210. Bal: 5000 INR',
        date: 1794477600000,
      },
      expectedAmountPaise: 35000,
      expectedType: 'expense',
      expectedAccountLast4: '1234',
      expectedBankName: 'Axis Bank',
      expectedTitle: 'Swiggy',
    },
  ];

  const spamCases: SpamCase[] = [
    {
      name: 'OTP Message with Amount',
      sms: {
        id: 'spam-1',
        address: 'VM-SBIN',
        body: '123456 is the OTP for your transaction of Rs. 500.00 at Amazon. Do not share OTP with anyone.',
        date: 1794218500000,
      },
      reason: 'Contains OTP and security code keywords',
    },
    {
      name: 'Pre-approved Loan Offer',
      sms: {
        id: 'spam-2',
        address: 'AD-KOTAKB',
        body: 'Congratulations! Pre-approved personal loan of Rs. 5,00,000 for you. Apply now: https://kotak.com',
        date: 1794218600000,
      },
      reason: 'Contains pre-approved loan marketing keywords and no financial anchors',
    },
    {
      name: 'Swiggy Promo Discount (Marketing Header)',
      sms: {
        id: 'spam-3',
        address: 'QP-SWIGGY',
        body: 'Flat Rs 150 off on your next food order! Use code FEAST. Paid via HDFC to get 10% cashback.',
        date: 1794218700000,
      },
      reason: 'Marketing sender QP-SWIGGY, discount keywords, no bank anchors',
    },
    {
      name: 'Jio Telecom Recharge Due Reminder',
      sms: {
        id: 'spam-4',
        address: 'VM-JIO',
        body: 'Your Jio recharge of Rs 299 is due today. Recharge now on MyJio to continue calls.',
        date: 1794218800000,
      },
      reason: 'Telecom sender, bill due reminder, not a completed transaction',
    },
    {
      name: 'Credit Card Bill Generated Reminder',
      sms: {
        id: 'spam-5',
        address: 'AD-HDFCBK',
        body: 'Your HDFC Bank Credit Card statement has been generated. Total amount due: Rs. 14,250.00. Due date: 20-Nov-26. Pay before due date.',
        date: 1794218900000,
      },
      reason: 'Bill statement generated with due date, not a completed debit',
    },
    {
      name: 'UPI Collect / Payment Request',
      sms: {
        id: 'spam-6',
        address: 'AD-GPAY',
        body: 'Collect request: user@upi has requested Rs 1,500.00 from you. Open Google Pay to approve or decline.',
        date: 1794219000000,
      },
      reason: 'Incoming collect request, not a completed transaction',
    },
    {
      name: 'Declined / Failed Transaction Alert',
      sms: {
        id: 'spam-7',
        address: 'AD-AXISBK',
        body: 'Transaction of INR 1,200.00 on Axis Bank Card XX1234 was declined due to insufficient balance.',
        date: 1794219100000,
      },
      reason: 'Declined transaction due to insufficient funds',
    },
    {
      name: 'Personal SMS from 10-digit mobile number',
      sms: {
        id: 'spam-8',
        address: '+919876543210',
        body: 'Hey bro, I have sent you Rs 500 on PhonePe please check.',
        date: 1794219200000,
      },
      reason: 'Personal phone number, not an official bank sender',
    },
    {
      name: 'Scratch & Win Lottery Spam',
      sms: {
        id: 'spam-9',
        address: 'AD-RUMMY',
        body: 'Scratch and win cash up to Rs. 25,000! Download app now and get Rs 100 free bonus cash.',
        date: 1794219300000,
      },
      reason: 'Gaming spam with lottery and bonus keywords',
    },
    {
      name: 'Myntra Voucher Offer',
      sms: {
        id: 'spam-10',
        address: 'BW-MYNTRA',
        body: 'Special offer! Get flat Rs 200 off on shopping worth Rs 1,999. Use promo code STYLE200.',
        date: 1794219400000,
      },
      reason: 'Retail shopping promo with promo code and flat off',
    },
    {
      name: 'Credit Limit Upgrade Marketing',
      sms: {
        id: 'spam-11',
        address: 'VK-ICICIB',
        body: 'Dear Customer, your ICICI Bank Credit Card limit can be increased to Rs. 2,00,000 for free. Click here to avail.',
        date: 1794219500000,
      },
      reason: 'Credit limit marketing offer, no transaction',
    },
    {
      name: 'KYC Expiry Alert',
      sms: {
        id: 'spam-12',
        address: 'VM-SBIN',
        body: 'SBI Alert: Your A/c KYC is expiring soon. Update your Aadhaar and PAN immediately to prevent debit block.',
        date: 1794219600000,
      },
      reason: 'KYC maintenance notice without transaction',
    },
    // --- Verbatim Spam & Marketing Samples from ORIGINAL_REQUEST.md ---
    {
      name: 'Verbatim R3: Promotional Cashback Offer (Must be ignored)',
      sms: {
        id: 'req-spam-promo-1',
        address: 'AD-RBLBNK',
        body: 'Congratulations! You have won ₹5,000 cashback coupon on your RBL Credit card. Use code WIN5000 to redeem now at xyz.com',
        date: 1794477600000,
      },
      reason: 'Contains winning/congratulations marketing keywords and coupon code, rejected by Layer 2',
    },
    {
      name: 'Verbatim R3: Pre-Approved Loan Spam (Must be ignored)',
      sms: {
        id: 'req-spam-loan-2',
        address: 'AD-HDFCBK',
        body: 'Dear Customer, ₹2,50,000 pre-approved personal loan is ready in your A/C. Zero processing fee. Click bit.ly/loan to claim today.',
        date: 1794477600000,
      },
      reason: 'Contains pre-approved personal loan spam keywords, rejected by Layer 2',
    },
    {
      name: 'Verbatim R3: OTP Authentication (Must be ignored)',
      sms: {
        id: 'req-spam-otp-3',
        address: 'VM-SBIN',
        body: '482910 is your OTP for transaction of INR 350.00 at Zomato. Do not share with anyone.',
        date: 1794477600000,
      },
      reason: 'Contains OTP security code and do-not-share keywords, rejected by Layer 2',
    },
    // --- Edge Case: Personal Phone Sender with Bank Debit Text ---
    {
      name: 'Edge Case: Personal Phone Sender Forwarding Valid Bank Debit Text',
      sms: {
        id: 'req-spam-personal-4',
        address: '+919876543210',
        body: 'Dear SBI User, A/C 9876 debited by Rs 250.00 on 12-Nov-26 by UPI to Swiggy. Ref No 431602819231. Bal: Rs 14,230.50',
        date: 1794477600000,
      },
      reason: 'Personal phone number sender rejected by Layer 1 even if message body mimics bank debit',
    },
    // --- Added 10 Spam Cases from Challenger 2 Suite ---
    {
      name: 'Mixed Casing Promotional Cashback Offer',
      sms: {
        id: 'spam-mix-1',
        address: 'AD-RBLBNK',
        body: 'cOnGrAtUlAtIoNs! yOu hAvE wOn rS 10,000 cAsHbAcK. uSe cOdE wIn10k tO rEdEeM.',
        date: 1794477600000,
      },
      reason: 'Mixed casing promotional cashback offer with win and coupon code keywords',
    },
    {
      name: 'Spam Disguised as Debit: Promo Wallet with Scratch & Win',
      sms: {
        id: 'spam-disguised-1',
        address: 'AD-SBIN',
        body: 'Alert: Rs 5,000 debited from our promo wallet to your A/C ending 1234. Scratch and win prizes now at bit.ly/win',
        date: 1794477600000,
      },
      reason: 'Contains scratch and win marketing keywords despite mentioning debit',
    },
    {
      name: 'Zero Debit Card Marketing (Rs 0.00)',
      sms: {
        id: 'spam-zero-1',
        address: 'AD-HDFCBK',
        body: 'A/C *1234 debited by Rs 0.00. Free credit card with no annual fee approved for you. Click here to claim.',
        date: 1794477600000,
      },
      reason: 'Zero debit amount and marketing keywords for free card',
    },
    {
      name: 'Instant Loan Offer with Mimicked Account Number',
      sms: {
        id: 'spam-loan-1',
        address: 'AD-KOTAKB',
        body: 'Instant loan of Rs. 1,00,000 credited to account ending 9999 is waiting! Apply now bit.ly/fake',
        date: 1794477600000,
      },
      reason: 'Instant loan marketing offer with call to action',
    },
    {
      name: 'No Cost EMI Offer on Card',
      sms: {
        id: 'spam-emi-1',
        address: 'AD-ICICIB',
        body: 'Zero down payment and no cost EMI offer for Rs. 75,000 on your card *4321. Avail offer today.',
        date: 1794477600000,
      },
      reason: 'Zero down payment and no cost EMI promotional marketing',
    },
    {
      name: 'Fake OTP Message Mentioning Debit of Amount',
      sms: {
        id: 'spam-otp-1',
        address: 'VM-SBIN',
        body: '492019 is your secret code for debit of Rs 500.00 from A/C *1234 at Zomato. Do not share.',
        date: 1794477600000,
      },
      reason: 'Contains secret code / do not share OTP patterns',
    },
    {
      name: 'Upcoming Broadband Bill Due Reminder',
      sms: {
        id: 'spam-bill-1',
        address: 'VM-AIRTEL',
        body: 'Upcoming bill: Rs 1,450.00 due on 15-Nov-26 for your Airtel broadband. Pay before due date.',
        date: 1794477600000,
      },
      reason: 'Upcoming bill due date reminder, not a completed transaction',
    },
    {
      name: 'PhonePe UPI Collect Request with Account Ending',
      sms: {
        id: 'spam-collect-1',
        address: 'AD-PHONEPE',
        body: 'Collect request: user@upi has requested Rs 800.00 from your A/C ending 3333. Approve on PhonePe.',
        date: 1794477600000,
      },
      reason: 'Incoming collect request, not a debit',
    },
    {
      name: 'Declined Transaction Alert (Axis Bank)',
      sms: {
        id: 'spam-failed-1',
        address: 'AD-AXISBK',
        body: 'Transaction of INR 1,500.00 at Swiggy was declined on A/C *1234. Insufficient balance.',
        date: 1794477600000,
      },
      reason: 'Transaction was declined alert with insufficient balance',
    },
    {
      name: 'Adversarial: Formatted Personal Phone Sender with Spaces (+91 98765 43210)',
      sms: {
        id: 'adv-spam-phone-spaces',
        address: '+91 98765 43210',
        body: 'Dear SBI User, A/C 9876 debited by Rs 250.00 on 12-Nov-26 by UPI to Swiggy. Ref No 431602819231. Bal: Rs 14,230.50',
        date: 1794477600000,
      },
      reason: 'Personal phone number with formatting spaces must be rejected by Layer 1',
    },
  ];

  let successes = 0;
  const failures: string[] = [];
  const total = legitimateCases.length + spamCases.length + 1; // +1 for batch deduplication test

  // 1. Verify legitimate cases
  for (const tc of legitimateCases) {
    const result = parseSms(tc.sms);
    if (!result) {
      failures.push(`[FAILED] Expected legitimate transaction for "${tc.name}", but it was rejected.`);
      continue;
    }

    let caseFailed = false;
    if (result.amount !== tc.expectedAmountPaise) {
      failures.push(
        `[FAILED] "${tc.name}" amount mismatch: expected ${tc.expectedAmountPaise}, got ${result.amount}.`
      );
      caseFailed = true;
    }
    if (result.type !== tc.expectedType) {
      failures.push(
        `[FAILED] "${tc.name}" type mismatch: expected ${tc.expectedType}, got ${result.type}.`
      );
      caseFailed = true;
    }
    if (tc.expectedTitle && result.title !== tc.expectedTitle) {
      failures.push(
        `[FAILED] "${tc.name}" title mismatch: expected "${tc.expectedTitle}", got "${result.title}".`
      );
      caseFailed = true;
    }
    if (tc.expectedAccountLast4 && result.accountLast4 !== tc.expectedAccountLast4) {
      failures.push(
        `[FAILED] "${tc.name}" accountLast4 mismatch: expected "${tc.expectedAccountLast4}", got "${result.accountLast4}".`
      );
      caseFailed = true;
    }
    if (tc.expectedReferenceNo && result.referenceNo !== tc.expectedReferenceNo) {
      failures.push(
        `[FAILED] "${tc.name}" referenceNo mismatch: expected "${tc.expectedReferenceNo}", got "${result.referenceNo}".`
      );
      caseFailed = true;
    }
    if (tc.expectedCategoryId && result.categoryId !== tc.expectedCategoryId) {
      failures.push(
        `[FAILED] "${tc.name}" categoryId mismatch: expected "${tc.expectedCategoryId}", got "${result.categoryId}".`
      );
      caseFailed = true;
    }
    if (tc.expectedBankName && result.bankName !== tc.expectedBankName) {
      failures.push(
        `[FAILED] "${tc.name}" bankName mismatch: expected "${tc.expectedBankName}", got "${result.bankName}".`
      );
      caseFailed = true;
    }

    if (!caseFailed) {
      successes++;
    }
  }

  // 2. Verify spam/advertising cases are all rejected
  for (const tc of spamCases) {
    const result = parseSms(tc.sms);
    if (result) {
      failures.push(
        `[FAILED] Expected spam message to be REJECTED for "${tc.name}" (${tc.reason}), but got parsed as ${result.type} of Rs ${result.amount / 100}.`
      );
    } else {
      successes++;
    }
  }

  // 3. Verify Batch Deduplication via parseSmsList
  const duplicateRawMessages: RawSms[] = [
    {
      id: 'batch-msg-1',
      address: 'VM-SBIN',
      body: 'Dear SBI User, A/C 9876 debited by Rs 250.00 on 12-Nov-26 by UPI to Swiggy. Ref No 431602819231. Bal: Rs 14,230.50',
      date: 1794477600000,
    },
    {
      id: 'batch-msg-2', // Duplicate message within the same minute
      address: 'VM-SBIN',
      body: 'Dear SBI User, A/C 9876 debited by Rs 250.00 on 12-Nov-26 by UPI to Swiggy. Ref No 431602819231. Bal: Rs 14,230.50',
      date: 1794477610000,
    },
  ];
  const batchParsed = parseSmsList(duplicateRawMessages);
  if (batchParsed.length !== 1) {
    failures.push(
      `[FAILED] Batch deduplication failed: expected 1 parsed transaction for duplicate SMS in same minute, got ${batchParsed.length}.`
    );
  } else {
    successes++;
  }

  return {
    passed: failures.length === 0,
    total,
    successes,
    failures,
  };
}

const res = runParserTests();
console.log(`Test Results: ${res.successes}/${res.total} tests passed.`);
if (!res.passed) {
  console.error('Failures:\n' + res.failures.join('\n'));
  process.exit(1);
} else {
  console.log('ALL SMS PARSER TESTS PASSED PERFECTLY!');
}

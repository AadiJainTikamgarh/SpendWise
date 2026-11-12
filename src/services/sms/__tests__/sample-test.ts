import { parseSms } from '../sms-parser';
import { RawSms } from '../types';

export interface TestResult {
  passed: boolean;
  total: number;
  successes: number;
  failures: string[];
}

export function runParserTests(): TestResult {
  const legitimateCases: { name: string; sms: RawSms; expectedAmountPaise: number; expectedType: 'expense' | 'income' }[] = [
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
    },
  ];

  const spamCases: { name: string; sms: RawSms; reason: string }[] = [
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
  ];

  let successes = 0;
  const failures: string[] = [];
  const total = legitimateCases.length + spamCases.length;

  // 1. Verify legitimate cases
  for (const tc of legitimateCases) {
    const result = parseSms(tc.sms);
    if (!result) {
      failures.push(`[FAILED] Expected legitimate transaction for "${tc.name}", but it was rejected.`);
    } else if (result.amount !== tc.expectedAmountPaise) {
      failures.push(
        `[FAILED] "${tc.name}" amount mismatch: expected ${tc.expectedAmountPaise}, got ${result.amount}.`
      );
    } else if (result.type !== tc.expectedType) {
      failures.push(
        `[FAILED] "${tc.name}" type mismatch: expected ${tc.expectedType}, got ${result.type}.`
      );
    } else {
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


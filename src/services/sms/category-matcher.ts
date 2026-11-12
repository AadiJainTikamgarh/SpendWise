import { EXPENSE_CATEGORIES } from '@/constants/categories';
import { Category } from '@/types/finance';

interface CategoryKeywordRule {
  categoryId: string;
  keywords: string[];
}

const CATEGORY_RULES: CategoryKeywordRule[] = [
  {
    categoryId: 'food',
    keywords: [
      'swiggy', 'zomato', 'mcdonald', 'kfc', 'burger king', 'domino', 'pizza', 'starbucks',
      'subway', 'chaayos', 'chai point', 'cafe', 'restaurant', 'bakery', 'eats', 'dhaba',
      'biryani', 'kitchen', 'diner', 'food'
    ],
  },
  {
    categoryId: 'groceries',
    keywords: [
      'blinkit', 'zepto', 'instamart', 'bigbasket', 'bbnow', 'dmart', 'nature basket',
      'spencer', 'supermarket', 'grofer', 'kirana', 'dairy', 'milk', 'country delight',
      'licious', 'meat', 'fresh'
    ],
  },
  {
    categoryId: 'transport',
    keywords: [
      'uber', 'ola', 'rapido', 'metro', 'dmrc', 'bmrc', 'irctc', 'indian rail', 'petrol',
      'fuel', 'hpcl', 'iocl', 'bpcl', 'shell', 'parking', 'toll', 'fastag', 'nhai',
      'chalo', 'bus'
    ],
  },
  {
    categoryId: 'shopping',
    keywords: [
      'amazon', 'flipkart', 'myntra', 'ajio', 'nykaa', 'tata cliq', 'zara', 'h&m',
      'uniqlo', 'croma', 'reliance retail', 'reliance digital', 'meesho', 'lenskart',
      'decathlon', 'shoppers stop', 'lifestyle', 'westside', 'ikea'
    ],
  },
  {
    categoryId: 'bills',
    keywords: [
      'airtel', 'jio', 'vi', 'vodafone', 'bsnl', 'electricity', 'power', 'bescom',
      'tneb', 'mseb', 'uppcl', 'cesc', 'adani electricity', 'tatasky', 'tata play',
      'dish tv', 'gas', 'indane', 'bharat gas', 'hp gas', 'water', 'broadband', 'act fibernet',
      'hathway', 'recharge', 'billdesk', 'bbps', 'maintenance'
    ],
  },
  {
    categoryId: 'entertainment',
    keywords: [
      'bookmyshow', 'pvr', 'inox', 'cinepolis', 'netflix', 'spotify', 'hotstar',
      'prime video', 'disney', 'youtube', 'apple music', 'sony liv', 'zee5', 'steam',
      'playstation', 'gaming'
    ],
  },
  {
    categoryId: 'health',
    keywords: [
      'apollo', '1mg', 'pharmeasy', 'netmeds', 'medplus', 'pharmacy', 'chemist',
      'hospital', 'clinic', 'diagnostics', 'dr lal', 'metropolis', 'practo', 'cult.fit',
      'fitness', 'gym'
    ],
  },
  {
    categoryId: 'investments',
    keywords: [
      'zerodha', 'groww', 'kuvera', 'indmoney', 'upstox', 'angel one', 'mf central',
      'cams', 'kfintech', 'mutual fund', 'sip', 'nse', 'bse', 'etmoney'
    ],
  },
  {
    categoryId: 'travel',
    keywords: [
      'makemytrip', 'goibibo', 'cleartrip', 'easemytrip', 'indigo', 'air india', 'spicejet',
      'vistara', 'hotel', 'resort', 'airbnb', 'oyo', 'agoda', 'booking.com'
    ],
  },
  {
    categoryId: 'education',
    keywords: [
      'udemy', 'coursera', 'unacademy', 'byjus', 'physicswallah', 'school', 'college',
      'university', 'tuition', 'fee'
    ],
  },
];

export function matchCategory(text: string): { categoryId: string; category?: Category } {
  const normalized = text.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (normalized.includes(keyword)) {
        const found = EXPENSE_CATEGORIES.find((c) => c.id === rule.categoryId);
        return {
          categoryId: rule.categoryId,
          category: found,
        };
      }
    }
  }

  const defaultCategory = EXPENSE_CATEGORIES.find((c) => c.id === 'other_expense') || EXPENSE_CATEGORIES[0];
  return {
    categoryId: defaultCategory.id,
    category: defaultCategory,
  };
}

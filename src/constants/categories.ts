import { Category } from '@/types/finance';

export const EXPENSE_CATEGORIES: Category[] = [
  {
    id: 'food',
    name: 'Food & Dining',
    icon: 'restaurant-outline',
    color: '#FF6B6B',
    type: 'expense',
  },
  {
    id: 'groceries',
    name: 'Groceries',
    icon: 'cart-outline',
    color: '#4ECDC4',
    type: 'expense',
  },
  {
    id: 'transport',
    name: 'Transport',
    icon: 'car-outline',
    color: '#45B7D1',
    type: 'expense',
  },
  {
    id: 'shopping',
    name: 'Shopping',
    icon: 'bag-handle-outline',
    color: '#2ECC71',
    type: 'expense',
  },
  {
    id: 'bills',
    name: 'Bills & Utilities',
    icon: 'flash-outline',
    color: '#F39C12',
    type: 'expense',
  },
  {
    id: 'entertainment',
    name: 'Entertainment',
    icon: 'film-outline',
    color: '#9B59B6',
    type: 'expense',
  },
  {
    id: 'health',
    name: 'Health & Fitness',
    icon: 'medkit-outline',
    color: '#E74C3C',
    type: 'expense',
  },
  {
    id: 'education',
    name: 'Education',
    icon: 'school-outline',
    color: '#3498DB',
    type: 'expense',
  },
  {
    id: 'personal',
    name: 'Personal Care',
    icon: 'sparkles-outline',
    color: '#E84393',
    type: 'expense',
  },
  {
    id: 'other_expense',
    name: 'Others',
    icon: 'ellipsis-horizontal-circle-outline',
    color: '#95A5A6',
    type: 'expense',
  },
];

export const INCOME_CATEGORIES: Category[] = [
  {
    id: 'salary',
    name: 'Salary',
    icon: 'cash-outline',
    color: '#2ECC71',
    type: 'income',
  },
  {
    id: 'freelance',
    name: 'Freelance',
    icon: 'laptop-outline',
    color: '#1ABC9C',
    type: 'income',
  },
  {
    id: 'investment',
    name: 'Investments',
    icon: 'trending-up-outline',
    color: '#34495E',
    type: 'income',
  },
  {
    id: 'gift',
    name: 'Gifts',
    icon: 'gift-outline',
    color: '#E67E22',
    type: 'income',
  },
  {
    id: 'other_income',
    name: 'Other Income',
    icon: 'wallet-outline',
    color: '#16A085',
    type: 'income',
  },
];

export const ALL_CATEGORIES = [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES];

export function getCategoryById(categoryId: string): Category {
  const found = ALL_CATEGORIES.find((c) => c.id === categoryId);
  if (found) return found;
  return {
    id: categoryId,
    name: 'General',
    icon: 'pricetag-outline',
    color: '#7F8C8D',
    type: 'expense',
  };
}

export type UserID = 'rama' | 'nadiya';

export interface UserSettings {
  foodPerDay: number;      // default 50000
  laundryAmount: number;   // default 50000, every 2 weeks
  fuelAmount: number;      // default 40000, per week (only for Nadiya or editable)
  language: 'en' | 'id';   // default 'en' or 'id'
}

export interface User {
  id: UserID;
  name: string;
  incomeType: 'monthly' | 'weekly';
  monthlySalary: number;   // Relevant for Rama
  currentBalance: number;
  savingsBalance: number;
  livingFundBalance: number;       // Wallet for daily food & fuel (runs Nadiya / Rama)
  freeSpendingBalance: number;     // Wallet for hobby, clothes, entertainment
  kosContributionBalance: number;  // Saved Kos rent portion
  laundryFundBalance: number;      // Saved Laundry fund
  nextPaydayDate: string;  // YYYY-MM-DD
  settings: UserSettings;
}

export type BillType = 'installment' | 'recurring' | 'one-time';

export interface BillPaymentInstance {
  dueDate: string;         // YYYY-MM-DD
  amount: number;
  isPaid: boolean;
  paidDate?: string;       // YYYY-MM-DD when paid
}

export interface Bill {
  id: string;
  name: string;
  userId: UserID | 'shared';
  billType: BillType;
  amount: number;          // amount per payment
  dueDay: number;          // e.g. 28, 1, 17 (used for recurring or fallback)
  dueDate?: string;        // Specific due date for one-time bills, or starting due date for installments
  totalPayments?: number;  // For installments
  remainingPayments?: number; // For installments
  priority: 'high' | 'medium' | 'low';
  isArchived: boolean;     // Move to archive when installment payments = 0
  
  // To support installments with flexible dates and individual paid statuses:
  installments?: BillPaymentInstance[];
  
  // To track recurring bills payment month-by-month (e.g. "2026-06", "2026-07")
  paidMonths?: string[]; 
  
  // For one-time bills:
  oneTimePaid?: boolean;
  oneTimePaidDate?: string;

  // Description / memo for the bill
  notes?: string;

  // Track partial money/savings reserved specifically for this bill:
  reservedAmount?: number;
}

export interface Transaction {
  id: string;
  userId: UserID;
  category: 'living' | 'free' | 'bills';
  amount: number;
  date: string;            // YYYY-MM-DD
  description: string;
  associatedBillId?: string; // If paid a specific bill instance
  associatedBillDueDate?: string; // If paid a specific payment instance of that bill
}

export interface SuggestedAllocation {
  userId: UserID;
  incomeAmount: number;
  date: string;
  living: number;
  laundry: number;
  fuel: number;
  bills: number;
  kos: number;
  savings: number;
  free: number;
  billAllocations?: Record<string, number>;
}

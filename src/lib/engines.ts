import { User, Bill, SuggestedAllocation, UserID } from '../types';
import { daysBetween } from './utils';

// Get the actual simulated due date of a bill in the current month
export function getBillActiveDueDate(bill: Bill, activeMonthStr: string): string {
  if (bill.billType === 'installment' && bill.installments) {
    const inst = bill.installments.find(i => i.dueDate.substring(0, 7) <= activeMonthStr && !i.isPaid);
    if (inst) return inst.dueDate;
  } else if (bill.billType === 'one-time' && bill.dueDate) {
    return bill.dueDate;
  }
  // Fallback for recurring: e.g., "2026-06-28" - pad day to ensure standard format
  return `${activeMonthStr}-${String(bill.dueDay).padStart(2, '0')}`;
}

export function calculateNadiyaAllocation(
  incomeAmount: number,
  user: User,
  activeUnpaidBills: Bill[],
  currentDate: string,
  kosRemainingThisMonth: number
): SuggestedAllocation {
  const activeMonthStr = currentDate.substring(0, 7);
  let remaining = incomeAmount;

  // 1. Laundry Reserve: target Rp50.000 every 2 weeks. Top up existing laundryFundBalance up to Rp50.000
  const laundryTarget = Math.max(0, 50000 - (user.laundryFundBalance || 0));
  const allocatedLaundry = Math.min(laundryTarget, remaining);
  remaining -= allocatedLaundry;

  // 2. Living Fund: Food = Rp50.000/day * 7 days = Rp350.000. Fuel = Rp40.000/week. Total = Rp390.000. Top up livingFundBalance.
  const livingTarget = Math.max(0, 390000 - (user.livingFundBalance || 0));
  const allocatedLiving = Math.min(livingTarget, remaining);
  remaining -= allocatedLiving;

  // 3. Nearest Due Bills: Sort Nadiya's active unpaid bills by due date priority
  const nadiyaBills = activeUnpaidBills.filter(b => b.userId === 'nadiya' && b.id !== 'shared-kos');
  const sortedBills = [...nadiyaBills].sort((a, b) => {
    const dateA = getBillActiveDueDate(a, activeMonthStr);
    const dateB = getBillActiveDueDate(b, activeMonthStr);
    return dateA.localeCompare(dateB);
  });

  let allocatedBills = 0;
  const billAllocations: Record<string, number> = {};
  for (const bill of sortedBills) {
    if (remaining <= 0) break;
    const billRemaining = Math.max(0, bill.amount - (bill.reservedAmount || 0));
    if (billRemaining <= 0) continue;
    const toAllocate = Math.min(billRemaining, remaining);
    allocatedBills += toAllocate;
    remaining -= toAllocate;
    billAllocations[bill.id] = toAllocate;
  }

  // 4. Shared Rent (Kos): Splitting up to remaining cost this month
  const kosTarget = Math.max(0, kosRemainingThisMonth);
  const allocatedKos = Math.min(kosTarget, remaining);
  remaining -= allocatedKos;

  // 5. Savings: flat Rp100.000 target suggestion (optional, auto-enabled after 1 Aug 2026)
  const isSavingsEnabled = new Date(currentDate) >= new Date('2026-08-01');
  const savingsTarget = isSavingsEnabled ? 100000 : 0;
  const allocatedSavings = Math.min(savingsTarget, remaining);
  remaining -= allocatedSavings;

  // 6. Free Spending: remainder of income
  const allocatedFree = Math.max(0, remaining);

  return {
    userId: 'nadiya',
    incomeAmount,
    date: currentDate,
    living: allocatedLiving,
    laundry: allocatedLaundry,
    fuel: 40000, // fuel config parameter
    bills: allocatedBills,
    kos: allocatedKos,
    savings: allocatedSavings,
    free: allocatedFree,
    billAllocations
  };
}

export function calculateRamaAllocation(
  incomeAmount: number,
  user: User,
  activeUnpaidBills: Bill[],
  currentDate: string,
  kosRemainingThisMonth: number
): SuggestedAllocation {
  const activeMonthStr = currentDate.substring(0, 7);
  let remaining = incomeAmount;

  // Priority 1: All Due Bills (sorted by due-date priority)
  const ramaBills = activeUnpaidBills.filter(b => b.userId === 'rama' && b.id !== 'shared-kos');
  const sortedRamaBills = [...ramaBills].sort((a, b) => {
    const dateA = getBillActiveDueDate(a, activeMonthStr);
    const dateB = getBillActiveDueDate(b, activeMonthStr);
    return dateA.localeCompare(dateB);
  });

  let allocatedBills = 0;
  const billAllocations: Record<string, number> = {};
  for (const bill of sortedRamaBills) {
    if (remaining <= 0) break;
    const billRemaining = Math.max(0, bill.amount - (bill.reservedAmount || 0));
    if (billRemaining <= 0) continue;
    const toAllocate = Math.min(billRemaining, remaining);
    allocatedBills += toAllocate;
    remaining -= toAllocate;
    billAllocations[bill.id] = toAllocate;
  }

  // Priority 2: Rent (Kos split)
  const kosTarget = Math.max(0, kosRemainingThisMonth);
  const allocatedKos = Math.min(kosTarget, remaining);
  remaining -= allocatedKos;

  // Priority 3: Savings: flat Rp450.000 target suggestion (auto-enabled after 1 Aug 2026)
  const isSavingsEnabled = new Date(currentDate) >= new Date('2026-08-01');
  const savingsTarget = isSavingsEnabled ? 450000 : 0;
  const allocatedSavings = Math.min(savingsTarget, remaining);
  remaining -= allocatedSavings;

  // Priority 4: Free Spending
  const allocatedFree = Math.max(0, remaining);

  return {
    userId: 'rama',
    incomeAmount,
    date: currentDate,
    living: 0,
    laundry: 0,
    fuel: 0,
    bills: allocatedBills,
    kos: allocatedKos,
    savings: allocatedSavings,
    free: allocatedFree,
    billAllocations
  };
}

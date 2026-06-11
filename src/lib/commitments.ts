import { Bill, UserID } from '../types';
import { addDays, parseDate, formatDateString, daysBetween } from './utils';

export interface UnpaidOccurrence {
  billId: string;
  name: string;
  amount: number;
  dueDate: string; // YYYY-MM-DD
  userId: string;
  priority: 'high' | 'medium' | 'low';
}

/**
 * Returns all active unpaid payment occurrences for a user or 'all' users
 * within a given time range or generally for the next 30-40 days.
 */
export function getUnpaidOccurrences(
  bills: Bill[],
  currentDateStr: string,
  userIdFilter: UserID | 'all'
): UnpaidOccurrence[] {
  const occurrences: UnpaidOccurrence[] = [];
  const activeMonthStr = currentDateStr.substring(0, 7); // e.g., "2026-06"

  // Helper to get next month's year-month string
  const getNextMonthStr = (dateStr: string): string => {
    const d = parseDate(dateStr);
    let y = d.getFullYear();
    let m = d.getMonth() + 1; // 0-indexed plus 1 is current month, plus 1 more is next month
    if (m > 11) {
      m = 0;
      y += 1;
    }
    const nextM = String(m + 1).padStart(2, '0');
    return `${y}-${nextM}`;
  };

  const nextMonthStr = getNextMonthStr(currentDateStr);

  bills.forEach((b) => {
    if (b.isArchived) return;

    // Filter by user
    const matchUser =
      userIdFilter === 'all' ||
      b.userId === userIdFilter ||
      b.userId === 'shared';

    if (!matchUser) return;

    if (b.billType === 'one-time') {
      if (!b.oneTimePaid) {
        let dueDate = b.dueDate || currentDateStr;
        occurrences.push({
          billId: b.id,
          name: b.name,
          amount: b.amount,
          dueDate,
          userId: b.userId,
          priority: b.priority,
        });
      }
    } else if (b.billType === 'recurring') {
      // Recurring bills exist month-by-month. We calculate occurrences for the active month and next month.
      const dueDayStr = String(b.dueDay).padStart(2, '0');
      
      // Active Month split/normal
      if (b.userId === 'shared') {
        const splitAmount = 1000000; // total 2M split 50/50
        
        // Rama's portion
        if (userIdFilter === 'all' || userIdFilter === 'rama') {
          const splitFlag = `${activeMonthStr}-rama`;
          if (!b.paidMonths?.includes(splitFlag)) {
            occurrences.push({
              billId: b.id,
              name: `${b.name} (Rama Split)`,
              amount: splitAmount,
              dueDate: `${activeMonthStr}-${dueDayStr}`,
              userId: 'rama',
              priority: b.priority,
            });
          }
        }
        
        // Nadiya's portion
        if (userIdFilter === 'all' || userIdFilter === 'nadiya') {
          const splitFlag = `${activeMonthStr}-nadiya`;
          if (!b.paidMonths?.includes(splitFlag)) {
            occurrences.push({
              billId: b.id,
              name: `${b.name} (Nadiya Split)`,
              amount: splitAmount,
              dueDate: `${activeMonthStr}-${dueDayStr}`,
              userId: 'nadiya',
              priority: b.priority,
            });
          }
        }
      } else {
        // Individual recurring
        if (!b.paidMonths?.includes(activeMonthStr)) {
          occurrences.push({
            billId: b.id,
            name: b.name,
            amount: b.amount,
            dueDate: `${activeMonthStr}-${dueDayStr}`,
            userId: b.userId,
            priority: b.priority,
          });
        }
      }

      // Next month forecast occurrence
      if (b.userId === 'shared') {
        const splitAmount = 1000000;
        
        if (userIdFilter === 'all' || userIdFilter === 'rama') {
          const splitFlag = `${nextMonthStr}-rama`;
          if (!b.paidMonths?.includes(splitFlag)) {
            occurrences.push({
              billId: b.id,
              name: `${b.name} (Rama Split - Forecast)`,
              amount: splitAmount,
              dueDate: `${nextMonthStr}-${dueDayStr}`,
              userId: 'rama',
              priority: b.priority,
            });
          }
        }
        
        if (userIdFilter === 'all' || userIdFilter === 'nadiya') {
          const splitFlag = `${nextMonthStr}-nadiya`;
          if (!b.paidMonths?.includes(splitFlag)) {
            occurrences.push({
              billId: b.id,
              name: `${b.name} (Nadiya Split - Forecast)`,
              amount: splitAmount,
              dueDate: `${nextMonthStr}-${dueDayStr}`,
              userId: 'nadiya',
              priority: b.priority,
            });
          }
        }
      } else {
        if (!b.paidMonths?.includes(nextMonthStr)) {
          occurrences.push({
            billId: b.id,
            name: `${b.name} (Forecast)`,
            amount: b.amount,
            dueDate: `${nextMonthStr}-${dueDayStr}`,
            userId: b.userId,
            priority: b.priority,
          });
        }
      }
    } else if (b.billType === 'installment' && b.installments) {
      // Installment occurrences map exactly to their unpaid payment instances
      b.installments.forEach((inst) => {
        if (!inst.isPaid) {
          occurrences.push({
            billId: b.id,
            name: b.name,
            amount: inst.amount,
            dueDate: inst.dueDate,
            userId: b.userId,
            priority: b.priority,
          });
        }
      });
    }
  });

  // Sort by due date ascending
  return occurrences.sort((a, b) => (a.dueDate < b.dueDate ? -1 : 1));
}

export interface WeeklyCommitments {
  thisWeek: {
    total: number;
    items: UnpaidOccurrence[];
  };
  nextWeek: {
    total: number;
    items: UnpaidOccurrence[];
  };
  upcomingMonth: {
    total: number;
    items: UnpaidOccurrence[];
  };
}

/**
 * Categorize occurrences into This Week (0-6 days or overdue), Next Week (7-13 days), and Month Commitments (14-30 days)
 */
export function getWeeklyCommitments(
  bills: Bill[],
  currentDateStr: string,
  userIdFilter: UserID | 'all'
): WeeklyCommitments {
  const occurrences = getUnpaidOccurrences(bills, currentDateStr, userIdFilter);

  const thisWeekItems: UnpaidOccurrence[] = [];
  const nextWeekItems: UnpaidOccurrence[] = [];
  const upcomingMonthItems: UnpaidOccurrence[] = [];

  const limitThisWeek = addDays(currentDateStr, 6);
  const limitNextWeek = addDays(currentDateStr, 13);
  const limitUpcomingMonth = addDays(currentDateStr, 30);

  occurrences.forEach((occ) => {
    if (occ.dueDate <= limitThisWeek) {
      thisWeekItems.push(occ);
    } else if (occ.dueDate <= limitNextWeek) {
      nextWeekItems.push(occ);
    } else if (occ.dueDate <= limitUpcomingMonth) {
      upcomingMonthItems.push(occ);
    }
  });

  return {
    thisWeek: {
      total: thisWeekItems.reduce((sum, item) => sum + item.amount, 0),
      items: thisWeekItems,
    },
    nextWeek: {
      total: nextWeekItems.reduce((sum, item) => sum + item.amount, 0),
      items: nextWeekItems,
    },
    upcomingMonth: {
      total: upcomingMonthItems.reduce((sum, item) => sum + item.amount, 0),
      items: upcomingMonthItems,
    },
  };
}

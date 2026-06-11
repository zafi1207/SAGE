import React from 'react';
import { User, Bill, UserID, Transaction } from '../types';
import { formatRupiah, formatHumanDate, daysBetween } from '../lib/utils';
import { getUnpaidOccurrences, getWeeklyCommitments } from '../lib/commitments';
import { 
  Calendar, 
  AlertCircle, 
  HandCoins, 
  CheckCircle2, 
  CircleDot, 
  Layers, 
  TrendingUp, 
  ArrowRight, 
  ShieldAlert,
  HelpCircle,
  Clock
} from 'lucide-react';

interface DashboardProps {
  users: User[];
  bills: Bill[];
  transactions: Transaction[];
  currentDate: string;
  selectedUser: UserID;
  onChangeUser: (userId: UserID) => void;
  onOpenAllocationModal: () => void;
  kosRemainingThisMonth: number; // leftover of total 2,000,000
}

export default function Dashboard({
  users,
  bills,
  transactions,
  currentDate,
  selectedUser,
  onChangeUser,
  onOpenAllocationModal,
  kosRemainingThisMonth
}: DashboardProps) {
  
  const rama = users.find(u => u.id === 'rama') || users[0];
  const nadiya = users.find(u => u.id === 'nadiya') || users[1];
  const activeUser = selectedUser === 'rama' ? rama : nadiya;

  const activeMonthStr = currentDate.substring(0, 7);

  // Filter bills by active user for general overview
  const userBills = bills.filter(b => b.userId === selectedUser || b.userId === 'shared');

  // Active Unpaid Bills for current selected user this month (using activeMonthStr)
  const activeUnpaidUserBills = userBills.filter(b => {
    if (b.isArchived) return false;
    
    if (b.billType === 'recurring') {
      if (b.userId === 'shared') {
        return !b.paidMonths?.includes(`${activeMonthStr}-${selectedUser}`);
      }
      return !b.paidMonths?.includes(activeMonthStr);
    } else if (b.billType === 'installment' && b.installments) {
      return b.installments.some(inst => inst.dueDate.substring(0, 7) <= activeMonthStr && !inst.isPaid);
    } else {
      if (b.oneTimePaid) return false;
      if (!b.dueDate) return true;
      return b.dueDate.substring(0, 7) <= activeMonthStr;
    }
  });

  const activeUnpaidTotalAmount = activeUnpaidUserBills.reduce((sum, b) => {
    if (b.userId === 'shared') {
      return sum + 1000000; // split portion
    }
    return sum + b.amount;
  }, 0);

  // ADDITIONAL INCOME NEEDED (Replacing Extra Income Needed)
  // Rama's bills exceed his current balance
  const billsExceedBalance = activeUnpaidTotalAmount > rama.currentBalance;
  const additionalIncomeNeeded = billsExceedBalance ? activeUnpaidTotalAmount - rama.currentBalance : 0;

  // DAYS TO PAYDAY SYSTEM
  const nDaysToNextPayday = daysBetween(currentDate, activeUser.nextPaydayDate);
  const suggestedDailySpend = nDaysToNextPayday > 0 
    ? Math.round(activeUser.livingFundBalance / nDaysToNextPayday) 
    : activeUser.livingFundBalance;

  // WEEKLY COMMITMENT METRICS
  const commitments = getWeeklyCommitments(bills, currentDate, selectedUser);

  // NADIYA SPECIFIC METRICS: COMMITMENTS BEFORE NEXT PAYDAY
  const nadiyaOccurrences = getUnpaidOccurrences(bills, currentDate, 'nadiya');
  const nadiyaBeforePayday = nadiyaOccurrences.filter(occ => occ.dueDate <= nadiya.nextPaydayDate);
  const nadiyaTotalNeededBeforePayday = nadiyaBeforePayday.reduce((sum, occ) => sum + occ.amount, 0);

  // Current priority bill (any High priority unpaid item, or fallback to Rent)
  const highPriorityUnpaidOcc = nadiyaOccurrences.find(occ => occ.priority === 'high');
  let currentPriorityText = '🍜 Secure Daily Living Fund';
  let prioritySub = 'Ensure food reserves are secure first';
  let priorityAmount = 0;

  if (highPriorityUnpaidOcc) {
    currentPriorityText = `🚨 ${highPriorityUnpaidOcc.name}`;
    prioritySub = `Due: ${formatHumanDate(highPriorityUnpaidOcc.dueDate)}. Clear to prevent penalties!`;
    priorityAmount = highPriorityUnpaidOcc.amount;
  } else if (nadiya.livingFundBalance > 200000) {
    currentPriorityText = '🏠 Securing Rent (Kos Split)';
    prioritySub = 'You have comfortable food reserves. Prioritize your split rent!';
    priorityAmount = 1000000;
  }

  // KOS PROGRESS (Total split 2M, 1M each)
  const sharedRentBill = bills.find(b => b.id === 'shared-kos');
  const isRamaKosPaid = sharedRentBill?.paidMonths?.includes(`${activeMonthStr}-rama`) || false;
  const isNadiyaKosPaid = sharedRentBill?.paidMonths?.includes(`${activeMonthStr}-nadiya`) || false;

  const ramaKosContribution = isRamaKosPaid ? 1000000 : rama.kosContributionBalance;
  const nadiyaKosContribution = isNadiyaKosPaid ? 1000000 : nadiya.kosContributionBalance;
  
  const totalKosCollected = ramaKosContribution + nadiyaKosContribution;
  const kosProgressPercent = Math.min(100, Math.round((totalKosCollected / 2000000) * 100));
  const totalKosRemaining = 2000000 - totalKosCollected;

  return (
    <div id="home-dashboard" className="space-y-5 flex-1 animate-fadeIn">
      
      {/* Companion Selector & Resource allocator */}
      <div className="flex flex-col sm:flex-row justify-between items-center bg-white border border-slate-200/80 p-3 rounded-3xl gap-3 shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-full w-full sm:w-auto">
          <button
            id="switch-rama"
            onClick={() => onChangeUser('rama')}
            className={`flex-1 sm:flex-initial px-6 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              selectedUser === 'rama'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            👨🏻‍💼 Rama
          </button>
          <button
            id="switch-nadiya"
            onClick={() => onChangeUser('nadiya')}
            className={`flex-1 sm:flex-initial px-6 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              selectedUser === 'nadiya'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            👩🏻‍🎨 Nadiya
          </button>
        </div>

        <button
          onClick={onOpenAllocationModal}
          className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all duration-200 text-white font-bold text-xs rounded-full flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/10"
        >
          <HandCoins size={14} className="text-emerald-100" />
          <span>Add & Allocate Income</span>
        </button>
      </div>

      {/* Cash wallet and simplified "Safe To Use" metrics */}
      <div className="grid grid-cols-2 gap-4">
        {/* Wallet Actual Balance */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-1.5 shadow-sm hover:shadow-md transition duration-200">
          <span className="text-[9px] uppercase font-bold text-slate-400 block tracking-wider font-mono">
            Actual Balance
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight font-display">
            {formatRupiah(activeUser.currentBalance)}
          </div>
          <span className="text-[9px] text-slate-400 leading-none block font-medium">
            Cash currently on hand.
          </span>
        </div>

        {/* Simplified label: Safe To Use */}
        <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-1.5 shadow-sm hover:shadow-md transition duration-200 border-emerald-100">
          <span className="text-[9px] uppercase font-bold text-emerald-600 block tracking-wider font-mono">
            Safe To Use
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 tracking-tight font-display">
            {formatRupiah(activeUser.freeSpendingBalance)}
          </div>
          <span className="text-[9px] text-slate-400 leading-none block font-medium">
            Worry-free pocket spending money!
          </span>
        </div>
      </div>

      {/* RAMA DASHBOARD COMPLEMENTS */}
      {selectedUser === 'rama' ? (
        <div className="space-y-4">
          
          {/* Additional Income Needed trigger */}
          {additionalIncomeNeeded > 0 ? (
            <div className="p-5 bg-amber-50 border border-amber-200 rounded-3xl flex items-start gap-3.5">
              <AlertCircle size={20} className="text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              <div className="space-y-1">
                <span className="text-[9px] px-2 py-0.5 bg-amber-500/10 text-amber-800 rounded-full font-bold uppercase tracking-widest font-mono">
                  Additional Income Needed
                </span>
                <p className="text-xs font-bold text-slate-900 mt-1.5">
                  You need <span className="font-mono font-black text-amber-700">{formatRupiah(additionalIncomeNeeded)}</span> more.
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed font-semibold">
                  Outstanding bills outweigh your current balance. Take an Ojol side gig to secure this target! Your ledger updates automatically when logged.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-emerald-50 border border-emerald-200/40 rounded-3xl flex items-center gap-2.5 text-xs text-emerald-800 leading-snug font-semibold shadow-sm">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>Perfect! Rama's current cash covers all outstanding monthly obligations. All Ojol side earnings from here represent direct savings.</span>
            </div>
          )}

          {/* Quick Rama Stats */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white border border-slate-200 p-4 rounded-3xl space-y-1 shadow-sm">
              <span className="text-slate-400 font-mono uppercase text-[9px] block">Unpaid This Month</span>
              <span className="font-black text-slate-800 text-sm font-mono">{formatRupiah(activeUnpaidTotalAmount)}</span>
            </div>
            
            <div className="bg-white border border-slate-200 p-4 rounded-3xl space-y-1 shadow-sm">
              <span className="text-slate-400 font-mono uppercase text-[9px] block">Ending Soon</span>
              <span className="font-black text-slate-800 text-sm font-mono">
                {bills.filter(b => b.userId === 'rama' && b.billType === 'installment' && b.remainingPayments && b.remainingPayments > 0 && b.remainingPayments <= 2).length} Loans (≤ 2 pays)
              </span>
            </div>
          </div>

        </div>
      ) : (
        /* NADIYA DASHBOARD METRIC EXPANSIONS (Task 3) */
        <div className="space-y-4">
          
          {/* Nadiya's Living Fund Balance widget */}
          <div className="bg-emerald-900 text-white rounded-[2rem] p-6 shadow-xl space-y-5">
             <div className="flex justify-between items-start">
               <div>
                 <h3 className="font-black text-base text-emerald-100 font-display">Living Fund</h3>
                 <p className="text-[9px] text-emerald-300 font-bold uppercase tracking-widest mt-0.5">
                   Food & Fuel Reserves (Weekly Cycle)
                 </p>
               </div>
               <div className="text-right">
                  <div className="text-2xl font-black text-white font-mono tracking-tight leading-none">
                    {formatRupiah(nadiya.livingFundBalance)}
                  </div>
                  <p className="text-[8px] font-bold text-[#a7f3d0] uppercase tracking-widest mt-1 text-right">
                    AVAILABLE NOW
                  </p>
               </div>
             </div>

             <div className="bg-white/10 p-4 rounded-2xl flex flex-col gap-3">
               <div className="flex justify-between text-xs font-semibold">
                 <span className="opacity-80">Days until payday</span>
                 <span className="font-bold uppercase tracking-widest text-white font-mono">
                   {nDaysToNextPayday === 0 ? 'SUNDAY PAYDAY TODAY!' : `${nDaysToNextPayday} Days`}
                 </span>
               </div>
               
               <div className="h-2 bg-white/20 rounded-full overflow-hidden block">
                 <div 
                   className="bg-[#00E676] h-full rounded-full transition-all" 
                   style={{ width: `${Math.max(5, Math.min(100, (nDaysToNextPayday / 7) * 100))}%` }}
                 ></div>
               </div>

               <div className="flex justify-between items-center mt-1 pt-1 border-t border-white/5">
                 <p className="text-[9px] opacity-75 uppercase font-bold tracking-widest font-mono text-[#a7f3d0]">Suggested daily cap</p>
                 <p className="text-sm font-black text-white font-mono">
                   {formatRupiah(suggestedDailySpend)}<span className="text-[9px] font-normal opacity-70 ml-0.5">/day</span>
                 </p>
               </div>
             </div>
          </div>

          {/* Payday details & companion status indicators */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="bg-white border border-slate-200 p-4 rounded-3xl flex items-start gap-2 shadow-sm">
              <Calendar size={15} className="text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-slate-400 font-mono text-[9px] uppercase block">Sunday Payday</span>
                <span className="font-extrabold text-slate-800 block text-[11px] mt-0.5">{formatHumanDate(nadiya.nextPaydayDate)}</span>
                <span className="text-[9px] text-emerald-600 block font-mono font-bold mt-1">
                  {nDaysToNextPayday === 0 ? 'Salary today!' : `${nDaysToNextPayday}d remaining`}
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 p-4 rounded-3xl flex items-start gap-2 shadow-sm">
              <CircleDot size={15} className="text-[#00E676] shrink-0 mt-0.5 animate-pulse" />
              <div>
                <span className="text-slate-400 font-mono text-[9px] uppercase block">Current Priority Bill</span>
                <span className="font-extrabold text-slate-800 block text-[11px] mt-0.5 truncate max-w-[120px]" title={currentPriorityText}>
                  {currentPriorityText}
                </span>
                <span className="text-[9px] text-slate-500 block leading-tight font-semibold mt-1">
                  {priorityAmount > 0 ? `${formatRupiah(priorityAmount)} portion` : 'Balanced'}
                </span>
              </div>
            </div>
          </div>

          {/* Task 3 Component - Nadiya Specific Commitment Summary */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 space-y-4 shadow-sm border-indigo-100">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="font-black text-slate-900 text-xs block uppercase font-mono tracking-wider text-indigo-950 flex items-center gap-1.5">
                  <Layers size={14} className="text-indigo-600" />
                  <span>Commitments Before Payday</span>
                </h4>
                <p className="text-[9px] text-slate-400 font-medium">Required obligations prior to next Sunday payout</p>
              </div>
              <span className="text-[9px] bg-slate-900 text-[#00E676] px-2 py-0.5 rounded font-mono font-bold">
                {nadiyaBeforePayday.length} ITEMS
              </span>
            </div>

            {nadiyaBeforePayday.length > 0 ? (
              <div className="space-y-2.5">
                <div className="divide-y divide-slate-100 text-xs text-slate-700">
                  {nadiyaBeforePayday.map(occ => (
                    <div key={`${occ.billId}-${occ.dueDate}`} className="py-2 flex justify-between items-center gap-2 first:pt-0 last:pb-0 font-semibold text-[11px]">
                      <div>
                        <div className="text-slate-900 font-extrabold flex items-center gap-1">
                          <span>{occ.name}</span>
                          {occ.priority === 'high' && (
                            <span className="text-[8px] bg-rose-50 text-rose-600 px-1 rounded font-bold font-mono">HIGH</span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-40o text-slate-400 font-mono mt-0.5">Due: {formatHumanDate(occ.dueDate)}</div>
                      </div>
                      <span className="font-mono text-slate-800 font-extrabold">{formatRupiah(occ.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2.5 border-t border-dashed border-slate-200 flex justify-between items-center bg-indigo-50/40 p-3 rounded-2xl">
                  <div>
                    <span className="text-[9px] text-indigo-900 font-semibold uppercase tracking-wider block font-mono">
                      Total Needed Before Payday:
                    </span>
                    <span className="text-base font-black text-indigo-700 font-mono tracking-tight block">
                      {formatRupiah(nadiyaTotalNeededBeforePayday)}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-medium max-w-[130px] leading-tight block text-right font-mono">
                    Ensure next salary allocation covers this!
                  </span>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/5 text-emerald-800 rounded-3xl border border-dashed border-emerald-500/15 text-center text-[11px] font-semibold">
                Wonderful! Nadiya has zero outstanding bill occurrences prior to her next payday (Sunday). Rest easy!
              </div>
            )}
          </div>

        </div>
      )}

      {/* COMMITMENT HIGHLIGHTS SUMMARY (Task 2) */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-5 space-y-4 shadow-sm">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <h4 className="font-black text-slate-900 text-xs block uppercase font-mono tracking-wider">
              Weekly Commitments
            </h4>
            <p className="text-[9px] text-slate-450 text-slate-400 font-medium">How much money do we need by week?</p>
          </div>
          <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-mono font-black text-slate-600">
            {selectedUser.toUpperCase()} ONLY
          </span>
        </div>

        {/* Commitment Blocks Column */}
        <div className="space-y-3">
          
          {/* This Week Item */}
          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex justify-between items-center gap-3">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-450 text-slate-400 font-bold uppercase tracking-wider block">This Week Commitments</span>
              <div className="text-base font-black text-slate-900 font-mono">{formatRupiah(commitments.thisWeek.total)}</div>
              <div className="text-[9px] text-slate-400 font-mono leading-none font-medium text-slate-500 max-w-[200px] truncate" title={commitments.thisWeek.items.map(i => i.name).join(', ')}>
                {commitments.thisWeek.items.length > 0 ? `(${commitments.thisWeek.items.map(i => i.name).join(' + ')})` : 'Zero obligations'}
              </div>
            </div>
            <Clock size={20} className={commitments.thisWeek.total > 0 ? 'text-amber-500 animate-pulse' : 'text-slate-350'} />
          </div>

          {/* Next Week Item */}
          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex justify-between items-center gap-3">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-450 text-slate-400 font-bold uppercase tracking-wider block">Next Week Commitments</span>
              <div className="text-base font-black text-slate-900 font-mono">{formatRupiah(commitments.nextWeek.total)}</div>
              <div className="text-[9px] text-slate-400 font-mono leading-none font-medium text-slate-500 max-w-[200px] truncate" title={commitments.nextWeek.items.map(i => i.name).join(', ')}>
                {commitments.nextWeek.items.length > 0 ? `(${commitments.nextWeek.items.map(i => i.name).join(' + ')})` : 'Zero obligations'}
              </div>
            </div>
            <Clock size={20} className={commitments.nextWeek.total > 0 ? 'text-[#00E676]' : 'text-slate-350'} />
          </div>

          {/* Upcoming Month Item */}
          <div className="p-4 bg-slate-50 border border-slate-200/70 rounded-2xl flex justify-between items-center gap-3">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-450 text-slate-400 font-bold uppercase tracking-wider block font-sans">Upcoming Month Commitments</span>
              <div className="text-base font-black text-slate-900 font-mono">{formatRupiah(commitments.upcomingMonth.total)}</div>
              <div className="text-[9px] text-slate-400 font-mono leading-none font-medium text-slate-500 max-w-[200px] truncate" title={commitments.upcomingMonth.items.map(i => i.name).join(', ')}>
                {commitments.upcomingMonth.items.length > 0 ? `(${commitments.upcomingMonth.items.map(i => i.name).join(' + ')})` : 'Zero obligations'}
              </div>
            </div>
            <Layers size={20} className="text-slate-350" />
          </div>

        </div>
      </div>

      {/* SHARED KOS PROGRESS CARD - SLEEK THEME */}
      <div className="bg-white border border-slate-200 rounded-[2rem] p-6 space-y-4 shadow-sm border-emerald-55 border-emerald-50">
        <div className="flex justify-between items-center text-xs">
          <div>
            <h4 className="font-extrabold text-slate-900 text-sm block flex items-center gap-1.5 font-display">
              <span>🏠 Kos Rent Split</span>
              <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-mono text-slate-500 font-bold uppercase tracking-wider">
                Due 28th Monthly
              </span>
            </h4>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">Target split: Rp 1,000,000 each</p>
          </div>
          <span className="font-black font-mono text-slate-800 text-sm">
            {formatRupiah(totalKosCollected)} / {formatRupiah(2000000)}
          </span>
        </div>

        {/* Progress bar */}
        <div className="space-y-1.5">
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden block">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${kosProgressPercent}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[10px] text-slate-400 font-mono">
            <span className="font-bold">{kosProgressPercent}% Secured</span>
            <span>Rp {totalKosRemaining >= 0 ? totalKosRemaining.toLocaleString('id-ID') : 0} Remaining</span>
          </div>
        </div>

        {/* Split states */}
        <div className="grid grid-cols-2 gap-3 pt-1 text-xs">
          <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between gap-1.5">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] font-mono">Rama Split</span>
            <span className={`font-black text-xs ${isRamaKosPaid ? 'text-emerald-600' : 'text-slate-800'}`}>
              {isRamaKosPaid ? '✓ SECURED' : formatRupiah(1000000 - ramaKosContribution)}
            </span>
          </div>
          
          <div className="p-3 bg-slate-50 border border-slate-150 rounded-2xl flex flex-col justify-between gap-1.5">
            <span className="font-bold text-slate-500 uppercase tracking-wider text-[9px] font-mono">Nadiya Split</span>
            <span className={`font-black text-xs ${isNadiyaKosPaid ? 'text-emerald-600' : 'text-slate-800'}`}>
              {isNadiyaKosPaid ? '✓ SECURED' : formatRupiah(1000000 - nadiyaKosContribution)}
            </span>
          </div>
        </div>
      </div>

    </div>
  );
}

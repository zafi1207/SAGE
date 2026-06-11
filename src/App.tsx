import React, { useState, useEffect } from 'react';
import { 
  initDB, 
  loadInitialData, 
  saveUserToDB, 
  saveBillToDB, 
  deleteBillFromDB,
  addTransactionToDB, 
  deleteTransactionFromDB, 
  saveSystemDateToDB, 
  resetDatabaseToDefaultStore 
} from './lib/db';
import { User, Bill, Transaction, UserID, SuggestedAllocation, UserSettings } from './types';
import { addDays, parseDate, formatDateString, formatRupiah } from './lib/utils';

// Icons
import { LayoutDashboard, ReceiptText, Tag, Settings as SettingsIcon, AlertCircle, Sparkles, CheckCircle2 } from 'lucide-react';

// Components
import SimulationBanner from './components/SimulationBanner';
import Dashboard from './components/Dashboard';
import BillsList from './components/BillsList';
import ExpenseTracker from './components/ExpenseTracker';
import SettingsTab from './components/SettingsTab';
import AllocationModal from './components/AllocationModal';

export default function App() {
  const [db, setDb] = useState<IDBDatabase | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  
  // App core state
  const [users, setUsers] = useState<User[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentDate, setCurrentDate] = useState<string>('2026-06-11');
  
  // Navigation
  const [activeTab, setActiveTab] = useState<'dashboard' | 'bills' | 'logs' | 'settings'>('dashboard');
  const [selectedUser, setSelectedUser] = useState<UserID>('rama');

  // Allocation Modal toggle
  const [isAllocationOpen, setIsAllocationOpen] = useState<boolean>(false);

  // Load IndexedDB state on startup
  useEffect(() => {
    async function start() {
      try {
        const initializedDb = await initDB();
        setDb(initializedDb);
        const data = await loadInitialData(initializedDb);
        setUsers(data.users);
        setBills(data.bills);
        setTransactions(data.transactions);
        setCurrentDate(data.currentDate);
        setLoading(false);
      } catch (err) {
        console.error('Failed to open database:', err);
        setLoading(false);
      }
    }
    start();
  }, []);

  // Helper: Recalculate payday dates in absolute time relative to current simulated date
  const getDynamicPayday = (userId: 'rama' | 'nadiya', dateStr: string): string => {
    const d = parseDate(dateStr);
    if (userId === 'rama') {
      const year = d.getFullYear();
      const month = d.getMonth();
      const day = d.getDate();
      if (day <= 28) {
        return formatDateString(new Date(year, month, 28));
      } else {
        let m = month + 1;
        let y = year;
        if (m > 11) { m = 0; y += 1; }
        return formatDateString(new Date(y, m, 28));
      }
    } else {
      // Nadiya gets paid every Sunday
      const dayOfWeek = d.getDay();
      const daysToSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
      return formatDateString(new Date(d.getFullYear(), d.getMonth(), d.getDate() + daysToSunday));
    }
  };

  // Handler: Update Forecast/Simulation Date Bidirectionally
  const handleForecastShift = async (value: number | 'today') => {
    let targetDate = '2026-06-11';
    if (value !== 'today') {
      targetDate = addDays(currentDate, value);
    }
    
    setCurrentDate(targetDate);
    await saveSystemDateToDB(targetDate);

    // update user paydays dynamically to match target date
    const updatedUsers = users.map(u => {
      const userCopy = {
        ...u,
        nextPaydayDate: getDynamicPayday(u.id, targetDate)
      };
      saveUserToDB(userCopy);
      return userCopy;
    });
    setUsers(updatedUsers);
  };

  // Handler: Update any existing bill details dynamically
  const handleUpdateBill = async (updatedBill: Bill) => {
    await saveBillToDB(updatedBill);
    setBills(prev => prev.map(b => b.id === updatedBill.id ? updatedBill : b));
  };

  // Handler: Delete any bill dynamically
  const handleDeleteBill = async (billId: string) => {
    await deleteBillFromDB(billId);
    setBills(prev => prev.filter(b => b.id !== billId));
  };

  // Handler: Monthly Reset
  const handleMonthlyReset = async () => {
    try {
      const activeDate = parseDate(currentDate);
      
      // Calculate start of next month
      const nextMonth = new Date(activeDate.getFullYear(), activeDate.getMonth() + 1, 1);
      const nextMonthStr = formatDateString(nextMonth);
      setCurrentDate(nextMonthStr);
      await saveSystemDateToDB(nextMonthStr);

      // 1. Reset all current monthly sub-wallet allocations of users back to 0 (so they plan fresh income)
      const updatedUsers = users.map(u => {
        const resetU: User = {
          ...u,
          livingFundBalance: 0,
          freeSpendingBalance: 0,
          kosContributionBalance: 0,
          laundryFundBalance: 0,
          // Shift payday if past (Rama's monthly payday is on the 28th of the month)
          nextPaydayDate: u.incomeType === 'monthly' ? `${nextMonthStr.substring(0, 8)}28` : u.nextPaydayDate
        };
        // Payday adjustments
        if (resetU.incomeType === 'weekly') {
          while (nextMonthStr > resetU.nextPaydayDate) {
            resetU.nextPaydayDate = addDays(resetU.nextPaydayDate, 7);
          }
        }
        saveUserToDB(resetU);
        return resetU;
      });
      setUsers(updatedUsers);

      // 2. Completed Bills (remaining payments reaching 0) go to completed archive and disappear from future lists
      const updatedBills = bills.map(b => {
        let billCopy = { ...b };
        if (billCopy.billType === 'installment' && billCopy.remainingPayments === 0) {
          billCopy.isArchived = true;
          saveBillToDB(billCopy);
        }
        return billCopy;
      });
      setBills(updatedBills);

      // 3. Clear current transactions list logs for active month (we wipe or flag them, let's keep them in IndexedDB for logs but omit from active view)
      // They remain present in database history but we reset the screen or clear. Let's keep transaction history intact so they have full history records!
      
      alert(`Success! Sage has performed Monthly Reset. Date advanced to ${nextMonthStr}. All current sub-wallets reset to zero, ready for next month's fresh income allocations!`);
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Fully Reset Database to preloaded state
  const handleResetAllData = async () => {
    setLoading(true);
    try {
      await resetDatabaseToDefaultStore();
      const initializedDb = await initDB();
      const data = await loadInitialData(initializedDb);
      setUsers(data.users);
      setBills(data.bills);
      setTransactions(data.transactions);
      setCurrentDate(data.currentDate);
      setActiveTab('dashboard');
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  // Handler: Import backup data and restore state
  const handleImportBackup = async (backupData: { users: User[], bills: Bill[], transactions: Transaction[], currentDate: string }) => {
    setLoading(true);
    try {
      const dbInstance = await initDB();
      
      // Let's perform sequential writes in standard promises or transaction complete
      const tx = dbInstance.transaction(['users', 'bills', 'transactions', 'system'], 'readwrite');
      tx.objectStore('users').clear();
      tx.objectStore('bills').clear();
      tx.objectStore('transactions').clear();
      tx.objectStore('system').clear();

      backupData.users.forEach(u => tx.objectStore('users').put(u));
      backupData.bills.forEach(b => tx.objectStore('bills').put(b));
      backupData.transactions.forEach(t => tx.objectStore('transactions').put(t));
      tx.objectStore('system').put({ key: 'currentDate', value: backupData.currentDate });

      tx.oncomplete = () => {
        setUsers(backupData.users);
        setBills(backupData.bills);
        setTransactions(backupData.transactions);
        setCurrentDate(backupData.currentDate);
        setLoading(false);
        alert('Backup imported successfully! Your Sage offline data has been fully restored.');
      };
      
      tx.onerror = () => {
        setLoading(false);
        alert('Failed to import backup: Database write error.');
      };
    } catch (err) {
      console.error(err);
      setLoading(false);
      alert('Failed to parse or restore backup.');
    }
  };

  // Handler: Apply Suggested/Manual Allocation
  const handleApplyAllocation = async (allocation: SuggestedAllocation) => {
    const curUser = users.find(u => u.id === allocation.userId);
    if (!curUser) return;

    const updatedUser: User = {
      ...curUser,
      currentBalance: curUser.currentBalance + allocation.incomeAmount,
      livingFundBalance: curUser.livingFundBalance + allocation.living,
      freeSpendingBalance: curUser.freeSpendingBalance + allocation.free,
      kosContributionBalance: curUser.kosContributionBalance + allocation.kos,
      laundryFundBalance: curUser.laundryFundBalance + allocation.laundry,
      savingsBalance: curUser.savingsBalance + allocation.savings
    };

    // Save user update
    await saveUserToDB(updatedUser);

    // Save allocation details as a unique income Transaction for logs
    const newTx: Transaction = {
      id: `tx-alloc-${allocation.userId}-${Date.now()}`,
      userId: allocation.userId,
      category: 'free',
      amount: -Math.abs(allocation.incomeAmount), // negative represents deposit in overall journal logic, let's represent as a positive credit log!
      date: currentDate,
      description: `Income Added: ${allocation.incomeAmount.toLocaleString('id-ID')} (Living: ${allocation.living.toLocaleString('id-ID')}, Bills: ${allocation.bills.toLocaleString('id-ID')}, Kos: ${allocation.kos.toLocaleString('id-ID')}, Savings: ${allocation.savings.toLocaleString('id-ID')})`
    };
    // Let's store positive credit amounts as positive numbers, and negative debit amounts as negative numbers
    newTx.amount = Math.abs(allocation.incomeAmount); // positive income credit

    await addTransactionToDB(newTx);

    // If allocation includes some bills portion, of course, let's record that!
    
    // Refresh local lists
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    setTransactions(prev => [newTx, ...prev]);
  };

  // Handler: Pay Bill
  const handlePayBill = async (billId: string, instanceDueDateOrSplitUser?: string) => {
    const bill = bills.find(b => b.id === billId);
    if (!bill) return;

    // Find the payee user ID
    const payUserId: UserID = bill.userId === 'shared' 
      ? (instanceDueDateOrSplitUser === 'rama' ? 'rama' : 'nadiya') 
      : bill.userId;
    
    const curUser = users.find(u => u.id === payUserId);
    if (!curUser) return;

    let updatedBill = { ...bill };
    let finalAmountDeducted = bill.amount;

    if (bill.userId === 'shared') {
      // Shared is split! Deduct Rp 1,000,000 portion
      finalAmountDeducted = 1000000;
      
      if (!updatedBill.paidMonths) {
        updatedBill.paidMonths = [];
      }
      // Record split payment flag (e.g. "2026-06-rama")
      const monthPrefix = currentDate.substring(0, 7);
      const splitFlag = `${monthPrefix}-${instanceDueDateOrSplitUser}`;
      if (!updatedBill.paidMonths.includes(splitFlag)) {
        updatedBill.paidMonths.push(splitFlag);
      }
    } else if (bill.billType === 'installment' && bill.installments) {
      // Installment matching: find specific unpaid instance
      const instIndex = bill.installments.findIndex(i => i.dueDate === instanceDueDateOrSplitUser && !i.isPaid);
      if (instIndex !== -1) {
        updatedBill.installments[instIndex].isPaid = true;
        updatedBill.installments[instIndex].paidDate = currentDate;
      }
      
      if (updatedBill.remainingPayments !== undefined) {
        updatedBill.remainingPayments = Math.max(0, updatedBill.remainingPayments - 1);
        if (updatedBill.remainingPayments === 0) {
          updatedBill.isArchived = true;
        }
      }
    } else if (bill.billType === 'recurring') {
      // Recurring matching: record active month paid
      if (!updatedBill.paidMonths) {
        updatedBill.paidMonths = [];
      }
      const activeMonthStr = currentDate.substring(0, 7);
      if (!updatedBill.paidMonths.includes(activeMonthStr)) {
        updatedBill.paidMonths.push(activeMonthStr);
      }
    } else {
      // One-time
      updatedBill.oneTimePaid = true;
      updatedBill.oneTimePaidDate = currentDate;
      updatedBill.isArchived = true;
    }

    // Update bill database
    await saveBillToDB(updatedBill);

    // Deduct amount from user's current Balance
    const updatedUser: User = {
      ...curUser,
      currentBalance: Math.max(0, curUser.currentBalance - finalAmountDeducted)
    };
    await saveUserToDB(updatedUser);

    // Also deduct from user's kos splits if relevant
    if (bill.id === 'shared-kos') {
      updatedUser.kosContributionBalance = Math.max(0, updatedUser.kosContributionBalance - finalAmountDeducted);
      await saveUserToDB(updatedUser);
    }

    // Write payment transaction to ledger
    const newTx: Transaction = {
      id: `tx-bill-pay-${bill.id}-${Date.now()}`,
      userId: payUserId,
      category: 'bills',
      amount: -Math.abs(finalAmountDeducted), // negative represents spend
      date: currentDate,
      description: `Cleared Bill: ${bill.name} (Portion: ${formatRupiah(finalAmountDeducted)})`
    };
    await addTransactionToDB(newTx);

    // Update states
    setBills(bills.map(b => b.id === updatedBill.id ? updatedBill : b));
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    setTransactions(prev => [newTx, ...prev]);
  };

  // Handler: Add Custom Bill
  const handleAddCustomBill = async (newBill: Bill) => {
    await saveBillToDB(newBill);
    setBills(prev => [newBill, ...prev]);
  };

  // Handler: General Spend Logger Transaction / Extra Ojol Income
  const handleAddTransactionAndDeduct = async (txn: Transaction) => {
    const activeUserRecord = users.find(u => u.id === txn.userId);
    if (!activeUserRecord) return;

    let updatedUser = { ...activeUserRecord };
    
    // Positive means Cash Income Credit, Negative means Cash Expense Debit
    if (txn.amount < 0) {
      const positiveAmountToDeduct = Math.abs(txn.amount);
      
      // General Actual Cash deduction
      updatedUser.currentBalance = Math.max(0, updatedUser.currentBalance - positiveAmountToDeduct);

      // Target physical category buckets:
      if (txn.category === 'living') {
        updatedUser.livingFundBalance = Math.max(0, updatedUser.livingFundBalance - positiveAmountToDeduct);
      } else if (txn.category === 'free') {
        updatedUser.freeSpendingBalance = Math.max(0, updatedUser.freeSpendingBalance - positiveAmountToDeduct);
      } else if (txn.category === 'bills') {
        // Bills can deduct from general cash
      }
    } else {
      // Income added! (e.g. Ojol entry)
      const creditAmount = Math.abs(txn.amount);
      updatedUser.currentBalance = updatedUser.currentBalance + creditAmount;
      
      // Increases Free Spending bucket
      updatedUser.freeSpendingBalance = updatedUser.freeSpendingBalance + creditAmount;
    }

    await saveUserToDB(updatedUser);
    await addTransactionToDB(txn);

    // Update state lists
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
    setTransactions(prev => [txn, ...prev]);
  };

  // Handler: Delete Historical transaction line
  const handleDeleteTransaction = async (id: string) => {
    const targets = transactions.find(t => t.id === id);
    if (!targets) return;

    // Refund balances nicely:
    const activeUserRecord = users.find(u => u.id === targets.userId);
    if (activeUserRecord) {
      let refundedUser = { ...activeUserRecord };
      if (targets.amount < 0) {
        // refund spent money
        const absVal = Math.abs(targets.amount);
        refundedUser.currentBalance += absVal;
        if (targets.category === 'living') refundedUser.livingFundBalance += absVal;
        if (targets.category === 'free') refundedUser.freeSpendingBalance += absVal;
      } else {
        // subtract incorrect income logged
        const absVal = Math.abs(targets.amount);
        refundedUser.currentBalance = Math.max(0, refundedUser.currentBalance - absVal);
        refundedUser.freeSpendingBalance = Math.max(0, refundedUser.freeSpendingBalance - absVal);
      }
      await saveUserToDB(refundedUser);
      setUsers(users.map(u => u.id === refundedUser.id ? refundedUser : u));
    }

    await deleteTransactionFromDB(id);
    setTransactions(transactions.filter(t => t.id !== id));
  };

  // Handler: Update parameters in settings
  const handleUpdateSettings = async (userIdStr: 'rama' | 'nadiya', settingsObj: UserSettings) => {
    const user = users.find(u => u.id === userIdStr);
    if (!user) return;

    const updatedUser: User = {
      ...user,
      settings: settingsObj
    };

    await saveUserToDB(updatedUser);
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-sm text-slate-500 font-mono">
        <div className="text-center space-y-2">
          <div className="w-8 h-8 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="animate-pulse">Loading offline databases...</p>
        </div>
      </div>
    );
  }

  // Active Month Strings
  const activeMonthString = currentDate.substring(0, 7);

  // KOS splits details
  const sharedKosBill = bills.find(b => b.id === 'shared-kos');
  const isRamaKosSecured = sharedKosBill?.paidMonths?.includes(`${activeMonthString}-rama`) || false;
  const isNadiyaKosSecured = sharedKosBill?.paidMonths?.includes(`${activeMonthString}-nadiya`) || false;
  
  const ramaKosAllocated = isRamaKosSecured ? 1000000 : (users.find(u => u.id === 'rama')?.kosContributionBalance || 0);
  const nadiyaKosAllocated = isNadiyaKosSecured ? 1000000 : (users.find(u => u.id === 'nadiya')?.kosContributionBalance || 0);
  const totalKosRemainingThisMonth = Math.max(0, 2000000 - (ramaKosAllocated + nadiyaKosAllocated));

  // Outstanding unpaid bills for active user (including splits)
  const currentActiveUserBills = bills.filter(b => b.userId === selectedUser || b.userId === 'shared');
  const unpaidMonthlyActiveBills = currentActiveUserBills.filter(b => {
    if (b.isArchived) return false;
    if (b.billType === 'recurring') {
      if (b.userId === 'shared') {
        return !b.paidMonths?.includes(`${activeMonthString}-${selectedUser}`);
      }
      return !b.paidMonths?.includes(activeMonthString);
    } else if (b.billType === 'installment' && b.installments) {
      return b.installments.some(inst => inst.dueDate.substring(0, 7) <= activeMonthString && !inst.isPaid);
    } else {
      if (b.oneTimePaid) return false;
      if (!b.dueDate) return true;
      return b.dueDate.substring(0, 7) <= activeMonthString;
    }
  });

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center py-0 sm:py-8 transition-colors">
      
      {/* Maximum width smartphone-like modern mobile frame */}
      <div className="w-full max-w-md bg-slate-50 min-h-screen sm:min-h-[85vh] sm:rounded-3xl sm:shadow-2xl border-0 sm:border border-slate-200/65 flex flex-col overflow-hidden relative pb-16">
        
        {/* App banner / Status indicator */}
        <header className="p-4 pt-5 pb-3 bg-white border-b border-slate-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-1.5 focus:outline-none">
            <div className="w-7 h-7 bg-slate-900 rounded-lg flex items-center justify-center font-black text-white text-xs tracking-tighter">
              S
            </div>
            <div>
              <h1 className="font-black text-sm text-slate-900 tracking-tight">Sage</h1>
              <span className="text-[10px] text-slate-500 font-medium block leading-none">Life Finance Companion</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] bg-slate-900 text-[#00E676] px-2 py-0.5 rounded font-mono font-bold">
              OFFLINE SECURE
            </span>
          </div>
        </header>

        {/* Outer scrolling area */}
        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          
          {/* Top simulated time status */}
          <SimulationBanner
            currentDate={currentDate}
            users={users}
            onForecastShift={handleForecastShift}
            onNextMonthReset={handleMonthlyReset}
          />

          {/* Core active Tab selection */}
          {activeTab === 'dashboard' && (
            <Dashboard
              users={users}
              bills={bills}
              transactions={transactions}
              currentDate={currentDate}
              selectedUser={selectedUser}
              onChangeUser={setSelectedUser}
              onOpenAllocationModal={() => setIsAllocationOpen(true)}
              kosRemainingThisMonth={selectedUser === 'rama' ? Math.max(0, 1000000 - ramaKosAllocated) : Math.max(0, 1000000 - nadiyaKosAllocated)}
            />
          )}

          {activeTab === 'bills' && (
            <BillsList
              bills={bills}
              currentDate={currentDate}
              selectedUser={selectedUser}
              users={users}
              onPayBill={handlePayBill}
              onAddCustomBill={handleAddCustomBill}
              onUpdateBill={handleUpdateBill}
              onDeleteBill={handleDeleteBill}
            />
          )}

          {activeTab === 'logs' && (
            <ExpenseTracker
              transactions={transactions}
              users={users}
              onAddTransaction={handleAddTransactionAndDeduct}
              onDeleteTransaction={handleDeleteTransaction}
              currentDate={currentDate}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab
              users={users}
              bills={bills}
              transactions={transactions}
              currentDate={currentDate}
              onUpdateSettings={handleUpdateSettings}
              onResetAllData={handleResetAllData}
              onImportBackup={handleImportBackup}
            />
          )}

        </div>

        {/* Smartphone Bottom persistent Navigation utilities bar */}
        <nav className="absolute bottom-0 inset-x-0 bg-white border-t border-slate-205 border-slate-100 flex py-1 px-4 justify-between items-center shrink-0 z-40 shadow-lg">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center p-1.5 flex-1 transition ${
              activeTab === 'dashboard' ? 'text-slate-900 scale-102 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <LayoutDashboard size={17} />
            <span className="text-[9px] tracking-tight mt-0.5">Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('bills')}
            className={`flex flex-col items-center p-1.5 flex-1 transition ${
              activeTab === 'bills' ? 'text-slate-900 scale-102 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <ReceiptText size={17} />
            <span className="text-[9px] tracking-tight mt-0.5">Bills</span>
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={`flex flex-col items-center p-1.5 flex-1 transition ${
              activeTab === 'logs' ? 'text-slate-900 scale-102 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Tag size={17} />
            <span className="text-[9px] tracking-tight mt-0.5">Expenses</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex flex-col items-center p-1.5 flex-1 transition ${
              activeTab === 'settings' ? 'text-slate-900 scale-102 font-bold' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <SettingsIcon size={17} />
            <span className="text-[9px] tracking-tight mt-0.5">Settings</span>
          </button>
        </nav>

      </div>

      {/* Suggested Allocation modal */}
      <AllocationModal
        isOpen={isAllocationOpen}
        onClose={() => setIsAllocationOpen(false)}
        user={selectedUser === 'rama' ? users[0] : users[1]}
        activeUnpaidBills={unpaidMonthlyActiveBills}
        currentDate={currentDate}
        kosRemainingThisMonth={selectedUser === 'rama' ? Math.max(0, 1000000 - ramaKosAllocated) : Math.max(0, 1000000 - nadiyaKosAllocated)}
        onApplyAllocation={handleApplyAllocation}
        onLogOjolExtra={(amount, memo) => {
          // Rama Ojol sidework log direct credit
          const extraTx: Transaction = {
            id: `tx-ojol-${Date.now()}`,
            userId: 'rama',
            category: 'free',
            amount: amount, // Positive means credit
            date: currentDate,
            description: `Ojol Gig: ${memo}`
          };
          handleAddTransactionAndDeduct(extraTx);
        }}
      />

    </div>
  );
}

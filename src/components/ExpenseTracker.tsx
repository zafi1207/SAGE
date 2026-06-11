import React, { useState } from 'react';
import { Plus, Minus, Search, Calendar, FileText, Trash2, ArrowUpRight, ArrowDownRight, Tag, HelpCircle } from 'lucide-react';
import { Transaction, User, UserID } from '../types';
import { formatRupiah, formatHumanDate } from '../lib/utils';

interface ExpenseTrackerProps {
  transactions: Transaction[];
  users: User[];
  onAddTransaction: (txn: Transaction) => void;
  onDeleteTransaction: (id: string) => void;
  currentDate: string;
}

export default function ExpenseTracker({
  transactions,
  users,
  onAddTransaction,
  onDeleteTransaction,
  currentDate
}: ExpenseTrackerProps) {
  const [type, setType] = useState<'expense' | 'income'>('expense');
  const [userId, setUserId] = useState<UserID>('rama');
  const [category, setCategory] = useState<'living' | 'free' | 'bills'>('living');
  const [amount, setAmount] = useState<number>(50000);
  const [description, setDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const activeUser = users.find(u => u.id === userId);

  const handleLoggedAddStr = () => {
    if (amount <= 0) return;

    const finalAmount = type === 'income' ? -Math.abs(amount) : Math.abs(amount);

    const newTx: Transaction = {
      id: `tx-${userId}-${Date.now()}`,
      userId,
      category,
      amount: finalAmount, // Negative represents expense, Positive represents income
      date: currentDate,
      description: description || (type === 'income' ? 'Logged Income' : `Spent on ${category}`)
    };

    onAddTransaction(newTx);
    
    // reset form fields
    setDescription('');
    setAmount(50000);
  };

  // Filter transactions
  const filteredTx = transactions.filter(tx => {
    const term = searchQuery.toLowerCase();
    const userMatch = tx.userId.toLowerCase().includes(term);
    const descMatch = tx.description.toLowerCase().includes(term);
    const catMatch = tx.category.toLowerCase().includes(term);
    return userMatch || descMatch || catMatch;
  });

  return (
    <div className="space-y-6 flex-1 animate-fadeIn">
      
      {/* Transaction Logger Card */}
      <div className="bg-white rounded-3xl border border-slate-205 border-slate-200 shadow-sm p-5 space-y-5">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h3 className="text-sm font-extrabold text-[#0f172a] uppercase font-display tracking-wide">Journal Entries</h3>
            <p className="text-[10px] text-slate-400 font-mono">DEDUCTS FROM THE DEDICATED WALLETS</p>
          </div>
          <Tag className="text-slate-400" size={18} />
        </div>

        {/* Expense vs Income Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200/20">
          <button
            type="button"
            onClick={() => setType('expense')}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              type === 'expense' ? 'bg-[#0f172a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📉 Spent Cash (Expense)
          </button>
          <button
            type="button"
            onClick={() => {
              setType('income');
              setCategory('free'); // default redirect
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              type === 'income' ? 'bg-[#0f172a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            📈 Added Extra (Income)
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 text-xs">
          
          {/* User selector */}
          <div className="space-y-1.5">
            <label className="text-slate-500 font-bold block">User Account</label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value as UserID)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#0f172a] focus:outline-none focus:border-[#0f172a] focus:bg-white transition"
            >
              <option value="rama">Rama</option>
              <option value="nadiya">Nadiya</option>
            </select>
          </div>

          {/* Category selection */}
          <div className="space-y-1.5">
            <label className="text-slate-500 font-bold block">Wallet Category</label>
            <select
              value={category}
              disabled={type === 'income'}
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#0f172a] disabled:opacity-50"
            >
              <option value="living">🍜 Living Fund</option>
              <option value="free">🛍 Free Spending</option>
              <option value="bills">💳 Bills Allocation</option>
            </select>
          </div>

          {/* Money amount */}
          <div className="space-y-1.5">
            <label className="text-slate-500 font-bold block">Amount In Rupiah</label>
            <input
              type="number"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value))}
              placeholder="e.g. 50000"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-900 font-mono focus:outline-none focus:border-[#0f172a] focus:bg-white transition"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-slate-500 font-bold block">Brief memo</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={type === 'income' ? 'Ojol gig profit, gift' : 'Dinner, warung, laundry'}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-[#0f172a] focus:outline-none focus:border-[#0f172a] focus:bg-white transition"
            />
          </div>

        </div>

        {/* Wallet Balance Check Indicator */}
        {type === 'expense' && activeUser && (
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-500 flex justify-between items-center font-medium">
            <span>
              Target Wallet balance left:
            </span>
            <span className="font-extrabold text-[#0f172a] font-mono">
              {category === 'living'
                ? formatRupiah(activeUser.livingFundBalance)
                : category === 'free'
                ? formatRupiah(activeUser.freeSpendingBalance)
                : formatRupiah(activeUser.currentBalance)}
            </span>
          </div>
        )}

        <button
          onClick={handleLoggedAddStr}
          disabled={amount <= 0}
          className="w-full py-3 bg-[#0f172a] hover:bg-slate-800 transition-all duration-200 active:scale-[0.98] text-white rounded-full text-xs font-bold shadow-sm flex items-center justify-center gap-1.5"
        >
          {type === 'expense' ? <Minus size={14} /> : <Plus size={14} />}
          <span>Log journal entry</span>
        </button>

      </div>

      {/* Transaction List Card */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 space-y-4">
        
        {/* Title & Search bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-widest font-mono">
            Recent Logs History ({transactions.length})
          </h3>
          <div className="relative w-full sm:w-auto">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memo..."
              className="w-full sm:w-auto pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#0f172a] transition-all"
            />
          </div>
        </div>

        {filteredTx.length > 0 ? (
          <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto pr-1">
            {filteredTx.map((tx) => {
              const isExpense = tx.amount > 0;
              const absAmount = Math.abs(tx.amount);
              
              return (
                <div key={tx.id} className="py-3 flex justify-between items-center gap-3 text-xs hover:bg-slate-50/20 px-1 rounded-lg">
                  <div className="flex items-center gap-3 truncate">
                    <div className={`p-2.5 rounded-full shrink-0 border ${
                      isExpense 
                        ? 'bg-rose-50 text-rose-600 border-rose-100' 
                        : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                    }`}>
                      {isExpense ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                    </div>
                    <div className="truncate space-y-0.5">
                      <div className="font-extrabold text-[#0f172a] truncate max-w-[140px] sm:max-w-xs font-display">{tx.description}</div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2 font-medium">
                        <span className="uppercase font-bold tracking-wider text-slate-650 text-slate-500">{tx.userId}</span>
                        <span>•</span>
                        <span>{formatHumanDate(tx.date)}</span>
                        <span>•</span>
                        <span className="bg-slate-100 px-1.5 py-0.5 rounded text-[8px] font-bold">
                          {tx.category === 'living' ? '🍜 Living' : tx.category === 'free' ? '🛍 Free' : '💳 Bill'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`font-mono font-bold text-sm ${
                      isExpense ? 'text-[#0f172a] font-extrabold' : 'text-emerald-600 font-extrabold'
                    }`}>
                      {isExpense ? '-' : '+'}{formatRupiah(absAmount)}
                    </span>
                    <button
                      onClick={() => onDeleteTransaction(tx.id)}
                      className="p-1.5 text-slate-300 hover:text-rose-600 rounded-full transition hover:bg-rose-50"
                      title="Delete log"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-slate-400 text-xs text-center p-6 bg-slate-50 rounded-3xl border border-dashed border-slate-200 font-semibold leading-tight">
            No transaction records matched. Fill in the logger form above to record entries!
          </p>
        )}

      </div>

    </div>
  );
}

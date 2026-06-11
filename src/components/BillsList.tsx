import React, { useState } from 'react';
import { 
  CreditCard, 
  Calendar, 
  CheckSquare, 
  Square, 
  Archive, 
  Milestone, 
  Award, 
  Sparkles, 
  CheckCircle, 
  Plus, 
  Edit3, 
  Trash2, 
  Save, 
  X, 
  AlertCircle,
  FileText
} from 'lucide-react';
import { Bill, UserID, User } from '../types';
import { formatRupiah, formatHumanDate, parseDate, formatDateString } from '../lib/utils';

interface BillsListProps {
  bills: Bill[];
  currentDate: string;
  selectedUser: UserID;
  users: User[];
  onPayBill: (billId: string, instanceDueDate?: string) => void;
  onAddCustomBill: (newBill: Bill) => void;
  onUpdateBill: (updatedBill: Bill) => void;
  onDeleteBill: (billId: string) => void;
}

export default function BillsList({
  bills,
  currentDate,
  selectedUser,
  users,
  onPayBill,
  onAddCustomBill,
  onUpdateBill,
  onDeleteBill
}: BillsListProps) {
  const [filterUser, setFilterUser] = useState<UserID | 'all'>(selectedUser);
  const [showAddForm, setShowAddForm] = useState(false);
  
  // Custom bill state
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState<number>(150000);
  const [newType, setNewType] = useState<'installment' | 'recurring' | 'one-time'>('one-time');
  const [newDueDay, setNewDueDay] = useState<number>(1);
  const [newBillMonth, setNewBillMonth] = useState<string>(currentDate.substring(0, 7));
  const [newPayments, setNewPayments] = useState<number>(6);
  const [newPriority, setNewPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [newNotes, setNewNotes] = useState('');
  const [newOwner, setNewOwner] = useState<UserID | 'shared'>(selectedUser);

  // Active Billing Editor State
  const [editingBill, setEditingBill] = useState<Bill | null>(null);

  // Edit fields locally
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState<number>(0);
  const [editType, setEditType] = useState<'installment' | 'recurring' | 'one-time'>('one-time');
  const [editDueDay, setEditDueDay] = useState<number>(1);
  const [editBillMonth, setEditBillMonth] = useState<string>(currentDate.substring(0, 7));
  const [editDueDate, setEditDueDate] = useState('');
  const [editTotalPayments, setEditTotalPayments] = useState<number>(6);
  const [editRemainingPayments, setEditRemainingPayments] = useState<number>(6);
  const [editPriority, setEditPriority] = useState<'high' | 'medium' | 'low'>('medium');
  const [editNotes, setEditNotes] = useState('');
  const [editOwner, setEditOwner] = useState<UserID | 'shared'>('rama');
  const [editIsArchived, setEditIsArchived] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

  // Helper to generate a list of monthly options for selection
  const generateMonthOptions = () => {
    const currentSimMonth = parseDate(currentDate);
    const options = [];
    for (let i = -6; i <= 18; i++) {
      const d = new Date(currentSimMonth.getFullYear(), currentSimMonth.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      options.push({ val, label });
    }
    return options;
  };

  const activeMonthStr = currentDate.substring(0, 7); // e.g. "2026-06"

  // Filter bills by selected user / filter
  const userFilteredBills = bills.filter(b => {
    if (filterUser === 'all') return true;
    return b.userId === filterUser || b.userId === 'shared';
  });

  // CATEGORIZATION OF BILLS:
  
  // 1. ACTIVE BILLS: Unpaid bills whose cycle matches the current month or previous unpaid
  const activeBills = userFilteredBills.filter(b => {
    if (b.isArchived) return false;

    if (b.billType === 'recurring') {
      if (b.userId === 'shared') {
        // Shared relies on user-specific month payments
        return !b.paidMonths?.includes(`${activeMonthStr}-${selectedUser}`);
      }
      return !b.paidMonths?.includes(activeMonthStr);
    } else if (b.billType === 'installment') {
      if (!b.installments) return false;
      return b.installments.some(inst => {
        const instMonth = inst.dueDate.substring(0, 7);
        return (instMonth <= activeMonthStr) && !inst.isPaid;
      });
    } else {
      if (b.oneTimePaid) return false;
      if (!b.dueDate) return true;
      return b.dueDate.substring(0, 7) <= activeMonthStr;
    }
  });

  // 2. UPCOMING BILLS: Future unpaid instances (due next month or further)
  const upcomingBills = userFilteredBills.filter(b => {
    if (b.isArchived) return false;

    if (b.billType === 'recurring') {
      if (b.userId === 'shared') {
        return b.paidMonths?.includes(`${activeMonthStr}-${selectedUser}`);
      }
      return b.paidMonths?.includes(activeMonthStr); 
    } else if (b.billType === 'installment') {
      if (!b.installments) return false;
      const hasActiveUnpaid = b.installments.some(inst => inst.dueDate.substring(0, 7) <= activeMonthStr && !inst.isPaid);
      if (hasActiveUnpaid) return false;
      return b.installments.some(inst => inst.dueDate.substring(0, 7) > activeMonthStr && !inst.isPaid);
    } else {
      if (b.oneTimePaid) return false;
      if (!b.dueDate) return false;
      return b.dueDate.substring(0, 7) > activeMonthStr;
    }
  });

  // 3. ENDING SOON: Installments with <= 2 remaining payments
  const endingSoonBills = userFilteredBills.filter(b => {
    if (b.isArchived) return false;
    if (b.billType !== 'installment') return false;
    return b.remainingPayments !== undefined && b.remainingPayments > 0 && b.remainingPayments <= 2;
  });

  // 4. COMPLETED / ARCHIVED:
  const completedBills = userFilteredBills.filter(b => b.isArchived);

  // Sum total debts ending soon
  const burdenReductionSum = endingSoonBills.reduce((sum, b) => {
    if (b.userId === 'shared') return sum + 1000000;
    return sum + b.amount;
  }, 0);

  // ACTIVATE BILL EDITOR MODAL
  const handleOpenEditModal = (bill: Bill) => {
    setEditingBill(bill);
    setEditName(bill.name);
    setEditAmount(bill.amount);
    setEditType(bill.billType);
    setEditDueDay(bill.dueDay);
    setEditDueDate(bill.dueDate || '');
    setEditTotalPayments(bill.totalPayments || 6);
    setEditRemainingPayments(bill.remainingPayments ?? (bill.billType === 'installment' ? 6 : 0));
    setEditPriority(bill.priority);
    setEditNotes(bill.notes || '');
    setEditOwner(bill.userId);
    setEditIsArchived(bill.isArchived || false);
    setIsConfirmingDelete(false);

    const initialMonth = bill.dueDate ? bill.dueDate.substring(0, 7)
      : (bill.installments && bill.installments.length > 0) ? bill.installments[0].dueDate.substring(0, 7)
      : currentDate.substring(0, 7);
    setEditBillMonth(initialMonth);
  };

  const handleSaveEdit = () => {
    if (!editingBill) return;
    if (!editName.trim()) {
      alert('Bill title cannot be empty.');
      return;
    }

    let computedDueDate = undefined;
    // construct updated installments array if it's installment
    let updatedInsts = editingBill.installments;
    if (editType === 'installment') {
      // Re-generate or adjust remaining payments
      updatedInsts = [];
      const parts = editBillMonth.split('-');
      const baseDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, editDueDay);
      for (let i = 0; i < editTotalPayments; i++) {
        const offsetMonth = baseDate.getMonth() + i;
        const due = new Date(baseDate.getFullYear(), offsetMonth, editDueDay);
        updatedInsts.push({
          installmentNumber: i + 1,
          amount: editAmount,
          dueDate: formatDateString(due),
          isPaid: i < (editTotalPayments - editRemainingPayments)
        });
      }
    } else if (editType === 'one-time') {
      const parts = editBillMonth.split('-');
      const baseDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, editDueDay);
      computedDueDate = formatDateString(baseDate);
    }

    const updatedBill: Bill = {
      ...editingBill,
      name: editName,
      amount: editAmount,
      billType: editType,
      dueDay: editDueDay,
      dueDate: editType === 'one-time' ? computedDueDate : undefined,
      totalPayments: editType === 'installment' ? editTotalPayments : undefined,
      remainingPayments: editType === 'installment' ? editRemainingPayments : undefined,
      priority: editPriority,
      notes: editNotes,
      userId: editOwner,
      isArchived: editIsArchived,
      installments: updatedInsts
    };

    onUpdateBill(updatedBill);
    setEditingBill(null);
  };

  const handleDeleteAction = () => {
    if (!editingBill) return;
    onDeleteBill(editingBill.id);
    setIsConfirmingDelete(false);
    setEditingBill(null);
  };

  const handleAddNewBill = () => {
    if (!newName.trim()) {
      alert('Please enter a valid bill name');
      return;
    }

    const randomId = 'bill-' + Date.now();
    let computedDueDate = undefined;
    let computedInstallments = undefined;

    if (newType === 'one-time') {
      const parts = newBillMonth.split('-');
      const targetDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, newDueDay);
      computedDueDate = formatDateString(targetDate);
    } else if (newType === 'installment') {
      computedInstallments = [];
      const parts = newBillMonth.split('-');
      const baseDate = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, newDueDay);
      for (let i = 0; i < newPayments; i++) {
        const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, newDueDay);
        computedInstallments.push({
          installmentNumber: i + 1,
          amount: newAmount,
          dueDate: formatDateString(targetDate),
          isPaid: false
        });
      }
    }

    const created: Bill = {
      id: randomId,
      name: newName,
      amount: newAmount,
      dueDay: newDueDay,
      billType: newType,
      priority: newPriority,
      userId: newOwner,
      totalPayments: newType === 'installment' ? newPayments : undefined,
      remainingPayments: newType === 'installment' ? newPayments : undefined,
      dueDate: computedDueDate,
      installments: computedInstallments,
      paidMonths: [],
      notes: newNotes,
      isArchived: false
    };

    onAddCustomBill(created);

    // Reset Form
    setNewName('');
    setNewAmount(150000);
    setNewDueDay(1);
    setNewType('one-time');
    setNewPriority('medium');
    setNewNotes('');
    setShowAddForm(false);
    setNewBillMonth(currentDate.substring(0, 7));
  };

  return (
    <div className="space-y-6 flex-1 animate-fadeIn">
      
      {/* Dynamic Debts Ending Soon panel */}
      <div className="bg-gradient-to-br from-[#0f172a] to-slate-900 text-white rounded-[2rem] p-6 shadow-xl relative overflow-hidden border border-slate-805 border-slate-800">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="font-extrabold text-base text-emerald-400 flex items-center gap-1 font-display">
              <Sparkles size={16} />
              <span>Loans Ending Soon</span>
            </h3>
            <p className="text-[10px] text-slate-400 font-mono tracking-wider font-bold uppercase mt-0.5">
              Less than 2 payments remaining
            </p>
          </div>
          <span className="px-2.5 py-0.5 bg-emerald-500/10 text-[#00E676] rounded-full text-[10px] font-bold font-mono">
            {endingSoonBills.length} CARDS ACTIVE
          </span>
        </div>

        {endingSoonBills.length > 0 ? (
          <div className="mt-4 pt-1 space-y-3.5">
            <div className="divide-y divide-slate-800 text-xs">
              {endingSoonBills.map(b => (
                <div key={b.id} className="py-2.5 first:pt-0 last:pb-0 flex justify-between items-center gap-2 font-semibold">
                  <div>
                    <span className="text-slate-200 block font-bold text-[13px]">{b.name}</span>
                    <span className="text-[9px] text-slate-450 text-slate-400 font-mono">
                      Owner: {b.userId.toUpperCase()} • {b.remainingPayments} payments left
                    </span>
                  </div>
                  <span className="font-mono text-slate-100 text-xs font-bold text-slate-350">{formatRupiah(b.amount)}/mo</span>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <div>
                <span className="text-[9px] opacity-75 uppercase tracking-wider block font-mono text-slate-400">Overhead Reduction Sum:</span>
                <span className="text-lg font-black text-emerald-450 text-[#00E676] font-mono tracking-tight block">
                  {formatRupiah(burdenReductionSum)}/month
                </span>
              </div>
              <span className="text-[10px] text-emerald-300 text-right font-mono max-w-[150px] leading-tight block font-medium">
                Clear these soon to secure major salary savings!
              </span>
            </div>
          </div>
        ) : (
          <p className="mt-3.5 text-xs text-emerald-250/90 leading-relaxed font-semibold text-slate-300">
            Excellent! Currently, you don't have any short-term loans lingering within 2 payments of completion. Clear outstanding debts to reduce monthly overhead!
          </p>
        )}
      </div>

      {/* User filtering & custom bill trigger */}
      <div className="flex justify-between items-center gap-2">
        <div className="flex bg-slate-100 p-1 rounded-full">
          <button
            onClick={() => setFilterUser('all')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              filterUser === 'all'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            All Bills
          </button>
          <button
            onClick={() => setFilterUser('rama')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              filterUser === 'rama'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Rama
          </button>
          <button
            onClick={() => setFilterUser('nadiya')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              filterUser === 'nadiya'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Nadiya
          </button>
        </div>

        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 font-bold active:scale-95 transition-all duration-200 text-white rounded-full text-xs flex items-center gap-1.5 shadow-sm"
        >
          <Plus size={14} />
          <span>New Bill</span>
        </button>
      </div>

      {/* Add Custom Bill Form */}
      {showAddForm && (
        <div className="p-5 bg-white border border-slate-200 rounded-[2rem] space-y-4 animate-fadeIn shadow-sm">
          <div className="flex justify-between items-center">
            <h4 className="text-xs font-bold text-slate-800 uppercase font-mono tracking-wider">Create Custom Bill</h4>
            <span className="text-[9px] text-[#00E676] bg-slate-900 px-2 py-0.5 rounded font-mono font-bold">
              OFFLINE SECURE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="col-span-2 space-y-1">
              <label className="text-slate-700 block font-bold">Bill Title / Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Pegadaian, Motor loan"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 block font-bold">Cost per payment</label>
              <input
                type="number"
                value={newAmount || ''}
                onChange={(e) => setNewAmount(Number(e.target.value))}
                placeholder="150000"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 block font-bold">Due Day of Month</label>
              <input
                type="number"
                min={1}
                max={31}
                value={newDueDay}
                onChange={(e) => setNewDueDay(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-mono font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 block font-bold">Bill Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-bold"
              >
                <option value="one-time">One-Time Bill</option>
                <option value="recurring">Recurring Monthly</option>
                <option value="installment">Installment Bill</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 block font-bold">Billing Month / Start Month</label>
              <select
                value={newBillMonth}
                onChange={(e) => setNewBillMonth(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-bold"
              >
                {generateMonthOptions().map(opt => (
                  <option key={opt.val} value={opt.val}>{opt.label}</option>
                ))}
              </select>
            </div>

            {newType === 'installment' && (
              <div className="space-y-1">
                <label className="text-slate-700 block font-bold">Total Installments</label>
                <input
                  type="number"
                  value={newPayments}
                  onChange={(e) => setNewPayments(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-mono font-bold"
                />
              </div>
            )}

            <div className="space-y-1">
              <label className="text-slate-700 block font-bold">Account Owner</label>
              <select
                value={newOwner}
                onChange={(e) => setNewOwner(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-bold"
              >
                <option value="rama">👨🏻‍💼 Rama Only</option>
                <option value="nadiya">👩🏻‍🎨 Nadiya Only</option>
                <option value="shared">🏠 Shared split</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-700 block font-bold">Priority Tier</label>
              <select
                value={newPriority}
                onChange={(e) => setNewPriority(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-bold"
              >
                <option value="high">🚨 High Priority</option>
                <option value="medium">⚡ Medium Priority</option>
                <option value="low">☕ Low Priority</option>
              </select>
            </div>

            <div className="col-span-2 space-y-1">
              <label className="text-slate-700 block font-bold">Notes / Description (Optional)</label>
              <input
                type="text"
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                placeholder="Add special conditions or metadata..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 text-xs font-medium"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-1.5 text-xs font-bold">
            <button
              onClick={() => setShowAddForm(false)}
              className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full transition"
            >
              Cancel
            </button>
            <button
              onClick={handleAddNewBill}
              className="flex-1 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full transition shadow-sm"
            >
              Confirm Custom Bill
            </button>
          </div>
        </div>
      )}

      {/* RENDER ACTIVE MONTHLY OBLIGATIONS */}
      <div className="space-y-5">
        
        {/* Section 1: ACTIVE BILLS */}
        <div className="space-y-3">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Milestone size={14} className="text-[#00E676]" />
            <span>Bills Coming Soon / Active</span>
            <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-full text-[10px] font-bold font-mono">
              {activeBills.length} Unpaid
            </span>
          </h4>

          {activeBills.length > 0 ? (
            <div className="space-y-3">
              {activeBills.map((b) => {
                // Find instance due date (earliest unpaid of current month or earlier)
                let showDueDate = `${activeMonthStr}-${String(b.dueDay).padStart(2, '0')}`;
                if (b.billType === 'installment' && b.installments) {
                  const inst = b.installments.find(i => i.dueDate.substring(0, 7) <= activeMonthStr && !i.isPaid);
                  if (inst) showDueDate = inst.dueDate;
                } else if (b.billType === 'one-time' && b.dueDate) {
                  showDueDate = b.dueDate;
                }

                return (
                  <div key={b.id} className="p-5 bg-white border border-slate-200 rounded-[2rem] flex flex-col gap-3 shadow-sm hover:shadow-md transition duration-200 relative">
                    
                    <div className="flex justify-between items-start gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-extrabold text-[#0f172a] text-[13px] sm:text-sm font-display">{b.name}</span>
                          {b.userId === 'shared' ? (
                            <span className="text-[8px] px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200/40 rounded-full font-bold uppercase tracking-wider font-mono">
                              SHARED
                            </span>
                          ) : (
                            <span className="text-[8px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold uppercase tracking-wider font-mono">
                              {b.userId.toUpperCase()}
                            </span>
                          )}
                          {b.priority === 'high' && (
                            <span className="text-[8px] px-1.5 py-0.5 text-rose-600 bg-rose-50 rounded-full font-bold font-mono">
                              🚨 HIGH
                            </span>
                          )}
                        </div>
                        
                        <div className="flex gap-2.5 text-[9px] text-slate-400 font-mono">
                          <span className="flex items-center gap-0.5 font-bold">
                            <Calendar size={10} className="text-slate-400" />
                            {formatHumanDate(showDueDate)}
                          </span>
                          <span>
                            {b.billType === 'installment' && b.remainingPayments && (
                              <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">
                                Installment {b.totalPayments! - b.remainingPayments! + 1}/{b.totalPayments}
                              </span>
                            )}
                            {b.billType === 'recurring' && <span className="text-emerald-600 font-bold bg-emerald-50 px-1 rounded">Recurring</span>}
                            {b.billType === 'one-time' && <span className="text-amber-600 font-bold bg-amber-50 px-1 rounded">One-Time</span>}
                          </span>
                        </div>
                      </div>

                      {/* Top Right Pricing Details */}
                      <div className="text-right">
                        {b.userId === 'shared' ? (
                          <span className="text-xs font-black text-slate-900 block font-mono">
                            Split {formatRupiah(1000000)}/each
                          </span>
                        ) : (
                          <span className="text-sm font-black text-slate-900 block font-mono">
                            {formatRupiah(b.amount)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Bill Progress: Total Bill Amount, Reserved Amount, Remaining Amount, Progress Percentage */}
                    {(() => {
                      const isShared = b.userId === 'shared';
                      const totalBillAmount = isShared ? 1000000 : b.amount; // individual due portion
                      const reservedAmount = b.reservedAmount || 0;
                      const remainingAmount = Math.max(0, totalBillAmount - reservedAmount);
                      const progressPercentage = Math.min(100, Math.round((reservedAmount / totalBillAmount) * 100));

                      return (
                        <div className="space-y-1.5 p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100">
                          <div className="flex justify-between text-[11px] font-mono text-slate-500 font-bold">
                            <span>Bill Progress:</span>
                            <span className="font-extrabold text-slate-700">{formatRupiah(reservedAmount)} / {formatRupiah(totalBillAmount)}</span>
                          </div>
                          
                          <div className="h-2 bg-slate-200/50 rounded-full overflow-hidden block">
                            <div 
                              className="bg-emerald-500 h-full rounded-full transition-all" 
                              style={{ width: `${progressPercentage}%` }}
                            ></div>
                          </div>

                          <div className="flex justify-between items-center text-[10px] font-mono font-medium">
                            <span className="text-emerald-700 font-extrabold bg-emerald-50/70 px-1.5 py-0.5 rounded-md">
                              {progressPercentage}% Reserved
                            </span>
                            <span className="text-slate-450">
                              Remaining Due: <span className="font-bold text-rose-600">{formatRupiah(remainingAmount)}</span>
                            </span>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Display notes if any */}
                    {b.notes && (
                      <div className="p-2.5 bg-amber-500/5 border border-amber-200/20 rounded-xl text-[10px] text-slate-500 flex items-start gap-1 font-mono leading-normal">
                        <FileText size={11} className="text-amber-600 shrink-0 mt-0.5" />
                        <p>{b.notes}</p>
                      </div>
                    )}

                    {/* Actions Row */}
                    <div className="flex justify-between items-center pt-2 border-t border-slate-100 gap-2">
                      <button
                        onClick={() => handleOpenEditModal(b)}
                        className="px-3 py-1.5 text-[10px] font-extrabold text-slate-500 hover:text-slate-800 transition-all rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200/50 flex items-center gap-1"
                        title="Edit bill configurations"
                      >
                        <Edit3 size={11} />
                        <span>Edit Bill</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        {b.userId === 'shared' ? (
                          <div className="flex gap-1">
                            <button
                              onClick={() => onPayBill(b.id, 'rama')}
                              disabled={b.paidMonths?.includes(activeMonthStr + '-rama')}
                              className={`px-3 py-1.5 text-[9px] font-black rounded-full transition-all ${
                                b.paidMonths?.includes(activeMonthStr + '-rama')
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-slate-900 text-white hover:bg-slate-800'
                              }`}
                            >
                              {b.paidMonths?.includes(activeMonthStr + '-rama') ? 'Rama ✓' : 'Pay Rama 1M'}
                            </button>
                            <button
                              onClick={() => onPayBill(b.id, 'nadiya')}
                              disabled={b.paidMonths?.includes(activeMonthStr + '-nadiya')}
                              className={`px-3 py-1.5 text-[9px] font-black rounded-full transition-all ${
                                b.paidMonths?.includes(activeMonthStr + '-nadiya')
                                  ? 'bg-emerald-50 text-emerald-600'
                                  : 'bg-slate-900 text-white hover:bg-slate-800'
                              }`}
                            >
                              {b.paidMonths?.includes(activeMonthStr + '-nadiya') ? 'Nadiya ✓' : 'Pay Nadiya 1M'}
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => onPayBill(b.id, showDueDate)}
                            className="px-4.5 py-2 bg-slate-900 hover:bg-slate-800 active:scale-95 transition-all text-white text-[11px] font-bold rounded-full shadow-sm"
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>
          ) : (
            <div className="p-5 bg-emerald-50 border border-emerald-200/50 rounded-3xl text-xs text-emerald-850 flex items-center gap-3 shadow-sm">
              <CheckCircle size={20} className="text-emerald-600 shrink-0" />
              <div>
                <p className="font-extrabold text-emerald-950 text-sm">All obligations satisfied for {activeMonthStr}!</p>
                <p className="text-emerald-700/90 leading-tight mt-0.5 font-medium">
                  Rama and Nadiya have secured and marked paid all bills due this month. No debts left threatening this month's budget.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Section 2: UPCOMING COMMITMENTS */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Milestone size={14} className="text-emerald-600" />
            <span>Upcoming Future Commitments</span>
            <span className="px-2 py-0.5 bg-slate-200/70 text-slate-700 rounded-full text-[10px] font-mono font-bold">
              {upcomingBills.length} Remaining
            </span>
          </h4>

          {upcomingBills.length > 0 ? (
            <div className="space-y-2.5">
              {upcomingBills.slice(0, 5).map(b => (
                <div key={b.id} className="p-4 bg-white border border-slate-200 rounded-3xl flex flex-col gap-2.5 text-xs shadow-sm">
                  
                  <div className="flex justify-between items-center gap-2">
                    <div>
                      <div className="font-bold text-[#0f172a] flex items-center gap-1.5 font-display">
                        <span>{b.name}</span>
                        <span className="text-[8px] font-mono uppercase bg-slate-100 px-1.5 py-0.5 rounded-full text-slate-500 font-bold">
                          {b.userId.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {b.billType === 'installment' ? `${b.remainingPayments} payments remaining` : 'Monthly recurring obligation'}
                      </div>
                    </div>
                    <span className="font-mono font-extrabold text-slate-800 text-sm">
                      {formatRupiah(b.amount)}
                    </span>
                  </div>

                  {/* Bill Progress: Total Bill Amount, Reserved Amount, Remaining Amount, Progress Percentage */}
                  {(() => {
                    const isShared = b.userId === 'shared';
                    const totalBillAmount = isShared ? 1000000 : b.amount; // individual due portion
                    const reservedAmount = b.reservedAmount || 0;
                    const remainingAmount = Math.max(0, totalBillAmount - reservedAmount);
                    const progressPercentage = Math.min(100, Math.round((reservedAmount / totalBillAmount) * 100 || 0));

                    return (
                      <div className="space-y-1.5 p-2 bg-slate-50/50 rounded-2xl border border-slate-100 text-[10px]">
                        <div className="flex justify-between font-mono text-slate-500 font-bold font-mono">
                          <span>Progress:</span>
                          <span className="font-extrabold text-slate-700">{formatRupiah(reservedAmount)} / {formatRupiah(totalBillAmount)}</span>
                        </div>
                        
                        <div className="h-1.5 bg-slate-200/50 rounded-full overflow-hidden block">
                          <div 
                            className="bg-emerald-500 h-full rounded-full transition-all" 
                            style={{ width: `${progressPercentage}%` }}
                          ></div>
                        </div>

                        <div className="flex justify-between items-center font-mono font-medium text-[9px]">
                          <span className="text-emerald-700 font-extrabold bg-emerald-50/75 px-1.5 rounded">
                            {progressPercentage}% Saved
                          </span>
                          <span className="text-slate-450">
                            Remaining Due: <span className="font-bold text-rose-600">{formatRupiah(remainingAmount)}</span>
                          </span>
                        </div>
                      </div>
                    );
                  })()}

                  {b.notes && (
                     <div className="p-2.5 bg-slate-50 rounded-xl text-[9px] text-slate-400 font-mono">
                       Notes: {b.notes}
                     </div>
                  )}

                  <div className="flex justify-start">
                    <button
                      onClick={() => handleOpenEditModal(b)}
                      className="px-2.5 py-1 text-[9px] bg-slate-50 hover:bg-slate-100 border border-slate-200/40 text-slate-500 hover:text-slate-700 font-bold rounded-full transition flex items-center gap-1"
                    >
                      <Edit3 size={9} />
                      <span>Edit Bill</span>
                    </button>
                  </div>
                </div>
              ))}
              {upcomingBills.length > 5 && (
                <div className="text-center text-[10px] text-slate-400 font-mono italic pt-1">
                  + {upcomingBills.length - 5} more future scheduled monthly installments
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-450 bg-slate-50/50 p-4 rounded-3xl border border-dashed border-slate-200 text-center font-semibold">
              No future unpaid items found.
            </p>
          )}
        </div>

        {/* Section 3: COMPLETED ARCHIVE & DEBT PAYOFF TRACKER */}
        <div className="space-y-3 pt-2">
          <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 font-mono">
            <Archive size={14} className="text-emerald-500" />
            <span>Completed Archive (Debt Cleared 🏆)</span>
            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-800 rounded-full text-[10px] font-mono font-bold">
              {completedBills.length} Cleared
            </span>
          </h4>

          {completedBills.length > 0 ? (
            <div className="space-y-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
              {completedBills.map(b => (
                <div key={b.id} className="p-3.5 bg-emerald-500/5 border border-emerald-501/10 rounded-2xl flex flex-col gap-2 border border-emerald-500/15">
                  <div className="flex items-center gap-2.5 text-xs">
                    <Award className="text-emerald-600 shrink-0" size={16} />
                    <div className="truncate flex-1">
                      <span className="font-extrabold text-slate-800 block truncate font-display">{b.name}</span>
                      <span className="text-[9px] text-emerald-600 font-mono block font-bold">
                        Saved {formatRupiah(b.amount)}/month!
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-emerald-50/70 text-[9px] font-mono text-slate-400">
                     <span>Owner: {b.userId.toUpperCase()}</span>
                     <button
                       onClick={() => handleOpenEditModal(b)}
                       className="text-indigo-600 font-bold hover:underline"
                     >
                       Edit Archive
                     </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-4 bg-slate-50 rounded-3xl border border-dashed border-slate-200 text-center text-xs text-slate-450 leading-tight font-semibold">
              No completed installments archived yet. Help Rama and Nadiya clear their active installments to move them here and celebrate debt-free dates!
            </div>
          )}
        </div>
      </div>

      {/* BILL EDITOR DISPLAY PORTAL - DIALOG MODAL (Task 1) */}
      {editingBill && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center p-4 z-50 animate-fadeIn backdrop-blur-xs">
          <div className="bg-white rounded-[2rem] border border-slate-200 w-full max-w-md max-h-[90vh] overflow-y-auto p-6 space-y-5 shadow-2xl">
            
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Edit3 size={16} className="text-slate-800" />
                <h3 className="font-extrabold text-[#0f172a] text-sm font-display tracking-wide uppercase">
                  Edit Bill Details
                </h3>
              </div>
              <button 
                onClick={() => setEditingBill(null)}
                className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              
              {/* Name */}
              <div className="space-y-1">
                <label className="text-slate-700 block font-bold">Bill Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white text-slate-850 font-semibold"
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="text-slate-700 block font-bold">Cost per Payment</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold font-mono text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={editAmount || ''}
                    onChange={(e) => setEditAmount(Number(e.target.value))}
                    className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white font-mono font-bold"
                  />
                </div>
              </div>

              {/* Billing Month / Start Month */}
              <div className="space-y-1">
                <label className="text-slate-700 block font-bold">Billing Month / Start Month</label>
                <select
                  value={editBillMonth}
                  onChange={(e) => setEditBillMonth(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white font-bold"
                >
                  {generateMonthOptions().map(opt => (
                    <option key={opt.val} value={opt.val}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Due Day */}
                <div className="space-y-1">
                  <label className="text-slate-700 block font-bold">Due Day (1-31)</label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={editDueDay}
                    onChange={(e) => setEditDueDay(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white font-mono font-bold"
                  />
                </div>

                {/* Priority */}
                <div className="space-y-1">
                  <label className="text-slate-700 block font-bold">Priority Tier</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white font-bold"
                  >
                    <option value="high">🚨 High Priority</option>
                    <option value="medium">⚡ Medium Priority</option>
                    <option value="low">☕ Low Priority</option>
                  </select>
                </div>
              </div>

              {/* Bill Type */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-700 block font-bold">Bill Type</label>
                  <select
                    value={editType}
                    onChange={(e) => setEditType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white font-bold"
                  >
                    <option value="one-time">One-Time Bill</option>
                    <option value="recurring">Recurring Monthly</option>
                    <option value="installment">Installment Bill</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-700 block font-bold">Owner / Assignee</label>
                  <select
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white font-bold"
                  >
                    <option value="rama">👨🏻‍💼 Rama Only</option>
                    <option value="nadiya">👩🏻‍🎨 Nadiya Only</option>
                    <option value="shared">🏠 Shared splits</option>
                  </select>
                </div>
              </div>

              {/* Installment custom counters */}
              {editType === 'installment' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200/55 rounded-2xl">
                  <div className="space-y-1">
                    <label className="text-slate-500 block font-bold">Total Insts</label>
                    <input
                      type="number"
                      value={editTotalPayments}
                      onChange={(e) => setEditTotalPayments(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-500 block font-bold">Remaining payments</label>
                    <input
                      type="number"
                      value={editRemainingPayments}
                      min={0}
                      max={editTotalPayments}
                      onChange={(e) => setEditRemainingPayments(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1">
                <label className="text-slate-700 block font-bold">Notes / Special Conditions</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="Notes about limits, rules etc."
                  className="w-full h-14 p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium leading-relaxed"
                />
              </div>

              {/* Completed checkbox toggle */}
              <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl">
                <input
                  type="checkbox"
                  id="mark-completed-toggle"
                  checked={editIsArchived}
                  onChange={(e) => setEditIsArchived(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 accent-emerald-500 rounded"
                />
                <label htmlFor="mark-completed-toggle" className="text-[11px] font-bold text-slate-700 cursor-pointer select-none">
                  Mark as fully closed / Completed & Archive 🏆
                </label>
              </div>

              {/* Danger Delete Option button */}
              <div className="pt-2 border-t border-slate-105 mt-2 space-y-3">
                {isConfirmingDelete ? (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row justify-between items-center gap-3 animate-fadeIn">
                    <span className="text-xs font-extrabold text-rose-700 font-sans block text-center sm:text-left">
                      Permanently delete this bill? This cannot be undone.
                    </span>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsConfirmingDelete(false)}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-extrabold"
                      >
                        No, Keep
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteAction}
                        className="flex-1 sm:flex-none px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-extrabold shadow-sm active:scale-95 transition"
                      >
                        Yes, Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-between items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsConfirmingDelete(true)}
                      className="px-4 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold flex items-center gap-1.5 transition active:scale-95"
                    >
                      <Trash2 size={13} />
                      <span>Delete Bill</span>
                    </button>

                    <div className="flex items-center gap-2 text-xs font-bold font-sans">
                      <button
                        type="button"
                        onClick={() => setEditingBill(null)}
                        className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm flex items-center gap-1"
                      >
                        <Save size={13} />
                        <span>Save Bill</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}

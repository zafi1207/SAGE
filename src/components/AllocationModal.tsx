import React, { useState, useEffect } from 'react';
import { X, Sparkles, Check, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';
import { User, Bill, SuggestedAllocation } from '../types';
import { formatRupiah } from '../lib/utils';
import { calculateRamaAllocation, calculateNadiyaAllocation } from '../lib/engines';

interface AllocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  activeUnpaidBills: Bill[];
  currentDate: string;
  kosRemainingThisMonth: number;
  onApplyAllocation: (allocation: SuggestedAllocation) => void;
  onLogOjolExtra?: (amount: number, description: string) => void;
}

export default function AllocationModal({
  isOpen,
  onClose,
  user,
  activeUnpaidBills,
  currentDate,
  kosRemainingThisMonth,
  onApplyAllocation,
  onLogOjolExtra
}: AllocationModalProps) {
  const [incomeAmount, setIncomeAmount] = useState<number>(
    user.id === 'rama' ? user.monthlySalary : 1500000
  );
  const [description, setDescription] = useState<string>(
    user.id === 'rama' ? 'Monthly Salary' : 'Weekly Paycheck'
  );
  
  // Custom mode to support Rama Ojol
  const [isOjolMode, setIsOjolMode] = useState<boolean>(false);
  
  // Allocated state
  const [allocatedLiving, setAllocatedLiving] = useState<number>(0);
  const [allocatedLaundry, setAllocatedLaundry] = useState<number>(0);
  const [allocatedKos, setAllocatedKos] = useState<number>(0);
  const [allocatedBills, setAllocatedBills] = useState<number>(0);
  const [allocatedSavings, setAllocatedSavings] = useState<number>(0);
  const [allocatedFree, setAllocatedFree] = useState<number>(0);

  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  // Auto-calculate suggested allocation whenever amount changes
  useEffect(() => {
    if (isOpen) {
      handleCalculate();
    }
  }, [incomeAmount, isOjolMode, isOpen]);

  const handleCalculate = () => {
    let sugg: SuggestedAllocation;
    
    if (user.id === 'rama') {
      if (isOjolMode) {
        // Ojol is raw extra cash, goes directly to active bills/kos or free spending
        sugg = {
          userId: 'rama',
          incomeAmount,
          date: currentDate,
          living: 0,
          laundry: 0,
          fuel: 0,
          bills: Math.min(incomeAmount, 100000), // optional default suggestions
          kos: 0,
          savings: 0,
          free: incomeAmount
        };
      } else {
        sugg = calculateRamaAllocation(
          incomeAmount,
          user,
          activeUnpaidBills,
          currentDate,
          kosRemainingThisMonth
        );
      }
    } else {
      // Nadiya weekly allocations
      sugg = calculateNadiyaAllocation(
        incomeAmount,
        user,
        activeUnpaidBills,
        currentDate,
        kosRemainingThisMonth
      );
    }

    setAllocatedLiving(sugg.living);
    setAllocatedLaundry(sugg.laundry);
    setAllocatedKos(sugg.kos);
    setAllocatedBills(sugg.bills);
    setAllocatedSavings(sugg.savings);
    setAllocatedFree(sugg.free);
    setIsCalculated(true);
  };

  // Adjust sliders/inputs dynamically ensuring sum remains exact
  const handleAdjustValue = (category: 'living' | 'laundry' | 'kos' | 'bills' | 'savings' | 'free', newValue: number) => {
    // Determine free space
    let oldVal = 0;
    if (category === 'living') oldVal = allocatedLiving;
    else if (category === 'laundry') oldVal = allocatedLaundry;
    else if (category === 'kos') oldVal = allocatedKos;
    else if (category === 'bills') oldVal = allocatedBills;
    else if (category === 'savings') oldVal = allocatedSavings;
    else if (category === 'free') oldVal = allocatedFree;

    const diff = newValue - oldVal;

    // Adjust other category (prefer Free Spending as buffer first)
    if (category === 'free') {
      // If user is directly modifying free spending, adjust Living Fund instead
      if (user.id === 'nadiya') {
        setAllocatedFree(newValue);
        setAllocatedLiving(Math.max(0, allocatedLiving - diff));
      } else {
        setAllocatedFree(newValue);
        setAllocatedBills(Math.max(0, allocatedBills - diff));
      }
    } else {
      // Adjust Free spending
      if (allocatedFree >= diff) {
        if (category === 'living') setAllocatedLiving(newValue);
        else if (category === 'laundry') setAllocatedLaundry(newValue);
        else if (category === 'kos') setAllocatedKos(newValue);
        else if (category === 'bills') setAllocatedBills(newValue);
        else if (category === 'savings') setAllocatedSavings(newValue);
        
        setAllocatedFree(allocatedFree - diff);
      } else {
        // If free spending can't buffer, prevent adjustment or hard cap
        const possibleNewVal = oldVal + allocatedFree;
        if (category === 'living') setAllocatedLiving(possibleNewVal);
        else if (category === 'laundry') setAllocatedLaundry(possibleNewVal);
        else if (category === 'kos') setAllocatedKos(possibleNewVal);
        else if (category === 'bills') setAllocatedBills(possibleNewVal);
        else if (category === 'savings') setAllocatedSavings(possibleNewVal);
        
        setAllocatedFree(0);
      }
    }
  };

  if (!isOpen) return null;

  const totalAllocated = 
    allocatedLiving + 
    allocatedLaundry + 
    allocatedKos + 
    allocatedBills + 
    allocatedSavings + 
    allocatedFree;

  const handleApply = () => {
    if (isOjolMode && user.id === 'rama' && onLogOjolExtra) {
      onLogOjolExtra(incomeAmount, description);
      onClose();
      return;
    }

    onApplyAllocation({
      userId: user.id,
      incomeAmount,
      date: currentDate,
      living: allocatedLiving,
      laundry: allocatedLaundry,
      fuel: user.settings.fuelAmount,
      bills: allocatedBills,
      kos: allocatedKos,
      savings: allocatedSavings,
      free: allocatedFree
    });
    onClose();
  };

  const isSavingsEnabled = new Date(currentDate) >= new Date('2026-08-01');

  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl border border-slate-200/50 overflow-hidden max-h-[92vh] flex flex-col animate-scaleUp">
        
        {/* Header */}
        <div className="p-5 bg-slate-50/50 border-b border-slate-100/80 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded-full">
              <Sparkles size={18} />
            </div>
            <div>
              <h3 className="font-extrabold text-[#0f172a] text-md font-display">Add Income & Allocation Planner</h3>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-[9px] px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-bold uppercase tracking-wider font-mono">
                  {user.id.toUpperCase()}
                </span>
                <span className="text-[10px] text-slate-400 font-mono font-medium">{user.name}</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 active:scale-95 text-slate-400 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Modal Form Content */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          
          {/* Rama Special Mode: Ojol Extra Income Toggle */}
          {user.id === 'rama' && (
            <div className="flex bg-slate-100/80 p-1 rounded-full gap-1 border border-slate-200/45">
              <button
                type="button"
                onClick={() => {
                  setIsOjolMode(false);
                  setIncomeAmount(user.monthlySalary);
                  setDescription('Monthly Salary');
                }}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                  !isOjolMode ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                💼 Monthly Salary
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOjolMode(true);
                  setIncomeAmount(150000);
                  setDescription('Ojol Side Hustle');
                }}
                className={`flex-1 py-2 rounded-full text-xs font-bold transition-all duration-200 ${
                  isOjolMode ? 'bg-white text-[#0f172a] shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                🏍 Ojol Side Hustle
              </button>
            </div>
          )}

          {/* Amount inputs */}
          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider font-mono block">INCOMING CASH AMOUNT</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-extrabold text-slate-450 text-slate-400 text-sm font-mono">Rp</span>
              <input
                type="number"
                value={incomeAmount || ''}
                onChange={(e) => setIncomeAmount(Number(e.target.value))}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-2xl font-extrabold text-[#0f172a] text-lg focus:outline-none focus:border-[#0f172a] transition-all font-mono"
                placeholder="e.g. 1500000"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-extrabold text-slate-500 uppercase tracking-wider font-mono block">DESCRIPTION / LABEL</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-2xl text-xs font-semibold text-[#0f172a] focus:outline-none focus:border-[#0f172a] transition-all"
              placeholder="Source description"
            />
          </div>

          {/* Suggested Allocation Breakdown Card */}
          {isCalculated && !isOjolMode && (
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 block uppercase tracking-wider font-mono">
                  Suggested Allocation Projections
                </span>
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full font-mono font-bold">
                  SAGE ALLOCATION ENGINE
                </span>
              </div>

              <div className="bg-slate-50/50 rounded-3xl p-4 border border-slate-200/60 space-y-4">
                
                {/* 1. Laundry Wallet (only if Nadiya) */}
                {user.id === 'nadiya' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-700 font-bold">
                      <span>🧺 Laundry Reserve (2 weeks)</span>
                      <span className="font-mono text-slate-900 font-extrabold">{formatRupiah(allocatedLaundry)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={incomeAmount}
                      step={10000}
                      value={allocatedLaundry}
                      onChange={(e) => handleAdjustValue('laundry', Number(e.target.value))}
                      className="w-full accent-[#0f172a] h-1.5 bg-slate-200 rounded-md cursor-ew-resize"
                    />
                  </div>
                )}

                {/* 2. Living Fund (only if Nadiya) */}
                {user.id === 'nadiya' && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs text-slate-700 font-bold pb-0.5">
                      <span className="flex items-center gap-1">
                        🍜 Living Fund 
                        <span className="text-[10px] px-2 py-0.5 font-bold text-slate-500 bg-slate-100 rounded-full">
                          Food & Living
                        </span>
                      </span>
                      <span className="font-mono text-slate-900 font-extrabold">{formatRupiah(allocatedLiving)}</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={incomeAmount}
                      step={10000}
                      value={allocatedLiving}
                      onChange={(e) => handleAdjustValue('living', Number(e.target.value))}
                      className="w-full accent-amber-500 h-1.5 bg-slate-200 rounded-md cursor-ew-resize"
                    />
                  </div>
                )}

                {/* 3. Bills (Installments & Due Bills) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-700 font-bold">
                    <span>💳 Bills Safe Deposit</span>
                    <span className="font-mono text-slate-900 font-extrabold">{formatRupiah(allocatedBills)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={incomeAmount}
                    step={10000}
                    value={allocatedBills}
                    onChange={(e) => handleAdjustValue('bills', Number(e.target.value))}
                    className="w-full accent-rose-500 h-1.5 bg-slate-200 rounded-md cursor-ew-resize"
                  />
                  <span className="text-[9px] text-slate-400 block font-mono font-medium">
                     Unpaid active monthly bills target secure. Only spent when bill is paid.
                  </span>
                </div>

                {/* 4. Kos (Shared rent portion) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-700 font-bold">
                    <span>🏠 Rent (Kos shared split)</span>
                    <span className="font-mono text-slate-900 font-extrabold">{formatRupiah(allocatedKos)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={incomeAmount}
                    step={10000}
                    value={allocatedKos}
                    onChange={(e) => handleAdjustValue('kos', Number(e.target.value))}
                    className="w-full accent-emerald-500 h-1.5 bg-slate-200 rounded-md cursor-ew-resize"
                  />
                </div>

                {/* 5. Savings (If applicable) */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-700 font-bold">
                    <span>🐖 Savings Goals {isSavingsEnabled ? '⚡' : '🔒'}</span>
                    <span className="font-mono text-slate-900 font-extrabold">{formatRupiah(allocatedSavings)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={incomeAmount}
                    step={10000}
                    value={allocatedSavings}
                    disabled={!isSavingsEnabled}
                    onChange={(e) => handleAdjustValue('savings', Number(e.target.value))}
                    className="w-full accent-[#10b981] h-1.5 bg-slate-200 rounded-md cursor-ew-resize disabled:opacity-40"
                  />
                  {!isSavingsEnabled && (
                    <span className="text-[9px] text-slate-400 block font-mono font-medium">
                      Auto-unlocks after August 1st, 2026. Prioritize current high-risk debt bills first.
                    </span>
                  )}
                </div>

                {/* 6. Free Spending */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-700 font-bold pb-0.5">
                    <span>🛍 Free Spending (Safe remainder)</span>
                    <span className="font-mono text-slate-900 font-extrabold">{formatRupiah(allocatedFree)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={incomeAmount}
                    step={10000}
                    value={allocatedFree}
                    onChange={(e) => handleAdjustValue('free', Number(e.target.value))}
                    className="w-full accent-sky-500 h-1.5 bg-slate-200 rounded-md cursor-ew-resize"
                  />
                  <span className="text-[9px] text-slate-400 block font-medium">
                    Fully safe to spend on entertainment, food, or general lifestyle!
                  </span>
                </div>
              </div>

              {/* Total checking */}
              <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex justify-between items-center text-xs">
                <span className="font-extrabold text-emerald-900">Total Accounted For:</span>
                <span className="font-mono font-black text-emerald-950 text-sm">{formatRupiah(totalAllocated)}</span>
              </div>
            </div>
          )}

          {isOjolMode && user.id === 'rama' && (
            <div className="p-4 bg-emerald-50 border border-emerald-200/30 rounded-3xl text-xs space-y-2 text-emerald-900 animate-fadeIn">
              <div className="flex gap-2 items-center font-extrabold text-emerald-950">
                <AlertCircle size={16} className="text-emerald-700" />
                <span>Ojol Extra Income Cash-In</span>
              </div>
              <p className="leading-relaxed font-semibold">
                This counts as extra gig income. It will go directly toward reducing the <strong>Extra Income Needed</strong> target for this month's bills and increases your actual cash balance.
              </p>
            </div>
          )}
        </div>

        {/* Action button */}
        <div className="p-5 bg-slate-50 border-t border-slate-100/80 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-[#0f172a] text-xs font-bold rounded-full transition-all duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={incomeAmount <= 0}
            className="flex-1 py-3 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-full transition-all duration-200 disabled:opacity-45 flex items-center justify-center gap-1.5 shadow-sm active:scale-[0.98]"
          >
            <Check size={14} />
            <span>Apply Allocation</span>
          </button>
        </div>

      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, RefreshCw, RotateCcw, AlertTriangle } from 'lucide-react';
import { formatHumanDate, daysBetween } from '../lib/utils';
import { User } from '../types';

interface SimulationBannerProps {
  currentDate: string;
  users: User[];
  onForecastShift: (value: number | 'today') => void;
  onNextMonthReset: () => void;
}

export default function SimulationBanner({
  currentDate,
  users,
  onForecastShift,
  onNextMonthReset
}: SimulationBannerProps) {
  const rama = users.find(u => u.id === 'rama');
  const nadiya = users.find(u => u.id === 'nadiya');

  const daysToRamaPayday = rama ? daysBetween(currentDate, rama.nextPaydayDate) : 0;
  const daysToNadiyaPayday = nadiya ? daysBetween(currentDate, nadiya.nextPaydayDate) : 0;

  // Check if savings is automatically enabled (after 01 Aug 2026)
  const isSavingsEnabled = new Date(currentDate) >= new Date('2026-08-01');

  return (
    <div id="simulated-time-banner" className="bg-[#0f172a] text-white rounded-[2rem] shadow-xl border border-slate-805 border-slate-800 p-5 mb-6 transition-all">
      <div className="space-y-4">
        {/* Top Header Row with Time view */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-500/15 rounded-full text-emerald-400 border border-emerald-500/10">
            <Calendar size={18} />
          </div>
          <div>
            <div className="text-[9px] text-[#00E676] font-mono font-bold tracking-widest uppercase mb-0.5">
              FORECAST COMPANION ACTIVE
            </div>
            <div className="font-extrabold text-sm flex items-center gap-2 font-display">
              <span>{formatHumanDate(currentDate, 'en')}</span>
              <span className="text-[10px] px-2.5 py-0.5 bg-slate-800 rounded-full text-slate-300 font-mono font-bold">
                {currentDate}
              </span>
            </div>
          </div>
        </div>

        {/* Forecast Controls Interface */}
        <div className="space-y-2.5 pt-1.5 border-t border-slate-800/80">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-extrabold">
            Forecast Controls
          </div>
          
          {/* Main Day-by-Day Controls */}
          <div className="grid grid-cols-3 gap-2">
            <button
              id="forecast-prev-day"
              onClick={() => onForecastShift(-1)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-755 text-slate-200 hover:text-white border border-slate-700/50 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95"
              title="Step backward one day"
            >
              <ChevronLeft size={14} />
              <span>Prev Day</span>
            </button>

            <button
              id="forecast-today"
              onClick={() => onForecastShift('today')}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-755 text-[#00E676] border border-slate-700/50 rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95"
              title="Return immediately to actual start date 2026-06-11"
            >
              <RotateCcw size={12} />
              <span>Today</span>
            </button>

            <button
              id="forecast-next-day"
              onClick={() => onForecastShift(1)}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 border border-emerald-650"
              title="Step forward one day"
            >
              <span>Next Day</span>
              <ChevronRight size={14} />
            </button>
          </div>

          {/* Jump & Reset Actions */}
          <div className="flex gap-2 justify-between items-center text-xs flex-wrap">
            <div className="flex gap-1.5">
              <button
                id="forecast-plus-7"
                onClick={() => onForecastShift(7)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 text-slate-200 rounded-full text-[11px] font-bold transition duration-150 active:scale-95"
              >
                +7 Days
              </button>
              <button
                id="forecast-plus-30"
                onClick={() => onForecastShift(30)}
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-350 text-slate-200 rounded-full text-[11px] font-bold transition duration-150 active:scale-95"
              >
                +30 Days
              </button>
            </div>

            <button
              id="forecast-reset-to-today"
              onClick={() => onForecastShift('today')}
              className="text-[11px] font-bold text-slate-400 hover:text-white flex items-center gap-1"
              title="Revert to today"
            >
              Reset To Today
            </button>
          </div>
        </div>

        {/* Countdown paydays footer */}
        <div className="pt-2 border-t border-slate-800/40 grid grid-cols-2 gap-3 text-[10px] font-mono text-slate-400">
          <div>
            <span className="block opacity-75">Rama Payday:</span>
            <span className="font-extrabold text-slate-250 text-slate-200 font-sans text-xs">
              {daysToRamaPayday === 0 ? 'Today!' : `${daysToRamaPayday}d remaining (${rama?.nextPaydayDate})`}
            </span>
          </div>
          <div>
            <span className="block opacity-75">Nadiya Payday:</span>
            <span className="font-extrabold text-slate-250 text-slate-200 font-sans text-xs">
              {daysToNadiyaPayday === 0 ? 'Today!' : `${daysToNadiyaPayday}d remaining (${nadiya?.nextPaydayDate})`}
            </span>
          </div>
        </div>

        {/* Dynamic Reset Monthly Action */}
        <div className="pt-1 flex items-center justify-between gap-2.5">
          <span className="text-[9px] font-mono text-slate-500 font-bold uppercase">
            Auto Savings: {isSavingsEnabled ? 'ACTIVE (>= AUG)' : 'INACTIVE'}
          </span>
          <button
            onClick={onNextMonthReset}
            className="px-3.5 py-1.5 bg-indigo-950 hover:bg-indigo-900 border border-indigo-900/60 text-indigo-300 hover:text-indigo-200 text-[10px] font-mono font-bold rounded-full flex items-center gap-1 transition-all"
          >
            <RefreshCw size={10} />
            <span>Trigger Monthly Cycle Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
}

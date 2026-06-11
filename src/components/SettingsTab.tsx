import React, { useState, useRef } from 'react';
import { Settings, ShieldAlert, Languages, BookOpen, Check, Download, Upload, Trash2, Database } from 'lucide-react';
import { User, Bill, Transaction, UserSettings } from '../types';
import { formatRupiah } from '../lib/utils';

interface SettingsTabProps {
  users: User[];
  bills: Bill[];
  transactions: Transaction[];
  currentDate: string;
  onUpdateSettings: (userId: 'rama' | 'nadiya', settings: UserSettings) => void;
  onResetAllData: () => void;
  onImportBackup: (backup: { users: User[]; bills: Bill[]; transactions: Transaction[]; currentDate: string }) => void;
}

export default function SettingsTab({
  users,
  bills,
  transactions,
  currentDate,
  onUpdateSettings,
  onResetAllData,
  onImportBackup
}: SettingsTabProps) {
  const [activeSubUser, setActiveSubUser] = useState<'rama' | 'nadiya'>('rama');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Backup and safer reset state
  const [resetInput, setResetInput] = useState('');
  const [pasteBackupText, setPasteBackupText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const rama = users.find(u => u.id === 'rama');
  const nadiya = users.find(u => u.id === 'nadiya');
  const targetUser = activeSubUser === 'rama' ? rama : nadiya;

  // Local setting states
  const [food, setFood] = useState<number>(targetUser?.settings.foodPerDay || 50000);
  const [laundry, setLaundry] = useState<number>(targetUser?.settings.laundryAmount || 50000);
  const [fuel, setFuel] = useState<number>(targetUser?.settings.fuelAmount || 40000);
  const [lang, setLang] = useState<'en' | 'id'>(targetUser?.settings.language || 'en');

  // When active user tab switches, trigger state refresh
  React.useEffect(() => {
    if (targetUser) {
      setFood(targetUser.settings.foodPerDay);
      setLaundry(targetUser.settings.laundryAmount);
      setFuel(targetUser.settings.fuelAmount);
      setLang(targetUser.settings.language);
    }
  }, [activeSubUser, users]);

  const handleSave = () => {
    if (!targetUser) return;
    
    onUpdateSettings(activeSubUser, {
      foodPerDay: food,
      laundryAmount: laundry,
      fuelAmount: fuel,
      language: lang
    });

    setSuccessMsg(`Successfully saved settings for ${targetUser.name}!`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // EXPORT BACKUP ROOT
  const handleExportBackup = () => {
    try {
      const backupPayload = {
        users,
        bills,
        transactions,
        currentDate,
        exportedAt: new Date().toISOString()
      };
      
      const fileData = JSON.stringify(backupPayload, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(fileData);
      
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataUri);
      downloadAnchor.setAttribute('download', `sage_backup_${currentDate}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      setSuccessMsg('Backup downloaded successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      alert('Failed to generate backup file.');
    }
  };

  // FILE IMPORT BACKUP
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const textStr = event.target?.result as string;
        const parsed = JSON.parse(textStr);
        
        if (parsed.users && parsed.bills && parsed.transactions && parsed.currentDate) {
          const proceed = window.confirm('Importing this file will OVERWRITE all your existing local data. Proceed?');
          if (proceed) {
            onImportBackup({
              users: parsed.users,
              bills: parsed.bills,
              transactions: parsed.transactions,
              currentDate: parsed.currentDate
            });
          }
        } else {
          alert('Invalid backup structure. The file must match Sage exported schema.');
        }
      } catch (err) {
        alert('Invalid JSON file format.');
      }
    };
    reader.readAsText(file);
    // Reset file input value
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // PASTE IMPORT BACKUP
  const handlePasteImport = () => {
    if (!pasteBackupText.trim()) return;
    try {
      const parsed = JSON.parse(pasteBackupText.trim());
      if (parsed.users && parsed.bills && parsed.transactions && parsed.currentDate) {
        const proceed = window.confirm('Importing this backup will OVERWRITE all your current Sage data. Proceed?');
        if (proceed) {
          onImportBackup({
            users: parsed.users,
            bills: parsed.bills,
            transactions: parsed.transactions,
            currentDate: parsed.currentDate
          });
          setPasteBackupText('');
        }
      } else {
        alert('Invalid backup schema.');
      }
    } catch (err) {
      alert('Failed to parse backup text. Please ensure it is valid Sage backup JSON.');
    }
  };

  // RESET PROTECTION ENGINE
  const handleResetAction = () => {
    if (resetInput.trim() !== 'RESET') {
      alert('Invalid confirmation string. Please type RESET in all caps.');
      return;
    }
    
    onResetAllData();
    setResetInput('');
  };

  return (
    <div className="space-y-6 flex-1 animate-fadeIn">
      
      {/* 1. Companion setting variables */}
      <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-5 space-y-5">
        <div className="flex justify-between items-center">
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold text-[#0f172a] uppercase font-display tracking-wide">Companion Settings</h3>
            <p className="text-[10px] text-slate-450 text-slate-400 font-mono">Tweak living cost variables for both accounts</p>
          </div>
          <Settings className="text-slate-400 font-mono" size={18} />
        </div>

        <div className="flex bg-slate-100 p-1 rounded-full border border-slate-200/20">
          <button
            onClick={() => setActiveSubUser('rama')}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              activeSubUser === 'rama' ? 'bg-[#0f172a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Rama Settings
          </button>
          <button
            onClick={() => setActiveSubUser('nadiya')}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold transition-all duration-200 ${
              activeSubUser === 'nadiya' ? 'bg-[#0f172a] text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            Nadiya Settings
          </button>
        </div>

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-150 text-emerald-800 text-xs rounded-2xl font-semibold text-center animate-fadeIn">
            ✓ {successMsg}
          </div>
        )}

        {targetUser && (
          <div className="space-y-4 text-xs">
            {/* Food Day Rate */}
            <div className="space-y-1.5">
              <label className="text-[#0f172a] font-bold block">🍜 Food rate per day (for two people)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">Rp</span>
                <input
                  type="number"
                  value={food || ''}
                  onChange={(e) => setFood(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-extrabold font-mono focus:outline-none focus:border-[#0f172a] focus:bg-white transition"
                />
              </div>
              <span className="text-[10px] text-slate-400 block font-mono">
                Current default is {formatRupiah(50000)}/day.
              </span>
            </div>

            {/* Laundry Rate */}
            <div className="space-y-1.5">
              <label className="text-[#0f172a] font-bold block">🧺 Laundry amount (every 2 weeks)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">Rp</span>
                <input
                  type="number"
                  value={laundry || ''}
                  onChange={(e) => setLaundry(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-extrabold font-mono focus:outline-none focus:border-[#0f172a] focus:bg-white transition"
                />
              </div>
              <span className="text-[10px] text-slate-400 block font-mono">
                Current default is {formatRupiah(50000)} every 2 weeks.
              </span>
            </div>

            {/* Fuel Rate (only for Nadiya or editable) */}
            <div className="space-y-1.5">
              <label className="text-[#0f172a] font-bold block">🚗 Fuel cost (per week)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-slate-400 font-mono">Rp</span>
                <input
                  type="number"
                  value={fuel || ''}
                  onChange={(e) => setFuel(Number(e.target.value))}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 font-extrabold font-mono focus:outline-none focus:border-[#0f172a] focus:bg-white transition"
                />
              </div>
              <span className="text-[10px] text-slate-400 block font-mono">
                Used to reserve Nadiya's weekly fuel. Current default is {formatRupiah(40000)}/week.
              </span>
            </div>

            {/* Language Locale Selector */}
            <div className="space-y-1.5">
              <label className="text-[#0f172a] font-bold block flex items-center gap-1.5">
                <Languages size={14} className="text-slate-500" />
                <span>Language Option</span>
              </label>
              <select
                value={lang}
                onChange={(e) => setLang(e.target.value as any)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-[#0f172a] font-semibold font-sans focus:outline-none"
              >
                <option value="en">English (US)</option>
                <option value="id">Bahasa Indonesia (ID)</option>
              </select>
            </div>

            <button
              onClick={handleSave}
              className="w-full py-3 bg-slate-950 hover:bg-slate-800 text-white rounded-full text-xs font-bold shadow-sm transition active:scale-[0.98] flex items-center justify-center gap-1.5 mt-2"
            >
              <Check size={14} />
              <span>Update variables for {targetUser.name}</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Sleek Data Management Backup & Control Suite */}
      <div className="bg-white rounded-[2rem] border border-slate-200 p-5 space-y-4 shadow-sm">
        <div className="flex items-center gap-2">
          <Database size={16} className="text-[#00E676]" />
          <h4 className="text-xs font-extrabold text-[#0f172a] uppercase tracking-wider font-mono">
            Data Management
          </h4>
        </div>

        <p className="text-[11px] text-slate-500 font-semibold leading-relaxed">
          Secure or migrate your Sage offline companion state. Export backups to local JSON files or paste and import backups back instantly.
        </p>

        {/* Data Options */}
        <div className="grid grid-cols-2 gap-2">
          {/* Export Button */}
          <button
            onClick={handleExportBackup}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition active:scale-95 text-center group"
          >
            <Download size={18} className="text-emerald-600 mb-1.5 group-hover:scale-110 transition" />
            <span className="text-xs font-extrabold text-slate-800 block">Export Backup</span>
            <span className="text-[9px] text-slate-400 block font-mono mt-0.5">Save locale JSON</span>
          </button>

          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex flex-col items-center justify-center p-4 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-slate-100 transition active:scale-95 text-center group"
          >
            <Upload size={18} className="text-indigo-600 mb-1.5 group-hover:scale-110 transition" />
            <span className="text-xs font-extrabold text-slate-800 block">Upload JSON</span>
            <span className="text-[9px] text-slate-400 block font-mono mt-0.5">Restore from file</span>
          </button>
        </div>

        {/* Secret input drawer for JSON file */}
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Alternative Paste backup block */}
        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs">
          <label className="text-slate-500 block font-semibold text-[10px] uppercase font-mono">
            Paste Companion Backup String:
          </label>
          <textarea
            value={pasteBackupText}
            onChange={(e) => setPasteBackupText(e.target.value)}
            placeholder="Paste Sage backup JSON text code string here..."
            className="w-full h-14 p-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-[9px] text-slate-700 focus:outline-none focus:border-slate-800"
          />
          <button
            onClick={handlePasteImport}
            disabled={!pasteBackupText.trim()}
            className="w-full py-2 bg-slate-900 disabled:opacity-40 hover:bg-slate-800 text-white rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 shadow-sm font-sans"
          >
            <Upload size={13} />
            <span>Restore From Backup String</span>
          </button>
        </div>
      </div>

      {/* 3. Philosophy Handbook panel */}
      <div className="p-5 bg-amber-500/5 border border-amber-200/40 rounded-3xl space-y-3">
        <div className="flex gap-2 items-center">
          <BookOpen className="text-amber-600 shrink-0" size={17} />
          <h4 className="text-xs font-extrabold text-amber-900 uppercase tracking-wider font-mono">Philosophy of Sage</h4>
        </div>
        <p className="text-xs text-amber-800/95 leading-relaxed font-semibold">
          Sage represents <strong>"Quiet & Calm Debt Management"</strong>. We believe in mapping allocations before cash is ever spent. Instead of retroactively tracking regretful leaks, we secure future rent, bills, and daily food reserves, leaving a clear <strong>Safe To Use</strong> budget.
        </p>
      </div>

      {/* 4. Danger Zone: reset everything requiring confirmation string */}
      <div className="bg-rose-50/45 p-5 border border-rose-200/60 rounded-[2rem] space-y-3.5">
        <h4 className="text-xs font-extrabold text-rose-800 block flex items-center gap-1.5 uppercase font-mono tracking-wider">
          <ShieldAlert size={15} />
          <span>Danger Zone: Revert Database</span>
        </h4>
        <p className="text-[11px] text-rose-700/90 font-semibold leading-relaxed">
          This resets Sage back to factory launch data. All logged wallets, custom setting rates, and bill payments will be permanently deleted.
        </p>

        {/* Protection text field */}
        <div className="space-y-2 text-xs">
          <span className="text-slate-500 block font-semibold text-[10px] uppercase font-mono">
            Type <strong className="text-rose-600 select-all font-bold">RESET</strong> to unlock purge:
          </span>
          <input
            type="text"
            value={resetInput}
            onChange={(e) => setResetInput(e.target.value)}
            placeholder="Type RESET here"
            className="w-full px-3 py-2.5 bg-white border border-rose-200 rounded-xl text-rose-800 font-extrabold font-mono focus:outline-none focus:border-rose-400 uppercase tracking-widest text-[#0f172a]"
          />
          
          <button
            onClick={handleResetAction}
            disabled={resetInput !== 'RESET'}
            className="w-full py-2.5 bg-rose-600 disabled:opacity-40 hover:bg-rose-700 text-white font-bold rounded-xl text-xs tracking-wide shadow-sm flex items-center justify-center gap-1.5 transition-all"
          >
            <Trash2 size={13} />
            <span>Purge all Sage Databases</span>
          </button>
        </div>
      </div>
    </div>
  );
}

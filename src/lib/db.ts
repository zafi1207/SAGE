import { User, Bill, Transaction, UserID } from '../types';

const DB_NAME = 'sage_pwa_db';
const DB_VERSION = 2;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('users')) {
        db.createObjectStore('users', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('bills')) {
        db.createObjectStore('bills', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('transactions')) {
        db.createObjectStore('transactions', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('system')) {
        db.createObjectStore('system', { keyPath: 'key' });
      }
    };
  });
}

// Preloaded initial data
export const INITIAL_USERS: User[] = [
  {
    id: 'rama',
    name: 'Rama',
    incomeType: 'monthly',
    monthlySalary: 4500000,
    currentBalance: 0,
    savingsBalance: 0,
    livingFundBalance: 0,
    freeSpendingBalance: 0,
    kosContributionBalance: 0,
    laundryFundBalance: 0,
    nextPaydayDate: '2026-06-28', // Rama gets paid on the 28th of the month
    settings: {
      foodPerDay: 50000,
      laundryAmount: 50000,
      fuelAmount: 40000,
      language: 'en'
    }
  },
  {
    id: 'nadiya',
    name: 'Nadiya',
    incomeType: 'weekly',
    monthlySalary: 0, // Weekly income is irregular/per-event
    currentBalance: 0,
    savingsBalance: 0,
    livingFundBalance: 0,
    freeSpendingBalance: 0,
    kosContributionBalance: 0,
    laundryFundBalance: 0,
    nextPaydayDate: '2026-06-14', // 3 days from starting simulated date (2026-06-11)
    settings: {
      foodPerDay: 50000,
      laundryAmount: 50000,
      fuelAmount: 40000,
      language: 'en'
    }
  }
];

export const INITIAL_BILLS: Bill[] = [
  // --- RAMA's BILLS ---
  {
    id: 'rama-spinjam-1',
    name: 'SPINJAM #1',
    userId: 'rama',
    billType: 'installment',
    amount: 246000,
    dueDay: 28,
    priority: 'high',
    isArchived: false,
    remainingPayments: 3,
    totalPayments: 3,
    installments: [
      { dueDate: '2026-07-28', amount: 246000, isPaid: false },
      { dueDate: '2026-08-28', amount: 246000, isPaid: false },
      { dueDate: '2026-09-28', amount: 246000, isPaid: false }
    ]
  },
  {
    id: 'rama-spinjam-2',
    name: 'SPINJAM #2',
    userId: 'rama',
    billType: 'installment',
    amount: 187000,
    dueDay: 7,
    priority: 'high',
    isArchived: false,
    remainingPayments: 1,
    totalPayments: 1,
    installments: [
      { dueDate: '2026-07-07', amount: 187000, isPaid: false }
    ]
  },
  {
    id: 'rama-spinjam-3',
    name: 'SPINJAM #3',
    userId: 'rama',
    billType: 'installment',
    amount: 187000,
    dueDay: 17,
    priority: 'high',
    isArchived: false,
    remainingPayments: 1,
    totalPayments: 1,
    installments: [
      { dueDate: '2026-07-17', amount: 187000, isPaid: false }
    ]
  },
  {
    id: 'rama-spinjam-4',
    name: 'SPINJAM #4',
    userId: 'rama',
    billType: 'installment',
    amount: 82000,
    dueDay: 18,
    priority: 'medium',
    isArchived: false,
    remainingPayments: 4,
    totalPayments: 4,
    installments: [
      { dueDate: '2026-07-18', amount: 82000, isPaid: false },
      { dueDate: '2026-08-18', amount: 82000, isPaid: false },
      { dueDate: '2026-09-18', amount: 82000, isPaid: false },
      { dueDate: '2026-10-18', amount: 82000, isPaid: false }
    ]
  },
  {
    id: 'rama-spinjam-5',
    name: 'SPINJAM #5',
    userId: 'rama',
    billType: 'installment',
    amount: 187000,
    dueDay: 3,
    priority: 'high',
    isArchived: false,
    remainingPayments: 2,
    totalPayments: 2,
    installments: [
      { dueDate: '2026-07-03', amount: 187000, isPaid: false },
      { dueDate: '2026-08-03', amount: 187000, isPaid: false }
    ]
  },
  {
    id: 'rama-spinjam-6',
    name: 'SPINJAM #6',
    userId: 'rama',
    billType: 'installment',
    amount: 187000,
    dueDay: 18,
    priority: 'high',
    isArchived: false,
    remainingPayments: 2,
    totalPayments: 2,
    installments: [
      { dueDate: '2026-07-18', amount: 187000, isPaid: false },
      { dueDate: '2026-08-18', amount: 187000, isPaid: false }
    ]
  },
  {
    id: 'rama-spinjam-7',
    name: 'SPINJAM #7',
    userId: 'rama',
    billType: 'installment',
    amount: 1477000,
    dueDay: 1,
    priority: 'high',
    isArchived: false,
    remainingPayments: 12,
    totalPayments: 12,
    installments: [
      { dueDate: '2026-07-01', amount: 1477000, isPaid: false },
      { dueDate: '2026-08-01', amount: 1477000, isPaid: false },
      { dueDate: '2026-09-01', amount: 1477000, isPaid: false },
      { dueDate: '2026-10-01', amount: 1477000, isPaid: false },
      { dueDate: '2026-11-01', amount: 1477000, isPaid: false },
      { dueDate: '2026-12-01', amount: 1477000, isPaid: false },
      { dueDate: '2027-01-01', amount: 1477000, isPaid: false },
      { dueDate: '2027-02-01', amount: 1477000, isPaid: false },
      { dueDate: '2027-03-01', amount: 1477000, isPaid: false },
      { dueDate: '2027-04-01', amount: 1477000, isPaid: false },
      { dueDate: '2027-05-01', amount: 1477000, isPaid: false },
      { dueDate: '2027-06-01', amount: 1477000, isPaid: false }
    ]
  },
  {
    id: 'rama-atome-1',
    name: 'ATOME (#1)',
    userId: 'rama',
    billType: 'installment',
    amount: 593000,
    dueDay: 26,
    priority: 'medium',
    isArchived: false,
    remainingPayments: 1,
    totalPayments: 1,
    installments: [
      { dueDate: '2026-06-26', amount: 593000, isPaid: false }
    ]
  },
  {
    id: 'rama-atome-2',
    name: 'ATOME (#2)',
    userId: 'rama',
    billType: 'installment',
    amount: 310000,
    dueDay: 26,
    priority: 'medium',
    isArchived: false,
    remainingPayments: 1,
    totalPayments: 1,
    installments: [
      { dueDate: '2026-07-26', amount: 310000, isPaid: false }
    ]
  },
  {
    id: 'rama-cc-travel',
    name: 'CC TRAVEL',
    userId: 'rama',
    billType: 'recurring',
    amount: 150000,
    dueDay: 25,
    priority: 'medium',
    isArchived: false,
    paidMonths: []
  },
  {
    id: 'rama-cc-tokped',
    name: 'CC TOKPED',
    userId: 'rama',
    billType: 'recurring',
    amount: 150000,
    dueDay: 1,
    priority: 'medium',
    isArchived: false,
    paidMonths: []
  },
  {
    id: 'rama-gpaylater',
    name: 'GPAYLATER',
    userId: 'rama',
    billType: 'installment',
    amount: 594000,
    dueDay: 1,
    priority: 'high',
    isArchived: false,
    remainingPayments: 1,
    totalPayments: 1,
    installments: [
      { dueDate: '2026-07-01', amount: 594000, isPaid: false }
    ]
  },
  {
    id: 'rama-spaylater-1',
    name: 'SPAYLATER (#1)',
    userId: 'rama',
    billType: 'installment',
    amount: 267000,
    dueDay: 11,
    priority: 'high',
    isArchived: false,
    remainingPayments: 1,
    totalPayments: 1,
    installments: [
      { dueDate: '2026-07-11', amount: 267000, isPaid: false }
    ]
  },
  {
    id: 'rama-spaylater-2',
    name: 'SPAYLATER (#2)',
    userId: 'rama',
    billType: 'installment',
    amount: 66000,
    dueDay: 11,
    priority: 'medium',
    isArchived: false,
    remainingPayments: 10,
    totalPayments: 10,
    installments: [
      { dueDate: '2026-08-11', amount: 66000, isPaid: false },
      { dueDate: '2026-09-11', amount: 66000, isPaid: false },
      { dueDate: '2026-10-11', amount: 66000, isPaid: false },
      { dueDate: '2026-11-11', amount: 66000, isPaid: false },
      { dueDate: '2026-12-11', amount: 66000, isPaid: false },
      { dueDate: '2027-01-11', amount: 66000, isPaid: false },
      { dueDate: '2027-02-11', amount: 66000, isPaid: false },
      { dueDate: '2027-03-11', amount: 66000, isPaid: false },
      { dueDate: '2027-04-11', amount: 66000, isPaid: false },
      { dueDate: '2027-05-11', amount: 66000, isPaid: false }
    ]
  },
  {
    id: 'rama-motor',
    name: 'MOTOR',
    userId: 'rama',
    billType: 'recurring',
    amount: 835000,
    dueDay: 28,
    priority: 'high',
    isArchived: false,
    paidMonths: []
  },
  {
    id: 'rama-hp',
    name: 'HP RAMA',
    userId: 'rama',
    billType: 'installment',
    amount: 1162000,
    dueDay: 31,
    priority: 'high',
    isArchived: false,
    remainingPayments: 1,
    totalPayments: 1,
    installments: [
      { dueDate: '2026-07-31', amount: 1162000, isPaid: false }
    ]
  },

  // --- NADIYA'S BILLS ---
  {
    id: 'nadiya-spinjam-1',
    name: 'SPINJAM',
    userId: 'nadiya',
    billType: 'installment',
    amount: 657500,
    dueDay: 1,
    priority: 'high',
    isArchived: false,
    remainingPayments: 8,
    totalPayments: 8,
    installments: [
      { dueDate: '2026-07-01', amount: 657500, isPaid: false },
      { dueDate: '2026-08-01', amount: 657500, isPaid: false },
      { dueDate: '2026-09-01', amount: 657500, isPaid: false },
      { dueDate: '2026-10-01', amount: 657500, isPaid: false },
      { dueDate: '2026-11-01', amount: 657500, isPaid: false },
      { dueDate: '2026-12-01', amount: 657500, isPaid: false },
      { dueDate: '2027-01-01', amount: 657500, isPaid: false },
      { dueDate: '2027-02-01', amount: 657500, isPaid: false }
    ]
  },
  {
    id: 'nadiya-spinjam-2',
    name: 'SPINJAM (Future)',
    userId: 'nadiya',
    billType: 'installment',
    amount: 246000,
    dueDay: 28,
    priority: 'medium',
    isArchived: false,
    remainingPayments: 2,
    totalPayments: 2,
    installments: [
      { dueDate: '2026-11-28', amount: 246000, isPaid: false },
      { dueDate: '2026-12-28', amount: 246000, isPaid: false }
    ]
  },
  {
    id: 'nadiya-hp',
    name: 'HP NADIYA',
    userId: 'nadiya',
    billType: 'installment',
    amount: 1195000,
    dueDay: 24,
    priority: 'high',
    isArchived: false,
    remainingPayments: 14,
    totalPayments: 14,
    installments: [
      { dueDate: '2026-07-24', amount: 1195000, isPaid: false },
      { dueDate: '2026-08-24', amount: 1195000, isPaid: false },
      { dueDate: '2026-09-24', amount: 1195000, isPaid: false },
      { dueDate: '2026-10-24', amount: 1195000, isPaid: false },
      { dueDate: '2026-11-24', amount: 1195000, isPaid: false },
      { dueDate: '2026-12-24', amount: 1195000, isPaid: false },
      { dueDate: '2027-01-24', amount: 1195000, isPaid: false },
      { dueDate: '2027-02-24', amount: 1195000, isPaid: false },
      { dueDate: '2027-03-24', amount: 1195000, isPaid: false },
      { dueDate: '2027-04-24', amount: 1195000, isPaid: false },
      { dueDate: '2027-05-24', amount: 1195000, isPaid: false },
      { dueDate: '2027-06-24', amount: 1195000, isPaid: false },
      { dueDate: '2027-07-24', amount: 1195000, isPaid: false },
      { dueDate: '2027-08-24', amount: 1195000, isPaid: false }
    ]
  },
  {
    id: 'nadiya-shopee',
    name: 'SHOPEE',
    userId: 'nadiya',
    billType: 'installment',
    amount: 186000,
    dueDay: 18,
    priority: 'medium',
    isArchived: false,
    remainingPayments: 4,
    totalPayments: 4,
    installments: [
      { dueDate: '2026-07-18', amount: 186000, isPaid: false },
      { dueDate: '2026-08-18', amount: 186000, isPaid: false },
      { dueDate: '2026-09-18', amount: 186000, isPaid: false },
      { dueDate: '2026-10-18', amount: 186000, isPaid: false }
    ]
  },
  {
    id: 'nadiya-tiktok-paylater',
    name: 'TIKTOK PAYLATER',
    userId: 'nadiya',
    billType: 'installment',
    amount: 340600, // starting installment amount
    dueDay: 2,
    priority: 'high',
    isArchived: false,
    remainingPayments: 3,
    totalPayments: 3,
    installments: [
      { dueDate: '2026-07-02', amount: 340600, isPaid: false },
      { dueDate: '2026-08-02', amount: 75936, isPaid: false },
      { dueDate: '2026-09-02', amount: 75936, isPaid: false }
    ]
  },
  {
    id: 'nadiya-gpaylater',
    name: 'GPAYLATER',
    userId: 'nadiya',
    billType: 'installment',
    amount: 320000,
    dueDay: 1,
    priority: 'high',
    isArchived: false,
    remainingPayments: 1,
    totalPayments: 1,
    installments: [
      { dueDate: '2026-07-01', amount: 320000, isPaid: false }
    ]
  },
  {
    id: 'nadiya-spaylater',
    name: 'SPAYLATER',
    userId: 'nadiya',
    billType: 'installment',
    amount: 66000,
    dueDay: 11,
    priority: 'medium',
    isArchived: false,
    remainingPayments: 1,
    totalPayments: 1,
    installments: [
      { dueDate: '2026-07-11', amount: 66000, isPaid: false }
    ]
  },

  // --- SHARED KOS ---
  {
    id: 'shared-kos',
    name: 'Kos',
    userId: 'shared',
    billType: 'recurring',
    amount: 2000000, // Total target is 2.000.000, Split 1M each.
    dueDay: 28,
    priority: 'high',
    isArchived: false,
    paidMonths: []
  }
];

export async function loadInitialData(db: IDBDatabase): Promise<{
  users: User[];
  bills: Bill[];
  transactions: Transaction[];
  currentDate: string;
}> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['users', 'bills', 'transactions', 'system'], 'readwrite');
    
    const usersStore = tx.objectStore('users');
    const billsStore = tx.objectStore('bills');
    const systemStore = tx.objectStore('system');

    // Default System Date
    const dateRequest = systemStore.get('currentDate');
    
    dateRequest.onsuccess = () => {
      if (dateRequest.result) {
        // Data already exists! Load it
        const loadedUsers: User[] = [];
        const loadedBills: Bill[] = [];
        const loadedTransactions: Transaction[] = [];
        let currentDateStr = dateRequest.result.value;

        const uReq = usersStore.getAll();
        uReq.onsuccess = () => {
          loadedUsers.push(...uReq.result);
          
          const bReq = billsStore.getAll();
          bReq.onsuccess = () => {
            loadedBills.push(...bReq.result);
            
            const tReq = tx.objectStore('transactions').getAll();
            tReq.onsuccess = () => {
              loadedTransactions.push(...tReq.result);
              resolve({
                users: loadedUsers,
                bills: loadedBills,
                transactions: loadedTransactions,
                currentDate: currentDateStr
              });
            };
          };
        };
      } else {
        // First Launch: Preload everything!
        INITIAL_USERS.forEach(u => usersStore.put(u));
        INITIAL_BILLS.forEach(b => billsStore.put(b));
        systemStore.put({ key: 'currentDate', value: '2026-06-11' });

        resolve({
          users: INITIAL_USERS,
          bills: INITIAL_BILLS,
          transactions: [],
          currentDate: '2026-06-11'
        });
      }
    };

    dateRequest.onerror = () => reject(dateRequest.error);
  });
}

export async function saveUserToDB(user: User): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('users', 'readwrite');
    const store = tx.objectStore('users');
    const req = store.put(user);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveBillToDB(bill: Bill): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bills', 'readwrite');
    const store = tx.objectStore('bills');
    const req = store.put(bill);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteBillFromDB(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('bills', 'readwrite');
    const store = tx.objectStore('bills');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function addTransactionToDB(txn: Transaction): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    const req = store.put(txn);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function deleteTransactionFromDB(id: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function saveSystemDateToDB(date: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('system', 'readwrite');
    const store = tx.objectStore('system');
    const req = store.put({ key: 'currentDate', value: date });
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function resetDatabaseToDefaultStore(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['users', 'bills', 'transactions', 'system'], 'readwrite');
    tx.objectStore('users').clear();
    tx.objectStore('bills').clear();
    tx.objectStore('transactions').clear();
    tx.objectStore('system').clear();

    INITIAL_USERS.forEach(u => tx.objectStore('users').put(u));
    INITIAL_BILLS.forEach(b => tx.objectStore('bills').put(b));
    tx.objectStore('system').put({ key: 'currentDate', value: '2026-06-11' });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

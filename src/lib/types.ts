export type LivestockType = 'dairy' | 'poultry';
export type TransactionType = 'income' | 'expense';

export interface AgriTransaction {
  id: string;
  date: string; // ISO string
  livestockType: LivestockType;
  transactionType: TransactionType;
  category: string;
  amount: number;
  description: string;
}

export interface AppSettings {
  farmName: string;
  managerName: string;
  location: string;
  currency: string;
}

export type TaskStatus = 'pending' | 'completed';

export interface FarmTask {
  id: string;
  title: string;
  date: string; // ISO string
  time: string; // HH:mm format
  livestockType: LivestockType | 'general';
  description: string;
  status: TaskStatus;
  priority: 'low' | 'medium' | 'high';
}

export type LivestockType = 'dairy' | 'poultry';

export interface BaseRecord {
  id: string;
  date: string; // ISO string
  revenue: number;
  expenses: number;
  notes?: string;
}

export interface DairyRecord extends BaseRecord {
  type: 'dairy';
}

export interface PoultryRecord extends BaseRecord {
  type: 'poultry';
}

export type AgriRecord = DairyRecord | PoultryRecord;

export interface AppSettings {
  farmName: string;
  managerName: string;
  location: string;
  currency: string;
}

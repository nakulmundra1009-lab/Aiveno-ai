
export enum Category {
  FOOD = 'Food',
  TRANSPORT = 'Transport',
  BILLS = 'Bills',
  SHOPPING = 'Shopping',
  HEALTH = 'Health',
  ENTERTAINMENT = 'Entertainment',
  OTHER = 'Other'
}

export interface Reminder {
  id: string;
  title: string;
  dueDate: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
}

export interface Expense {
  id: string;
  amount: number;
  category: Category;
  description: string;
  date: string;
}

export interface Document {
  id: string;
  name: string;
  expiryDate: string;
  type: string;
}

export interface UserMemory {
  name: string;
  preferences: string[];
  keyFacts: string[];
}

export interface AppState {
  reminders: Reminder[];
  expenses: Expense[];
  documents: Document[];
  memory: UserMemory;
}

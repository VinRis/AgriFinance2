'use client';
import React, { createContext, useContext, useReducer, ReactNode, useEffect, useMemo, useState } from 'react';
import { AgriTransaction, AppSettings, FarmTask, LivestockType } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';

type State = {
  transactions: AgriTransaction[];
  settings: AppSettings;
  tasks: FarmTask[];
};

type Action =
  | { type: 'ADD_TRANSACTION'; payload: AgriTransaction }
  | { type: 'UPDATE_TRANSACTION'; payload: AgriTransaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'ADD_TASK'; payload: FarmTask }
  | { type: 'UPDATE_TASK'; payload: FarmTask }
  | { type: 'DELETE_TASK'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_STATE'; payload: Partial<State> };

type AppContextType = State & {
  dispatch: React.Dispatch<Action>;
  getTransactions: (type: LivestockType) => AgriTransaction[];
  getTasks: (type?: LivestockType | 'general') => FarmTask[];
  isHydrated: boolean;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

const defaultSettings: AppSettings = {
  farmName: 'My Farm',
  managerName: 'Farm Manager',
  location: 'Green Valley',
  currency: '$',
};

const defaultState: State = {
    transactions: [],
    settings: defaultSettings,
    tasks: [],
};

function appReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STATE':
        const incomingState = action.payload;
        // Basic migration for tasks if they don't have new fields
        const incomingTasks = incomingState.tasks || [];
        const migratedTasks = incomingTasks.map(t => ({
            ...t,
            priority: t.priority || 'medium',
            reminder: t.reminder || false,
        }));

        return {
          settings: { ...defaultSettings, ...(incomingState.settings || {}) },
          transactions: incomingState.transactions || [],
          tasks: migratedTasks,
        };
    case 'ADD_TRANSACTION':
      return { ...state, transactions: [...state.transactions, action.payload] };
    case 'UPDATE_TRANSACTION':
      return {
        ...state,
        transactions: state.transactions.map((t) => (t.id === action.payload.id ? action.payload : t)),
      };
    case 'DELETE_TRANSACTION':
      return { ...state, transactions: state.transactions.filter((t) => t.id !== action.payload) };
    case 'ADD_TASK':
      return { ...state, tasks: [...state.tasks, action.payload] };
    case 'UPDATE_TASK':
       return {
        ...state,
        tasks: state.tasks.map((t) => (t.id === action.payload.id ? action.payload : t)),
      };
    case 'DELETE_TASK':
      return { ...state, tasks: state.tasks.filter((t) => t.id !== action.payload) };
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    default:
      return state;
  }
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [storedState, setStoredState] = useLocalStorage<State>('agri-finance-data', defaultState);
  const [state, dispatch] = useReducer(appReducer, defaultState);
  const [isHydrated, setIsHydrated] = useState(false);

  // Effect for initializing state from Local Storage
  useEffect(() => {
    dispatch({ type: 'SET_STATE', payload: storedState });
    setIsHydrated(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Effect for persisting state to local storage
  useEffect(() => {
    // Only save to local storage if the state is hydrated and has changed
    if (isHydrated) {
        // Simple string comparison to avoid deep object comparison on every render
        if (JSON.stringify(state) !== JSON.stringify(storedState)) {
            setStoredState(state);
        }
    }
  }, [state, isHydrated, setStoredState, storedState]);

  const getTransactions = (type: LivestockType) => {
    if (!isHydrated) return [];
    return state.transactions.filter(transaction => transaction.livestockType === type);
  };
  
  const getTasks = (type?: LivestockType | 'general') => {
    if (!isHydrated) return [];
    if (!type) return state.tasks;
    return state.tasks.filter(task => task.livestockType === type);
  };

  const contextValue = useMemo(() => ({
    ...state,
    dispatch,
    getTransactions,
    getTasks,
    isHydrated
  }), [state, dispatch, getTransactions, getTasks, isHydrated]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

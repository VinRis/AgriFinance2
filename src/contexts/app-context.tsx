'use client';

import React, { createContext, useContext, useReducer, ReactNode, useEffect, useMemo, useState } from 'react';
import { AgriTransaction, AppSettings, LivestockType } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';

type State = {
  transactions: AgriTransaction[];
  settings: AppSettings;
};

type Action =
  | { type: 'ADD_TRANSACTION'; payload: AgriTransaction }
  | { type: 'UPDATE_TRANSACTION'; payload: AgriTransaction }
  | { type: 'DELETE_TRANSACTION'; payload: string }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'SET_STATE'; payload: State };

type AppContextType = State & {
  dispatch: React.Dispatch<Action>;
  getTransactions: (type: LivestockType) => AgriTransaction[];
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
};

function appReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'SET_STATE':
        // Ensure that transactions are always an array
        return {
          settings: { ...defaultSettings, ...(action.payload.settings || {}) },
          transactions: action.payload.transactions || [],
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
    case 'UPDATE_SETTINGS':
      return { ...state, settings: { ...state.settings, ...action.payload } };
    default:
      return state;
  }
}

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [storedState, setStoredState] = useLocalStorage<State>('agri-finance-pro-data', defaultState);
  const [isHydrated, setIsHydrated] = useState(false);

  const initialState = useMemo(() => {
    if (!isHydrated) {
      return defaultState;
    }
    const transactions = storedState.transactions || [];
    const settings = { ...defaultSettings, ...(storedState.settings || {}) };
    return { transactions, settings };
  }, [storedState, isHydrated]);

  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (isHydrated) {
      dispatch({ type: 'SET_STATE', payload: storedState });
    }
  }, [isHydrated, storedState]);

  useEffect(() => {
    if (isHydrated) {
      setStoredState(state);
    }
  }, [state, setStoredState, isHydrated]);

  const getTransactions = (type: LivestockType) => {
    return state.transactions.filter(transaction => transaction.livestockType === type);
  };

  const contextValue = useMemo(() => ({
    ...state,
    dispatch,
    getTransactions
  }), [state]);

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

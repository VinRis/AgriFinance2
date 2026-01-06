'use client';
import React, { createContext, useContext, useReducer, ReactNode, useEffect, useMemo, useState, useCallback } from 'react';
import { AgriTransaction, AppSettings, FarmTask, LivestockType } from '@/lib/types';
import { useLocalStorage } from '@/hooks/use-local-storage';
import { useUser } from '@/firebase';
import { collection, doc, onSnapshot, writeBatch, getDocs, query, setDoc } from 'firebase/firestore';
import { useFirestore, useMemoFirebase } from '@/firebase/provider';
import { useToast } from '@/hooks/use-toast';

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
  isCloudSyncing: boolean;
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
        const incomingTasks = action.payload.tasks || [];
        const migratedTasks = incomingTasks.map(t => ({
            ...t,
            priority: t.priority || 'medium',
            reminder: t.reminder || false,
        }));
        return {
          settings: { ...defaultSettings, ...(action.payload.settings || {}) },
          transactions: action.payload.transactions || [],
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
  const [isHydrated, setIsHydrated] = useState(false);
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [state, dispatch] = useReducer(appReducer, defaultState);

  const isCloudSyncing = useMemo(() => !!user, [user]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  
  const transactionsColRef = useMemoFirebase(() => {
    if (!userDocRef) return null;
    return collection(userDocRef, 'transactions');
  }, [userDocRef]);

  const tasksColRef = useMemoFirebase(() => {
     if (!userDocRef) return null;
    return collection(userDocRef, 'tasks');
  }, [userDocRef]);

  // Merge local data to Firestore on login
  useEffect(() => {
    const mergeData = async () => {
        if (user && firestore && userDocRef && transactionsColRef && tasksColRef && storedState.transactions.length > 0) {
            console.log("Merging local data to Firestore...");
            toast({ title: "Syncing...", description: "Merging local data with the cloud." });

            const firestoreTransactionSnap = await getDocs(query(transactionsColRef));
            const firestoreTransactions = firestoreTransactionSnap.docs.map(d => d.data() as AgriTransaction);
            const firestoreTaskSnap = await getDocs(query(tasksColRef));
            const firestoreTasks = firestoreTaskSnap.docs.map(d => d.data() as FarmTask);

            const batch = writeBatch(firestore);

            // Merge settings, giving precedence to local settings if they are not default
            if (JSON.stringify(storedState.settings) !== JSON.stringify(defaultSettings)) {
              batch.set(userDocRef, storedState.settings, { merge: true });
            }

            // Merge transactions
            storedState.transactions.forEach(localTx => {
                if (!firestoreTransactions.some(ftx => ftx.id === localTx.id)) {
                    const docRef = doc(transactionsColRef, localTx.id);
                    batch.set(docRef, localTx);
                }
            });
            // Merge tasks
             storedState.tasks.forEach(localTask => {
                if (!firestoreTasks.some(ft => ft.id === localTask.id)) {
                    const docRef = doc(tasksColRef, localTask.id);
                    batch.set(docRef, localTask);
                }
            });

            await batch.commit();
            toast({ title: "Sync Complete", description: "Your local data has been saved to the cloud." });
            // Clear local storage after successful merge
            setStoredState(defaultState);
        }
    };
    if (isCloudSyncing && !isUserLoading) {
        mergeData();
    }
  }, [isCloudSyncing, isUserLoading, firestore, userDocRef, transactionsColRef, tasksColRef, storedState, setStoredState, user, toast]);

  // Subscribe to Firestore data when logged in
  useEffect(() => {
    if (isCloudSyncing && userDocRef && transactionsColRef && tasksColRef) {
        setIsHydrated(false);

        const unsubSettings = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            dispatch({ type: 'UPDATE_SETTINGS', payload: doc.data() as AppSettings });
          } else {
            // First time user, set default settings in firestore
            if(firestore) {
              setDoc(userDocRef, defaultSettings);
            }
          }
        });
        
        const unsubTransactions = onSnapshot(transactionsColRef, (snapshot) => {
          const transactions = snapshot.docs.map(doc => doc.data() as AgriTransaction);
          dispatch({ type: 'SET_STATE', payload: { transactions } });
        });

        const unsubTasks = onSnapshot(tasksColRef, (snapshot) => {
          const tasks = snapshot.docs.map(doc => doc.data() as FarmTask);
          dispatch({ type: 'SET_STATE', payload: { tasks } });
        });

        // After all subscriptions are set up and potentially fired once
        const timer = setTimeout(() => setIsHydrated(true), 500); // Small delay to allow data to populate

        return () => {
          unsubSettings();
          unsubTransactions();
          unsubTasks();
          clearTimeout(timer);
        };
    }
  }, [isCloudSyncing, userDocRef, transactionsColRef, tasksColRef, firestore]);

  // Load from local storage if not logged in
  useEffect(() => {
    if (!isUserLoading && !isCloudSyncing) {
      dispatch({ type: 'SET_STATE', payload: storedState });
      setIsHydrated(true);
    }
  }, [isUserLoading, isCloudSyncing, storedState]);

  // Persist state to local storage if not logged in
  useEffect(() => {
    if (isHydrated && !isCloudSyncing) {
      setStoredState(state);
    }
  }, [state, isHydrated, isCloudSyncing, setStoredState]);
  
   const wrappedDispatch = useCallback<React.Dispatch<Action>>((action) => {
    if (isCloudSyncing && userDocRef && firestore) {
      const { type, payload } = action;
      const batch = writeBatch(firestore);
      try {
        switch (type) {
            case 'ADD_TRANSACTION':
            case 'UPDATE_TRANSACTION':
                batch.set(doc(transactionsColRef!, (payload as AgriTransaction).id), payload);
                break;
            case 'DELETE_TRANSACTION':
                batch.delete(doc(transactionsColRef!, payload as string));
                break;
            case 'ADD_TASK':
            case 'UPDATE_TASK':
                batch.set(doc(tasksColRef!, (payload as FarmTask).id), payload);
                break;
            case 'DELETE_TASK':
                batch.delete(doc(tasksColRef!, payload as string));
                break;
            case 'UPDATE_SETTINGS':
                batch.set(userDocRef, payload, { merge: true });
                break;
            default:
                // For SET_STATE, we assume it's coming from Firestore or local storage, so we just update local state
                dispatch(action);
                return;
        }
        batch.commit()
            .catch(e => {
              console.error("Firestore update failed:", e);
              toast({ variant: 'destructive', title: "Sync Error", description: "Could not save changes to the cloud." });
            });
      } catch (e) {
        console.error("Error preparing Firestore batch:", e);
      }
    }
    // Always update the local state immediately for a responsive UI
    dispatch(action);
  }, [isCloudSyncing, userDocRef, firestore, transactionsColRef, tasksColRef, toast]);
  

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
    dispatch: wrappedDispatch,
    getTransactions,
    getTasks,
    isHydrated,
    isCloudSyncing
  }), [state, wrappedDispatch, getTransactions, getTasks, isHydrated, isCloudSyncing]);

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

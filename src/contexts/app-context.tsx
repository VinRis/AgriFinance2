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
        const incomingState = action.payload;
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
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [state, dispatch] = useReducer(appReducer, defaultState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isInitialSyncDone, setIsInitialSyncDone] = useState(false);


  const isCloudSyncing = useMemo(() => !!user, [user]);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  
  const transactionsColRef = useMemoFirebase(() => {
    if (!userDocRef) return null;
    return collection(userDocRef, 'livestockRecords');
  }, [userDocRef]);

  const tasksColRef = useMemoFirebase(() => {
     if (!userDocRef) return null;
    return collection(userDocRef, 'tasks');
  }, [userDocRef]);

  // Effect for initializing state from either Firestore or Local Storage
  useEffect(() => {
    if (isUserLoading) return; // Wait until we know if a user is logged in or not

    if (user && firestore && userDocRef && transactionsColRef && tasksColRef) {
      if (isInitialSyncDone) return; // Prevent re-subscribing
      
      console.log("User logged in, subscribing to Firestore.");
      const unsubSettings = onSnapshot(userDocRef, (doc) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: (doc.data() as AppSettings) || {} });
      });

      const unsubTransactions = onSnapshot(query(transactionsColRef), (snapshot) => {
        const transactions = snapshot.docs.map((doc) => doc.data() as AgriTransaction);
        dispatch({ type: 'SET_STATE', payload: { ...state, transactions } });
      });
      
      const unsubTasks = onSnapshot(query(tasksColRef), (snapshot) => {
          const tasks = snapshot.docs.map(doc => doc.data() as FarmTask);
          dispatch({ type: 'SET_STATE', payload: { ...state, tasks } });
          if (!isHydrated) setIsHydrated(true);
      });
      
      setIsInitialSyncDone(true); // Mark that initial sync setup is done

      return () => {
        unsubSettings();
        unsubTransactions();
        unsubTasks();
        setIsHydrated(false);
        setIsInitialSyncDone(false); // Reset on logout
      };
    } else if (!user && !isHydrated) {
      console.log("User not logged in, loading from local storage.");
      dispatch({ type: 'SET_STATE', payload: storedState });
      setIsHydrated(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isUserLoading, user, firestore, userDocRef, transactionsColRef, tasksColRef, isHydrated, storedState, isInitialSyncDone]);


  // Effect for persisting state to local storage when not logged in
  useEffect(() => {
    if (isHydrated && !isCloudSyncing) {
        if (JSON.stringify(state) !== JSON.stringify(storedState)) {
            setStoredState(state);
        }
    }
  }, [state, isHydrated, isCloudSyncing, setStoredState, storedState]);

  // Effect to merge local data to Firestore on the first login
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

            if (JSON.stringify(storedState.settings) !== JSON.stringify(defaultSettings)) {
              batch.set(userDocRef, storedState.settings, { merge: true });
            }

            storedState.transactions.forEach(localTx => {
                if (!firestoreTransactions.some(ftx => ftx.id === localTx.id)) {
                    const docRef = doc(transactionsColRef, localTx.id);
                    batch.set(docRef, localTx);
                }
            });
             storedState.tasks.forEach(localTask => {
                if (!firestoreTasks.some(ft => ft.id === localTask.id)) {
                    const docRef = doc(tasksColRef, localTask.id);
                    batch.set(docRef, localTask);
                }
            });

            await batch.commit();
            toast({ title: "Sync Complete", description: "Your local data has been saved to the cloud." });
            setStoredState(defaultState);
        }
    };
    if (isCloudSyncing && !isUserLoading) {
        mergeData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCloudSyncing, isUserLoading, firestore, userDocRef, transactionsColRef, tasksColRef, user, toast]);
  
   const wrappedDispatch = useCallback<React.Dispatch<Action>>((action) => {
    dispatch(action);

    if (isCloudSyncing && userDocRef && firestore && transactionsColRef && tasksColRef) {
      const { type, payload } = action;
      const batch = writeBatch(firestore);
      try {
        switch (type) {
            case 'ADD_TRANSACTION':
            case 'UPDATE_TRANSACTION':
                batch.set(doc(transactionsColRef, (payload as AgriTransaction).id), payload);
                break;
            case 'DELETE_TRANSACTION':
                batch.delete(doc(transactionsColRef, payload as string));
                break;
            case 'ADD_TASK':
            case 'UPDATE_TASK':
                batch.set(doc(tasksColRef, (payload as FarmTask).id), payload);
                break;
            case 'DELETE_TASK':
                batch.delete(doc(tasksColRef, payload as string));
                break;
            case 'UPDATE_SETTINGS':
                batch.set(userDocRef, payload, { merge: true });
                break;
            case 'SET_STATE':
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
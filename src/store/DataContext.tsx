import {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import type { DataPoint } from '../types/data.types';
import { DataService } from '../services/data.service';
import { StorageService } from '../services/storage.service';

// ─── State ────────────────────────────────────────────────────────────────────

interface DataState {
  points: DataPoint[];
  isLoaded: boolean;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

type DataAction =
  | { type: 'LOAD_INITIAL'; payload: DataPoint[] }
  | { type: 'ADD_POINT'; payload: { rawX: string; rawY: string } }
  | { type: 'DELETE_POINT'; payload: string }
  | { type: 'UPDATE_POINT'; payload: { id: string; rawX: string; rawY: string } }
  | { type: 'CLEAR_ALL' }
  | { type: 'IMPORT_POINTS'; payload: DataPoint[] };

// ─── Reducer ──────────────────────────────────────────────────────────────────

function dataReducer(state: DataState, action: DataAction): DataState {
  switch (action.type) {
    case 'LOAD_INITIAL':
      return { points: action.payload, isLoaded: true };

    case 'ADD_POINT': {
      const points = DataService.add(state.points, action.payload.rawX, action.payload.rawY);
      return { ...state, points };
    }

    case 'DELETE_POINT': {
      const points = DataService.remove(state.points, action.payload);
      return { ...state, points };
    }

    case 'UPDATE_POINT': {
      const { id, rawX, rawY } = action.payload;
      const points = DataService.update(state.points, id, rawX, rawY);
      return { ...state, points };
    }

    case 'CLEAR_ALL':
      return { ...state, points: [] };

    case 'IMPORT_POINTS': {
      const merged = DataService.sortByX([...state.points, ...action.payload]);
      return { ...state, points: merged };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface DataContextValue {
  points: DataPoint[];
  isLoaded: boolean;
  addPoint: (rawX: string, rawY: string) => void;
  deletePoint: (id: string) => void;
  updatePoint: (id: string, rawX: string, rawY: string) => void;
  clearAll: () => void;
  importPoints: (points: DataPoint[]) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DataProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dataReducer, { points: [], isLoaded: false });

  // Load persisted data on mount
  useEffect(() => {
    const saved = StorageService.load();
    dispatch({ type: 'LOAD_INITIAL', payload: saved });
  }, []);

  // Persist on every change (after initial load)
  useEffect(() => {
    if (state.isLoaded) {
      StorageService.save(state.points);
    }
  }, [state.points, state.isLoaded]);

  const addPoint = useCallback((rawX: string, rawY: string) => {
    dispatch({ type: 'ADD_POINT', payload: { rawX, rawY } });
  }, []);

  const deletePoint = useCallback((id: string) => {
    dispatch({ type: 'DELETE_POINT', payload: id });
  }, []);

  const updatePoint = useCallback((id: string, rawX: string, rawY: string) => {
    dispatch({ type: 'UPDATE_POINT', payload: { id, rawX, rawY } });
  }, []);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
    StorageService.clear();
  }, []);

  const importPoints = useCallback((points: DataPoint[]) => {
    dispatch({ type: 'IMPORT_POINTS', payload: points });
  }, []);

  return (
    <DataContext.Provider
      value={{ points: state.points, isLoaded: state.isLoaded, addPoint, deletePoint, updatePoint, clearAll, importPoints }}
    >
      {children}
    </DataContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}

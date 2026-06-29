import { createContext, useContext } from 'react';
import type { WalletInfo, Profile, ChainStatus } from './types';

export interface AppState {
  wallet: WalletInfo | null;
  profile: Profile | null;
  chain: ChainStatus;
  isLoading: boolean;
}

export interface AppActions {
  setWallet: (w: WalletInfo | null) => void;
  setProfile: (p: Profile | null) => void;
  setChain: (c: ChainStatus) => void;
  setLoading: (v: boolean) => void;
  logout: () => void;
}

export type AppContextType = AppState & AppActions;

export const AppContext = createContext<AppContextType>({
  wallet: null,
  profile: null,
  chain: { height: 0, connected: false },
  isLoading: false,
  setWallet: () => {},
  setProfile: () => {},
  setChain: () => {},
  setLoading: () => {},
  logout: () => {},
});

export const useApp = () => useContext(AppContext);

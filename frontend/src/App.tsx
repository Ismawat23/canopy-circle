import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppContext } from './lib/store';
import type { WalletInfo, Profile, ChainStatus } from './lib/types';
import { getBalance, getChainHeight, getProfile } from './lib/canopy';

import Landing from './pages/Landing';
import Home from './pages/Home';
import Explore from './pages/Explore';
import Circles from './pages/Circles';
import Wallet from './pages/Wallet';
import Notifications from './pages/Notifications';
import ProfilePage from './pages/Profile';
import Layout from './components/Layout';

export default function App() {
  const [wallet, setWalletState] = useState<WalletInfo | null>(() => {
    const saved = localStorage.getItem('cc_wallet');
    return saved ? JSON.parse(saved) : null;
  });
  const [profile, setProfile] = useState<Profile | null>(null);
  const [chain, setChain] = useState<ChainStatus>({ height: 0, connected: false });
  const [isLoading, setLoading] = useState(false);

  const setWallet = useCallback((w: WalletInfo | null) => {
    setWalletState(w);
    if (w) localStorage.setItem('cc_wallet', JSON.stringify(w));
    else localStorage.removeItem('cc_wallet');
  }, []);

  const logout = useCallback(() => {
    setWallet(null);
    setProfile(null);
  }, [setWallet]);

  // Poll chain height & wallet balance
  useEffect(() => {
    const poll = async () => {
      try {
        const h = await getChainHeight();
        setChain({ height: h.height, connected: true });
      } catch {
        setChain(prev => ({ ...prev, connected: false }));
      }
      if (wallet) {
        try {
          const b = await getBalance(wallet.address);
          setWalletState(prev => prev ? { ...prev, balance: b.balance } : null);
        } catch { /* ignore */ }
      }
    };
    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, [wallet?.address]);

  // Load profile when wallet changes
  useEffect(() => {
    if (!wallet) { setProfile(null); return; }
    getProfile(wallet.address).then(setProfile).catch(() => setProfile(null));
  }, [wallet?.address]);

  const ctx = {
    wallet, profile, chain, isLoading,
    setWallet, setProfile, setChain, setLoading, logout,
  };

  return (
    <AppContext.Provider value={ctx}>
      <BrowserRouter>
        <Routes>
          {!wallet ? (
            <>
              <Route path="/" element={<Landing />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </>
          ) : (
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/explore" element={<Explore />} />
              <Route path="/circles" element={<Circles />} />
              <Route path="/wallet" element={<Wallet />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/profile/:address?" element={<ProfilePage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </BrowserRouter>
    </AppContext.Provider>
  );
}

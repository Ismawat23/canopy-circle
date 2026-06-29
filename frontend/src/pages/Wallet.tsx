import { useState, useEffect } from 'react';
import { Send, Copy, Check, RefreshCw, ArrowUpRight, ArrowDownRight, Coins } from 'lucide-react';
import { useApp } from '../lib/store';
import { sendTokens, getBalance, getChainHeight, formatAddress } from '../lib/canopy';

export default function Wallet() {
  const { wallet, chain, setWallet } = useApp();
  const [toAddress, setToAddress] = useState('');
  const [amount, setAmount] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState('');
  const [sendSuccess, setSendSuccess] = useState('');
  const [copied, setCopied] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refreshBalance = async () => {
    if (!wallet) return;
    setRefreshing(true);
    try {
      const b = await getBalance(wallet.address);
      setWallet({ ...wallet, balance: b.balance });
    } catch { /* ignore */ }
    setRefreshing(false);
  };

  useEffect(() => { refreshBalance(); }, []);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(wallet?.address || '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSend = async () => {
    if (!wallet || !toAddress.trim() || !amount) return;
    setSending(true); setSendError(''); setSendSuccess('');
    try {
      await sendTokens(wallet.address, toAddress.trim(), parseInt(amount));
      setSendSuccess(`Successfully sent ${amount} tokens!`);
      setToAddress(''); setAmount('');
      setTimeout(refreshBalance, 2000);
    } catch (e) {
      setSendError((e as Error).message);
    }
    setSending(false);
  };

  const balance = wallet?.balance ?? 0;

  return (
    <div style={{ maxWidth: 680, margin: '0 auto', padding: '0 0 60px' }}>
      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(10,15,26,0.8)', backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        padding: '18px 20px',
      }}>
        <h1 style={{ fontSize: 18, fontWeight: 700 }}>Wallet</h1>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Your Canopy Network account</p>
      </div>

      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Balance card */}
        <div style={{
          padding: '28px 24px', borderRadius: 20,
          background: 'linear-gradient(135deg, rgba(34,197,94,0.15) 0%, rgba(22,163,74,0.08) 100%)',
          border: '1px solid rgba(34,197,94,0.25)',
          boxShadow: '0 0 40px rgba(34,197,94,0.08)',
        }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--green-400)', letterSpacing: '0.5px', marginBottom: 8 }}>
            TOTAL BALANCE
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 6 }}>
            <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: '-1px', color: '#f1f5f9' }}>
              {balance.toLocaleString()}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--green-500)' }}>CNPY</div>
            <button
              onClick={refreshBalance}
              style={{ marginLeft: 'auto', padding: 8, background: 'rgba(255,255,255,0.08)', borderRadius: 10, color: 'rgba(255,255,255,0.5)' }}
              title="Refresh balance"
            >
              <RefreshCw size={16} className={refreshing ? 'spin' : ''} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>
            <Coins size={13} />
            Block #{chain.height.toLocaleString()}
          </div>
        </div>

        {/* Address card */}
        <div className="glass" style={{ padding: '16px 20px' }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', letterSpacing: '0.5px', marginBottom: 10 }}>
            YOUR ADDRESS
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              flex: 1, fontSize: 13, fontFamily: 'monospace', color: '#f1f5f9',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {wallet?.address}
            </div>
            <button
              onClick={handleCopy}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                background: copied ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.07)',
                color: copied ? '#22c55e' : 'rgba(255,255,255,0.6)',
                border: `1px solid ${copied ? 'rgba(34,197,94,0.3)' : 'rgba(255,255,255,0.1)'}`,
                transition: 'all 0.2s',
              }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
        </div>

        {/* Quick stats */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="glass" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <ArrowUpRight size={16} color="#22c55e" />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Sent</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>—</div>
          </div>
          <div className="glass" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <ArrowDownRight size={16} color="#3b82f6" />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Received</span>
            </div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>—</div>
          </div>
        </div>

        {/* Send tokens */}
        <div className="glass" style={{ padding: '20px' }}>
          <h3 style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Send size={16} color="#22c55e" /> Send Tokens
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              value={toAddress}
              onChange={e => setToAddress(e.target.value)}
              placeholder="Recipient address (40 hex chars)"
              style={{
                padding: '11px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9', fontSize: 13, fontFamily: 'monospace',
              }}
            />
            <input
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Amount (CNPY tokens)"
              min="1"
              style={{
                padding: '11px 14px', borderRadius: 10,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#f1f5f9', fontSize: 13,
              }}
            />

            {sendError && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(239,68,68,0.1)', color: '#fca5a5', fontSize: 12 }}>
                {sendError}
              </div>
            )}
            {sendSuccess && (
              <div style={{ padding: '10px 14px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', color: '#4ade80', fontSize: 12 }}>
                ✓ {sendSuccess}
              </div>
            )}

            <button
              onClick={handleSend}
              disabled={sending || !toAddress.trim() || !amount}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                padding: '12px 0', borderRadius: 10, fontWeight: 600, fontSize: 14,
                background: (sending || !toAddress.trim() || !amount) ? 'rgba(255,255,255,0.1)' : 'var(--green-600)',
                color: (sending || !toAddress.trim() || !amount) ? 'rgba(255,255,255,0.3)' : 'white',
                cursor: sending ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
              }}
            >
              <Send size={15} />
              {sending ? 'Sending on-chain...' : 'Send on-chain'}
            </button>
          </div>
        </div>

        {/* Info */}
        <div style={{
          padding: '14px 16px', borderRadius: 12,
          background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
          fontSize: 12, color: 'rgba(255,255,255,0.35)', lineHeight: 1.7,
        }}>
          💡 All token transfers are real blockchain transactions on the Canopy Network.
          Each transaction requires a small fee (1000 uCNPY by default).
          Make sure your wallet has sufficient balance.
        </div>
      </div>
    </div>
  );
}

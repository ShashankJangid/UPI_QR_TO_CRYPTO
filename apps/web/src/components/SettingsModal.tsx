import React, { useState, useEffect } from 'react';
import { X, Wallet, Check, Loader2, KeyRound } from 'lucide-react';
import { API_URL } from '../config';
import { Merchant, BlockchainNetwork, USDT_CONTRACTS } from '@upi-crypto/shared';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: Merchant | null;
  onMerchantUpdated: (merchant: Merchant) => void;
}

interface RelayerStatus {
  hasPrivateKey: boolean;
  address: string | null;
  nativeBalance: string;
  usdtBalance: string;
  network: BlockchainNetwork;
  contractAddress: string;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  merchant,
  onMerchantUpdated
}) => {
  const [walletAddress, setWalletAddress] = useState(merchant?.walletAddress || '');
  const [network, setNetwork] = useState<BlockchainNetwork>(merchant?.walletNetwork || 'polygon');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);
  const [relayerStatus, setRelayerStatus] = useState<RelayerStatus | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const fetchRelayer = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/payments/relayer-status?network=${network}`);
        if (res.ok) {
          const data = await res.json();
          setRelayerStatus(data);
        }
      } catch (e) {
        console.error(e);
      }
    };

    fetchRelayer();
  }, [isOpen, network]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!walletAddress.startsWith('0x') || walletAddress.length !== 42) {
      alert('Please enter a valid 42-character EVM hex address (e.g. 0x...)');
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/merchants/wallet`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          merchantId: merchant?.id,
          walletAddress,
          walletNetwork: network
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update wallet');
      }

      const data = await res.json();
      onMerchantUpdated(data.merchant);
      setSuccessMessage(true);
      setTimeout(() => {
        setSuccessMessage(false);
        onClose();
      }, 1000);
    } catch (e: any) {
      alert(`Error saving wallet: ${e.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const currentContract = USDT_CONTRACTS[network];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Wallet className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">Merchant Payout &amp; Relayer Settings</h3>
              <p className="text-xs text-slate-500">Configure your receiving wallet &amp; on-chain rails</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Receiving Blockchain Network
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setNetwork('polygon')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  network === 'polygon'
                    ? 'bg-purple-50 border-purple-400 text-purple-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm text-purple-900">Polygon (PoS)</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Gas: &lt; $0.01 • 2s Finality</div>
              </button>

              <button
                type="button"
                onClick={() => setNetwork('bsc')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  network === 'bsc'
                    ? 'bg-amber-50 border-amber-400 text-amber-950'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                <div className="font-bold text-sm text-amber-900">BNB Smart Chain</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Gas: ~ $0.05 • 3s Finality</div>
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Your Destination EVM Wallet Address
            </label>
            <input
              type="text"
              value={walletAddress}
              onChange={e => setWalletAddress(e.target.value.trim())}
              placeholder="0x..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 mono placeholder-slate-400 focus:outline-none focus:border-emerald-600"
            />
            <p className="text-[11px] text-slate-500">
              The blockchain address where you will directly receive USDT. Compatible with MetaMask, Trust Wallet, Ledger, etc.
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <KeyRound className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Automated Payout Relayer
                </span>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                relayerStatus?.hasPrivateKey
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {relayerStatus?.hasPrivateKey ? 'Live Signer Active' : 'Test Mode (Simulated Signer)'}
              </span>
            </div>

            {relayerStatus?.hasPrivateKey ? (
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Relayer Address:</span>
                  <span className="mono text-slate-900 font-medium">{relayerStatus.address}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Native Gas Balance:</span>
                  <span className="mono text-emerald-700 font-semibold">{relayerStatus.nativeBalance} POL</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Treasury USDT Balance:</span>
                  <span className="mono text-emerald-700 font-semibold">{relayerStatus.usdtBalance} USDT</span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
                <p>
                  To enable <strong>real on-chain USDT transfers</strong> directly from your server, configure your private key in <code className="text-emerald-700 bg-white border border-slate-200 px-1 py-0.5 rounded">.env</code>:
                </p>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 mono text-[11px] text-slate-800">
                  RELAYER_PRIVATE_KEY=0x...your_hot_wallet_private_key...
                </div>
                <p className="text-[11px] text-slate-500">
                  Fund this address with ~0.5 POL for gas and USDT tokens to dispatch live payouts.
                </p>
              </div>
            )}
          </div>

          {currentContract && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-600">
                <span>USDT Contract:</span>
                <span className="mono text-slate-800 truncate max-w-[220px]">
                  {currentContract.address}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span>Token Decimals:</span>
                <span className="mono text-slate-800">{currentContract.decimals}</span>
              </div>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/20"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : successMessage ? (
              <>
                <Check className="h-4 w-4" />
                <span>Saved Successfully!</span>
              </>
            ) : (
              <span>Save Payout Settings</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

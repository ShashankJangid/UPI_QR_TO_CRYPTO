import React, { useState } from 'react';
import { Wallet, Check, ArrowRight, ExternalLink, RefreshCw, Sparkles, ShieldCheck } from 'lucide-react';
import { API_URL } from '../config';
import { Merchant, BlockchainNetwork, USDT_CONTRACTS } from '@upi-crypto/shared';

interface WalletConnectSectionProps {
  merchant: Merchant | null;
  onMerchantConnected: (merchant: Merchant) => void;
  onGenerateQrClick: () => void;
}

export const WalletConnectSection: React.FC<WalletConnectSectionProps> = ({
  merchant,
  onMerchantConnected,
  onGenerateQrClick
}) => {
  const [walletInput, setWalletInput] = useState(merchant?.walletAddress || '');
  const [network, setNetwork] = useState<BlockchainNetwork>(merchant?.walletNetwork || 'polygon');
  const [businessName, setBusinessName] = useState(merchant?.businessName || '');
  const [isEditing, setIsEditing] = useState(!merchant?.walletAddress);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleConnectWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanAddress = walletInput.trim();
    if (!cleanAddress.startsWith('0x') || cleanAddress.length !== 42) {
      setErrorMsg('Please enter a valid 42-character EVM address (e.g. 0x...)');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/merchants/connect-wallet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: cleanAddress,
          walletNetwork: network,
          businessName: businessName.trim() || undefined
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to connect wallet');
      }

      const data = await res.json();
      localStorage.setItem('connected_wallet', cleanAddress);
      localStorage.setItem('connected_network', network);
      localStorage.setItem('connected_merchant_id', data.merchant.id);
      
      onMerchantConnected(data.merchant);
      setIsEditing(false);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const getExplorerLink = (address: string) => {
    const explorer = USDT_CONTRACTS[network]?.explorer?.replace('/tx/', '/address/') || 'https://polygonscan.com/address/';
    return `${explorer}${address}`;
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">1. Payout Wallet Connection</h2>
            <p className="text-xs text-slate-500">
              Payments made by customers via UPI will automatically send USDT directly to this wallet.
            </p>
          </div>
        </div>

        {merchant && !isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors flex items-center space-x-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            <span>Switch / Change Wallet</span>
          </button>
        )}
      </div>

      {!isEditing && merchant ? (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 p-5 rounded-xl bg-gradient-to-r from-emerald-50/70 via-teal-50/40 to-slate-50 border border-emerald-100">
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                Active Payout Destination
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700 capitalize">
                {merchant.walletNetwork} Network
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-lg font-bold text-slate-900 mono">
                {merchant.walletAddress}
              </span>
              <a
                href={getExplorerLink(merchant.walletAddress)}
                target="_blank"
                rel="noreferrer"
                className="text-slate-400 hover:text-emerald-700"
                title="View on Explorer"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <p className="text-xs text-slate-500">
              Business Name: <strong className="text-slate-800">{merchant.businessName}</strong> • Any QR code generated below sends USDT here.
            </p>
          </div>

          <button
            onClick={onGenerateQrClick}
            className="px-6 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98] whitespace-nowrap"
          >
            <Sparkles className="h-4 w-4" />
            <span>Generate Payment QR for This Wallet</span>
          </button>
        </div>
      ) : (
        <form onSubmit={handleConnectWallet} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Your Receiving EVM Wallet Address (Hex)
              </label>
              <input
                type="text"
                required
                value={walletInput}
                onChange={e => setWalletInput(e.target.value.trim())}
                placeholder="0x71C7656EC7ab88b098defB751B7401B5f6d8976F"
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-900 mono placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
              <p className="text-[11px] text-slate-500">
                Enter your MetaMask, Trust Wallet, Ledger, or exchange deposit address for USDT.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Payout Network
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setNetwork('polygon')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    network === 'polygon'
                      ? 'bg-purple-50 border-purple-400 text-purple-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  Polygon (PoS)
                </button>
                <button
                  type="button"
                  onClick={() => setNetwork('bsc')}
                  className={`p-2.5 rounded-xl border text-xs font-bold transition-all text-center ${
                    network === 'bsc'
                      ? 'bg-amber-50 border-amber-400 text-amber-900'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}
                >
                  BNB Chain
                </button>
              </div>
              <p className="text-[11px] text-slate-500">Polygon fees are &lt; $0.01</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Merchant / Business Name (Optional)
              </label>
              <input
                type="text"
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                placeholder="e.g. Apex Store / Freelance Payouts"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <div className="flex items-end gap-3">
              <button
                type="submit"
                disabled={isLoading || !walletInput}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/20"
              >
                <span>{isLoading ? 'Connecting...' : 'Connect Wallet & Activate QR Codes'}</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {merchant && isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {errorMsg}
            </div>
          )}
        </form>
      )}
    </div>
  );
};

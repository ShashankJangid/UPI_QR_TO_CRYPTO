import React from 'react';
import { Settings, ArrowRightLeft, Zap } from 'lucide-react';
import { Merchant } from '@upi-crypto/shared';

interface NavbarProps {
  merchant: Merchant | null;
  currentRate: number;
  onOpenSettings: () => void;
  onOpenCollect: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  merchant,
  currentRate,
  onOpenSettings,
  onOpenCollect
}) => {
  const shortAddress = merchant?.walletAddress
    ? `${merchant.walletAddress.substring(0, 6)}...${merchant.walletAddress.substring(merchant.walletAddress.length - 4)}`
    : 'Not configured';

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/90 backdrop-blur-md shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-600 to-indigo-600 flex items-center justify-center shadow-md shadow-emerald-600/20">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg text-slate-900 tracking-tight">
                UPI<span className="text-emerald-600">2</span>Crypto
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                Merchant Gateway
              </span>
            </div>
            <p className="text-xs text-slate-500">Pay in INR (UPI) → Receive in USDT</p>
          </div>
        </div>

        <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="text-slate-600">Live Rate:</span>
          <span className="font-semibold text-slate-900 mono">1 USDT ≈ ₹{currentRate.toFixed(2)}</span>
          <span className="text-slate-400 text-[10px]">(incl. TDS)</span>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs transition-colors"
            title="Payout Settings"
          >
            <div className="h-2 w-2 rounded-full bg-purple-500"></div>
            <span className="capitalize font-medium text-slate-600">{merchant?.walletNetwork || 'Polygon'}:</span>
            <span className="mono font-semibold text-slate-900">{shortAddress}</span>
            <Settings className="h-3.5 w-3.5 text-slate-500 hover:text-slate-800 ml-1" />
          </button>

          <button
            onClick={onOpenCollect}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>Collect Payment</span>
          </button>
        </div>
      </div>
    </header>
  );
};

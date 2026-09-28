import React from 'react';
import { IndianRupee, Coins, CheckCircle2, Clock, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { DashboardStats } from '@upi-crypto/shared';

interface DashboardOverviewProps {
  stats: DashboardStats | null;
  onOpenCollect: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({ stats, onOpenCollect }) => {
  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-50 via-teal-50 to-indigo-50 border border-emerald-100 p-6 sm:p-8 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-semibold">
              <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span>Compliant FIU-IND On-Ramp Active</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Accept UPI Payments, Receive Pure <span className="text-emerald-600">USDT</span>
            </h1>
            <p className="text-slate-600 text-sm leading-relaxed">
              Customers scan dynamic UPI QR codes and pay in Indian Rupees via PhonePe, GPay, or Paytm. 
              TDS is handled automatically and USDT is transferred directly into your blockchain wallet.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <button
              onClick={onOpenCollect}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <span>Generate Dynamic QR</span>
              <ArrowUpRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">USDT Delivered</span>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 mono">
              {stats?.totalUsdtReceived ? stats.totalUsdtReceived.toFixed(2) : '0.00'} <span className="text-xs font-semibold text-emerald-600">USDT</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Directly credited to on-chain wallet</p>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total INR Collected</span>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 mono">
              ₹{stats?.totalInrVolume ? stats.totalInrVolume.toLocaleString('en-IN') : '0.00'}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Gross customer payments via UPI</p>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Completed Orders</span>
            <div className="h-9 w-9 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 mono">
              {stats?.successfulOrdersCount || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">100% on-chain confirmed</p>
          </div>
        </div>

        <div className="rounded-xl bg-white border border-slate-200 p-5 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">In-Flight / Pending</span>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 mono">
              {stats?.pendingOrdersCount || 0}
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Awaiting UPI scan or dispatch</p>
          </div>
        </div>
      </div>
    </div>
  );
};

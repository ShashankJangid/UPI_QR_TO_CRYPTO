import React from 'react';
import { ExternalLink, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { Order, USDT_CONTRACTS } from '@upi-crypto/shared';

interface TransactionsTableProps {
  orders: Order[];
  onRefresh: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ orders, onRefresh }) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="h-3 w-3" />
            <span>Delivered</span>
          </span>
        );
      case 'UPI_PAID':
      case 'PROCESSING_CRYPTO':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="h-3 w-3" />
            <span>Converting</span>
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <Clock className="h-3 w-3" />
            <span>Awaiting UPI</span>
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">
            <span>Expired</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="h-3 w-3" />
            <span>Failed</span>
          </span>
        );
    }
  };

  const getExplorerLink = (hash?: string, network = 'polygon') => {
    if (!hash) return '#';
    const baseUrl = USDT_CONTRACTS[network]?.explorer || 'https://polygonscan.com/tx/';
    return `${baseUrl}${hash}`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm">
      <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Payment &amp; On-Chain Settlement History</h2>
          <p className="text-xs text-slate-500">Customer UPI payments and USDT on-chain dispatches</p>
        </div>
        <button
          onClick={onRefresh}
          className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-medium text-slate-700 border border-slate-200 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 text-slate-600 uppercase font-semibold tracking-wider border-b border-slate-200">
            <tr>
              <th className="px-6 py-3.5">Time</th>
              <th className="px-6 py-3.5">Order ID</th>
              <th className="px-6 py-3.5">UPI Amount (INR)</th>
              <th className="px-6 py-3.5">USDT Received</th>
              <th className="px-6 py-3.5">Rate</th>
              <th className="px-6 py-3.5">Status</th>
              <th className="px-6 py-3.5">Blockchain Tx</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  No payment orders yet. Click "Collect Payment" to generate your first UPI QR code!
                </td>
              </tr>
            ) : (
              orders.map(order => (
                <tr key={order.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                    {formatDate(order.createdAt)}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-900 mono whitespace-nowrap">
                    {order.id}
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900 mono whitespace-nowrap">
                    ₹{order.amountInr.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 font-bold text-emerald-600 mono whitespace-nowrap">
                    +{order.amountUsdt.toFixed(4)} USDT
                  </td>
                  <td className="px-6 py-4 text-slate-600 mono whitespace-nowrap">
                    ₹{order.lockedRate.toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(order.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {order.txHash ? (
                      <a
                        href={getExplorerLink(order.txHash, order.destinationNetwork)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-emerald-600 hover:text-emerald-700 mono underline"
                      >
                        <span>{order.txHash.substring(0, 8)}...</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

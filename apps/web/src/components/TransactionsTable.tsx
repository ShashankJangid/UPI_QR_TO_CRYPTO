import React, { useState } from 'react';
import { 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Search, 
  Download, 
  QrCode, 
  Copy, 
  Check, 
  Hash, 
  Sparkles, 
  X, 
  Loader2, 
  RefreshCw 
} from 'lucide-react';
import { Order, USDT_CONTRACTS } from '@upi-crypto/shared';
import { API_URL } from '../config';

interface TransactionsTableProps {
  orders: Order[];
  onRefresh: () => void;
}

export const TransactionsTable: React.FC<TransactionsTableProps> = ({ orders, onRefresh }) => {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [utrInput, setUtrInput] = useState<string>('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState<boolean>(false);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isRetrying, setIsRetrying] = useState<boolean>(false);

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

  const copyToClipboard = (text: string, fieldId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldId);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'COMPLETED' && order.status !== 'COMPLETED') return false;
      if (statusFilter === 'PENDING' && order.status !== 'PENDING') return false;
      if (statusFilter === 'CONVERTING' && !['UPI_PAID', 'PROCESSING_CRYPTO'].includes(order.status)) return false;
      if (statusFilter === 'EXPIRED' && order.status !== 'EXPIRED') return false;
      if (statusFilter === 'FAILED' && order.status !== 'FAILED') return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchId = order.id.toLowerCase().includes(q);
      const matchTx = order.txHash?.toLowerCase().includes(q);
      const matchWallet = order.destinationWallet.toLowerCase().includes(q);
      const matchVpa = order.customerVpa?.toLowerCase().includes(q);
      return matchId || matchTx || matchWallet || matchVpa;
    }

    return true;
  });

  const exportCsv = () => {
    if (orders.length === 0) return;
    const headers = ['Order ID', 'Date', 'INR Amount', 'USDT Amount', 'Rate', 'Status', 'Wallet', 'Network', 'TxHash', 'UTR/Customer'];
    const rows = orders.map(o => [
      o.id,
      o.createdAt,
      o.amountInr.toFixed(2),
      o.amountUsdt.toFixed(4),
      o.lockedRate.toFixed(2),
      o.status,
      o.destinationWallet,
      o.destinationNetwork,
      o.txHash || '',
      o.customerVpa || ''
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.map(x => `"${x}"`).join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `upi_crypto_orders_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleVerifyUtrInModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder || !utrInput.trim()) return;

    setIsSubmittingUtr(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/payments/${selectedOrder.id}/verify-utr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          utr: utrInput.trim(),
          customerVpa: 'Customer-UPI'
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Verification failed');
      }

      const data = await res.json();
      setSelectedOrder(data.order);
      setUtrInput('');
      onRefresh();
    } catch (err: any) {
      alert(`UTR Error: ${err.message}`);
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  const handleSimulateInModal = async () => {
    if (!selectedOrder) return;
    setIsSimulating(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/payments/${selectedOrder.id}/simulate`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Simulation failed');
      }
      const data = await res.json();
      setSelectedOrder(data.order);
      onRefresh();
    } catch (e: any) {
      alert(`Simulation error: ${e.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleRetryInModal = async () => {
    if (!selectedOrder) return;
    setIsRetrying(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/payments/${selectedOrder.id}/retry`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Retry failed');
      }
      const data = await res.json();
      setSelectedOrder(data.order);
      onRefresh();
    } catch (e: any) {
      alert(`Retry error: ${e.message}`);
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm space-y-0">
      <div className="px-6 py-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Payment &amp; On-Chain Settlement History</h2>
          <p className="text-xs text-slate-500">Click any row to inspect receipt, QR code, bank UTR, or blockchain explorer</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCsv}
            disabled={orders.length === 0}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors flex items-center space-x-1.5"
            title="Download CSV"
          >
            <Download className="h-3.5 w-3.5 text-slate-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 border border-slate-200 transition-colors flex items-center space-x-1.5"
          >
            <RefreshCw className="h-3.5 w-3.5 text-slate-600" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'ALL', label: 'All Orders' },
            { id: 'COMPLETED', label: 'Delivered' },
            { id: 'CONVERTING', label: 'Converting' },
            { id: 'PENDING', label: 'Awaiting UPI' },
            { id: 'EXPIRED', label: 'Expired' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                statusFilter === tab.id
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-white hover:bg-slate-200 text-slate-700 border border-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-3.5 w-3.5" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search Order ID, Tx, Wallet..."
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
          />
        </div>
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
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                  {orders.length === 0
                    ? 'No payment orders yet. Click "Collect Payment" to generate your first UPI QR code!'
                    : 'No orders match your filter criteria.'}
                </td>
              </tr>
            ) : (
              filteredOrders.map(order => (
                <tr 
                  key={order.id} 
                  onClick={() => setSelectedOrder(order)}
                  className="hover:bg-emerald-50/40 cursor-pointer transition-colors"
                  title="Click to view full receipt & details"
                >
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
                  <td className="px-6 py-4 whitespace-nowrap" onClick={e => e.stopPropagation()}>
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

      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
            <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <QrCode className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900">Order Settlement Receipt</h3>
                  <p className="text-xs text-slate-500 mono">{selectedOrder.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500">Gross INR Paid via UPI</span>
                  <div className="text-2xl font-black text-slate-900 mono">₹{selectedOrder.amountInr.toFixed(2)}</div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-emerald-700 font-semibold">Net USDT Delivered</span>
                  <div className="text-2xl font-black text-emerald-600 mono">+{selectedOrder.amountUsdt.toFixed(4)} USDT</div>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Order Status:</span>
                  <div>{getStatusBadge(selectedOrder.status)}</div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Created At:</span>
                  <span className="text-slate-800 font-medium">{formatDate(selectedOrder.createdAt)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Locked Rate:</span>
                  <span className="mono text-slate-900 font-semibold">1 USDT = ₹{selectedOrder.lockedRate.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Receiving Wallet:</span>
                  <div className="flex items-center space-x-1.5">
                    <span className="mono text-slate-900 font-medium truncate max-w-[200px]" title={selectedOrder.destinationWallet}>
                      {selectedOrder.destinationWallet}
                    </span>
                    <button
                      onClick={() => copyToClipboard(selectedOrder.destinationWallet, 'wallet')}
                      className="text-slate-400 hover:text-slate-700"
                      title="Copy Wallet Address"
                    >
                      {copiedField === 'wallet' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500">Blockchain Network:</span>
                  <span className="font-semibold text-slate-900 capitalize">{selectedOrder.destinationNetwork}</span>
                </div>

                {selectedOrder.customerVpa && (
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                    <span className="text-slate-500">Bank UTR / Payer Info:</span>
                    <span className="mono text-slate-900 font-medium">{selectedOrder.customerVpa}</span>
                  </div>
                )}

                {selectedOrder.txHash && (
                  <div className="py-2 space-y-1.5">
                    <span className="text-slate-500">Blockchain Tx Hash:</span>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 border border-emerald-200">
                      <span className="mono text-slate-800 truncate max-w-[240px] text-[11px] font-semibold">
                        {selectedOrder.txHash}
                      </span>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => copyToClipboard(selectedOrder.txHash || '', 'tx')}
                          className="text-slate-500 hover:text-slate-800"
                          title="Copy Tx Hash"
                        >
                          {copiedField === 'tx' ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                        </button>
                        <a
                          href={getExplorerLink(selectedOrder.txHash, selectedOrder.destinationNetwork)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 font-semibold inline-flex items-center space-x-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {selectedOrder.status === 'PENDING' && (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  {selectedOrder.upiQrImageUrl && (
                    <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                      <img
                        src={selectedOrder.upiQrImageUrl}
                        alt="Dynamic UPI QR"
                        className="w-48 h-48 object-contain rounded-lg border border-slate-200 p-1 bg-white"
                      />
                      <span className="text-[11px] text-slate-500 font-medium">Scan with GPay, PhonePe, or Paytm</span>
                    </div>
                  )}

                  <form onSubmit={handleVerifyUtrInModal} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                    <label className="text-[11px] font-semibold text-slate-700">
                      Enter 12-Digit Bank UTR / UPI Ref to Confirm Payout:
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        required
                        value={utrInput}
                        onChange={e => setUtrInput(e.target.value)}
                        placeholder="e.g. 428519283912"
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600"
                      />
                      <button
                        type="submit"
                        disabled={isSubmittingUtr || utrInput.trim().length < 8}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg transition-colors flex items-center space-x-1"
                      >
                        {isSubmittingUtr ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span>Verify &amp; Payout</span>}
                      </button>
                    </div>
                  </form>

                  <button
                    onClick={handleSimulateInModal}
                    disabled={isSimulating}
                    className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{isSimulating ? 'Simulating UPI...' : '⚡ Instant Test Simulator: Complete Payment'}</span>
                  </button>
                </div>
              )}

              {selectedOrder.status === 'FAILED' && (
                <div className="pt-2 border-t border-slate-100">
                  <button
                    onClick={handleRetryInModal}
                    disabled={isRetrying}
                    className="w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <RefreshCw className="h-3.5 w-3.5 text-rose-600" />
                    <span>{isRetrying ? 'Retrying On-Chain Dispatch...' : 'Retry USDT Transfer'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

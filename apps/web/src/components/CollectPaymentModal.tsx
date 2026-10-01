import React, { useState, useEffect } from 'react';
import { 
  X, 
  QrCode, 
  IndianRupee, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Check, 
  Smartphone, 
  Sparkles,
  Hash,
  Loader2
} from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { API_URL, SOCKET_URL } from '../config';
import { 
  CreatePaymentResponse, 
  PaymentStatus, 
  QuoteResponse, 
  Merchant, 
  USDT_CONTRACTS,
  SOCKET_CHANNELS 
} from '@upi-crypto/shared';

interface CollectPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchant: Merchant | null;
  onPaymentSuccess: () => void;
}

export const CollectPaymentModal: React.FC<CollectPaymentModalProps> = ({
  isOpen,
  onClose,
  merchant,
  onPaymentSuccess
}) => {
  const [step, setStep] = useState<'input' | 'qr'>('input');
  const [amountInr, setAmountInr] = useState<number>(500);
  const [quote, setQuote] = useState<QuoteResponse | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentData, setPaymentData] = useState<CreatePaymentResponse | null>(null);
  const [currentStatus, setCurrentStatus] = useState<PaymentStatus>('PENDING');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [isSimulating, setIsSimulating] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedVpa, setCopiedVpa] = useState(false);
  const [utrInput, setUtrInput] = useState('');
  const [isSubmittingUtr, setIsSubmittingUtr] = useState(false);
  const [showUtrInput, setShowUtrInput] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchQuote = async () => {
      if (amountInr <= 0) return;
      setIsLoadingQuote(true);
      try {
        const res = await fetch(`${API_URL}/api/v1/payments/quote?amount=${amountInr}&network=${merchant?.walletNetwork || 'polygon'}`);
        if (res.ok) {
          const data = await res.json();
          setQuote(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingQuote(false);
      }
    };

    const timer = setTimeout(fetchQuote, 250);
    return () => clearTimeout(timer);
  }, [amountInr, isOpen, merchant?.walletNetwork]);

  useEffect(() => {
    if (!paymentData?.orderId) return;

    const socket: Socket = io(SOCKET_URL);

    socket.on('connect', () => {
      socket.emit('subscribe:order', paymentData.orderId);
    });

    socket.on(SOCKET_CHANNELS.PAYMENT_STATUS_UPDATE, (update: any) => {
      if (update.orderId === paymentData.orderId) {
        setCurrentStatus(update.status);
        if (update.txHash) {
          setTxHash(update.txHash);
        }
        if (update.status === 'COMPLETED') {
          onPaymentSuccess();
        }
      }
    });

    return () => {
      socket.disconnect();
    };
  }, [paymentData?.orderId, onPaymentSuccess]);

  useEffect(() => {
    if (step !== 'qr' || currentStatus === 'COMPLETED') return;

    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setCurrentStatus('EXPIRED');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [step, currentStatus]);

  if (!isOpen) return null;

  const handleCreateOrder = async () => {
    if (amountInr < 10) return;
    setIsSubmitting(true);

    try {
      const res = await fetch(`${API_URL}/api/v1/payments/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountInr,
          merchantId: merchant?.id,
          walletAddress: merchant?.walletAddress,
          walletNetwork: merchant?.walletNetwork
        })
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to create payment');
      }

      const data: CreatePaymentResponse = await res.json();
      setPaymentData(data);
      setCurrentStatus('PENDING');
      setTimeLeft(data.validSeconds || 600);
      setStep('qr');
    } catch (e: any) {
      alert(`Error: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentData?.orderId || !utrInput.trim()) return;

    setIsSubmittingUtr(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/payments/${paymentData.orderId}/verify-utr`, {
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

      setShowUtrInput(false);
    } catch (err: any) {
      alert(`UTR Error: ${err.message}`);
    } finally {
      setIsSubmittingUtr(false);
    }
  };

  const handleSimulatePayment = async () => {
    if (!paymentData?.orderId) return;
    setIsSimulating(true);
    try {
      const res = await fetch(`${API_URL}/api/v1/payments/${paymentData.orderId}/simulate`, {
        method: 'POST'
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Simulation failed');
      }
    } catch (e: any) {
      alert(`Simulation error: ${e.message}`);
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCopyLink = () => {
    if (!paymentData?.upiDeepLink) return;
    navigator.clipboard.writeText(paymentData.upiDeepLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const getExplorerLink = (hash: string) => {
    const network = merchant?.walletNetwork || 'polygon';
    const baseUrl = USDT_CONTRACTS[network]?.explorer || 'https://polygonscan.com/tx/';
    return `${baseUrl}${hash}`;
  };

  const payeeVpaMatch = paymentData?.upiDeepLink ? paymentData.upiDeepLink.match(/pa=([^&]+)/) : null;
  const payeeVpa = payeeVpaMatch ? decodeURIComponent(payeeVpaMatch[1]) : 'merchant@icici';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <QrCode className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900">
                {step === 'input' ? 'Collect Customer Payment' : 'Scan & Pay via UPI'}
              </h3>
              <p className="text-xs text-slate-500">
                {step === 'input' ? 'Generate dynamic payment QR code' : `Order ID: ${paymentData?.orderId}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6">
          {step === 'input' ? (
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  Amount to Collect (INR)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <IndianRupee className="h-5 w-5" />
                  </div>
                  <input
                    type="number"
                    min="10"
                    step="1"
                    value={amountInr || ''}
                    onChange={e => setAmountInr(parseFloat(e.target.value) || 0)}
                    placeholder="Enter amount (e.g. 500)"
                    className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xl font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-all mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  {[100, 500, 1000, 2000, 5000].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmountInr(val)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                        amountInr === val
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                      }`}
                    >
                      ₹{val}
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-600 pb-2 border-b border-slate-200">
                  <span className="flex items-center space-x-1.5">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Live Market Price:</span>
                  </span>
                  <span className="mono font-semibold text-emerald-700">
                    1 USDT ≈ ₹{quote ? quote.rate.toFixed(2) : '89.50'}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Gross Customer Payment:</span>
                    <span className="mono text-slate-900 font-medium">₹{amountInr.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Gateway Fee (1.5%):</span>
                    <span className="mono">-₹{quote?.feeInr?.toFixed(2) || '0.00'}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Statutory TDS Section 194S (1.0%):</span>
                    <span className="mono">-₹{quote?.tdsInr?.toFixed(2) || '0.00'}</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                      You Receive (USDT)
                    </span>
                    <p className="text-[11px] text-slate-500">Delivered directly on-chain</p>
                  </div>
                  <div className="text-right">
                    <span className="text-2xl font-black text-slate-900 mono">
                      {quote ? quote.merchantReceivesUsdt.toFixed(4) : '0.0000'}
                    </span>
                    <span className="text-xs font-bold text-emerald-600 ml-1">USDT</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-xs">
                <span className="text-slate-500">Receiving Wallet:</span>
                <span className="mono text-slate-800 font-medium truncate max-w-[260px]">
                  {merchant?.walletAddress} ({merchant?.walletNetwork || 'polygon'})
                </span>
              </div>

              <button
                onClick={handleCreateOrder}
                disabled={isSubmitting || amountInr < 10}
                className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-base flex items-center justify-center space-x-2 shadow-md shadow-emerald-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Generating Dynamic QR...</span>
                  </>
                ) : (
                  <>
                    <span>Show UPI QR to Customer</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-col items-center justify-center p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
                {paymentData?.upiQrImageUrl ? (
                  <img
                    src={paymentData.upiQrImageUrl}
                    alt="UPI Dynamic QR Code"
                    className="w-60 h-60 object-contain rounded-lg border border-slate-200 p-1"
                  />
                ) : (
                  <div className="w-60 h-60 flex items-center justify-center bg-slate-100 rounded-lg text-slate-400">
                    <QrCode className="h-12 w-12 animate-pulse" />
                  </div>
                )}

                <div className="text-center space-y-0.5">
                  <div className="text-2xl font-black text-slate-900 mono">
                    ₹{paymentData?.amountInr.toFixed(2)}
                  </div>
                  <div className="inline-flex items-center space-x-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                    <span>Receiving:</span>
                    <span className="mono">{paymentData?.amountUsdt.toFixed(4)} USDT</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-100 text-[11px] text-slate-700 font-medium">
                  <span>UPI ID: <strong className="mono">{payeeVpa}</strong></span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(payeeVpa);
                      setCopiedVpa(true);
                      setTimeout(() => setCopiedVpa(false), 2000);
                    }}
                    className="text-slate-500 hover:text-slate-800"
                    title="Copy UPI ID"
                  >
                    {copiedVpa ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
                  </button>
                </div>

                <div className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-xs">
                  <span className="text-emerald-800 font-medium">Payout Destination:</span>
                  <span className="mono text-emerald-950 font-bold truncate max-w-[200px]" title={paymentData?.destinationWallet || merchant?.walletAddress}>
                    {paymentData?.destinationWallet || merchant?.walletAddress} ({paymentData?.destinationNetwork || merchant?.walletNetwork || 'polygon'})
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 space-y-3">
                <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <span className="text-slate-500 font-medium">Status:</span>
                    <span className={`font-bold uppercase tracking-wider ${
                      currentStatus === 'COMPLETED' ? 'text-emerald-600' :
                      currentStatus === 'UPI_PAID' || currentStatus === 'PROCESSING_CRYPTO' ? 'text-amber-600' :
                      'text-indigo-600 animate-pulse'
                    }`}>
                      {currentStatus === 'PENDING' && 'Waiting for UPI scan...'}
                      {currentStatus === 'UPI_PAID' && 'UPI Received! Initiating payout...'}
                      {currentStatus === 'PROCESSING_CRYPTO' && 'Broadcasting USDT on Polygon...'}
                      {currentStatus === 'COMPLETED' && 'Delivered to Wallet!'}
                      {currentStatus === 'EXPIRED' && 'QR Expired'}
                    </span>
                  </div>

                  {currentStatus !== 'COMPLETED' && currentStatus !== 'EXPIRED' && (
                    <div className="flex items-center space-x-1 text-slate-600 mono">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatTimer(timeLeft)}</span>
                    </div>
                  )}
                </div>

                {currentStatus === 'COMPLETED' && txHash && (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 space-y-2">
                    <div className="flex items-center space-x-2 text-emerald-700 text-xs font-bold">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>USDT Confirmed On-Chain</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="mono text-slate-700 truncate max-w-[220px]">
                        Tx: {txHash}
                      </span>
                      <a
                        href={getExplorerLink(txHash)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center space-x-1 text-emerald-700 hover:text-emerald-800 font-semibold underline text-xs"
                      >
                        <span>View on PolygonScan</span>
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                )}
              </div>

              {currentStatus === 'PENDING' && (
                <div className="space-y-2">
                  {!showUtrInput ? (
                    <button
                      onClick={() => setShowUtrInput(true)}
                      className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-800 font-medium text-xs flex items-center justify-center space-x-2 transition-colors"
                    >
                      <Hash className="h-3.5 w-3.5 text-emerald-600" />
                      <span>Customer Paid? Confirm with Bank UTR Number</span>
                    </button>
                  ) : (
                    <form onSubmit={handleVerifyUtr} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Enter 12-Digit Bank UTR / UPI Ref from PhonePe / GPay:
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowUtrInput(false)}
                          className="text-[10px] text-slate-400 hover:text-slate-600"
                        >
                          Cancel
                        </button>
                      </div>
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
                  )}
                </div>
              )}

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {paymentData?.upiDeepLink && (
                    <a
                      href={paymentData.upiDeepLink}
                      className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-medium text-xs flex items-center justify-center space-x-1.5 transition-colors"
                    >
                      <Smartphone className="h-4 w-4" />
                      <span>Open in UPI App</span>
                    </a>
                  )}

                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs flex items-center justify-center transition-colors"
                    title="Copy UPI Deep Link"
                  >
                    {copiedLink ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </button>
                </div>

                {currentStatus === 'PENDING' && (
                  <button
                    onClick={handleSimulatePayment}
                    disabled={isSimulating}
                    className="w-full py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 font-semibold text-xs flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                    <span>{isSimulating ? 'Simulating UPI Payment...' : '⚡ Test Simulator: Trigger Instant Confirmation'}</span>
                  </button>
                )}

                {currentStatus === 'COMPLETED' && (
                  <button
                    onClick={() => {
                      setStep('input');
                      setAmountInr(500);
                      setPaymentData(null);
                      setCurrentStatus('PENDING');
                      setUtrInput('');
                    }}
                    className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center space-x-2 transition-all shadow-md shadow-emerald-600/20"
                  >
                    <span>Collect Another Payment</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Navbar } from './components/Navbar';
import { WalletConnectSection } from './components/WalletConnectSection';
import { DashboardOverview } from './components/DashboardOverview';
import { TransactionsTable } from './components/TransactionsTable';
import { CollectPaymentModal } from './components/CollectPaymentModal';
import { SettingsModal } from './components/SettingsModal';
import { API_URL, SOCKET_URL } from './config';
import { Merchant, Order, DashboardStats, DEFAULT_RATE, SOCKET_CHANNELS } from '@upi-crypto/shared';

export function App() {
  const [merchant, setMerchant] = useState<Merchant | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentRate, setCurrentRate] = useState<number>(DEFAULT_RATE.INR_PER_USDT);
  const [isCollectOpen, setIsCollectOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const fetchData = useCallback(async (targetMerchantId?: string) => {
    try {
      let activeId = targetMerchantId || localStorage.getItem('connected_merchant_id') || 'merchant-default-001';

      let merchantRes = await fetch(`${API_URL}/api/v1/merchants/profile?merchantId=${activeId}`);
      if (!merchantRes.ok && activeId !== 'merchant-default-001') {
        const savedWallet = localStorage.getItem('connected_wallet');
        const savedNetwork = localStorage.getItem('connected_network') || 'polygon';
        if (savedWallet) {
          const connectRes = await fetch(`${API_URL}/api/v1/merchants/connect-wallet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ walletAddress: savedWallet, walletNetwork: savedNetwork })
          });
          if (connectRes.ok) {
            const data = await connectRes.json();
            activeId = data.merchant.id;
            localStorage.setItem('connected_merchant_id', activeId);
            merchantRes = await fetch(`${API_URL}/api/v1/merchants/profile?merchantId=${activeId}`);
          }
        }
      }

      if (merchantRes.ok) {
        const m = await merchantRes.json();
        setMerchant(m);
      }

      const statsRes = await fetch(`${API_URL}/api/v1/merchants/stats?merchantId=${activeId}`);
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }

      const ordersRes = await fetch(`${API_URL}/api/v1/merchants/transactions?merchantId=${activeId}`);
      if (ordersRes.ok) {
        const o = await ordersRes.json();
        setOrders(o);
      }

      const quoteRes = await fetch(`${API_URL}/api/v1/payments/quote?amount=500`);
      if (quoteRes.ok) {
        const q = await quoteRes.json();
        setCurrentRate(q.rate);
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const socket: Socket = io(SOCKET_URL);
    const activeId = merchant?.id || localStorage.getItem('connected_merchant_id') || 'merchant-default-001';

    socket.on('connect', () => {
      socket.emit('subscribe:merchant', activeId);
    });

    socket.on(SOCKET_CHANNELS.PAYMENT_STATUS_UPDATE, () => {
      fetchData(activeId);
    });

    socket.on(SOCKET_CHANNELS.RATE_UPDATE, (data: { rate: number }) => {
      if (data?.rate) setCurrentRate(data.rate);
    });

    return () => {
      socket.disconnect();
    };
  }, [fetchData, merchant?.id]);

  const handleMerchantConnected = (newMerchant: Merchant) => {
    setMerchant(newMerchant);
    fetchData(newMerchant.id);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-emerald-600 selection:text-white">
      <Navbar
        merchant={merchant}
        currentRate={currentRate}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenCollect={() => setIsCollectOpen(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <WalletConnectSection
          merchant={merchant}
          onMerchantConnected={handleMerchantConnected}
          onGenerateQrClick={() => setIsCollectOpen(true)}
        />

        <DashboardOverview
          stats={stats}
          onOpenCollect={() => setIsCollectOpen(true)}
        />

        <TransactionsTable
          orders={orders}
          onRefresh={() => fetchData(merchant?.id)}
        />
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>UPI QR to Crypto (USDT) Gateway • Compliant FIU-IND Architecture</span>
          <div className="flex items-center space-x-4 text-slate-500">
            <span>Section 194S TDS Compliant</span>
            <span>•</span>
            <span>Polygon PoS &amp; BSC Rails</span>
          </div>
        </div>
      </footer>

      <CollectPaymentModal
        isOpen={isCollectOpen}
        onClose={() => setIsCollectOpen(false)}
        merchant={merchant}
        onPaymentSuccess={() => fetchData(merchant?.id)}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        merchant={merchant}
        onMerchantUpdated={m => {
          handleMerchantConnected(m);
        }}
      />
    </div>
  );
}

export default App;

# ⚡ UPI QR → Crypto (USDT) Merchant Payment Gateway

A production-ready application allowing merchants to accept payments in **Indian Rupees (INR) via UPI QR Codes** and automatically receive the equivalent value in **USDT (Tether)** directly into their blockchain wallet (Polygon PoS / BNB Smart Chain).

---

## 🏛️ Regulatory Architecture & Key Insight

> **Critical Rule:** Major Indian Payment Gateways (Razorpay, Cashfree, PhonePe, PayU) **strictly prohibit crypto/VDA transactions** in their Acceptable Use Policies. Attempting to use standard PGs will cause account freezing and legal penalties.

### The Compliant Path:
This application integrates with **FIU-IND registered Virtual Digital Asset (VDA) On-Ramps** (e.g. **Onramp.money** / **Onmeta**). The provider:
1. Generates authentic NPCI-compliant dynamic UPI QR codes (`upi://pay?...`).
2. Collects INR via UPI (Google Pay, PhonePe, Paytm, CRED).
3. Automatically deducts the statutory **1% TDS under Section 194S** and reports PAN.
4. Programmatically dispatches **USDT** directly to the merchant's destination EVM wallet on Polygon or BSC.
5. Sends an HMAC-SHA256 authenticated webhook back to your server with on-chain confirmation.

---

## 📐 System Architecture Flow

```
[ Customer ]
     │
     │ 1. Scans Dynamic UPI QR with GPay / PhonePe / Paytm
     ▼
[ Bank / UPI Rail (INR) ]
     │
     │ 2. Payment confirmed (e.g. ₹500)
     ▼
[ Regulated On-Ramp Engine (Onramp.money) ]
     │ - Locks INR/USDT exchange quote
     │ - Deducts 1% TDS & validates KYC/PAN
     │ - Mints/transfers USDT on Polygon PoS
     ▼
[ Blockchain Network (Polygon) ] ──────────────► [ Merchant Wallet ]
     │                                            (0x71... receives ~5.54 USDT)
     │ 3. On-chain transaction hash broadcasted
     ▼
[ Backend API (Node.js/Express) ]
     │ - Verifies HMAC-SHA256 signature
     │ - Enforces idempotent processing
     │ - Verifies transaction receipt via Polygon RPC
     ▼
[ Merchant Dashboard (React/Tailwind) ]
     • Real-time WebSocket status notification
     • Direct link to PolygonScan
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v18+ or v20+ (tested on Node v22)
- **npm** or **pnpm**

### 2. Install Dependencies
```bash
npm install
```

### 3. Build Shared Library
```bash
npm run build --workspace=@upi-crypto/shared
```

### 4. Start Development Servers
Run both Backend API (`localhost:4000`) and Merchant Dashboard (`localhost:3000`):
```bash
npm run dev
```

Or run separately:
```bash
# Terminal 1: Backend API & WebSocket Server
npm run dev:api

# Terminal 2: Web Merchant Dashboard
npm run dev:web
```

Open your browser at **`http://localhost:3000`**.

---

## 🧪 Testing the Complete Flow (Sandbox Mode)

1. Open **`http://localhost:3000`**.
2. Click **"Collect Payment"** or **"Generate Dynamic QR"**.
3. Enter amount in INR (e.g., `₹500` or `₹1,000`).
4. Watch the live quote calculation:
   - Current rate: `1 USDT ≈ ₹89.50`
   - Gateway fee (1.5%) + 1% TDS (Section 194S)
   - Net USDT delivered to wallet
5. Click **"Show UPI QR to Customer"**:
   - A high-contrast dynamic QR code is displayed along with the order ID and countdown timer.
6. Click **"⚡ Test: Simulate Customer UPI Payment"**:
   - Watch the live status transition in real-time over WebSockets:
     - ⏳ `Waiting for customer scan...`
     - ⚡ `UPI Payment confirmed! Initiating USDT conversion...`
     - 🚀 `Processing KYC & 1% TDS...`
     - 🎉 `Complete! Delivered to Wallet!` with an on-chain transaction hash and clickable **PolygonScan** explorer link!
7. Check the **Payment & On-Chain Settlement History** table to see your finalized transaction logged with full audit details.

---

## 🛠️ Configuration (`.env`)

Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

| Variable | Description | Default |
|:---|:---|:---|
| `PORT` | API Server port | `4000` |
| `DATABASE_URL` | PostgreSQL connection string (falls back to local file store if absent) | `""` |
| `ONRAMP_ENVIRONMENT` | `sandbox` or `production` | `sandbox` |
| `ONRAMP_API_KEY` | Your Onramp.money / Onmeta API key | sample |
| `ONRAMP_WEBHOOK_SECRET` | HMAC secret for verifying incoming webhooks | sample |
| `POLYGON_RPC_URL` | Polygon PoS RPC endpoint for on-chain verification | `https://polygon-rpc.com` |
| `DEFAULT_MERCHANT_WALLET`| EVM address where merchant receives USDT | Sample address |

---

## 🐳 Docker Deployment

To spin up the entire production stack including PostgreSQL, Redis, API, and Web:
```bash
docker-compose up --build -d
```

Services:
- **Web Dashboard**: `http://localhost:3000`
- **Backend API**: `http://localhost:4000`
- **PostgreSQL**: `localhost:5432`
- **Redis**: `localhost:6379`

---

## 🔍 Troubleshooting Guide

### 1. Webhook Signature Mismatch
- **Symptom**: Webhook returns HTTP 401 `Signature verification failed`.
- **Cause**: The raw request body or timestamp used to compute the HMAC does not match what the on-ramp provider signed, or `ONRAMP_WEBHOOK_SECRET` is wrong.
- **Fix**: Ensure your reverse proxy does not modify the raw body before verification. In sandbox mode, test requests pass signature validation automatically.

### 2. Stale or Dropped Orders
- **Symptom**: Customer claims they paid on PhonePe, but the merchant screen is still showing "Waiting for scan".
- **Cause**: Network dropped the webhook or the customer's bank delayed the settlement.
- **Fix**: The integrated `orphan-recovery.worker.ts` runs every 2 minutes to query the on-ramp Order Status API for orders in `PENDING` state and reconciles them.

### 3. Understanding the "USDT Premium"
- **Symptom**: Forex shows \$1 = ₹84.50, but the app quotes 1 USDT = ₹89.50.
- **Reason**: India has strict capital controls (FEMA/LRS) and a 1% TDS on crypto. Domestic demand for USDT outstrips supply, leading to a persistent 3% to 6% domestic USDT premium on all Indian exchanges and on-ramps.

### 4. Destination Wallet Gas & Networks
- Always use **Polygon PoS** or **BNB Smart Chain (BSC)** for USDT delivery. Ethereum ERC-20 USDT incurs high gas fees (\$2–\$8+ per transfer), making small retail UPI payments uneconomical.

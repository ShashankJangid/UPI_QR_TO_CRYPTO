import crypto from 'crypto';
import { db } from '../db';
import { Order, LedgerEntry, LedgerPosting, LedgerAuditReport } from '@upi-crypto/shared';

const GENESIS_HASH = '0000000000000000000000000000000000000000000000000000000000000000';

export class LedgerService {
  private calculateHash(previousHash: string, entryId: string, orderId: string, timestamp: string, postings: LedgerPosting[]): string {
    const payload = `${previousHash}:${entryId}:${orderId}:${timestamp}:${JSON.stringify(postings)}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  async recordUpiPaymentCollected(order: Order, feeInr: number, tdsInr: number): Promise<LedgerEntry> {
    const lastEntry = await db.getLastLedgerEntry();
    const previousHash = lastEntry ? lastEntry.entryHash : GENESIS_HASH;

    const entryId = `LED_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const postings: LedgerPosting[] = [
      {
        account: 'assets:fiat:upi_inr_receivable',
        amount: order.amountInr,
        currency: 'INR',
        direction: 'DEBIT'
      },
      {
        account: 'revenues:gateway:platform_fee_inr',
        amount: feeInr,
        currency: 'INR',
        direction: 'CREDIT'
      },
      {
        account: 'liabilities:govt:tds_inr_payable',
        amount: tdsInr,
        currency: 'INR',
        direction: 'CREDIT'
      },
      {
        account: 'liabilities:merchants:usdt_payable',
        amount: order.amountUsdt,
        currency: 'USDT',
        direction: 'CREDIT'
      }
    ];

    const entryHash = this.calculateHash(previousHash, entryId, order.id, timestamp, postings);

    const ledgerEntry: LedgerEntry = {
      id: entryId,
      orderId: order.id,
      eventType: 'UPI_COLLECTED',
      timestamp,
      postings,
      previousHash,
      entryHash
    };

    return db.saveLedgerEntry(ledgerEntry);
  }

  async recordCryptoPayoutDispatched(order: Order): Promise<LedgerEntry> {
    const lastEntry = await db.getLastLedgerEntry();
    const previousHash = lastEntry ? lastEntry.entryHash : GENESIS_HASH;

    const entryId = `LED_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const postings: LedgerPosting[] = [
      {
        account: 'liabilities:merchants:usdt_payable',
        amount: order.amountUsdt,
        currency: 'USDT',
        direction: 'DEBIT'
      },
      {
        account: 'assets:crypto:hot_wallet_usdt',
        amount: order.amountUsdt,
        currency: 'USDT',
        direction: 'CREDIT'
      }
    ];

    const entryHash = this.calculateHash(previousHash, entryId, order.id, timestamp, postings);

    const ledgerEntry: LedgerEntry = {
      id: entryId,
      orderId: order.id,
      eventType: 'CRYPTO_DISPATCHED',
      timestamp,
      postings,
      previousHash,
      entryHash
    };

    return db.saveLedgerEntry(ledgerEntry);
  }

  async verifyLedgerIntegrity(): Promise<LedgerAuditReport> {
    const entries = await db.getAllLedgerEntries();
    let isChainValid = true;
    let hasDiscrepancy = false;
    let expectedPreviousHash = GENESIS_HASH;

    let totalInrDebited = 0;
    let totalInrCredited = 0;
    let totalUsdtDebited = 0;
    let totalUsdtCredited = 0;

    for (const entry of entries) {
      if (entry.previousHash !== expectedPreviousHash) {
        isChainValid = false;
        hasDiscrepancy = true;
      }

      const calculatedHash = this.calculateHash(
        entry.previousHash,
        entry.id,
        entry.orderId,
        entry.timestamp,
        entry.postings
      );

      if (calculatedHash !== entry.entryHash) {
        isChainValid = false;
        hasDiscrepancy = true;
      }

      expectedPreviousHash = entry.entryHash;

      for (const posting of entry.postings) {
        if (posting.currency === 'INR') {
          if (posting.direction === 'DEBIT') totalInrDebited += posting.amount;
          else totalInrCredited += posting.amount;
        } else if (posting.currency === 'USDT') {
          if (posting.direction === 'DEBIT') totalUsdtDebited += posting.amount;
          else totalUsdtCredited += posting.amount;
        }
      }
    }

    return {
      isChainValid,
      totalEntriesCount: entries.length,
      totalInrDebited: parseFloat(totalInrDebited.toFixed(2)),
      totalInrCredited: parseFloat(totalInrCredited.toFixed(2)),
      totalUsdtDebited: parseFloat(totalUsdtDebited.toFixed(4)),
      totalUsdtCredited: parseFloat(totalUsdtCredited.toFixed(4)),
      hasDiscrepancy,
      lastVerifiedAt: new Date().toISOString()
    };
  }
}

export const ledgerService = new LedgerService();

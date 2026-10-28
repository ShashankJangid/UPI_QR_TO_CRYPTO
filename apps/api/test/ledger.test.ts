import test from 'node:test';
import assert from 'node:assert/strict';
import { ledgerService } from '../src/services/ledger.service';
import { db } from '../src/db';
import { Order } from '@upi-crypto/shared';

test('Double-Entry Ledger - Integrity and Hash Chaining', async (t) => {
  await db.initialize();

  await t.test('Genesis hash links on fresh ledger entry', async () => {
    const mockOrder: Order = {
      id: 'ORD_TEST_LEDGER_001',
      merchantId: 'merchant-default-001',
      amountInr: 1000,
      amountUsdt: 10.274,
      lockedRate: 94.9,
      status: 'UPI_PAID',
      destinationWallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      destinationNetwork: 'polygon',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const entry = await ledgerService.recordUpiPaymentCollected(mockOrder, 15, 10);
    assert.ok(entry.id.startsWith('LED_'));
    assert.equal(entry.eventType, 'UPI_COLLECTED');
    assert.equal(entry.orderId, mockOrder.id);
    assert.equal(typeof entry.entryHash, 'string');
    assert.equal(entry.entryHash.length, 64);
  });

  await t.test('Crypto payout debit matches credit liabilities', async () => {
    const mockOrder: Order = {
      id: 'ORD_TEST_LEDGER_001',
      merchantId: 'merchant-default-001',
      amountInr: 1000,
      amountUsdt: 10.274,
      lockedRate: 94.9,
      status: 'COMPLETED',
      destinationWallet: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      destinationNetwork: 'polygon',
      expiresAt: new Date(Date.now() + 600000).toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const entry = await ledgerService.recordCryptoPayoutDispatched(mockOrder);
    assert.equal(entry.eventType, 'CRYPTO_DISPATCHED');
    assert.equal(entry.postings.length, 2);

    const debits = entry.postings.filter(p => p.direction === 'DEBIT');
    const credits = entry.postings.filter(p => p.direction === 'CREDIT');
    assert.equal(debits.length, 1);
    assert.equal(credits.length, 1);
    assert.equal(debits[0].amount, credits[0].amount);
  });

  await t.test('Ledger audit report verifies chain validity with 0 discrepancy', async () => {
    const report = await ledgerService.verifyLedgerIntegrity();
    assert.equal(report.isChainValid, true);
    assert.equal(report.hasDiscrepancy, false);
    assert.ok(report.totalEntriesCount >= 2);
    assert.ok(report.totalInrDebited >= 1000);
  });
});

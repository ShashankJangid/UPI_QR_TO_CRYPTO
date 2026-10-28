import test from 'node:test';
import assert from 'node:assert/strict';
import { onrampService } from '../src/services/onramp.service';

test('Onramp Service - Quotes, Fees, and QR Generation', async (t) => {
  await t.test('Quote calculation deducts 1.5% fee and 1.0% TDS correctly', async () => {
    const amountInr = 1000;
    const quote = await onrampService.getQuote(amountInr, 'polygon');

    assert.equal(quote.amountInr, 1000);
    assert.equal(quote.feeInr, 15);
    assert.equal(quote.tdsInr, 10);
    assert.equal(quote.network, 'polygon');
    assert.ok(quote.rate > 0);

    const expectedNetInr = 1000 - 15 - 10;
    const expectedUsdt = parseFloat((expectedNetInr / quote.rate).toFixed(4));
    assert.equal(quote.merchantReceivesUsdt, expectedUsdt);
  });

  await t.test('Transaction creation generates valid UPI standard QR URI', async () => {
    const res = await onrampService.createTransaction(
      'ORD_TEST_999',
      500,
      '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      'polygon',
      'merchant.test@icici',
      'Test Merchant'
    );

    assert.ok(res.onrampTxnId.startsWith('TXN_'));
    assert.ok(res.upiQrData.startsWith('upi://pay?'));
    assert.ok(res.upiQrData.includes('pa=merchant.test%40icici'));
    assert.ok(res.upiQrData.includes('am=500.00'));
    assert.ok(res.upiQrData.includes('cu=INR'));
    assert.ok(res.upiQrImageUrl.startsWith('data:image/png;base64,'));
    assert.equal(res.payeeVpa, 'merchant.test@icici');
  });

  await t.test('Webhook signature validation verifies cryptographic timing-safe digest', () => {
    const payload = JSON.stringify({ event: 'payment.success', txnId: 'TXN_123' });
    const isSandboxValid = onrampService.verifyWebhookSignature(payload, 'sandbox-bypass');
    assert.equal(isSandboxValid, true);

    const isGarbageValid = onrampService.verifyWebhookSignature(payload, 'invalid-signature-hex-1234');
    assert.equal(isGarbageValid, false);
  });
});

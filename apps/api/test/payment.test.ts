import test from 'node:test';
import assert from 'node:assert/strict';
import { paymentService } from '../src/services/payment.service';
import { db } from '../src/db';

test('Payment Service - Order Processing and UTR Security', async (t) => {
  await db.initialize();

  const testWallet = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';

  await t.test('createPayment initializes order with valid dynamic QR code', async () => {
    const payment = await paymentService.createPayment('merchant-default-001', {
      amountInr: 250,
      walletAddress: testWallet,
      walletNetwork: 'polygon'
    });

    assert.ok(payment.orderId.startsWith('ORD_'));
    assert.equal(payment.amountInr, 250);
    assert.equal(payment.destinationWallet, testWallet);
    assert.equal(payment.status, 'PENDING');
    assert.ok(payment.upiQrData.startsWith('upi://pay?'));
    assert.ok(payment.upiQrImageUrl.startsWith('data:image/png;base64,'));
  });

  await t.test('Rejects invalid EVM destination wallet address', async () => {
    await assert.rejects(
      async () => {
        await paymentService.createPayment('merchant-default-001', {
          amountInr: 250,
          walletAddress: '0xInvalidAddressLength',
          walletNetwork: 'polygon'
        });
      },
      { message: /Invalid destination EVM wallet address/ }
    );
  });

  await t.test('Rejects malformed Bank UTR numbers', async () => {
    const payment = await paymentService.createPayment('merchant-default-001', {
      amountInr: 100,
      walletAddress: testWallet,
      walletNetwork: 'polygon'
    });

    await assert.rejects(
      async () => {
        await paymentService.confirmWithUtr(payment.orderId, 'short');
      },
      { message: /Please enter a valid alphanumeric Bank UTR/ }
    );

    await assert.rejects(
      async () => {
        await paymentService.confirmWithUtr(payment.orderId, 'UTR@@##$$%%^^');
      },
      { message: /Please enter a valid alphanumeric Bank UTR/ }
    );
  });

  await t.test('Confirms order with valid unique UTR and blocks re-use across orders', async () => {
    const firstPayment = await paymentService.createPayment('merchant-default-001', {
      amountInr: 500,
      walletAddress: testWallet,
      walletNetwork: 'polygon'
    });

    const uniqueUtr = `UTR${Date.now()}UNIQ`;
    const updated = await paymentService.confirmWithUtr(firstPayment.orderId, uniqueUtr, 'customer@okaxis');

    assert.ok(updated);
    assert.equal(updated.status, 'UPI_PAID');
    assert.ok(updated.customerVpa?.includes(uniqueUtr));

    const secondPayment = await paymentService.createPayment('merchant-default-001', {
      amountInr: 600,
      walletAddress: testWallet,
      walletNetwork: 'polygon'
    });

    await assert.rejects(
      async () => {
        await paymentService.confirmWithUtr(secondPayment.orderId, uniqueUtr);
      },
      { message: /Security Alert: Bank UTR .* has already been verified/ }
    );
  });
});

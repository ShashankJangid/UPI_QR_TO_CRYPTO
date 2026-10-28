import test from 'node:test';
import assert from 'node:assert/strict';
import { blockchainService } from '../src/services/blockchain.service';

test('Blockchain Service - Nonce Mutex and Address Validation', async (t) => {
  await t.test('Validates legitimate checksummed and lowercase EVM addresses', () => {
    assert.equal(blockchainService.isValidAddress('0x70997970C51812dc3A010C7d01b50e0d17dc79C8'), true);
    assert.equal(blockchainService.isValidAddress('0x71c7656ec7ab88b098defb751b7401b5f6d8976f'), true);
    assert.equal(blockchainService.isValidAddress('0x123'), false);
    assert.equal(blockchainService.isValidAddress('invalid-hex-string'), false);
  });

  await t.test('AsyncNonceMutex serializes concurrent acquisition sequentially', async () => {
    const executionOrder: number[] = [];

    const runWithLock = async (id: number, delayMs: number) => {
      const release = await (blockchainService as any).nonceMutex.acquire();
      try {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        executionOrder.push(id);
      } finally {
        release();
      }
    };

    await Promise.all([
      runWithLock(1, 30),
      runWithLock(2, 10),
      runWithLock(3, 5)
    ]);

    assert.deepEqual(executionOrder, [1, 2, 3]);
  });

  await t.test('Relayer status returns valid structure and fallback test mode', async () => {
    const status = await blockchainService.getRelayerStatus('polygon');
    assert.equal(status.network, 'polygon');
    assert.equal(typeof status.hasPrivateKey, 'boolean');
    assert.equal(typeof status.nativeBalance, 'string');
    assert.equal(typeof status.usdtBalance, 'string');
    assert.ok(status.contractAddress.startsWith('0x'));
  });
});

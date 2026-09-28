import https from 'https';
import { wsService } from './websocket.service';
import { DEFAULT_RATE } from '@upi-crypto/shared';

export class RateService {
  private currentRate: number = DEFAULT_RATE.INR_PER_USDT;
  private lastUpdated: number = Date.now();
  private pollIntervalMs: number = 30000;
  private timer: NodeJS.Timeout | null = null;

  constructor() {
    this.fetchLiveRate();
    this.timer = setInterval(() => this.fetchLiveRate(), this.pollIntervalMs);
  }

  getCurrentRate(): number {
    return this.currentRate;
  }

  getLastUpdated(): number {
    return this.lastUpdated;
  }

  async fetchLiveRate(): Promise<number> {
    try {
      const coingeckoRate = await this.fetchFromCoinGecko();
      if (coingeckoRate && coingeckoRate > 50 && coingeckoRate < 200) {
        this.updateRate(coingeckoRate);
        return this.currentRate;
      }
    } catch {}

    try {
      const wazirxRate = await this.fetchFromWazirX();
      if (wazirxRate && wazirxRate > 50 && wazirxRate < 200) {
        this.updateRate(wazirxRate);
        return this.currentRate;
      }
    } catch {}

    return this.currentRate;
  }

  private updateRate(rate: number) {
    this.currentRate = parseFloat(rate.toFixed(2));
    this.lastUpdated = Date.now();
    wsService.emitRateUpdate(this.currentRate, this.lastUpdated);
  }

  private fetchFromCoinGecko(): Promise<number | null> {
    return new Promise((resolve) => {
      const req = https.get(
        'https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr',
        { headers: { 'User-Agent': 'UpiCryptoGateway/1.0' }, timeout: 5000 },
        (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json?.tether?.inr) {
                resolve(json.tether.inr);
                return;
              }
              resolve(null);
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  }

  private fetchFromWazirX(): Promise<number | null> {
    return new Promise((resolve) => {
      const req = https.get(
        'https://api.wazirx.com/sapi/v1/ticker/24hr?symbol=usdtinr',
        { headers: { 'User-Agent': 'UpiCryptoGateway/1.0' }, timeout: 5000 },
        (res) => {
          let data = '';
          res.on('data', chunk => data += chunk);
          res.on('end', () => {
            try {
              const json = JSON.parse(data);
              if (json?.lastPrice) {
                const parsed = parseFloat(json.lastPrice);
                resolve(isNaN(parsed) ? null : parsed);
                return;
              }
              resolve(null);
            } catch {
              resolve(null);
            }
          });
        }
      );
      req.on('error', () => resolve(null));
      req.on('timeout', () => { req.destroy(); resolve(null); });
    });
  }
}

export const rateService = new RateService();

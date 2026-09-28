import { ethers } from 'ethers';
import { config } from '../config';
import { BlockchainNetwork, USDT_CONTRACTS } from '@upi-crypto/shared';

const ERC20_ABI = [
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function transfer(address to, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
  'function symbol() external view returns (string)'
];

export interface RelayerStatus {
  hasPrivateKey: boolean;
  address: string | null;
  nativeBalance: string;
  usdtBalance: string;
  network: BlockchainNetwork;
  contractAddress: string;
}

export class BlockchainService {
  private polygonProvider: ethers.JsonRpcProvider;
  private bscProvider: ethers.JsonRpcProvider;
  private relayerWallet: ethers.Wallet | null = null;

  constructor() {
    this.polygonProvider = new ethers.JsonRpcProvider(config.blockchain.polygonRpc, undefined, { staticNetwork: true });
    this.bscProvider = new ethers.JsonRpcProvider(config.blockchain.bscRpc, undefined, { staticNetwork: true });

    if (config.relayerPrivateKey && (config.relayerPrivateKey.trim().length === 64 || config.relayerPrivateKey.startsWith('0x'))) {
      try {
        const cleanKey = config.relayerPrivateKey.startsWith('0x') 
          ? config.relayerPrivateKey 
          : `0x${config.relayerPrivateKey}`;
        this.relayerWallet = new ethers.Wallet(cleanKey, this.polygonProvider);
      } catch (err: any) {
        console.error(err.message);
      }
    }
  }

  isValidAddress(address: string): boolean {
    return ethers.isAddress(address);
  }

  getExplorerUrl(txHash: string, network: BlockchainNetwork = 'polygon'): string {
    const explorer = USDT_CONTRACTS[network]?.explorer || 'https://polygonscan.com/tx/';
    return `${explorer}${txHash}`;
  }

  async getRelayerStatus(network: BlockchainNetwork = 'polygon'): Promise<RelayerStatus> {
    if (!this.relayerWallet) {
      return {
        hasPrivateKey: false,
        address: null,
        nativeBalance: '0.00',
        usdtBalance: '0.00',
        network,
        contractAddress: USDT_CONTRACTS[network]?.address || ''
      };
    }

    try {
      const provider = network === 'bsc' ? this.bscProvider : this.polygonProvider;
      const walletWithProvider = this.relayerWallet.connect(provider);
      const address = walletWithProvider.address;

      const nativeBalWei = await provider.getBalance(address);
      const nativeBalance = parseFloat(ethers.formatEther(nativeBalWei)).toFixed(4);

      const contractAddress = USDT_CONTRACTS[network]?.address;
      let usdtBalance = '0.00';

      if (contractAddress) {
        const contract = new ethers.Contract(contractAddress, ERC20_ABI, provider);
        const decimals = await contract.decimals();
        const balUnits = await contract.balanceOf(address);
        usdtBalance = parseFloat(ethers.formatUnits(balUnits, decimals)).toFixed(4);
      }

      return {
        hasPrivateKey: true,
        address,
        nativeBalance,
        usdtBalance,
        network,
        contractAddress
      };
    } catch {
      return {
        hasPrivateKey: true,
        address: this.relayerWallet.address,
        nativeBalance: '0.00',
        usdtBalance: '0.00',
        network,
        contractAddress: USDT_CONTRACTS[network]?.address || ''
      };
    }
  }

  async sendUsdt(
    destinationWallet: string,
    amountUsdt: number,
    network: BlockchainNetwork = 'polygon'
  ): Promise<{ txHash: string; blockNumber?: number; isRealOnChain: boolean }> {
    if (!this.isValidAddress(destinationWallet)) {
      throw new Error(`Invalid destination EVM address: ${destinationWallet}`);
    }

    if (this.relayerWallet) {
      try {
        const provider = network === 'bsc' ? this.bscProvider : this.polygonProvider;
        const signer = this.relayerWallet.connect(provider);
        const usdtAddress = USDT_CONTRACTS[network]?.address;

        if (!usdtAddress) throw new Error(`Unsupported network: ${network}`);

        const contract = new ethers.Contract(usdtAddress, ERC20_ABI, signer);
        const decimals: number = await contract.decimals();
        
        const tokenAmount = ethers.parseUnits(amountUsdt.toFixed(Math.min(decimals, 4)), decimals);
        const tx = await contract.transfer(destinationWallet, tokenAmount);
        const receipt = await tx.wait(1);

        return {
          txHash: tx.hash,
          blockNumber: receipt?.blockNumber,
          isRealOnChain: true
        };
      } catch (err: any) {
        throw new Error(`Blockchain execution error: ${err.message}`);
      }
    }

    const mockHash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    return {
      txHash: mockHash,
      isRealOnChain: false
    };
  }
}

export const blockchainService = new BlockchainService();

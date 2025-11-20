import { TronWeb } from 'tronweb';
import { log } from '../vite';

export const USDT_DECIMALS = 6;
export const BALANCE_DECIMALS = 8;

export function getMasterWalletAddress(): string {
  const address = process.env.MASTER_WALLET_ADDRESS || 'THVyqrSDMBvpibitvTt4xJFWxVgY61acLu';
  
  if (!isValidTronAddress(address)) {
    throw new Error(`Invalid TRON master wallet address: ${address}`);
  }
  
  return address;
}

export function getUsdtContractAddress(): string {
  return process.env.USDT_CONTRACT_ADDRESS || 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t';
}

export function getTronGridApiKey(): string | undefined {
  return process.env.TRONGRID_API_KEY;
}

export function isValidTronAddress(address: string): boolean {
  try {
    if (!address || address.length !== 34) {
      return false;
    }
    
    if (!address.startsWith('T')) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

export function initializeTronWeb(): TronWeb {
  const apiKey = getTronGridApiKey();
  
  const config: any = {
    fullHost: 'https://api.trongrid.io',
  };
  
  if (apiKey) {
    config.headers = { 'TRON-PRO-API-KEY': apiKey };
    log('TronWeb initialized with API key');
  } else {
    log('⚠️ TronWeb initialized without API key - rate limits apply');
  }
  
  return new TronWeb(config);
}

export function convertFromSun(amountInSun: string | number): number {
  const amountBigInt = BigInt(amountInSun);
  const divisor = BigInt(10 ** USDT_DECIMALS);
  const wholePart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;
  
  const amountStr = `${wholePart}.${fractionalPart.toString().padStart(USDT_DECIMALS, '0')}`;
  const amount = parseFloat(amountStr);
  
  return parseFloat(amount.toFixed(BALANCE_DECIMALS));
}

export function formatUsdtBalance(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2);
}

export function formatUsdtForStorage(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(8);
}

export function parseUsdtAmount(amount: string | number): number {
  return parseFloat(typeof amount === 'string' ? amount : amount.toString());
}

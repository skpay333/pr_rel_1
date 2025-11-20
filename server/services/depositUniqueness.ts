import { storage } from '../storage';
import { formatUsdtBalance } from '../config/tron';

const MIN_DEPOSIT_USDT = 30;
const MAX_DEPOSIT_USDT = 20000;
const MAX_DELTA_CENTS = BigInt(1000000000); // 10 USDT in smallest units (10^8 * 10)
const DECIMAL_PLACES = 8;
const SCALE = BigInt(100000000); // 10^8 for 8 decimal places

export function validateDepositAmount(amount: number): { valid: boolean; error?: string } {
  if (amount < MIN_DEPOSIT_USDT) {
    return { valid: false, error: `Минимальная сумма пополнения ${MIN_DEPOSIT_USDT} USDT` };
  }
  if (amount > MAX_DEPOSIT_USDT) {
    return { valid: false, error: `Максимальная сумма пополнения ${MAX_DEPOSIT_USDT} USDT` };
  }
  return { valid: true };
}

function decimalStringToBigInt(value: string | number): bigint {
  let str: string;
  if (typeof value === 'number') {
    str = value.toLocaleString('en-US', { 
      useGrouping: false, 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 20 
    });
  } else {
    str = value;
  }
  
  const isNegative = str.startsWith('-');
  const absStr = isNegative ? str.slice(1) : str;
  const [intPart, decPart = ''] = absStr.split('.');
  
  if (!decPart || decPart.length <= 8) {
    const paddedDec = decPart.padEnd(8, '0');
    const result = BigInt(intPart || '0') * SCALE + BigInt(paddedDec);
    return isNegative ? -result : result;
  }
  
  const first8Digits = decPart.slice(0, 8);
  const digit9 = parseInt(decPart[8] || '0', 10);
  
  let fractionalScaled = BigInt(first8Digits);
  let integerPart = BigInt(intPart || '0');
  
  if (digit9 >= 5) {
    fractionalScaled += BigInt(1);
    
    if (fractionalScaled >= SCALE) {
      integerPart += BigInt(1);
      fractionalScaled = BigInt(0);
    }
  }
  
  const result = integerPart * SCALE + fractionalScaled;
  return isNegative ? -result : result;
}

function bigIntToDecimal(scaled: bigint): number {
  return Number(scaled) / Number(SCALE);
}

export function roundToDecimals(num: number, decimals: number): number {
  const scaled = decimalStringToBigInt(num);
  return bigIntToDecimal(scaled);
}

export async function generateUniquePayableAmount(requestedAmount: number): Promise<number> {
  const scaledRequested = decimalStringToBigInt(requestedAmount);
  
  const activeDeposits = await storage.getActiveDeposits();
  
  console.log(`[generateUniquePayableAmount] Requested: ${requestedAmount} USDT`);
  console.log(`[generateUniquePayableAmount] Found ${activeDeposits.length} active deposits`);
  
  const usedAmountsScaled = new Set<bigint>(
    activeDeposits
      .map(d => d.payableAmount ? decimalStringToBigInt(d.payableAmount) : null)
      .filter((amt): amt is bigint => amt !== null)
  );
  
  if (usedAmountsScaled.size > 0) {
    console.log(`[generateUniquePayableAmount] Used amounts: ${Array.from(usedAmountsScaled).map(amt => bigIntToDecimal(amt)).join(', ')}`);
  }
  
  if (!usedAmountsScaled.has(scaledRequested)) {
    console.log(`[generateUniquePayableAmount] Exact amount ${requestedAmount} is available, using it`);
    return bigIntToDecimal(scaledRequested);
  }
  
  console.log(`[generateUniquePayableAmount] Amount ${requestedAmount} is already in use, searching for unique variation...`);
  
  const ONE_CENT = BigInt(1000000); // 0.01 USDT in smallest units (10^8 * 0.01)
  let deltaScaled = ONE_CENT; // Start with 0.01 USDT
  let attempts = 0;
  const maxAttempts = 200; // Increased to allow for both directions
  
  while (attempts < maxAttempts && deltaScaled <= MAX_DELTA_CENTS) {
    // Try both directions: first subtract, then add
    // This gives us variations like: -0.01, +0.01, -0.02, +0.02, etc.
    
    // Try subtracting delta
    const candidateDown = scaledRequested - deltaScaled;
    if (candidateDown >= scaledRequested - MAX_DELTA_CENTS) {
      if (!usedAmountsScaled.has(candidateDown)) {
        const uniqueAmount = bigIntToDecimal(candidateDown);
        console.log(`[generateUniquePayableAmount] Found unique amount: ${uniqueAmount} (${requestedAmount} - ${bigIntToDecimal(deltaScaled)})`);
        return uniqueAmount;
      }
    }
    attempts++;
    
    // Try adding delta
    const candidateUp = scaledRequested + deltaScaled;
    if (candidateUp <= scaledRequested + MAX_DELTA_CENTS) {
      if (!usedAmountsScaled.has(candidateUp)) {
        const uniqueAmount = bigIntToDecimal(candidateUp);
        console.log(`[generateUniquePayableAmount] Found unique amount: ${uniqueAmount} (${requestedAmount} + ${bigIntToDecimal(deltaScaled)})`);
        return uniqueAmount;
      }
    }
    attempts++;
    
    deltaScaled += ONE_CENT; // Increment by 0.01 USDT
  }
  
  const requestedStr = formatUsdtBalance(bigIntToDecimal(scaledRequested));
  throw new Error(
    `Не удалось сгенерировать уникальную сумму для ${requestedStr} USDT. ` +
    `Слишком много активных депозитов с похожими суммами. Попробуйте позже.`
  );
}

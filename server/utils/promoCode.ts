import { storage } from '../storage';

function shuffleString(str: string): string {
  const arr = str.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

function generateRandomLetters(count: number): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let result = '';
  for (let i = 0; i < count; i++) {
    result += letters.charAt(Math.floor(Math.random() * letters.length));
  }
  return result;
}

export async function generatePromoCode(username: string): Promise<string> {
  let baseString = username.toUpperCase().replace(/[^A-Z]/g, '');
  
  if (baseString.length < 4) {
    const needed = 4 - baseString.length;
    baseString += generateRandomLetters(needed);
  }
  
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const promoCode = shuffleString(baseString);
    
    const existingUser = await storage.getUserByPromoCode(promoCode);
    if (!existingUser) {
      return promoCode;
    }
    
    attempts++;
  }
  
  const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return shuffleString(baseString) + randomSuffix;
}

import { TronWeb } from 'tronweb';
import { storage } from '../storage';
import { getMasterWalletAddress, getUsdtContractAddress, initializeTronWeb as initializeTronWebConfig, convertFromSun } from '../config/tron';
import { createLogger } from '../utils/logger';

const logger = createLogger('blockchain');

const SCAN_INTERVAL_MS = 15 * 1000; // 15 seconds
const SCAN_WINDOW_MS = 2 * 60 * 1000; // 2 minutes lookback window
const MAX_EVENTS_PER_REQUEST = 200;

let scanInterval: NodeJS.Timeout | null = null;
let isScanning = false;
let tronWeb: TronWeb;

interface FailedDeposit {
  depositId: string;
  txHash: string;
  amount: number;
  error: string;
  timestamp: Date;
}

const failedDeposits: FailedDeposit[] = [];

async function processTransferEvent(event: any): Promise<{ success: boolean; error?: string }> {
  try {
    const { transaction_id: txHash, result, block_timestamp } = event;
    
    if (!result || !result.to || !result.from || result.value === undefined) {
      return { success: true };
    }

    const toAddress = tronWeb.address.fromHex(result.to);
    const fromAddress = tronWeb.address.fromHex(result.from);
    const amount = convertFromSun(result.value);

    if (toAddress !== getMasterWalletAddress()) {
      return { success: true };
    }

    const existingDeposit = await storage.getDepositByTxHash(txHash);
    if (existingDeposit) {
      return { success: true };
    }

    const matchingDeposit = await storage.findPendingDepositByPayableAmount(amount);
    
    if (!matchingDeposit) {
      logger.warn(`⚠️ No matching deposit for transfer: ${amount} USDT from ${fromAddress} (tx: ${txHash})`);
      return { success: true };
    }

    const success = await storage.confirmDepositWithTransaction(
      matchingDeposit.id,
      txHash,
      amount
    );

    if (success) {
      logger.info(`✓ Confirmed deposit ${matchingDeposit.id}: ${amount} USDT for user ${matchingDeposit.userId} (tx: ${txHash})`);
      return { success: true };
    } else {
      const error = `Failed to confirm deposit ${matchingDeposit.id} with tx ${txHash}`;
      logger.error(`❌ ${error}`);
      
      failedDeposits.push({
        depositId: matchingDeposit.id,
        txHash,
        amount,
        error: 'Database transaction failed',
        timestamp: new Date(),
      });
      
      return { success: false, error };
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error('❌ Error processing transfer event', error);
    return { success: false, error: errorMsg };
  }
}

async function fetchEventsWithBlockRange(
  minTimestamp: number,
  maxTimestamp: number
): Promise<any[]> {
  const allEvents: any[] = [];
  let fingerprint: string | null = null;
  let iterationCount = 0;
  const maxIterations = 50; // Safety limit

  try {
    do {
      const options: any = {
        only_confirmed: true,
        event_name: 'Transfer',
        min_block_timestamp: minTimestamp,
        max_block_timestamp: maxTimestamp,
        order_by: 'block_timestamp,asc',
        limit: MAX_EVENTS_PER_REQUEST,
      };

      if (fingerprint) {
        options.fingerprint = fingerprint;
      }

      const response = await tronWeb.event.getEventsByContractAddress(
        getUsdtContractAddress(),
        options
      );

      if (!response.success || !response.data || response.data.length === 0) {
        break;
      }

      const relevantEvents = response.data.filter((event: any) => {
        if (!event.result || !event.result.to) {
          return false;
        }
        
        try {
          const toAddress = tronWeb.address.fromHex(event.result.to);
          return toAddress === getMasterWalletAddress();
        } catch {
          return false;
        }
      });

      allEvents.push(...relevantEvents);

      const lastEvent = response.data[response.data.length - 1] as any;
      fingerprint = lastEvent._fingerprint || null;
      
      if (!fingerprint) {
        break;
      }
      
      iterationCount++;
      if (iterationCount >= maxIterations) {
        logger.warn(`⚠️ Reached max iterations (${maxIterations}) while fetching events`);
        break;
      }

    } while (fingerprint);

    return allEvents;
  } catch (error) {
    logger.error('Error fetching events with block range', error);
    throw error;
  }
}

async function scanBlockchain(): Promise<void> {
  if (isScanning) {
    logger.warn('Previous blockchain scan still running, skipping this interval');
    return;
  }

  isScanning = true;

  try {
    const currentBlock = await tronWeb.trx.getCurrentBlock();
    const currentBlockNumber = currentBlock.block_header?.raw_data?.number || 0;
    const currentBlockTimestamp = currentBlock.block_header?.raw_data?.timestamp || Date.now();

    let scanState = await storage.getTronScanState();
    
    if (!scanState) {
      const initialTimestamp = currentBlockTimestamp - SCAN_WINDOW_MS;
      scanState = await storage.createTronScanState({
        lastProcessedBlockNumber: (currentBlockNumber - 40).toString(),
      });
      
      await storage.updateTronScanStateWithTimestamp(
        currentBlockNumber - 40,
        new Date(initialTimestamp)
      );
      
      scanState = await storage.getTronScanState();
      if (!scanState) {
        throw new Error('Failed to create scan state');
      }
    }

    const lastProcessedTimestamp = scanState.lastProcessedTimestamp?.getTime() || 
                                   (currentBlockTimestamp - SCAN_WINDOW_MS);
    
    const minTimestamp = lastProcessedTimestamp;
    const maxTimestamp = currentBlockTimestamp;

    if (maxTimestamp <= minTimestamp) {
      return;
    }

    logger.info(`Scanning blocks from timestamp ${minTimestamp} to ${maxTimestamp}...`);

    const events = await fetchEventsWithBlockRange(minTimestamp, maxTimestamp);

    logger.info(`Found ${events.length} USDT transfer(s) to master wallet in scan window`);

    let allSuccessful = true;
    const processedResults: { success: boolean; error?: string }[] = [];

    for (const event of events) {
      const result = await processTransferEvent(event);
      processedResults.push(result);
      
      if (!result.success) {
        allSuccessful = false;
        logger.error(`❌ Failed to process event tx: ${event.transaction_id} - ${result.error}`);
      }
    }

    if (!allSuccessful) {
      const failedCount = processedResults.filter(r => !r.success).length;
      logger.warn(`⚠️ WARNING: ${failedCount}/${events.length} events failed to process. Block number NOT advanced.`);
      logger.warn(`⚠️ Last processed block remains at ${scanState.lastProcessedBlockNumber}`);
      
      if (failedDeposits.length > 0) {
        logger.error('❌ FAILED DEPOSITS REQUIRING MANUAL REVIEW:');
        failedDeposits.slice(-10).forEach(fd => {
          logger.error(`   - Deposit ID: ${fd.depositId}, TX: ${fd.txHash}, Amount: ${fd.amount} USDT, Error: ${fd.error}`);
        });
      }
      return;
    }

    await storage.updateTronScanStateWithTimestamp(currentBlockNumber, new Date(currentBlockTimestamp));
    logger.info(`✓ Successfully processed all ${events.length} events (including 0 events case), advanced to block ${currentBlockNumber}`);
  } catch (error) {
    logger.error('❌ Error scanning blockchain', error);
    logger.warn(`⚠️ State NOT advanced due to error. Will retry on next scan.`);
  } finally {
    isScanning = false;
  }
}

export async function startBlockchainScanner(): Promise<void> {
  logger.info('Starting TRON blockchain scanner...');
  
  tronWeb = initializeTronWebConfig();
  
  await scanBlockchain();
  
  if (scanInterval) {
    clearInterval(scanInterval);
  }
  
  scanInterval = setInterval(async () => {
    await scanBlockchain();
  }, SCAN_INTERVAL_MS);

  const intervalSeconds = SCAN_INTERVAL_MS / 1000;
  logger.info(`Blockchain scanner started. Scans every ${intervalSeconds} seconds.`);
}

export function stopBlockchainScanner(): void {
  if (scanInterval) {
    clearInterval(scanInterval);
    scanInterval = null;
    logger.info('Blockchain scanner stopped.');
  }
}

export async function forceScan(): Promise<void> {
  await scanBlockchain();
}

export function getFailedDeposits(): FailedDeposit[] {
  return [...failedDeposits];
}

export function clearFailedDeposits(): void {
  failedDeposits.length = 0;
  logger.info('Cleared failed deposits list');
}

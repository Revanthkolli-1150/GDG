import { PatientTriage } from '../types';

const DB_NAME = 'ParamedicTriageOfflineDB';
const DB_VERSION = 1;
const STORE_NAME = 'triage_queue';

export interface OfflineSyncStatus {
  isOnline: boolean;
  pendingCount: number;
  lastSyncAt: string | null;
  syncInProgress: boolean;
}

class ParamedicOfflineQueue {
  private db: IDBDatabase | null = null;
  private isOnline: boolean = navigator.onLine;
  private syncInProgress: boolean = false;
  private lastSyncAt: string | null = null;
  private listeners: Set<(status: OfflineSyncStatus) => void> = new Set();

  constructor() {
    this.initIndexedDB();
    this.setupNetworkListeners();
  }

  private async initIndexedDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'clientRecordId' });
          store.createIndex('recordedAt', 'recordedAt', { unique: false });
        }
      };

      request.onsuccess = (event: Event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log('[IndexedDB Offline Engine] Initialized paramedic triage local queue storage.');
        this.notifyStatusChange();
        resolve();
      };

      request.onerror = (event: Event) => {
        console.error('[IndexedDB Offline Engine] Error opening local database:', request.error);
        reject(request.error);
      };
    });
  }

  private setupNetworkListeners(): void {
    window.addEventListener('online', () => {
      console.log('[Network Monitor] Cellular/WiFi Signal Restored. Triggering background queue sync...');
      this.isOnline = true;
      this.notifyStatusChange();
      this.flushQueueToServer();
    });

    window.addEventListener('offline', () => {
      console.warn('[Network Monitor] Offline mode activated. All paramedic vitals will be saved to IndexedDB.');
      this.isOnline = false;
      this.notifyStatusChange();
    });
  }

  /**
   * Enqueue patient triage vital updates into local append-only IndexedDB storage queue
   */
  public async enqueueTriageRecord(triage: PatientTriage): Promise<string> {
    const clientRecordId = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const recordToSave = {
      ...triage,
      clientRecordId,
      isSyncedFromOffline: true,
      recordedAt: triage.recordedAt || new Date().toISOString(),
    };

    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) return reject('Database not initialized');
      const tx = this.db.transaction([STORE_NAME], 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.add(recordToSave);

      req.onsuccess = () => {
        console.log(`[IndexedDB Queue] Logged offline patient triage record: ${clientRecordId}`);
        this.notifyStatusChange();

        // If online, immediately attempt background sync
        if (this.isOnline) {
          this.flushQueueToServer();
        }
        resolve(clientRecordId);
      };

      req.onerror = () => {
        console.error('[IndexedDB Queue] Failed to write offline record:', req.error);
        reject(req.error);
      };
    });
  }

  /**
   * Get all pending unsynced triage records stored in IndexedDB
   */
  public async getPendingRecords(): Promise<any[]> {
    if (!this.db) await this.initIndexedDB();

    return new Promise((resolve, reject) => {
      if (!this.db) return resolve([]);
      const tx = this.db.transaction([STORE_NAME], 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Drain IndexedDB local queue and post batch triage payload to backend endpoint
   */
  public async flushQueueToServer(): Promise<void> {
    if (this.syncInProgress || !this.isOnline) return;

    const pending = await this.getPendingRecords();
    if (pending.length === 0) return;

    this.syncInProgress = true;
    this.notifyStatusChange();

    console.log(`[Background Sync Worker] Syncing ${pending.length} offline paramedic triage records to server...`);

    const clientTxId = `tx-sync-${Date.now()}`;

    try {
      const response = await fetch('http://localhost:5000/api/triage/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: pending, clientTxId }),
      });

      if (response.ok) {
        // Clear local queue upon confirmed sync
        await this.clearSyncedRecords(pending.map(p => p.clientRecordId));
        this.lastSyncAt = new Date().toLocaleTimeString();
        console.log(`[Background Sync Worker] BATCH SYNC SUCCESSFUL. ${pending.length} records pushed.`);
      } else {
        console.warn('[Background Sync Worker] Server responded with error status. Will retry on next heartbeat.');
      }
    } catch (err) {
      console.error('[Background Sync Worker] Failed to connect to server backend:', err);
    } finally {
      this.syncInProgress = false;
      this.notifyStatusChange();
    }
  }

  private async clearSyncedRecords(recordIds: string[]): Promise<void> {
    if (!this.db) return;
    const tx = this.db.transaction([STORE_NAME], 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    recordIds.forEach(id => store.delete(id));
  }

  public subscribeStatus(callback: (status: OfflineSyncStatus) => void): () => void {
    this.listeners.add(callback);
    this.getPendingRecords().then(records => {
      callback({
        isOnline: this.isOnline,
        pendingCount: records.length,
        lastSyncAt: this.lastSyncAt,
        syncInProgress: this.syncInProgress,
      });
    });

    return () => this.listeners.delete(callback);
  }

  private async notifyStatusChange(): Promise<void> {
    const pending = await this.getPendingRecords();
    const status: OfflineSyncStatus = {
      isOnline: this.isOnline,
      pendingCount: pending.length,
      lastSyncAt: this.lastSyncAt,
      syncInProgress: this.syncInProgress,
    };
    this.listeners.forEach(cb => cb(status));
  }

  // Force Manual Simulation Toggle for Offline/Online Testing
  public toggleSimulationNetworkState(forceOnline: boolean): void {
    this.isOnline = forceOnline;
    console.log(`[Simulation Engine] Network state manually set to: ${forceOnline ? 'ONLINE' : 'OFFLINE'}`);
    this.notifyStatusChange();
    if (forceOnline) {
      this.flushQueueToServer();
    }
  }
}

export const offlineQueue = new ParamedicOfflineQueue();

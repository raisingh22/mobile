import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { axiosClient } from '../api/axiosClient';

interface QueueItem {
  id: string;
  url: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  body: any;
  timestamp: number;
}

export class SyncQueueService {
  private static STORAGE_KEY = '@optiflow:sync_queue';

  /**
   * Enqueues a failed request or action to be synced later.
   */
  static async enqueue(url: string, method: 'POST' | 'PATCH' | 'DELETE', body: any) {
    const queue = await this.getQueue();
    const item: QueueItem = {
      id: Math.random().toString(36).substring(2, 9),
      url,
      method,
      body,
      timestamp: Date.now(),
    };
    queue.push(item);
    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    console.log(`[SyncQueueService] Enqueued offline action: ${method} ${url}`);
  }

  static async getQueue(): Promise<QueueItem[]> {
    const raw = await AsyncStorage.getItem(this.STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }

  /**
   * Iterates through the offline queue and submits all items to the backend when online.
   */
  static async processQueue() {
    const state = await NetInfo.fetch();
    if (!state.isConnected) {
      console.log('[SyncQueueService] Still offline, skipping sync process.');
      return;
    }

    const queue = await this.getQueue();
    if (queue.length === 0) return;

    console.log(`[SyncQueueService] Syncing ${queue.length} offline actions...`);

    const remaining: QueueItem[] = [];

    for (const item of queue) {
      try {
        await axiosClient.request({
          url: item.url,
          method: item.method,
          data: item.body,
        });
        console.log(`[SyncQueueService] Successfully synced action ${item.id}`);
      } catch (err) {
        console.error(`[SyncQueueService] Sync failed for ${item.id}, keeping in queue`, err);
        remaining.push(item);
      }
    }

    await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(remaining));
  }
}

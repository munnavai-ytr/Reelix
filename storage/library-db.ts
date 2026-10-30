// Reelix Unified Library IndexedDB Store
// Manages User/AI Created items, Forks, Favorites, and Cached Audio Assets

export type LibraryCategory =
  | 'effects'
  | 'transitions'
  | 'text-animations'
  | 'caption-styles'
  | 'templates'
  | 'sfx'
  | 'music'
  | 'fonts'
  | 'stickers';

export interface LibraryItem {
  id: string;
  name: string;
  category: LibraryCategory;
  tags: string[];
  isBuiltIn: boolean;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
  author: 'system' | 'user' | 'ai-director' | 'ai-creator';
  source?: 'built-in' | 'freesound' | 'jamendo' | 'custom-import' | 'ai-studio';
  license?: string;
  description?: string;
  thumbnailUrl?: string; // Data URL or preview image
  // Polymorphic definition payload
  payload: any;
  // Audio specific metadata
  audioDuration?: number;
  audioBpm?: number;
  audioBlobKey?: string; // OPFS key
  audioUrl?: string; // external or blob URL
}

const DB_NAME = 'reelix_library_db';
const DB_VERSION = 1;
const STORE_NAME = 'library_items';

class LibraryDatabase {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private async getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB not supported on server'));
        return;
      }
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: any) => {
        const db = event.target.result as IDBDatabase;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
          store.createIndex('category', 'category', { unique: false });
          store.createIndex('isFavorite', 'isFavorite', { unique: false });
          store.createIndex('isBuiltIn', 'isBuiltIn', { unique: false });
          store.createIndex('updatedAt', 'updatedAt', { unique: false });
        }
      };

      request.onsuccess = (event: any) => {
        resolve(event.target.result);
      };

      request.onerror = (event: any) => {
        reject(event.target.error);
      };
    });

    return this.dbPromise;
  }

  async getAllItems(): Promise<LibraryItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getItemsByCategory(category: LibraryCategory): Promise<LibraryItem[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const index = store.index('category');
      const request = index.getAll(category);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getItem(id: string): Promise<LibraryItem | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveItem(item: LibraryItem): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteItem(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async toggleFavorite(id: string): Promise<boolean> {
    const item = await this.getItem(id);
    if (!item) return false;
    item.isFavorite = !item.isFavorite;
    item.updatedAt = Date.now();
    await this.saveItem(item);
    return item.isFavorite;
  }

  async clearAll(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

export const LibraryDB = new LibraryDatabase();

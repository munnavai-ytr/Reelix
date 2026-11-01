// IndexedDB Storage for Reelix Projects, Edit Plans, and Media Cache (Waveforms & Thumbnails)
import { EditPlan } from '../engine/types';

export interface ProjectRecord {
  id: string;
  title: string;
  duration: number;
  thumbnail?: string; // Data URL or blob URL of the first frame
  updatedAt: number;
  createdAt: number;
  editPlan: EditPlan;
}

export interface MediaCacheRecord {
  key: string;
  type: 'waveform' | 'thumbnail';
  data: unknown;
  updatedAt: number;
}

const DB_NAME = 'reelix_studio_db';
const DB_VERSION = 2;
const STORE_PROJECTS = 'projects';
const STORE_MEDIA_CACHE = 'media_cache';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      return reject(new Error('IndexedDB not supported in SSR'));
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        const store = db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt', { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_MEDIA_CACHE)) {
        db.createObjectStore(STORE_MEDIA_CACHE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export const ProjectDb = {
  async saveProject(project: ProjectRecord): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.put(project);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getProject(id: string): Promise<ProjectRecord | null> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  },

  async listProjects(): Promise<ProjectRecord[]> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readonly');
      const store = tx.objectStore(STORE_PROJECTS);
      const index = store.index('updatedAt');
      const req = index.openCursor(null, 'prev');
      const projects: ProjectRecord[] = [];

      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          projects.push(cursor.value);
          cursor.continue();
        } else {
          resolve(projects);
        }
      };
      req.onerror = () => reject(req.error);
    });
  },

  async deleteProject(id: string): Promise<void> {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = tx.objectStore(STORE_PROJECTS);
      const req = store.delete(id);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },
};

export const MediaCacheDb = {
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const db = await openDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_MEDIA_CACHE, 'readonly');
        const store = tx.objectStore(STORE_MEDIA_CACHE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result ? (req.result.data as T) : null);
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async set(key: string, type: 'waveform' | 'thumbnail', data: unknown): Promise<void> {
    try {
      const db = await openDb();
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_MEDIA_CACHE, 'readwrite');
        const store = tx.objectStore(STORE_MEDIA_CACHE);
        store.put({ key, type, data, updatedAt: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    } catch {}
  },
};

export const ProjectsDB = {
  getAll: () => ProjectDb.listProjects(),
  save: (p: ProjectRecord) => ProjectDb.saveProject(p),
  get: (id: string) => ProjectDb.getProject(id),
  delete: (id: string) => ProjectDb.deleteProject(id),
};

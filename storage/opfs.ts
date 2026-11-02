// Origin Private File System (OPFS) wrapper for fast local binary video/audio caching
// Provides storage estimation, file listing, and safe unreferenced cache pruning

export interface StorageEstimateResult {
  usedBytes: number;
  quotaBytes: number;
  usedPercent: number;
  formattedUsed: string;
  formattedQuota: string;
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export const OpfsService = {
  isSupported(): boolean {
    return typeof navigator !== 'undefined' && 'storage' in navigator && 'getDirectory' in navigator.storage;
  },

  async getRoot(): Promise<FileSystemDirectoryHandle | null> {
    if (!this.isSupported()) return null;
    try {
      return await navigator.storage.getDirectory();
    } catch {
      return null;
    }
  },

  async writeFile(filename: string, data: Blob | ArrayBuffer | Uint8Array): Promise<string> {
    const root = await this.getRoot();
    if (!root) {
      const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart]);
      return URL.createObjectURL(blob);
    }

    try {
      const cleanName = filename.replace(/^opfs:\/\//, '');
      const fileHandle = await root.getFileHandle(cleanName, { create: true });
      const writable = await fileHandle.createWritable();
      const blobData = data instanceof Blob ? data : new Blob([data as unknown as BlobPart]);
      await writable.write(blobData);
      await writable.close();
      return `opfs://${cleanName}`;
    } catch {
      const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart]);
      return URL.createObjectURL(blob);
    }
  },

  async readFile(filename: string): Promise<Blob | null> {
    const root = await this.getRoot();
    if (!root) return null;

    try {
      const cleanName = filename.replace(/^opfs:\/\//, '');
      const fileHandle = await root.getFileHandle(cleanName);
      const file = await fileHandle.getFile();
      return file;
    } catch {
      return null;
    }
  },

  async resolveToBlobUrl(uriOrUrl: string): Promise<string> {
    if (!uriOrUrl || !uriOrUrl.startsWith('opfs://')) {
      return uriOrUrl;
    }
    const blob = await this.readFile(uriOrUrl);
    if (!blob) return '';
    return URL.createObjectURL(blob);
  },

  async deleteFile(filename: string): Promise<boolean> {
    const root = await this.getRoot();
    if (!root) return false;
    try {
      const cleanName = filename.replace(/^opfs:\/\//, '');
      await root.removeEntry(cleanName);
      return true;
    } catch {
      return false;
    }
  },

  async saveBlob(filename: string, blob: Blob): Promise<string> {
    return this.writeFile(filename, blob);
  },

  /**
   * Retrieves accurate storage usage and quota via navigator.storage.estimate()
   */
  async getStorageUsage(): Promise<StorageEstimateResult> {
    if (typeof navigator !== 'undefined' && 'storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const usedBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 1024 * 1024 * 1024; // fallback 1GB
        const usedPercent = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0;
        return {
          usedBytes,
          quotaBytes,
          usedPercent,
          formattedUsed: formatBytes(usedBytes),
          formattedQuota: formatBytes(quotaBytes),
        };
      } catch {
        // fallback
      }
    }
    return {
      usedBytes: 0,
      quotaBytes: 1024 * 1024 * 1024,
      usedPercent: 0,
      formattedUsed: '0 MB',
      formattedQuota: 'Available',
    };
  },

  /**
   * Lists all files currently stored in OPFS root directory
   */
  async listOpfsFiles(): Promise<Array<{ name: string; size: number }>> {
    const files: Array<{ name: string; size: number }> = [];
    const root = await this.getRoot();
    if (!root) return files;

    try {
      // Cast for async iterator over directory entries
      const entries = (root as unknown as { entries: () => AsyncIterable<[string, FileSystemHandle]> }).entries();
      for await (const [name, handle] of entries) {
        if (handle.kind === 'file') {
          try {
            const file = await (handle as FileSystemFileHandle).getFile();
            files.push({ name, size: file.size });
          } catch {
            files.push({ name, size: 0 });
          }
        }
      }
    } catch (err) {
      console.warn('[OPFS] Could not iterate entries:', err);
    }
    return files;
  },

  /**
   * Safely deletes ONLY media files not currently referenced in any saved project
   */
  async clearUnusedCache(usedFilenamesOrUris: Set<string>): Promise<{ deletedCount: number; freedBytes: number }> {
    const root = await this.getRoot();
    if (!root) return { deletedCount: 0, freedBytes: 0 };

    const cleanUsed = new Set<string>();
    usedFilenamesOrUris.forEach((u) => cleanUsed.add(u.replace(/^opfs:\/\//, '')));

    let deletedCount = 0;
    let freedBytes = 0;

    try {
      const files = await this.listOpfsFiles();
      for (const f of files) {
        if (!cleanUsed.has(f.name)) {
          try {
            await root.removeEntry(f.name);
            deletedCount++;
            freedBytes += f.size;
          } catch {
            // skip if locked
          }
        }
      }
    } catch (err) {
      console.warn('[OPFS] Cache cleanup error:', err);
    }

    return { deletedCount, freedBytes };
  },

  async clearAll(): Promise<void> {
    const root = await this.getRoot();
    if (!root) return;
    try {
      const files = await this.listOpfsFiles();
      for (const f of files) {
        await root.removeEntry(f.name, { recursive: true }).catch(() => {});
      }
    } catch {
      // fallback
    }
  },
};

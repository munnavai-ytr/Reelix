// Origin Private File System (OPFS) wrapper for fast local binary video/audio caching

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
      // Fallback: store as object URL in memory/blob
      const blob = data instanceof Blob ? data : new Blob([data as unknown as BlobPart]);
      return URL.createObjectURL(blob);
    }

    try {
      const fileHandle = await root.getFileHandle(filename, { create: true });
      const writable = await fileHandle.createWritable();
      const blobData = data instanceof Blob ? data : new Blob([data as unknown as BlobPart]);
      await writable.write(blobData);
      await writable.close();
      return `opfs://${filename}`;
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
    if (!uriOrUrl.startsWith('opfs://')) {
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

  async clearAll(): Promise<void> {
    const root = await this.getRoot();
    if (!root) return;
    try {
      for await (const [name] of (root as any).entries()) {
        await root.removeEntry(name, { recursive: true }).catch(() => {});
      }
    } catch {
      // fallback
    }
  }
};

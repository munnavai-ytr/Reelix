// Reelix Portable Project Backup & Restore (.reelix container using fflate)
import * as fflate from 'fflate';
import { EditPlan, Layer, VideoLayer, AudioLayer, ImageLayer } from '../engine/types';
import { OpfsService } from './opfs';
import { ProjectDb, ProjectRecord } from './db';
import { BRAND } from '../ui/brand';

export interface ReelixBackupManifest {
  format: 'reelix-project-archive';
  version: string;
  appName: string;
  createdAt: number;
  project: ProjectRecord;
  mediaFiles: string[];
}

/**
 * Creates a standalone zipped .reelix archive containing the project metadata and all local OPFS media binaries.
 */
export async function createProjectBackup(plan: EditPlan): Promise<{ blob: Blob; filename: string }> {
  const zipData: Record<string, Uint8Array> = {};
  const mediaFilenames: string[] = [];

  // Extract all opfs media referenced in the plan
  const opfsUris = new Set<string>();

  for (const layer of plan.layers) {
    if (layer.type === 'video') {
      const v = layer as VideoLayer;
      if (v.src && v.src.startsWith('opfs://')) opfsUris.add(v.src);
    } else if (layer.type === 'audio') {
      const a = layer as AudioLayer;
      if (a.src && a.src.startsWith('opfs://')) opfsUris.add(a.src);
    } else if (layer.type === 'image') {
      const img = layer as ImageLayer;
      if (img.src && img.src.startsWith('opfs://')) opfsUris.add(img.src);
    }
  }

  // Load each OPFS media file into zip buffer
  for (const uri of Array.from(opfsUris)) {
    try {
      const blob = await OpfsService.readFile(uri);
      if (blob) {
        const cleanName = uri.replace(/^opfs:\/\//, '');
        const arrayBuf = await blob.arrayBuffer();
        zipData[`media/${cleanName}`] = new Uint8Array(arrayBuf);
        mediaFilenames.push(cleanName);
      }
    } catch (err) {
      console.warn(`[Backup] Could not read ${uri}:`, err);
    }
  }

  const projectRecord: ProjectRecord = {
    id: plan.id,
    title: plan.title,
    duration: plan.duration,
    updatedAt: Date.now(),
    createdAt: plan.metadata?.createdAt || Date.now(),
    editPlan: plan,
  };

  const manifest: ReelixBackupManifest = {
    format: 'reelix-project-archive',
    version: BRAND.version,
    appName: BRAND.appName,
    createdAt: Date.now(),
    project: projectRecord,
    mediaFiles: mediaFilenames,
  };

  const manifestStr = JSON.stringify(manifest, null, 2);
  zipData['manifest.json'] = fflate.strToU8(manifestStr);
  zipData['project.json'] = fflate.strToU8(JSON.stringify(projectRecord, null, 2));

  // Zip synchronous via fflate
  const zipped = fflate.zipSync(zipData, { level: 6 });
  const blob = new Blob([zipped as Uint8Array<ArrayBuffer>], { type: 'application/x-reelix+zip' });
  const sanitizedTitle = (plan.title || 'Untitled-Short').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${sanitizedTitle}.reelix`;

  return { blob, filename };
}

/**
 * Restores a project from a .reelix archive: extracts all media back to local OPFS and saves into IndexedDB.
 */
export async function restoreProjectFromBackup(fileOrBlob: Blob | File): Promise<ProjectRecord> {
  const arrayBuf = await fileOrBlob.arrayBuffer();
  const unzipped = fflate.unzipSync(new Uint8Array(arrayBuf));

  const projectJsonBytes = unzipped['project.json'] || unzipped['manifest.json'];
  if (!projectJsonBytes) {
    throw new Error('Invalid .reelix archive: missing project.json or manifest');
  }

  const rawJson = fflate.strFromU8(projectJsonBytes);
  const parsed = JSON.parse(rawJson);
  const projectRecord: ProjectRecord = parsed.project || parsed;

  if (!projectRecord.editPlan || !projectRecord.id) {
    throw new Error('Corrupted .reelix archive: missing edit plan structure');
  }

  // Restore all media files into OPFS
  for (const [filePath, fileBytes] of Object.entries(unzipped)) {
    if (filePath.startsWith('media/') && fileBytes.length > 0) {
      const filename = filePath.replace(/^media\//, '');
      try {
        await OpfsService.writeFile(filename, fileBytes);
      } catch (err) {
        console.warn(`[Restore] Failed to restore media file ${filename}:`, err);
      }
    }
  }

  // Save restored project record to IndexedDB
  await ProjectDb.saveProject({
    ...projectRecord,
    updatedAt: Date.now(),
  });

  return projectRecord;
}

/**
 * Downloads or shares the project backup on Web or Native Android.
 */
export async function downloadOrShareProjectBackup(blob: Blob, filename: string): Promise<void> {
  const isNative = typeof window !== 'undefined' &&
    !!(window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor?.isNativePlatform?.();

  if (isNative && typeof navigator !== 'undefined' && navigator.share) {
    try {
      const file = new File([blob], filename, { type: 'application/octet-stream' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: filename,
          files: [file],
        });
        return;
      }
    } catch {
      // fallback to download link
    }
  }

  // Web Browser fallback
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

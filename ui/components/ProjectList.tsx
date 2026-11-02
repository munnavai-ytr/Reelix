// Projects Gallery from IndexedDB with Real Backup & Restore (.reelix)
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ProjectDb, ProjectRecord } from '@/storage/db';
import { useStudioStore } from '@/engine/store';
import { Film, Play, Trash2, Copy, Plus, Clock, Download, Upload, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';
import { toast, promptConfirm } from './Toast';
import { useStrings } from '@/ui/strings';
import { createProjectBackup, restoreProjectFromBackup, downloadOrShareProjectBackup } from '@/storage/backup';

function createDuplicatedRecord(project: ProjectRecord): ProjectRecord {
  const timestamp = Date.now();
  return {
    ...project,
    id: `proj_${timestamp}`,
    title: `${project.title} (Copy)`,
    createdAt: timestamp,
    updatedAt: timestamp,
    editPlan: {
      ...project.editPlan,
      id: `plan_${timestamp}`,
      title: `${project.title} (Copy)`,
    },
  };
}

export function ProjectList() {
  const strings = useStrings();
  const { setPlan, setActiveTab } = useStudioStore();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRestoring, setIsRestoring] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const loadProjects = React.useCallback(async () => {
    try {
      const list = await ProjectDb.listProjects();
      setProjects(list);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    ProjectDb.listProjects().then((list) => {
      if (active) {
        setProjects(list);
        setLoading(false);
      }
    }).catch(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const handleOpenProject = (project: ProjectRecord) => {
    triggerHaptic('medium');
    setPlan(project.editPlan);
    setActiveTab('editor');
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    triggerHaptic('heavy');
    promptConfirm({
      title: strings.projects.delete,
      message: strings.projects.confirmDelete,
      confirmLabel: strings.dialogs.confirm,
      isDestructive: true,
      onConfirm: async () => {
        await ProjectDb.deleteProject(id);
        toast.info('Project deleted');
        loadProjects();
      },
    });
  };

  const handleDuplicate = async (e: React.MouseEvent, project: ProjectRecord) => {
    e.stopPropagation();
    triggerHaptic('light');
    const newRecord = createDuplicatedRecord(project);
    await ProjectDb.saveProject(newRecord);
    loadProjects();
    toast.success('Project duplicated');
  };

  const handleBackup = async (e: React.MouseEvent, project: ProjectRecord) => {
    e.stopPropagation();
    triggerHaptic('light');
    try {
      toast.info('Packaging project backup...');
      const { blob, filename } = await createProjectBackup(project.editPlan);
      await downloadOrShareProjectBackup(blob, filename);
      toast.success(`Backup created: ${filename}`);
    } catch (err) {
      console.error('[Backup Error]:', err);
      toast.error('Failed to export backup');
    }
  };

  const handleRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    triggerHaptic('medium');
    setIsRestoring(true);
    try {
      toast.info('Restoring .reelix project...');
      const restored = await restoreProjectFromBackup(file);
      await loadProjects();
      toast.success(`Project "${restored.title}" restored successfully!`);
      setPlan(restored.editPlan);
      setActiveTab('editor');
    } catch (err) {
      console.error('[Restore Error]:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to restore project');
    } finally {
      setIsRestoring(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24 font-manrope">
      {/* Header zone with Restore & New Short buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2 font-bricolage">
            <Film className="w-6 h-6 text-violet-400" />
            <span>{strings.projects.title}</span>
          </h1>
          <p className="text-xs text-[#8D8DA8] mt-0.5">
            {strings.projects.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Hidden File Picker for Restore */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".reelix,.zip"
            onChange={handleRestoreFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isRestoring}
            className="px-3.5 py-2 rounded-xl bg-[#191927] hover:bg-white/10 text-slate-200 border border-[#26263A] text-xs font-semibold flex items-center gap-1.5 transition-colors touch-target"
            title="Import .reelix backup file"
          >
            {isRestoring ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
            ) : (
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>{isRestoring ? 'Restoring...' : strings.projects.restore}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setActiveTab('create');
            }}
            className="px-4 py-2 rounded-xl brand-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/20 active:scale-95 transition-all touch-target"
          >
            <Plus className="w-4 h-4" />
            <span>New Short</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-64 rounded-3xl bg-white/[0.03] animate-pulse border border-white/5" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl bg-[#12121C] border border-[#26263A] space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto text-violet-400">
            <Film className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white font-bricolage">
              {strings.projects.emptyTitle}
            </h3>
            <p className="text-xs text-[#8D8DA8] max-w-sm mx-auto">
              {strings.projects.emptyDesc}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className="px-5 py-2.5 rounded-2xl brand-gradient text-white text-xs font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all touch-target"
          >
            Create Your First Short
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {projects.map((proj) => (
            <div
              key={proj.id}
              onClick={() => handleOpenProject(proj)}
              className="group rounded-3xl bg-[#12121C] border border-[#26263A] overflow-hidden hover:border-violet-500/40 transition-all cursor-pointer flex flex-col justify-between p-3 relative"
            >
              {/* 9:16 Thumbnail preview */}
              <div className="w-full h-44 rounded-2xl bg-[#0A0A10] border border-[#26263A] relative overflow-hidden flex items-center justify-center group-hover:scale-[1.02] transition-transform">
                {proj.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proj.thumbnail} alt={proj.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-violet-950/20 flex flex-col items-center justify-center p-3 text-center">
                    <Film className="w-8 h-8 text-violet-400/60 mb-2" />
                    <span className="text-[10px] font-mono text-[#8D8DA8] truncate max-w-full">
                      {proj.title}
                    </span>
                  </div>
                )}

                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[9px] font-mono text-slate-200">
                  {proj.duration.toFixed(1)}s
                </div>

                {/* Hover Play Icon */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                  <div className="w-10 h-10 rounded-full brand-gradient flex items-center justify-center text-white pl-0.5 shadow-lg shadow-violet-500/40">
                    <Play className="w-5 h-5 fill-white" />
                  </div>
                </div>
              </div>

              {/* Title and metadata */}
              <div className="pt-3 space-y-1">
                <h4 className="text-xs font-bold text-white truncate">{proj.title}</h4>
                <div className="flex items-center justify-between text-[10px] text-[#8D8DA8]">
                  <span className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" />
                    {new Date(proj.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => handleBackup(e, proj)}
                      title="Backup Project (.reelix)"
                      className="p-1 hover:text-emerald-400 transition-colors"
                      aria-label="Backup Project"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDuplicate(e, proj)}
                      title="Duplicate"
                      className="p-1 hover:text-cyan-400 transition-colors"
                      aria-label="Duplicate Project"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, proj.id)}
                      title="Delete"
                      className="p-1 hover:text-rose-400 transition-colors"
                      aria-label="Delete Project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

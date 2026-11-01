// Projects Gallery from IndexedDB with real thumbnails
'use client';

import React, { useState, useEffect } from 'react';
import { ProjectDb, ProjectRecord } from '../../storage/db';
import { useStudioStore } from '../../engine/store';
import { Film, Play, Trash2, Copy, Plus, Clock } from 'lucide-react';
import { triggerHaptic } from '../../storage/haptics';
import { toast, promptConfirm } from './Toast';

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
    }
  };
}

export function ProjectList() {
  const { setPlan, setActiveTab } = useStudioStore();
  const [projects, setProjects] = useState<ProjectRecord[]>([]);
  const [loading, setLoading] = useState(true);

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
      title: 'Delete Project',
      message: 'Are you sure you want to delete this project? This action cannot be undone.',
      confirmLabel: 'Delete',
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
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6 pb-24">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <Film className="w-6 h-6 text-violet-400" />
            <span>Saved Projects</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            100% stored in IndexedDB on this device.
          </p>
        </div>

        <button
          onClick={() => {
            triggerHaptic('light');
            setActiveTab('create');
          }}
          className="px-4 py-2 rounded-xl brand-gradient text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>New Short</span>
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className="h-64 rounded-3xl bg-white/[0.03] animate-pulse border border-white/5" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-20 px-4 rounded-3xl glass-card border border-white/5 space-y-4">
          <div className="w-16 h-16 rounded-3xl brand-gradient/20 border border-violet-500/30 flex items-center justify-center mx-auto text-violet-400">
            <Film className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-white">No Projects Saved Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Create your first vertical Short using voice recording or script text.
            </p>
          </div>
          <button
            onClick={() => setActiveTab('create')}
            className="px-5 py-2.5 rounded-2xl brand-gradient text-white text-xs font-bold shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
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
              className="group rounded-3xl glass-card border border-white/5 overflow-hidden hover:border-violet-500/40 transition-all cursor-pointer flex flex-col justify-between p-3 relative"
            >
              {/* 9:16 Thumbnail preview */}
              <div className="w-full h-44 rounded-2xl bg-[#0B0B0F] border border-white/5 relative overflow-hidden flex items-center justify-center group-hover:scale-[1.02] transition-transform">
                {proj.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proj.thumbnail} alt={proj.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full brand-gradient/10 flex flex-col items-center justify-center p-3 text-center">
                    <Film className="w-8 h-8 text-violet-400/60 mb-2" />
                    <span className="text-[10px] font-mono text-slate-400 truncate max-w-full">
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
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(proj.updatedAt).toLocaleDateString()}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => handleDuplicate(e, proj)}
                      title="Duplicate"
                      className="p-1 hover:text-cyan-400"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDelete(e, proj.id)}
                      title="Delete"
                      className="p-1 hover:text-rose-400"
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

// Studio Settings: Language, Storage Meter, Cache Pruning, API Keys & Privacy Legal Info
'use client';

import React, { useState, useEffect } from 'react';
import { ApiKeysService, ApiKeys } from '@/storage/keys';
import { PinService } from '@/storage/pin';
import { SystemPromptsService, PromptConfig } from '@/storage/system-prompts';
import { getFilteredModelLists, invalidateModelCache, FormattedModelOption } from '@/ai/models';
import {
  Key,
  Shield,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Lock,
  Unlock,
  RefreshCw,
  HardDrive,
  Trash2,
  Globe,
  Compass,
  FileText,
  HelpCircle,
  X,
  ExternalLink,
} from 'lucide-react';
import { triggerHaptic } from '@/storage/haptics';
import { toast } from './Toast';
import { useLanguageStore, useStrings, Language } from '@/ui/strings';
import { BRAND } from '@/ui/brand';
import { useStudioStore } from '@/engine/store';
import { OpfsService, StorageEstimateResult, formatBytes } from '@/storage/opfs';
import { ProjectDb, ProjectRecord } from '@/storage/db';

export function SettingsModal() {
  const strings = useStrings();
  const { lang, setLang } = useLanguageStore();
  const { setShowOnboarding } = useStudioStore();

  const [keys, setKeys] = useState<ApiKeys>(() => ApiKeysService.getKeys());
  const [promptConfig, setPromptConfig] = useState<PromptConfig>(() => SystemPromptsService.getConfig());
  const [testStatus, setTestStatus] = useState<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});

  // Dynamic model lists
  const [textModelOptions, setTextModelOptions] = useState<FormattedModelOption[]>([]);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  // Storage and project stats
  const [storageStats, setStorageStats] = useState<StorageEstimateResult | null>(null);
  const [projectsList, setProjectsList] = useState<ProjectRecord[]>([]);
  const [isClearingCache, setIsClearingCache] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showShortcutsHelp, setShowShortcutsHelp] = useState(false);

  // PIN state
  const [pinEnabled, setPinEnabled] = useState(() => PinService.isPinSet());
  const [pinConfigured, setPinConfigured] = useState(() => PinService.isPinConfigured());
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');

  const loadStorageAndProjects = async () => {
    try {
      const usage = await OpfsService.getStorageUsage();
      setStorageStats(usage);
      const prjs = await ProjectDb.listProjects();
      setProjectsList(prjs);
    } catch (e) {
      console.warn('[Settings] Error loading storage:', e);
    }
  };

  const loadModels = async (force = false) => {
    setIsRefreshingModels(true);
    try {
      if (force) invalidateModelCache();
      const { textModels } = await getFilteredModelLists(force);
      setTextModelOptions(textModels);
    } catch (err) {
      console.warn('Failed to load dynamic model list:', err);
    } finally {
      setIsRefreshingModels(false);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([OpfsService.getStorageUsage(), ProjectDb.listProjects()]).then(([usage, prjs]) => {
      if (active) {
        setStorageStats(usage);
        setProjectsList(prjs);
      }
    }).catch(() => {});

    const k = ApiKeysService.getKeys();
    if (k.gemini && k.gemini.trim().length > 10) {
      getFilteredModelLists(false)
        .then(({ textModels }) => {
          if (active) setTextModelOptions(textModels);
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, []);

  const handleLanguageChange = (newLang: Language) => {
    triggerHaptic('light');
    setLang(newLang);
    toast.success(newLang === 'bn' ? 'ভাষা বাংলায় পরিবর্তিত হয়েছে।' : 'Language changed to English.');
  };

  const handleSave = () => {
    triggerHaptic('success');
    ApiKeysService.saveKeys(keys);
    SystemPromptsService.saveConfig(promptConfig);
    toast.success(lang === 'bn' ? 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে!' : 'Settings saved successfully!');
  };

  const handleModelChange = (key: 'selectedModel', val: string) => {
    triggerHaptic('light');
    const updated = { ...promptConfig, [key]: val };
    setPromptConfig(updated);
    SystemPromptsService.saveConfig({ [key]: val });
  };

  const runTest = async (type: 'gemini' | 'pexels' | 'freesound' | 'jamendo') => {
    triggerHaptic('medium');
    setTestStatus((prev) => ({ ...prev, [type]: { loading: true } }));

    let res: { success: boolean; message: string };
    if (type === 'gemini') {
      res = await ApiKeysService.testGemini(keys.gemini);
      if (res.success) {
        await loadModels(true);
      }
    } else if (type === 'pexels') {
      res = await ApiKeysService.testPexels(keys.pexels);
    } else if (type === 'freesound') {
      res = await ApiKeysService.testFreesound(keys.freesound);
    } else {
      res = await ApiKeysService.testJamendo(keys.jamendo);
    }

    setTestStatus((prev) => ({
      ...prev,
      [type]: { loading: false, success: res.success, message: res.message },
    }));

    if (res.success) {
      triggerHaptic('success');
      ApiKeysService.saveKeys({ [type]: keys[type] });
      toast.success(`${type.toUpperCase()} key verified!`);
    } else {
      triggerHaptic('error');
    }
  };

  const handleClearCacheConfirm = async () => {
    triggerHaptic('medium');
    setIsClearingCache(true);
    setShowClearConfirm(false);

    try {
      // Gather all referenced media URIs from all saved projects so active media is untouched
      const projects = await ProjectDb.listProjects();
      const usedUris = new Set<string>();

      for (const p of projects) {
        for (const layer of p.editPlan?.layers || []) {
          const src = (layer as any).src;
          if (src && typeof src === 'string' && src.startsWith('opfs://')) {
            usedUris.add(src);
          }
        }
      }

      const { deletedCount, freedBytes } = await OpfsService.clearUnusedCache(usedUris);
      await loadStorageAndProjects();
      triggerHaptic('success');
      toast.success(
        lang === 'bn'
          ? `ক্যাশ খালি হয়েছে! ${deletedCount} টি অব্যবহৃত ফাইল মুছে ${formatBytes(freedBytes)} মুক্ত করা হয়েছে।`
          : `Cache cleared! ${deletedCount} unreferenced files deleted, freed ${formatBytes(freedBytes)}.`
      );
    } catch (err) {
      console.error('[Settings] Clear cache failed:', err);
      toast.error('Failed to clear cache');
    } finally {
      setIsClearingCache(false);
    }
  };

  const handleSetPin = async () => {
    if (!newPin || newPin.length < 4) {
      setPinMessage('PIN must be at least 4 digits');
      return;
    }
    try {
      await PinService.setPin(newPin);
      setPinConfigured(true);
      setPinEnabled(true);
      setNewPin('');
      setPinMessage('PIN protection updated');
      triggerHaptic('success');
    } catch {
      setPinMessage('Failed to set PIN');
    }
  };

  const handleTogglePin = () => {
    triggerHaptic('light');
    const nextState = !pinEnabled;
    PinService.togglePinEnabled(nextState);
    setPinEnabled(nextState);
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-16 font-manrope">
      {/* Settings Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white font-bricolage">
            {strings.settings.title}
          </h1>
          <p className="text-xs text-[#8D8DA8] mt-0.5">
            {strings.settings.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowShortcutsHelp(true);
            }}
            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-[#8D8DA8] hover:text-white transition-colors"
            title="Keyboard Shortcuts"
            aria-label="Keyboard Shortcuts"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              triggerHaptic('light');
              setShowOnboarding(true);
            }}
            className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>{strings.settings.showTourButton}</span>
          </button>
        </div>
      </div>

      {/* LANGUAGE TOGGLE */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {strings.settings.languageTitle}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => handleLanguageChange('en')}
            className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
              lang === 'en'
                ? 'bg-violet-600/20 border-violet-500 text-white font-bold'
                : 'bg-[#191927] border-[#26263A] text-slate-300 hover:border-white/20'
            }`}
          >
            <div className="text-xs font-medium">English (Default)</div>
            {lang === 'en' && <CheckCircle2 className="w-4 h-4 text-violet-400" />}
          </button>

          <button
            type="button"
            onClick={() => handleLanguageChange('bn')}
            className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between ${
              lang === 'bn'
                ? 'bg-cyan-600/20 border-cyan-500 text-white font-bold'
                : 'bg-[#191927] border-[#26263A] text-slate-300 hover:border-white/20'
            }`}
          >
            <div className="text-xs font-medium font-bengali">বাংলা (Bengali)</div>
            {lang === 'bn' && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
          </button>
        </div>
      </div>

      {/* STORAGE METER & OPFS CACHE */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-4 h-4 text-violet-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {strings.settings.storageMeterTitle}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowClearConfirm(true)}
            disabled={isClearingCache}
            className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-40"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>{strings.settings.clearCacheButton}</span>
          </button>
        </div>

        {/* Progress Storage Bar */}
        {storageStats && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-slate-300">
                {storageStats.formattedUsed} {strings.settings.usedOf} {storageStats.formattedQuota}
              </span>
              <span className="text-cyan-400 font-semibold">{storageStats.usedPercent}%</span>
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-[#26263A]">
              <div
                className="h-full rounded-full brand-gradient transition-all duration-300"
                style={{ width: `${Math.max(2, storageStats.usedPercent)}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#8D8DA8] pt-1 border-t border-[#26263A]">
          <span>
            {projectsList.length} {strings.settings.projectsCount}
          </span>
          <span className="text-[11px] italic text-slate-400">
            {strings.settings.clearCacheDesc}
          </span>
        </div>
      </div>

      {/* API KEYS SECTION */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              {strings.settings.keysTitle}
            </span>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">Device-Only Storage</span>
        </div>

        <p className="text-xs text-[#8D8DA8]">
          {strings.settings.keysDesc}
        </p>

        {/* Gemini API Key */}
        <div className="space-y-2 p-3.5 rounded-xl bg-[#191927] border border-[#26263A]">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-white">Google Gemini API Key *</span>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-cyan-400 hover:text-cyan-300 text-[11px] flex items-center gap-1 font-medium"
            >
              <span>Get Free Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              placeholder="AIzaSy..."
              value={keys.gemini}
              onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
              className="flex-1 px-3 py-2 rounded-xl bg-[#0A0A10] border border-[#26263A] text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => runTest('gemini')}
              disabled={testStatus.gemini?.loading || !keys.gemini.trim()}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-40 transition-colors"
            >
              {testStatus.gemini?.loading ? 'Testing...' : 'Test'}
            </button>
          </div>
          {testStatus.gemini?.message && (
            <p className={`text-[11px] ${testStatus.gemini.success ? 'text-emerald-400' : 'text-rose-400'}`}>
              {testStatus.gemini.message}
            </p>
          )}
        </div>

        {/* Optional Keys (Pexels, Jamendo, Freesound) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Pexels */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#191927] border border-[#26263A]">
            <div className="flex justify-between text-xs font-medium text-slate-300">
              <span>Pexels (Stock)</span>
              <button
                type="button"
                onClick={() => runTest('pexels')}
                disabled={testStatus.pexels?.loading || !keys.pexels.trim()}
                className="text-cyan-400 text-[11px] font-bold"
              >
                Test
              </button>
            </div>
            <input
              type="password"
              placeholder="Pexels Key"
              value={keys.pexels}
              onChange={(e) => setKeys({ ...keys, pexels: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0A10] border border-[#26263A] text-white text-xs font-mono"
            />
          </div>

          {/* Jamendo */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#191927] border border-[#26263A]">
            <div className="flex justify-between text-xs font-medium text-slate-300">
              <span>Jamendo (Music)</span>
              <button
                type="button"
                onClick={() => runTest('jamendo')}
                disabled={testStatus.jamendo?.loading || !keys.jamendo.trim()}
                className="text-cyan-400 text-[11px] font-bold"
              >
                Test
              </button>
            </div>
            <input
              type="text"
              placeholder="Client ID"
              value={keys.jamendo}
              onChange={(e) => setKeys({ ...keys, jamendo: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0A10] border border-[#26263A] text-white text-xs font-mono"
            />
          </div>

          {/* Freesound */}
          <div className="space-y-1.5 p-3 rounded-xl bg-[#191927] border border-[#26263A]">
            <div className="flex justify-between text-xs font-medium text-slate-300">
              <span>Freesound (SFX)</span>
              <button
                type="button"
                onClick={() => runTest('freesound')}
                disabled={testStatus.freesound?.loading || !keys.freesound.trim()}
                className="text-cyan-400 text-[11px] font-bold"
              >
                Test
              </button>
            </div>
            <input
              type="password"
              placeholder="Freesound Token"
              value={keys.freesound}
              onChange={(e) => setKeys({ ...keys, freesound: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg bg-[#0A0A10] border border-[#26263A] text-white text-xs font-mono"
            />
          </div>
        </div>

        {/* Model Selection Dropdown */}
        <div className="p-3.5 rounded-xl bg-[#191927] border border-[#26263A] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>AI Director & Transcription Model</span>
            </span>
            <button
              type="button"
              onClick={() => loadModels(true)}
              disabled={isRefreshingModels || !keys.gemini.trim()}
              className="text-[10px] text-cyan-400 font-semibold flex items-center gap-1"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshingModels ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
          <select
            value={promptConfig.selectedModel || 'auto'}
            onChange={(e) => handleModelChange('selectedModel', e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-[#0A0A10] border border-[#26263A] text-white text-xs focus:border-violet-500 focus:outline-none"
          >
            <option value="auto">Auto (Optimal Flash Model)</option>
            {textModelOptions.map((m) => (
              <option key={m.name} value={m.name}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3 rounded-xl brand-gradient text-white font-bold text-xs shadow-lg shadow-violet-500/20 active:scale-95 transition-all"
        >
          Save Settings
        </button>
      </div>

      {/* LEGAL & LICENSING INFO */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#12121C] border border-[#26263A] space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-violet-400" />
          <span className="text-xs font-bold text-white uppercase tracking-wider">
            {strings.settings.legalTitle}
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          {strings.settings.privacyNote}
        </p>

        <p className="text-[11px] text-[#8D8DA8] leading-relaxed">
          {strings.settings.licensesNote}
        </p>

        <div className="pt-2 border-t border-[#26263A] flex flex-wrap items-center justify-between text-xs text-[#8D8DA8]">
          <div className="flex items-center gap-3">
            <span>
              {strings.settings.version}: <strong className="text-white font-mono">{BRAND.version}</strong>
            </span>
            <span>·</span>
            <span>
              {strings.settings.buildDate}: <strong className="text-white font-mono">{BRAND.buildDate}</strong>
            </span>
          </div>
          <div className="flex items-center gap-3">
            <a href={`mailto:${BRAND.supportEmail}`} className="text-cyan-400 hover:underline">
              {BRAND.supportEmail}
            </a>
            <span>·</span>
            <a href={BRAND.website} target="_blank" rel="noreferrer" className="text-violet-400 hover:underline">
              {BRAND.website}
            </a>
          </div>
        </div>
      </div>

      {/* IN-APP CONFIRM CLEAR CACHE MODAL */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm rounded-2xl bg-[#14141E] border border-rose-500/30 p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  {strings.settings.clearCacheTitle}
                </h3>
                <p className="text-[11px] text-[#8D8DA8]">
                  Clean up unreferenced media files
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              This will safely prune temporary cached audio and video files from OPFS. Your saved projects and edit timelines will remain intact.
            </p>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                {strings.dialogs.cancel}
              </button>
              <button
                type="button"
                onClick={handleClearCacheConfirm}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
              >
                {strings.dialogs.confirm}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KEYBOARD SHORTCUTS HELP MODAL */}
      {showShortcutsHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md rounded-2xl bg-[#14141E] border border-[#26263A] p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
                <span>{strings.shortcuts.title}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsHelp(false)}
                className="text-[#8D8DA8] hover:text-white p-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              {[
                { key: 'Space', desc: strings.shortcuts.playPause },
                { key: 'S', desc: strings.shortcuts.split },
                { key: 'Delete / Backspace', desc: strings.shortcuts.delete },
                { key: 'Ctrl+Z / ⌘Z', desc: strings.shortcuts.undo },
                { key: 'Ctrl+Shift+Z / ⌘Shift+Z', desc: strings.shortcuts.redo },
                { key: '+ / =', desc: strings.shortcuts.zoomIn },
                { key: '- / _', desc: strings.shortcuts.zoomOut },
                { key: '?', desc: strings.shortcuts.help },
              ].map((s, idx) => (
                <div key={idx} className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-slate-300">{s.desc}</span>
                  <kbd className="px-2 py-0.5 rounded bg-black/50 border border-white/10 text-cyan-300 font-mono text-[11px]">
                    {s.key}
                  </kbd>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowShortcutsHelp(false)}
              className="w-full py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold"
            >
              {strings.dialogs.close}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

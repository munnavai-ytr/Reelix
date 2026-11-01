// Settings Panel: API Keys Manager & PIN Security Configuration
'use client';

import React, { useState, useEffect } from 'react';
import { ApiKeysService, ApiKeys } from '../../storage/keys';
import { PinService } from '../../storage/pin';
import { SystemPromptsService, PromptConfig } from '../../storage/system-prompts';
import { getFilteredModelLists, invalidateModelCache, FormattedModelOption } from '../../ai/models';
import { Key, Shield, CheckCircle2, AlertCircle, Sparkles, Lock, Unlock, Eye, EyeOff, RefreshCw } from 'lucide-react';
import { triggerHaptic } from '../../storage/haptics';
import { toast } from './Toast';

export function SettingsModal() {
  const [keys, setKeys] = useState<ApiKeys>(() => ApiKeysService.getKeys());
  const [promptConfig, setPromptConfig] = useState<PromptConfig>(() => SystemPromptsService.getConfig());

  const [testStatus, setTestStatus] = useState<Record<string, { loading: boolean; success?: boolean; message?: string }>>({});
  const [showKey, setShowKey] = useState<Record<string, boolean>>({});

  // Dynamic model lists
  const [textModelOptions, setTextModelOptions] = useState<FormattedModelOption[]>([]);
  const [isRefreshingModels, setIsRefreshingModels] = useState(false);

  // PIN state
  const [pinEnabled, setPinEnabled] = useState(() => PinService.isPinSet());
  const [pinConfigured, setPinConfigured] = useState(() => PinService.isPinConfigured());
  const [newPin, setNewPin] = useState('');
  const [pinMessage, setPinMessage] = useState('');

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
    const k = ApiKeysService.getKeys();
    if (k.gemini && k.gemini.trim().length > 10) {
      getFilteredModelLists(false)
        .then(({ textModels }) => {
          setTextModelOptions(textModels);
        })
        .catch(() => {});
    }
  }, []);

  const handleSave = () => {
    triggerHaptic('success');
    ApiKeysService.saveKeys(keys);
    SystemPromptsService.saveConfig(promptConfig);
    toast.success('Settings saved successfully!');
  };

  const handleModelChange = (key: 'selectedModel', val: string) => {
    triggerHaptic('light');
    const updated = { ...promptConfig, [key]: val };
    setPromptConfig(updated);
    SystemPromptsService.saveConfig({ [key]: val });
  };

  const runTest = async (type: 'gemini' | 'pexels' | 'freesound' | 'jamendo') => {
    triggerHaptic('medium');
    setTestStatus(prev => ({ ...prev, [type]: { loading: true } }));

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

    setTestStatus(prev => ({ ...prev, [type]: { loading: false, success: res.success, message: res.message } }));
    if (res.success) {
      triggerHaptic('success');
      ApiKeysService.saveKeys({ [type]: keys[type] });
    } else {
      triggerHaptic('error');
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
      setPinMessage('Admin PIN set successfully!');
      triggerHaptic('success');
    } catch (err: unknown) {
      setPinMessage(err instanceof Error ? err.message : 'Error setting PIN');
    }
  };

  const handleTogglePin = () => {
    triggerHaptic('light');
    const nextState = !pinEnabled;
    PinService.togglePinEnabled(nextState);
    setPinEnabled(nextState);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-8 pb-24">
      <div>
        <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
          <Key className="w-6 h-6 text-violet-400" />
          <span>API Keys & Engine Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          All keys are securely stored inside your device browser local storage and used directly or through native Capacitor HTTP.
        </p>
      </div>

      {/* API Keys Configuration */}
      <div className="space-y-5">
        {/* Gemini API Key & Model Selectors */}
        <div className="p-4 sm:p-5 rounded-3xl glass-card border border-white/5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Gemini API Key</span>
                <span className="text-[10px] text-rose-400 font-bold">*Required</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Powers Director AI, clip analysis, and speech transcription</p>
            </div>
            <button
              onClick={() => setShowKey(prev => ({ ...prev, gemini: !prev.gemini }))}
              className="text-slate-400 hover:text-white p-1"
            >
              {showKey.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type={showKey.gemini ? 'text' : 'password'}
              placeholder="AIzaSy..."
              value={keys.gemini}
              onChange={(e) => setKeys({ ...keys, gemini: e.target.value })}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs font-mono focus:border-violet-500 focus:outline-none"
            />
            <button
              onClick={() => runTest('gemini')}
              disabled={testStatus.gemini?.loading || !keys.gemini.trim()}
              className="px-4 py-2.5 rounded-xl brand-gradient text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              {testStatus.gemini?.loading ? (
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5" />
              )}
              <span>Test</span>
            </button>
          </div>

          {testStatus.gemini?.message && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              testStatus.gemini.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
            }`}>
              {testStatus.gemini.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>{testStatus.gemini.message}</span>
            </div>
          )}

          {/* Model Selection Dropdown */}
          <div className="pt-3 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>AI Model Selection</span>
              </span>
              <button
                type="button"
                onClick={() => loadModels(true)}
                disabled={isRefreshingModels || !keys.gemini.trim()}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 disabled:opacity-30"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshingModels ? 'animate-spin' : ''}`} />
                <span>Refresh models</span>
              </button>
            </div>

            <div>
              <label className="text-[11px] text-slate-300 mb-1 block">Text & Vision Model</label>
              <select
                value={promptConfig.selectedModel || 'auto'}
                onChange={e => handleModelChange('selectedModel', e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs focus:border-violet-500 focus:outline-none"
              >
                <option value="auto">Auto (recommended)</option>
                {textModelOptions.map(m => (
                  <option key={m.name} value={m.name}>{m.label}</option>
                ))}
              </select>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Free tier: use a Flash model. Pro models may require paid API quotas. Auto selects the fastest available model.
            </p>
          </div>
        </div>

        {/* Pexels API Key */}
        <div className="p-4 sm:p-5 rounded-3xl glass-card border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Pexels Video API Key</span>
                <span className="text-[10px] text-slate-400">(Optional)</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Fetches real vertical 9:16 portrait stock footage</p>
            </div>
            <button
              onClick={() => setShowKey(prev => ({ ...prev, pexels: !prev.pexels }))}
              className="text-slate-400 hover:text-white p-1"
            >
              {showKey.pexels ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type={showKey.pexels ? 'text' : 'password'}
              placeholder="Pexels API Key"
              value={keys.pexels}
              onChange={(e) => setKeys({ ...keys, pexels: e.target.value })}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={() => runTest('pexels')}
              disabled={testStatus.pexels?.loading || !keys.pexels.trim()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              <span>Test</span>
            </button>
          </div>

          {testStatus.pexels?.message && (
            <div className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              testStatus.pexels.success ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'
            }`}>
              {testStatus.pexels.success ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> : <AlertCircle className="w-3.5 h-3.5 shrink-0" />}
              <span>{testStatus.pexels.message}</span>
            </div>
          )}
        </div>

        {/* Freesound API Key */}
        <div className="p-4 sm:p-5 rounded-3xl glass-card border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Freesound API Token</span>
                <span className="text-[10px] text-slate-400">(Optional)</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Fetches real whooshes, impacts, and sound effect accents</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="password"
              placeholder="Freesound Token"
              value={keys.freesound}
              onChange={(e) => setKeys({ ...keys, freesound: e.target.value })}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={() => runTest('freesound')}
              disabled={testStatus.freesound?.loading || !keys.freesound.trim()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              <span>Test</span>
            </button>
          </div>
        </div>

        {/* Jamendo Client ID */}
        <div className="p-4 sm:p-5 rounded-3xl glass-card border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>Jamendo Music Client ID</span>
                <span className="text-[10px] text-slate-400">(Optional)</span>
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">Streams Royalty-Free background music tracks</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Jamendo Client ID"
              value={keys.jamendo}
              onChange={(e) => setKeys({ ...keys, jamendo: e.target.value })}
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs font-mono focus:border-cyan-500 focus:outline-none"
            />
            <button
              onClick={() => runTest('jamendo')}
              disabled={testStatus.jamendo?.loading || !keys.jamendo.trim()}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1.5 shrink-0"
            >
              <span>Test</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save All Keys */}
      <button
        onClick={handleSave}
        className="w-full py-3.5 rounded-2xl brand-gradient text-white font-bold text-sm shadow-xl shadow-violet-500/20 active:scale-95 transition-all"
      >
        Save All Keys & Model Choices
      </button>

      {/* Admin Route PIN Lock Protection Section */}
      <div className="p-5 rounded-3xl glass-card border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 text-violet-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-sm font-bold text-white">Admin Shell PIN Lock</div>
              <div className="text-[11px] text-slate-400">Protects the /admin route with WebCrypto SHA-256</div>
            </div>
          </div>

          {pinConfigured && (
            <button
              onClick={handleTogglePin}
              className={`p-2 rounded-xl transition-colors ${
                pinEnabled ? 'bg-violet-600/30 text-violet-300' : 'bg-white/5 text-slate-400'
              }`}
            >
              {pinEnabled ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            </button>
          )}
        </div>

        <div className="space-y-3 pt-2">
          <label className="text-xs font-medium text-slate-300">Set New 4-8 Digit PIN</label>
          <div className="flex gap-2">
            <input
              type="password"
              maxLength={8}
              placeholder="e.g. 1234"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-48 px-3.5 py-2 rounded-xl bg-[#0B0B0F] border border-white/10 text-white text-xs font-mono tracking-widest text-center focus:border-violet-500 focus:outline-none"
            />
            <button
              onClick={handleSetPin}
              disabled={newPin.length < 4}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-bold disabled:opacity-30 transition-colors"
            >
              Update PIN
            </button>
          </div>
          {pinMessage && (
            <p className="text-[11px] text-cyan-300 font-mono">{pinMessage}</p>
          )}
        </div>
      </div>

      {/* Runtime Device Capability Report */}
      <div className="p-5 rounded-3xl glass-card border border-white/5 space-y-3">
        <div className="flex items-center gap-2 text-xs font-bold text-white">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Device & Hardware Capability Status</span>
        </div>
        <p className="text-[11px] text-slate-400">
          Reelix runs 100% on-device. Active capabilities on your hardware:
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <span className="text-white/60">WebCodecs</span>
            <span className="text-emerald-400 font-bold">Hardware</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <span className="text-white/60">WebGL2</span>
            <span className="text-emerald-400 font-bold">Enabled</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <span className="text-white/60">Web Audio</span>
            <span className="text-emerald-400 font-bold">Active</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <span className="text-white/60">OPFS</span>
            <span className="text-emerald-400 font-bold">Ready</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <span className="text-white/60">Haptics</span>
            <span className="text-cyan-400 font-bold">Supported</span>
          </div>
          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
            <span className="text-white/60">Format</span>
            <span className="text-violet-400 font-bold">1080×1920</span>
          </div>
        </div>
      </div>
    </div>
  );
}

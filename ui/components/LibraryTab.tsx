'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  Sparkles,
  Heart,
  Volume2,
  Play,
  Pause,
  Upload,
  Copy,
  Trash2,
  Sliders,
  Type,
  Layers,
  Wand2,
  FileCode,
  Music,
  Check,
  Tag,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { Registry } from '@/registry';
import { LibraryDB, LibraryItem, LibraryCategory } from '@/storage/library-db';
import { HapticsService } from '@/storage/haptics';
import { SoundApisService } from '@/lib/sound-apis';
import { analyzeAudioBlob } from '@/lib/bpm-detector';
import { OpfsService } from '@/storage/opfs';
import { GamificationService } from '@/storage/gamification';

interface LibraryTabProps {
  onSelectItem?: (item: any) => void;
  onOpenCreator?: (type: string, baseItem?: any) => void;
}

export const LibraryTab: React.FC<LibraryTabProps> = ({ onSelectItem, onOpenCreator }) => {
  const [selectedCategory, setSelectedCategory] = useState<LibraryCategory>('effects');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'builtin' | 'my-items' | 'favorites'>('all');
  const [dbItems, setDbItems] = useState<LibraryItem[]>([]);
  const [onlineSounds, setOnlineSounds] = useState<any[]>([]);
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [activeAudioUrl, setActiveAudioUrl] = useState<string | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [forkSuccessId, setForkSuccessId] = useState<string | null>(null);
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [importStatus, setImportStatus] = useState<string>('');

  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const categories: Array<{ id: LibraryCategory; label: string; icon: React.ReactNode }> = [
    { id: 'effects', label: 'Effects (45+)', icon: <Sliders className="w-4 h-4" /> },
    { id: 'transitions', label: 'Transitions (22+)', icon: <Layers className="w-4 h-4" /> },
    { id: 'text-animations', label: 'Text Anim (28+)', icon: <Type className="w-4 h-4" /> },
    { id: 'caption-styles', label: 'Captions (18+)', icon: <Wand2 className="w-4 h-4" /> },
    { id: 'templates', label: 'Templates (22+)', icon: <FileCode className="w-4 h-4" /> },
    { id: 'sfx', label: 'SFX & Hits', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'music', label: 'Music Tracks', icon: <Music className="w-4 h-4" /> },
    { id: 'stickers', label: 'Stickers (32+)', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'fonts', label: 'Fonts (22+)', icon: <Type className="w-4 h-4" /> },
  ];

  const loadDbItems = useCallback(async () => {
    try {
      const items = await LibraryDB.getAllItems();
      setDbItems(items);
    } catch (e) {
      console.warn('Failed loading library items from IndexedDB', e);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    LibraryDB.getAllItems().then(items => {
      if (isMounted) setDbItems(items);
    }).catch(e => console.warn('Failed loading library items from IndexedDB', e));
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle Online Sound Search (Freesound / Jamendo)
  const handleSearchOnlineSounds = async () => {
    if (!searchQuery.trim()) return;
    setIsSearchingOnline(true);
    try {
      if (selectedCategory === 'sfx') {
        const results = await SoundApisService.searchFreesound(searchQuery);
        setOnlineSounds(results);
      } else if (selectedCategory === 'music') {
        const results = await SoundApisService.searchJamendo(searchQuery);
        setOnlineSounds(results);
      }
    } catch (err: any) {
      alert(err.message || 'Sound search failed. Please check API keys in Settings.');
    } finally {
      setIsSearchingOnline(false);
    }
  };

  // Play audio preview
  const handleTogglePlayAudio = (url: string) => {
    if (activeAudioUrl === url && isPlayingAudio) {
      audioPlayerRef.current?.pause();
      setIsPlayingAudio(false);
    } else {
      if (!audioPlayerRef.current) {
        audioPlayerRef.current = new Audio();
      }
      audioPlayerRef.current.src = url;
      audioPlayerRef.current.play().catch(e => console.warn('Audio play error:', e));
      setActiveAudioUrl(url);
      setIsPlayingAudio(true);
      audioPlayerRef.current.onended = () => setIsPlayingAudio(false);
    }
  };

  // Fork a built-in item into MY ITEMS
  const handleForkItem = async (item: any) => {
    HapticsService.light();
    const forked: LibraryItem = {
      id: `${item.id}-fork-${Date.now().toString(36)}`,
      name: `${item.name} (Copy)`,
      category: selectedCategory,
      tags: [...(item.tags || []), 'forked'],
      isBuiltIn: false,
      isFavorite: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      author: 'user',
      source: 'built-in',
      payload: item,
    };
    await LibraryDB.saveItem(forked);
    await loadDbItems();
    setForkSuccessId(item.id);
    setTimeout(() => setForkSuccessId(null), 2000);
    GamificationService.recordAction('use_template');
  };

  // Toggle favorite
  const handleToggleFav = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    HapticsService.selection();
    await LibraryDB.toggleFavorite(id);
    await loadDbItems();
  };

  // Delete My Item
  const handleDeleteMyItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this item from My Items?')) {
      await LibraryDB.deleteItem(id);
      await loadDbItems();
    }
  };

  // Bulk Audio Import with Web Audio BPM detection and Gemini mood tagging
  const handleBulkAudioFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsBulkImporting(true);
    let importedCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setImportStatus(`Analyzing [${i + 1}/${files.length}]: ${file.name}...`);
      try {
        const beatResult = await analyzeAudioBlob(file);
        const opfsKey = `audio_lib_${Date.now()}_${file.name}`;
        await OpfsService.saveBlob(opfsKey, file);

        const newItem: LibraryItem = {
          id: `custom_audio_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          name: file.name.replace(/\.[^/.]+$/, ''),
          category: beatResult.duration > 20 ? 'music' : 'sfx',
          tags: [`${beatResult.bpm} BPM`, 'imported'],
          isBuiltIn: false,
          isFavorite: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          author: 'user',
          source: 'custom-import',
          audioDuration: beatResult.duration,
          audioBpm: beatResult.bpm,
          audioBlobKey: opfsKey,
          payload: { bpm: beatResult.bpm, beats: beatResult.beats },
        };

        await LibraryDB.saveItem(newItem);
        importedCount++;
      } catch (err) {
        console.warn('Error processing bulk file:', file.name, err);
      }
    }

    setIsBulkImporting(false);
    setImportStatus('');
    await loadDbItems();
    HapticsService.success();
    alert(`Successfully imported and analyzed ${importedCount} audio track(s) with real BPM detection!`);
  };

  // Gather items to display
  let itemsToRender: any[] = [];

  if (selectedCategory === 'effects') {
    itemsToRender = Registry.listEffects().map(e => ({ ...e, isBuiltIn: true }));
  } else if (selectedCategory === 'transitions') {
    itemsToRender = Registry.listTransitions().map(t => ({ ...t, isBuiltIn: true }));
  } else if (selectedCategory === 'text-animations') {
    itemsToRender = Registry.listTextAnimations().map(a => ({ ...a, isBuiltIn: true }));
  } else if (selectedCategory === 'caption-styles') {
    itemsToRender = Registry.listCaptionStyles().map(c => ({ ...c, isBuiltIn: true }));
  } else if (selectedCategory === 'templates') {
    itemsToRender = Registry.listTemplates().map(t => ({ ...t, isBuiltIn: true }));
  } else if (selectedCategory === 'stickers') {
    itemsToRender = Registry.listStickers().map(s => ({ ...s, isBuiltIn: true }));
  } else if (selectedCategory === 'fonts') {
    itemsToRender = Registry.listFonts().map(f => ({ ...f, isBuiltIn: true }));
  }

  // Merge with DB items in this category
  const myCategoryItems = dbItems.filter(item => item.category === selectedCategory);
  const myCategoryPayloads = myCategoryItems.map(item => ({
    ...item.payload,
    id: item.id,
    name: item.name,
    tags: item.tags,
    isBuiltIn: false,
    isFavorite: item.isFavorite,
    dbId: item.id,
    source: item.source,
    audioDuration: item.audioDuration,
    audioBpm: item.audioBpm,
    audioBlobKey: item.audioBlobKey,
    audioUrl: item.audioUrl,
  }));

  // Combine built-in + user items
  let allCombined = [...myCategoryPayloads, ...itemsToRender];

  // If SFX/Music and online sounds searched, include them
  if ((selectedCategory === 'sfx' || selectedCategory === 'music') && onlineSounds.length > 0) {
    allCombined = [...onlineSounds, ...allCombined];
  }

  // Apply filters
  const filtered = allCombined.filter(item => {
    if (filterType === 'builtin' && !item.isBuiltIn) return false;
    if (filterType === 'my-items' && item.isBuiltIn) return false;
    if (filterType === 'favorites' && !item.isFavorite) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = item.name?.toLowerCase().includes(q);
      const matchTag = item.tags?.some((t: string) => t.toLowerCase().includes(q));
      const matchDesc = item.description?.toLowerCase().includes(q);
      return matchName || matchTag || matchDesc;
    }
    return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#0B0B0F] text-white">
      {/* Top Header & Search Bar */}
      <div className="p-4 border-b border-white/5 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              Unified Studio Library
            </h2>
            <p className="text-xs text-white/50">
              Browse built-in assets, fork & customize, or create new with AI
            </p>
          </div>

          <div className="flex items-center gap-2">
            {(selectedCategory === 'sfx' || selectedCategory === 'music') && (
              <>
                <input
                  type="file"
                  ref={fileInputRef}
                  multiple
                  accept="audio/*"
                  className="hidden"
                  onChange={handleBulkAudioFiles}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isBulkImporting}
                  className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  {isBulkImporting ? 'Analyzing...' : 'Bulk Audio Import'}
                </button>
              </>
            )}

            <button
              onClick={() => onOpenCreator?.(selectedCategory.slice(0, -1))}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-cyan-500 hover:from-violet-500 hover:to-cyan-400 text-xs font-semibold shadow-lg shadow-violet-500/20 flex items-center gap-1.5 transition-all"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Studio Creator
            </button>
          </div>
        </div>

        {importStatus && (
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-300 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            {importStatus}
          </div>
        )}

        {/* Search & Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              placeholder={`Search ${selectedCategory}...`}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearchOnlineSounds()}
              className="w-full pl-9 pr-20 py-2 rounded-xl bg-white/5 border border-white/10 text-sm focus:outline-none focus:border-violet-500 transition-colors"
            />
            {(selectedCategory === 'sfx' || selectedCategory === 'music') && (
              <button
                onClick={handleSearchOnlineSounds}
                disabled={isSearchingOnline || !searchQuery.trim()}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition-colors"
              >
                {isSearchingOnline ? '...' : 'API Search'}
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/5 overflow-x-auto">
            {(['all', 'builtin', 'my-items', 'favorites'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setFilterType(tab)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  filterType === tab
                    ? 'bg-violet-600 text-white font-semibold'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                {tab === 'all'
                  ? 'All Items'
                  : tab === 'builtin'
                  ? 'Built-in'
                  : tab === 'my-items'
                  ? 'My Items'
                  : 'Favorites'}
              </button>
            ))}
          </div>
        </div>

        {/* Categories Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setOnlineSounds([]);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                  isSelected
                    ? 'bg-white/15 text-white border border-white/20 shadow-sm'
                    : 'bg-white/5 text-white/50 hover:text-white hover:bg-white/10 border border-transparent'
                }`}
              >
                {cat.icon}
                {cat.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid of Items */}
      <div className="flex-1 overflow-y-auto p-4">
        {filtered.length === 0 ? (
          <div className="h-64 flex flex-col items-center justify-center text-center p-6 border border-dashed border-white/10 rounded-2xl">
            <Sparkles className="w-8 h-8 text-white/20 mb-2" />
            <p className="text-sm font-semibold text-white/60">No items found</p>
            <p className="text-xs text-white/40 mt-1 max-w-sm">
              Try adjusting your search terms or use the AI Studio Creator to generate one instantly!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            <AnimatePresence>
              {filtered.map(item => {
                const isPlaying = activeAudioUrl === (item.previewUrl || item.audioUrl) && isPlayingAudio;
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => onSelectItem?.(item)}
                    className="group relative flex flex-col rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-violet-500/40 p-3 transition-all cursor-pointer"
                  >
                    {/* Badge / Status Top Bar */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          item.isBuiltIn
                            ? 'bg-white/10 text-white/60'
                            : 'bg-violet-500/20 text-violet-300'
                        }`}
                      >
                        {item.isBuiltIn ? 'Built-in' : 'My Item'}
                      </span>

                      <div className="flex items-center gap-1">
                        {item.dbId && (
                          <button
                            onClick={e => handleToggleFav(item.dbId, e)}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-rose-400 transition-colors"
                          >
                            <Heart
                              className={`w-3.5 h-3.5 ${
                                item.isFavorite ? 'fill-rose-500 text-rose-500' : ''
                              }`}
                            />
                          </button>
                        )}

                        {item.isBuiltIn ? (
                          <button
                            title="Fork into My Items"
                            onClick={e => {
                              e.stopPropagation();
                              handleForkItem(item);
                            }}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-cyan-400 transition-colors"
                          >
                            {forkSuccessId === item.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        ) : (
                          <button
                            title="Delete My Item"
                            onClick={e => handleDeleteMyItem(item.dbId, e)}
                            className="p-1 rounded-lg hover:bg-white/10 text-white/40 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview Area */}
                    <div className="h-28 rounded-xl bg-black/40 border border-white/5 flex items-center justify-center p-2 mb-2 overflow-hidden relative">
                      {/* Stickers SVG rendering */}
                      {selectedCategory === 'stickers' && item.svg && (
                        <div
                          className="w-16 h-16 flex items-center justify-center"
                          dangerouslySetInnerHTML={{ __html: item.svg }}
                        />
                      )}

                      {/* Font Preview */}
                      {selectedCategory === 'fonts' && (
                        <div className="text-center">
                          <p
                            className="text-lg font-bold text-white leading-tight"
                            style={{ fontFamily: item.family }}
                          >
                            {item.sampleText?.slice(0, 15) || 'AaBb 123'}
                          </p>
                          <span className="text-[10px] text-white/40">{item.name}</span>
                        </div>
                      )}

                      {/* Audio Waveform / Play Button */}
                      {(selectedCategory === 'sfx' || selectedCategory === 'music') && (
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              handleTogglePlayAudio(item.previewUrl || item.audioUrl);
                            }}
                            className="w-10 h-10 rounded-full bg-violet-600/80 hover:bg-violet-500 text-white flex items-center justify-center shadow-lg transition-transform hover:scale-105"
                          >
                            {isPlaying ? (
                              <Pause className="w-4 h-4" />
                            ) : (
                              <Play className="w-4 h-4 ml-0.5" />
                            )}
                          </button>
                          {item.audioBpm && (
                            <span className="text-[10px] font-mono text-cyan-400 flex items-center gap-1">
                              <Flame className="w-3 h-3" />
                              {item.audioBpm} BPM
                            </span>
                          )}
                        </div>
                      )}

                      {/* Effects / Transitions / Captions visual card */}
                      {selectedCategory !== 'stickers' &&
                        selectedCategory !== 'fonts' &&
                        selectedCategory !== 'sfx' &&
                        selectedCategory !== 'music' && (
                          <div className="text-center px-2">
                            <span className="text-xs font-semibold text-white/90 line-clamp-2">
                              {item.name}
                            </span>
                            {item.category && (
                              <span className="text-[10px] text-violet-400 font-mono block mt-1">
                                {item.category}
                              </span>
                            )}
                          </div>
                        )}

                      {/* Source/License badge */}
                      {item.source && (
                        <div className="absolute bottom-1 right-1 px-1 rounded bg-black/60 text-[9px] text-white/50 flex items-center gap-0.5">
                          <ShieldCheck className="w-2.5 h-2.5 text-cyan-400" />
                          {item.source}
                        </div>
                      )}
                    </div>

                    {/* Metadata Footer */}
                    <div className="mt-auto">
                      <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                      {item.tags && (
                        <div className="flex items-center gap-1 mt-1 overflow-hidden">
                          <Tag className="w-2.5 h-2.5 text-white/30 flex-shrink-0" />
                          <span className="text-[10px] text-white/40 truncate">
                            {item.tags.slice(0, 2).join(', ')}
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

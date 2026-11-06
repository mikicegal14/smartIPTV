import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AppConfigBackup,
  AppSettings,
  CategoryGroup,
  GlobalFilterMode,
  PlaylistSource,
  StreamItem,
  XtreamCredentials,
} from './types/iptv';
import { DEMO_M3U_CONTENT } from './data/demoPlaylist';
import { fetchM3UFromUrl, parseM3UContent } from './services/m3uParser';
import { fetchXtreamPlaylist } from './services/xtreamService';
import {
  createBackupPayload,
  deletePlaylistFromDb,
  loadAllPlaylists,
  loadFavorites,
  loadRecentIds,
  loadSettings,
  saveFavorites,
  savePlaylistToDb,
  saveRecentIds,
  saveSettings,
} from './services/storageService';
import { useWebOSRemote } from './hooks/useWebOSRemote';
import { HeaderBar } from './components/HeaderBar';
import { CategorySidebar } from './components/CategorySidebar';
import { StreamList } from './components/StreamList';
import { PreviewPanel } from './components/PreviewPanel';
import { PlaylistManagerModal } from './components/PlaylistManagerModal';
import { ColorKeyLegend } from './components/ColorKeyLegend';
import { Star } from 'lucide-react';

export const App: React.FC = () => {
  const [playlists, setPlaylists] = useState<PlaylistSource[]>([]);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<string>('ALL');
  const [globalFilter, setGlobalFilter] = useState<GlobalFilterMode>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const deferredSearchQuery = useDeferredValue(searchQuery);

  const [favorites, setFavorites] = useState<string[]>(() => loadFavorites());
  const [recentIds, setRecentIds] = useState<string[]>(() => loadRecentIds());
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());

  const [selectedStream, setSelectedStream] = useState<StreamItem | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [focusZone, setFocusZone] = useState<'categories' | 'streams'>('streams');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState<boolean>(false);

  const [toastBanner, setToastBanner] = useState<{
    text: string;
    isFavAdded?: boolean;
  } | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<number | undefined>(undefined);

  const showToast = useCallback((text: string, isFavAdded?: boolean) => {
    setToastBanner({ text, isFavAdded });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToastBanner(null);
    }, 2800);
  }, []);

  // Construye un objeto PlaylistSource a partir de sus items
  const buildPlaylistSource = (
    id: string,
    name: string,
    sourceType: PlaylistSource['sourceType'],
    items: StreamItem[],
    extra?: { url?: string; useCorsProxy?: boolean; xtream?: XtreamCredentials }
  ): PlaylistSource => {
    const uniqueGroups = new Set(items.map((item) => item.group));
    return {
      id,
      name,
      sourceType,
      url: extra?.url,
      useCorsProxy: extra?.useCorsProxy,
      xtream: extra?.xtream,
      channelCount: items.length,
      categoriesCount: uniqueGroups.size,
      updatedAt: new Date().toISOString(),
      items,
    };
  };

  // Carga inicial desde IndexedDB (o inicializa lista Demo si está vacío)
  useEffect(() => {
    let mounted = true;
    (async () => {
      const saved = await loadAllPlaylists();
      if (!mounted) return;

      if (saved.length > 0) {
        setPlaylists(saved);
        const firstStream = saved[0]?.items[0] || null;
        if (firstStream) {
          setSelectedStream(firstStream);
        }
      } else {
        // Inicializar lista Demo preconfigurada
        const demoId = 'demo_default';
        const demoName = 'Lista Demo Oficial (Canales Abiertos)';
        const parsed = parseM3UContent(DEMO_M3U_CONTENT, demoId, demoName);
        const demoSource = buildPlaylistSource(demoId, demoName, 'demo', parsed);
        await savePlaylistToDb(demoSource);
        if (!mounted) return;
        setPlaylists([demoSource]);
        if (parsed.length > 0) {
          setSelectedStream(parsed[0]);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const favoritesSet = useMemo(() => new Set(favorites), [favorites]);

  // Todos los streams de todas las listas cargadas (asegurando searchKey precalculado)
  const allStreamsAcrossPlaylists = useMemo(() => {
    return playlists.flatMap((pl) =>
      pl.items.map((item) =>
        item.searchKey
          ? item
          : {
              ...item,
              searchKey: `${item.name} ${item.group} ${item.playlistName}`.toLowerCase(),
            }
      )
    );
  }, [playlists]);

  // Streams según la lista seleccionada (o TODAS si hay una búsqueda global activa)
  const baseStreams = useMemo(() => {
    // Cuando el usuario escribe en el buscador global, buscamos en todos los listados
    if (deferredSearchQuery.trim() !== '' || selectedPlaylistId === 'ALL') {
      return allStreamsAcrossPlaylists;
    }
    const targetPl = playlists.find((p) => p.id === selectedPlaylistId);
    if (!targetPl) return allStreamsAcrossPlaylists;
    return allStreamsAcrossPlaylists.filter((s) => s.playlistId === selectedPlaylistId);
  }, [allStreamsAcrossPlaylists, playlists, selectedPlaylistId, deferredSearchQuery]);

  // Filtrado por Modo Global (Todos, Favoritos, En Vivo, VOD, Recientes)
  const streamsByGlobalMode = useMemo(() => {
    switch (globalFilter) {
      case 'favorites':
        return baseStreams.filter((s) => favoritesSet.has(s.id));
      case 'live':
        return baseStreams.filter((s) => s.contentType === 'live');
      case 'vod':
        return baseStreams.filter(
          (s) => s.contentType === 'movie' || s.contentType === 'series'
        );
      case 'recent': {
        const map = new Map(baseStreams.map((s) => [s.id, s]));
        return recentIds.map((id) => map.get(id)).filter((s): s is StreamItem => Boolean(s));
      }
      case 'all':
      default:
        return baseStreams;
    }
  }, [baseStreams, globalFilter, favoritesSet, recentIds]);

  // Categorías agrupadas con contadores basadas en el modo activo
  const categories = useMemo<CategoryGroup[]>(() => {
    const counts = new Map<string, number>();
    for (const item of streamsByGlobalMode) {
      counts.set(item.group, (counts.get(item.group) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }, [streamsByGlobalMode]);

  // Streams finales filtrados por Categoría y por Búsqueda Global (Ultra rápido con searchKey)
  const filteredStreams = useMemo(() => {
    let list = streamsByGlobalMode;

    if (selectedCategory !== 'ALL') {
      list = list.filter((s) => s.group === selectedCategory);
    }

    const q = deferredSearchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((s) =>
        s.searchKey
          ? s.searchKey.includes(q)
          : s.name.toLowerCase().includes(q) || s.group.toLowerCase().includes(q)
      );
    }

    return list;
  }, [streamsByGlobalMode, selectedCategory, deferredSearchQuery]);

  // Mantener focusedIndex dentro de límites válidos
  useEffect(() => {
    if (filteredStreams.length === 0) {
      setFocusedIndex(0);
    } else if (focusedIndex >= filteredStreams.length) {
      setFocusedIndex(0);
    }
  }, [filteredStreams.length, focusedIndex]);

  const focusedStream = filteredStreams[focusedIndex] || null;

  // Seleccionar un canal para previsualizar y registrar en Recientes
  const handleSelectStream = useCallback(
    (stream: StreamItem, index?: number) => {
      setSelectedStream(stream);
      if (typeof index === 'number') {
        setFocusedIndex(index);
      }
      setRecentIds((prev) => {
        const next = [stream.id, ...prev.filter((id) => id !== stream.id)].slice(0, 40);
        saveRecentIds(next);
        return next;
      });
    },
    []
  );

  // Alternar Favorito (Botón Amarillo o clic en estrella)
  const handleToggleFavorite = useCallback(
    (targetStream?: StreamItem | null) => {
      const streamToToggle = targetStream || focusedStream || selectedStream;
      if (!streamToToggle) return;

      setFavorites((prev) => {
        const exists = prev.includes(streamToToggle.id);
        const next = exists
          ? prev.filter((id) => id !== streamToToggle.id)
          : [streamToToggle.id, ...prev];
        saveFavorites(next);
        showToast(
          exists
            ? `Eliminado de Favoritos: ${streamToToggle.name}`
            : `Agregado a Favoritos: ${streamToToggle.name}`,
          !exists
        );
        return next;
      });
    },
    [focusedStream, selectedStream, showToast]
  );

  // Cambiar al canal anterior o siguiente
  const handleStepChannel = useCallback(
    (delta: number) => {
      if (filteredStreams.length === 0) return;
      const currentIdx = selectedStream
        ? filteredStreams.findIndex((s) => s.id === selectedStream.id)
        : focusedIndex;
      const baseIdx = currentIdx >= 0 ? currentIdx : 0;
      const nextIdx =
        (baseIdx + delta + filteredStreams.length) % filteredStreams.length;
      const nextStream = filteredStreams[nextIdx];
      if (nextStream) {
        handleSelectStream(nextStream, nextIdx);
      }
    },
    [filteredStreams, selectedStream, focusedIndex, handleSelectStream]
  );

  // Manejadores del Control Remoto LG webOS (Botón Amarillo = 405, etc.)
  const { lastRemoteKeyBadge } = useWebOSRemote({
    onYellowButton: () => {
      // Si estamos en pantalla completa, marcamos el canal en reproducción; si estamos en la lista, el canal apuntado/enfocado
      const target = isFullscreen ? selectedStream : focusedStream || selectedStream;
      handleToggleFavorite(target);
    },
    onRedButton: () => {
      setIsFullscreen(false);
      setIsPlaylistModalOpen((prev) => !prev);
    },
    onGreenButton: () => {
      setIsFullscreen(false);
      setIsPlaylistModalOpen(false);
      window.setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    },
    onBlueButton: () => {
      setIsFullscreen(false);
      setIsPlaylistModalOpen(false);
      setSelectedCategory('ALL');
      setGlobalFilter((prev) => (prev === 'favorites' ? 'all' : 'favorites'));
      showToast('Vista de Favoritos');
    },
    onBackButton: () => {
      if (isPlaylistModalOpen) {
        setIsPlaylistModalOpen(false);
      } else if (isFullscreen) {
        setIsFullscreen(false);
      } else if (searchQuery) {
        setSearchQuery('');
      }
    },
    onChannelUp: () => handleStepChannel(-1),
    onChannelDown: () => handleStepChannel(1),
    onNavigateArrow: (direction) => {
      if (isPlaylistModalOpen) return;

      if (isFullscreen) {
        if (direction === 'up' || direction === 'right') handleStepChannel(-1);
        if (direction === 'down' || direction === 'left') handleStepChannel(1);
        if (direction === 'enter') setIsFullscreen(false);
        return;
      }

      if (focusZone === 'streams') {
        if (direction === 'down') {
          setFocusedIndex((prev) =>
            Math.min( Math.max(0, filteredStreams.length - 1), prev + 1 )
          );
        } else if (direction === 'up') {
          setFocusedIndex((prev) => Math.max(0, prev - 1));
        } else if (direction === 'left') {
          setFocusZone('categories');
        } else if (direction === 'enter') {
          const current = filteredStreams[focusedIndex];
          if (current) {
            if (selectedStream?.id === current.id) {
              setIsFullscreen(true);
            } else {
              handleSelectStream(current, focusedIndex);
            }
          }
        }
      } else if (focusZone === 'categories') {
        const allCatNames = ['ALL', ...categories.map((c) => c.name)];
        const currentCatIdx = Math.max(0, allCatNames.indexOf(selectedCategory));
        if (direction === 'down') {
          const nextCat = allCatNames[Math.min(allCatNames.length - 1, currentCatIdx + 1)];
          if (nextCat) setSelectedCategory(nextCat);
        } else if (direction === 'up') {
          const prevCat = allCatNames[Math.max(0, currentCatIdx - 1)];
          if (prevCat) setSelectedCategory(prevCat);
        } else if (direction === 'right' || direction === 'enter') {
          setFocusZone('streams');
        }
      }
    },
  });

  // Acciones CRUD de Listas IPTV
  const handleAddUrlPlaylist = async (
    name: string,
    url: string,
    useCorsProxy: boolean
  ) => {
    const rawM3U = await fetchM3UFromUrl(url, useCorsProxy);
    const id = `pl_${Date.now().toString(36)}`;
    const items = parseM3UContent(rawM3U, id, name);
    if (items.length === 0) {
      throw new Error('La URL no contiene canales válidos en formato M3U/M3U8.');
    }
    const newPl = buildPlaylistSource(id, name, 'url', items, { url, useCorsProxy });
    await savePlaylistToDb(newPl);
    setPlaylists((prev) => [...prev, newPl]);
    setSelectedPlaylistId(newPl.id);
    setSelectedCategory('ALL');
    setSelectedStream(items[0]);
    showToast(`Lista "${name}" agregada (${items.length} canales)`);
  };

  const handleAddRawM3UPlaylist = async (name: string, content: string) => {
    const id = `pl_${Date.now().toString(36)}`;
    const items = parseM3UContent(content, id, name);
    if (items.length === 0) {
      throw new Error('No se encontraron canales válidos en el contenido M3U proporcionado.');
    }
    const newPl = buildPlaylistSource(id, name, 'file', items);
    await savePlaylistToDb(newPl);
    setPlaylists((prev) => [...prev, newPl]);
    setSelectedPlaylistId(newPl.id);
    setSelectedCategory('ALL');
    setSelectedStream(items[0]);
    showToast(`Lista "${name}" cargada (${items.length} canales)`);
  };

  const handleAddXtreamPlaylist = async (
    name: string,
    credentials: XtreamCredentials,
    useCorsProxy: boolean
  ) => {
    const id = `xtream_${Date.now().toString(36)}`;
    const items = await fetchXtreamPlaylist(credentials, id, name, useCorsProxy);
    const newPl = buildPlaylistSource(id, name, 'xtream', items, {
      xtream: credentials,
      useCorsProxy,
    });
    await savePlaylistToDb(newPl);
    setPlaylists((prev) => [...prev, newPl]);
    setSelectedPlaylistId(newPl.id);
    setSelectedCategory('ALL');
    setSelectedStream(items[0]);
    showToast(`Xtream "${name}" sincronizado (${items.length} canales)`);
  };

  const handleRefreshPlaylist = async (pl: PlaylistSource) => {
    if (pl.sourceType === 'url' && pl.url) {
      const raw = await fetchM3UFromUrl(pl.url, pl.useCorsProxy);
      const items = parseM3UContent(raw, pl.id, pl.name);
      const updated = buildPlaylistSource(pl.id, pl.name, 'url', items, {
        url: pl.url,
        useCorsProxy: pl.useCorsProxy,
      });
      await savePlaylistToDb(updated);
      setPlaylists((prev) => prev.map((p) => (p.id === pl.id ? updated : p)));
    } else if (pl.sourceType === 'xtream' && pl.xtream) {
      const items = await fetchXtreamPlaylist(
        pl.xtream,
        pl.id,
        pl.name,
        pl.useCorsProxy
      );
      const updated = buildPlaylistSource(pl.id, pl.name, 'xtream', items, {
        xtream: pl.xtream,
        useCorsProxy: pl.useCorsProxy,
      });
      await savePlaylistToDb(updated);
      setPlaylists((prev) => prev.map((p) => (p.id === pl.id ? updated : p)));
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    await deletePlaylistFromDb(playlistId);
    setPlaylists((prev) => {
      const remaining = prev.filter((p) => p.id !== playlistId);
      if (selectedPlaylistId === playlistId) {
        setSelectedPlaylistId('ALL');
      }
      return remaining;
    });
  };

  const handleLoadDemoPlaylist = async () => {
    const demoId = 'demo_default';
    const demoName = 'Lista Demo Oficial (Canales Abiertos)';
    const items = parseM3UContent(DEMO_M3U_CONTENT, demoId, demoName);
    const demoPl = buildPlaylistSource(demoId, demoName, 'demo', items);
    await savePlaylistToDb(demoPl);
    setPlaylists((prev) => {
      const withoutOldDemo = prev.filter((p) => p.id !== demoId);
      return [demoPl, ...withoutOldDemo];
    });
    if (!selectedStream && items.length > 0) {
      setSelectedStream(items[0]);
    }
  };

  const handleExportBackup = () => {
    const backup = createBackupPayload(playlists, favorites, recentIds, settings);
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `smart-iptv-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportBackup = async (jsonContent: string) => {
    const parsed = JSON.parse(jsonContent) as AppConfigBackup;
    if (!parsed || !Array.isArray(parsed.playlists)) {
      throw new Error('El archivo JSON no tiene el formato de respaldo de Smart IPTV.');
    }
    for (const pl of parsed.playlists) {
      await savePlaylistToDb(pl);
    }
    setPlaylists(parsed.playlists);
    if (Array.isArray(parsed.favorites)) {
      setFavorites(parsed.favorites);
      saveFavorites(parsed.favorites);
    }
    if (Array.isArray(parsed.recentIds)) {
      setRecentIds(parsed.recentIds);
      saveRecentIds(parsed.recentIds);
    }
  };

  const toggleViewMode = () => {
    setSettings((prev) => {
      const next: AppSettings = {
        ...prev,
        viewMode: prev.viewMode === 'list' ? 'grid' : 'list',
      };
      saveSettings(next);
      return next;
    });
  };

  const activeTargetStream = isFullscreen
    ? selectedStream
    : focusedStream || selectedStream;

  const handleSelectCategory = useCallback((cat: string) => {
    setSelectedCategory(cat);
    setFocusZone('streams');
  }, []);

  const handleFocusIndexChange = useCallback((idx: number) => {
    setFocusedIndex(idx);
    setFocusZone('streams');
  }, []);

  const handleOpenFullscreen = useCallback(() => {
    setIsFullscreen(true);
  }, []);

  return (
    <div className="tv-app-shell">
      {/* Notificación flotante en pantalla (Toast para Favoritos / Acciones) */}
      {toastBanner && (
        <div className="tv-toast-notification" role="status" aria-live="polite">
          <Star
            size={20}
            fill={toastBanner.isFavAdded ? '#FACC15' : 'none'}
            color="#FACC15"
          />
          <span>{toastBanner.text}</span>
        </div>
      )}

      {/* Cabecera Superior */}
      <HeaderBar
        playlists={playlists}
        selectedPlaylistId={selectedPlaylistId}
        onSelectPlaylist={(id) => {
          setSelectedPlaylistId(id);
          setSelectedCategory('ALL');
        }}
        globalFilter={globalFilter}
        onSelectGlobalFilter={(mode) => {
          setGlobalFilter(mode);
          setSelectedCategory('ALL');
        }}
        searchQuery={searchQuery}
        onSearchChange={(q) => setSearchQuery(q)}
        searchInputRef={searchInputRef}
        viewMode={settings.viewMode}
        onToggleViewMode={toggleViewMode}
        onOpenPlaylistModal={() => setIsPlaylistModalOpen(true)}
        favoritesCount={favorites.length}
        totalStreamsCount={allStreamsAcrossPlaylists.length}
      />

      {/* Área Principal de 3 Paneles: Categorías | Listado de Reproducciones | Previsualizador */}
      <main className="tv-workspace">
        <CategorySidebar
          categories={categories}
          selectedCategory={selectedCategory}
          onSelectCategory={handleSelectCategory}
          totalFilteredByMode={streamsByGlobalMode.length}
          isFocusZone={focusZone === 'categories'}
        />

        <StreamList
          streams={filteredStreams}
          selectedStream={selectedStream}
          focusedIndex={focusedIndex}
          favoritesSet={favoritesSet}
          viewMode={settings.viewMode}
          searchQuery={deferredSearchQuery}
          selectedCategory={selectedCategory}
          isFocusZone={focusZone === 'streams'}
          onSelectStream={handleSelectStream}
          onFocusIndexChange={handleFocusIndexChange}
          onToggleFavorite={handleToggleFavorite}
          onOpenFullscreen={handleOpenFullscreen}
        />

        <PreviewPanel
          stream={selectedStream}
          focusedStream={focusedStream}
          isFullscreen={isFullscreen}
          isFavorite={Boolean(selectedStream && favoritesSet.has(selectedStream.id))}
          isFocusedFavorite={Boolean(
            focusedStream && favoritesSet.has(focusedStream.id)
          )}
          onToggleFullscreen={() => setIsFullscreen((prev) => !prev)}
          onToggleFavorite={(stream) => handleToggleFavorite(stream)}
          onPrevChannel={() => handleStepChannel(-1)}
          onNextChannel={() => handleStepChannel(1)}
          onPlayFocusedStream={(stream) => handleSelectStream(stream, focusedIndex)}
        />
      </main>

      {/* Barra Inferior de Botones de Colores del Control LG Magic Remote */}
      <ColorKeyLegend
        onRedPress={() => setIsPlaylistModalOpen(true)}
        onGreenPress={() => {
          searchInputRef.current?.focus();
          searchInputRef.current?.select();
        }}
        onYellowPress={() => handleToggleFavorite(activeTargetStream)}
        onBluePress={() => {
          setSelectedCategory('ALL');
          setGlobalFilter((prev) => (prev === 'favorites' ? 'all' : 'favorites'));
        }}
        activeTargetName={activeTargetStream?.name}
        isActiveTargetFavorite={Boolean(
          activeTargetStream && favoritesSet.has(activeTargetStream.id)
        )}
        lastRemoteKeyBadge={lastRemoteKeyBadge}
      />

      {/* Modal de Gestión de Listas IPTV */}
      <PlaylistManagerModal
        isOpen={isPlaylistModalOpen}
        playlists={playlists}
        onClose={() => setIsPlaylistModalOpen(false)}
        onAddUrlPlaylist={handleAddUrlPlaylist}
        onAddRawM3UPlaylist={handleAddRawM3UPlaylist}
        onAddXtreamPlaylist={handleAddXtreamPlaylist}
        onRefreshPlaylist={handleRefreshPlaylist}
        onDeletePlaylist={handleDeletePlaylist}
        onLoadDemoPlaylist={handleLoadDemoPlaylist}
        onExportBackup={handleExportBackup}
        onImportBackup={handleImportBackup}
      />
    </div>
  );
};

export default App;

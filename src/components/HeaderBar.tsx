import React, { useEffect, useState } from 'react';
import {
  Tv,
  Search,
  X,
  Star,
  Clock,
  Film,
  Radio,
  Layers,
  List,
  LayoutGrid,
  PlusCircle,
} from 'lucide-react';
import { GlobalFilterMode, PlaylistSource } from '../types/iptv';

interface HeaderBarProps {
  playlists: PlaylistSource[];
  selectedPlaylistId: string;
  onSelectPlaylist: (id: string) => void;
  globalFilter: GlobalFilterMode;
  onSelectGlobalFilter: (mode: GlobalFilterMode) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  viewMode: 'list' | 'grid';
  onToggleViewMode: () => void;
  onOpenPlaylistModal: () => void;
  favoritesCount: number;
  totalStreamsCount: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  playlists,
  selectedPlaylistId,
  onSelectPlaylist,
  globalFilter,
  onSelectGlobalFilter,
  searchQuery,
  onSearchChange,
  searchInputRef,
  viewMode,
  onToggleViewMode,
  onOpenPlaylistModal,
  favoritesCount,
  totalStreamsCount,
}) => {
  const [clockText, setClockText] = useState<string>('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      setClockText(
        now.toLocaleTimeString('es-ES', {
          hour: '2-digit',
          minute: '2-digit',
        })
      );
    };
    updateClock();
    const interval = window.setInterval(updateClock, 15000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <header className="tv-header">
      {/* Marca y Selector de Lista */}
      <div className="brand-and-source">
        <div className="brand-logo">
          <img src="./icon.svg" alt="Smart IPTV" className="brand-vector-icon" />
          <div>
            <h1>Smart IPTV</h1>
            <span className="brand-subtitle">LG webOS</span>
          </div>
        </div>

        <div className="playlist-selector-wrap">
          <select
            className="tv-select"
            value={selectedPlaylistId}
            onChange={(e) => onSelectPlaylist(e.target.value)}
            aria-label="Seleccionar lista IPTV"
          >
            <option value="ALL">
              Todas ({playlists.length}) • {totalStreamsCount} ch
            </option>
            {playlists.map((pl) => (
              <option key={pl.id} value={pl.id}>
                {pl.name} ({pl.channelCount})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Pestañas de Modo Global */}
      <nav className="filter-tabs" aria-label="Filtros principales">
        <button
          type="button"
          className={`filter-tab ${globalFilter === 'all' ? 'active' : ''}`}
          onClick={() => onSelectGlobalFilter('all')}
        >
          <Layers size={15} />
          <span>Todos</span>
        </button>

        <button
          type="button"
          className={`filter-tab fav-tab ${globalFilter === 'favorites' ? 'active' : ''}`}
          onClick={() => onSelectGlobalFilter('favorites')}
        >
          <Star size={15} fill={globalFilter === 'favorites' ? '#FACC15' : 'none'} />
          <span>Favoritos ({favoritesCount})</span>
        </button>

        <button
          type="button"
          className={`filter-tab ${globalFilter === 'live' ? 'active' : ''}`}
          onClick={() => onSelectGlobalFilter('live')}
        >
          <Radio size={15} />
          <span>En Vivo</span>
        </button>

        <button
          type="button"
          className={`filter-tab ${globalFilter === 'vod' ? 'active' : ''}`}
          onClick={() => onSelectGlobalFilter('vod')}
        >
          <Film size={15} />
          <span>VOD</span>
        </button>

        <button
          type="button"
          className={`filter-tab ${globalFilter === 'recent' ? 'active' : ''}`}
          onClick={() => onSelectGlobalFilter('recent')}
        >
          <Clock size={15} />
          <span>Recientes</span>
        </button>
      </nav>

      {/* Buscador Global + Botón de Listas + Reloj */}
      <div className="header-right-tools">
        <div className={`global-search-box ${searchQuery ? 'has-query' : ''}`}>
          <Search size={16} className="search-icon" />
          <input
            ref={searchInputRef}
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar en todas las listas..."
            aria-label="Buscar reproducciones en todas las listas"
          />
          {searchQuery ? (
            <button
              type="button"
              className="clear-search-btn"
              onClick={() => onSearchChange('')}
              title="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          ) : (
            <span className="key-hint-pill green" title="Botón Verde del control remoto">
              VERDE
            </span>
          )}
        </div>

        <button
          type="button"
          className="tv-btn icon-only-btn"
          onClick={onToggleViewMode}
          title={viewMode === 'list' ? 'Cambiar a vista cuadrícula' : 'Cambiar a vista lista'}
          aria-label="Cambiar vista"
        >
          {viewMode === 'list' ? <LayoutGrid size={18} /> : <List size={18} />}
        </button>

        <button
          type="button"
          className="tv-btn add-playlist-btn"
          onClick={onOpenPlaylistModal}
          title="Gestionar Listas IPTV (Botón Rojo)"
        >
          <PlusCircle size={17} />
          <span>Listas</span>
          <span className="key-dot red" />
        </button>

        <div className="tv-clock" aria-label="Hora actual">
          {clockText}
        </div>
      </div>
    </header>
  );
};

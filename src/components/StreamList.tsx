import React, { memo, useCallback, useEffect, useRef, useState } from 'react';
import { Star, Play, Maximize2, Tv, Film, Clapperboard } from 'lucide-react';
import { StreamItem } from '../types/iptv';

interface StreamListProps {
  streams: StreamItem[];
  selectedStream: StreamItem | null;
  focusedIndex: number;
  favoritesSet: Set<string>;
  viewMode: 'list' | 'grid';
  searchQuery: string;
  selectedCategory: string;
  isFocusZone: boolean;
  onSelectStream: (stream: StreamItem, index: number) => void;
  onFocusIndexChange: (index: number) => void;
  onToggleFavorite: (stream: StreamItem) => void;
  onOpenFullscreen: () => void;
}

const LIST_ROW_HEIGHT = 64; // 56px tarjeta + 8px separación
const GRID_ROW_HEIGHT = 122; // 112px tarjeta + 10px separación
const GRID_MIN_COL_WIDTH = 235;
const OVERSCAN_ROWS = 5;

function getInitials(name: string): string {
  const words = name
    .replace(/[^\w\sÁÉÍÓÚÑáéíóúñ]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return 'TV';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

interface StreamCardItemProps {
  stream: StreamItem;
  index: number;
  isSelected: boolean;
  isFocused: boolean;
  isFav: boolean;
  onCardClick: (stream: StreamItem, index: number) => void;
  onHoverFocus: (index: number) => void;
  onToggleFavorite: (stream: StreamItem) => void;
  onOpenFullscreen: () => void;
}

const StreamCardItem = memo<StreamCardItemProps>(
  ({
    stream,
    index,
    isSelected,
    isFocused,
    isFav,
    onCardClick,
    onHoverFocus,
    onToggleFavorite,
    onOpenFullscreen,
  }) => {
    return (
      <div
        role="button"
        tabIndex={0}
        className={`stream-card ${isSelected ? 'playing' : ''} ${
          isFocused ? 'remote-focused' : ''
        }`}
        onClick={() => onCardClick(stream, index)}
        onMouseEnter={() => onHoverFocus(index)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.stopPropagation();
            onCardClick(stream, index);
          }
        }}
      >
        <div className="stream-card-left">
          <span className="channel-number">#{stream.channelNumber}</span>
          <div className="channel-logo-box">
            {stream.logo ? (
              <img
                src={stream.logo}
                alt=""
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = 'none';
                  const fallback = e.currentTarget.nextElementSibling as HTMLElement | null;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="logo-fallback"
              style={{ display: stream.logo ? 'none' : 'flex' }}
            >
              {getInitials(stream.name)}
            </div>
          </div>
        </div>

        <div className="stream-card-center">
          <div className="stream-title-row">
            <h3 className="stream-name" title={stream.name}>
              {stream.name}
            </h3>
            {isSelected && (
              <span className="now-playing-badge">
                <span className="eq-bar b1" />
                <span className="eq-bar b2" />
                <span className="eq-bar b3" />
                ACTIVO
              </span>
            )}
          </div>

          <div className="stream-meta-row">
            <span className="meta-group">{stream.group}</span>
            <span className="meta-divider">•</span>
            <span className="meta-playlist">{stream.playlistName}</span>
          </div>
        </div>

        <div className="stream-card-right">
          <span className={`content-type-tag ${stream.contentType}`}>
            {stream.contentType === 'live' ? (
              <>
                <Tv size={11} /> LIVE
              </>
            ) : stream.contentType === 'movie' ? (
              <>
                <Film size={11} /> VOD
              </>
            ) : (
              <>
                <Clapperboard size={11} /> SERIE
              </>
            )}
          </span>

          {stream.quality !== 'AUTO' && (
            <span className={`quality-tag q-${stream.quality.toLowerCase()}`}>
              {stream.quality}
            </span>
          )}

          <button
            type="button"
            className={`fav-star-btn ${isFav ? 'is-fav' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleFavorite(stream);
            }}
            title="Agregar o quitar de Favoritos (Botón Amarillo)"
            aria-label="Favorito"
          >
            <Star
              size={18}
              fill={isFav ? '#FACC15' : 'none'}
              color={isFav ? '#FACC15' : 'currentColor'}
            />
          </button>

          {isSelected ? (
            <button
              type="button"
              className="quick-expand-btn"
              onClick={(e) => {
                e.stopPropagation();
                onOpenFullscreen();
              }}
              title="Expandir a Pantalla Completa"
              aria-label="Expandir a Pantalla Completa"
            >
              <Maximize2 size={15} />
            </button>
          ) : (
            <span className="play-hint-icon" title="Previsualizar">
              <Play size={15} />
            </span>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.stream === next.stream &&
    prev.index === next.index &&
    prev.isSelected === next.isSelected &&
    prev.isFocused === next.isFocused &&
    prev.isFav === next.isFav
);

export const StreamList: React.FC<StreamListProps> = ({
  streams,
  selectedStream,
  focusedIndex,
  favoritesSet,
  viewMode,
  searchQuery,
  selectedCategory,
  isFocusZone,
  onSelectStream,
  onFocusIndexChange,
  onToggleFavorite,
  onOpenFullscreen,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState<number>(0);
  const [viewport, setViewport] = useState<{ width: number; height: number }>({
    width: 920,
    height: 680,
  });

  // Medir tamaño del contenedor con ResizeObserver para calcular filas y columnas virtuales
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      setViewport({
        width: el.clientWidth || 920,
        height: el.clientHeight || 680,
      });
    };
    updateSize();

    if (typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(updateSize);
      observer.observe(el);
      return () => observer.disconnect();
    } else {
      window.addEventListener('resize', updateSize);
      return () => window.removeEventListener('resize', updateSize);
    }
  }, []);

  // Resetear scroll al cambiar de categoría o búsqueda
  useEffect(() => {
    setScrollTop(0);
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [selectedCategory, searchQuery]);

  const columns =
    viewMode === 'grid'
      ? Math.max(1, Math.floor((viewport.width - 24) / GRID_MIN_COL_WIDTH))
      : 1;
  const rowHeight = viewMode === 'grid' ? GRID_ROW_HEIGHT : LIST_ROW_HEIGHT;
  const totalRows = Math.ceil(streams.length / columns);
  const totalHeight = totalRows * rowHeight;

  // Mantener visible la fila enfocada cuando se navega con las flechas del control remoto
  useEffect(() => {
    if (!isFocusZone || !containerRef.current || streams.length === 0) return;
    const el = containerRef.current;
    const focusedRow = Math.floor(focusedIndex / columns);
    const rowTop = focusedRow * rowHeight;
    const rowBottom = rowTop + rowHeight;

    if (rowTop < el.scrollTop) {
      el.scrollTop = rowTop;
    } else if (rowBottom > el.scrollTop + el.clientHeight - 16) {
      el.scrollTop = rowBottom - el.clientHeight + 16;
    }
  }, [focusedIndex, isFocusZone, columns, rowHeight, streams.length]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const selectedStreamId = selectedStream?.id;

  const handleCardClick = useCallback(
    (stream: StreamItem, index: number) => {
      onFocusIndexChange(index);
      if (selectedStreamId === stream.id) {
        onOpenFullscreen();
      } else {
        onSelectStream(stream, index);
      }
    },
    [onFocusIndexChange, onOpenFullscreen, onSelectStream, selectedStreamId]
  );

  // Cálculo de la ventana virtual [startIndex, endIndex]
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS);
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewport.height) / rowHeight) + OVERSCAN_ROWS
  );
  const startIndex = startRow * columns;
  const endIndex = Math.min(streams.length, endRow * columns);
  const offsetY = startRow * rowHeight;

  const visibleSlice = streams.slice(startIndex, endIndex);

  return (
    <section className={`stream-list-section ${isFocusZone ? 'zone-focused' : ''}`}>
      <div className="stream-list-header">
        <div className="stream-list-title">
          <h2>
            {searchQuery.trim()
              ? `Resultados para "${searchQuery}"`
              : selectedCategory === 'ALL'
              ? 'Todas las Reproducciones'
              : selectedCategory}
          </h2>
          <span className="stream-count-pill">
            {streams.length} {streams.length === 1 ? 'canal' : 'canales'}
          </span>
        </div>

        <div className="stream-list-tip">
          <span className="yellow-dot-indicator" />
          <span>
            <strong>Botón Amarillo</strong> (<kbd>Y</kbd>) Favorito
          </span>
        </div>
      </div>

      {streams.length === 0 ? (
        <div className="empty-streams-box">
          <Tv size={40} />
          <h3>No se encontraron reproducciones</h3>
          <p>
            {searchQuery
              ? `No hay coincidencias para "${searchQuery}" en tus listas.`
              : 'No hay canales en esta vista. Cambia de categoría o agrega una lista IPTV.'}
          </p>
        </div>
      ) : (
        <div
          ref={containerRef}
          onScroll={handleScroll}
          className="streams-virtual-viewport"
        >
          <div
            className="streams-virtual-spacer"
            style={{ height: `${totalHeight}px` }}
          >
            <div
              className={`streams-virtual-window ${
                viewMode === 'grid' ? 'grid-view' : 'list-view'
              }`}
              style={{
                transform: `translate3d(0, ${offsetY}px, 0)`,
                gridTemplateColumns:
                  viewMode === 'grid' ? `repeat(${columns}, minmax(0, 1fr))` : undefined,
              }}
            >
              {visibleSlice.map((stream, localIdx) => {
                const realIndex = startIndex + localIdx;
                return (
                  <StreamCardItem
                    key={stream.id}
                    stream={stream}
                    index={realIndex}
                    isSelected={selectedStreamId === stream.id}
                    isFocused={focusedIndex === realIndex}
                    isFav={favoritesSet.has(stream.id)}
                    onCardClick={handleCardClick}
                    onHoverFocus={onFocusIndexChange}
                    onToggleFavorite={onToggleFavorite}
                    onOpenFullscreen={onOpenFullscreen}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

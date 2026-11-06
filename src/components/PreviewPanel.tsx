import React from 'react';
import {
  Maximize2,
  Star,
  SkipBack,
  SkipForward,
  Folder,
  Layers,
  Info,
  Sparkles,
} from 'lucide-react';
import { StreamItem } from '../types/iptv';
import { VideoPlayer } from './VideoPlayer';

interface PreviewPanelProps {
  stream: StreamItem | null;
  focusedStream: StreamItem | null;
  isFullscreen: boolean;
  isFavorite: boolean;
  isFocusedFavorite: boolean;
  onToggleFullscreen: () => void;
  onToggleFavorite: (stream: StreamItem) => void;
  onPrevChannel: () => void;
  onNextChannel: () => void;
  onPlayFocusedStream: (stream: StreamItem) => void;
}

export const PreviewPanel: React.FC<PreviewPanelProps> = ({
  stream,
  focusedStream,
  isFullscreen,
  isFavorite,
  isFocusedFavorite,
  onToggleFullscreen,
  onToggleFavorite,
  onPrevChannel,
  onNextChannel,
  onPlayFocusedStream,
}) => {
  const activeTargetForYellow = focusedStream || stream;

  return (
    <aside className={`preview-panel ${isFullscreen ? 'is-fullscreen-active' : ''}`}>
      <div className="preview-panel-header">
        <h2>Previsualizador</h2>
        {stream && (
          <div className="preview-header-actions">
            <span className="preview-ch-pill">Canal #{stream.channelNumber}</span>
            <button
              type="button"
              className="tv-btn icon-only-btn small"
              onClick={onToggleFullscreen}
              title="Expandir a Pantalla Completa"
              aria-label="Expandir a Pantalla Completa"
            >
              <Maximize2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Contenedor 16:9 del reproductor (se expande a toda la pantalla cuando isFullscreen=true) */}
      <div className={`preview-video-box ${isFullscreen ? 'fullscreen-box' : ''}`}>
        <VideoPlayer
          stream={stream}
          isFullscreen={isFullscreen}
          isFavorite={isFavorite}
          onToggleFullscreen={onToggleFullscreen}
          onToggleFavorite={onToggleFavorite}
          onPrevChannel={onPrevChannel}
          onNextChannel={onNextChannel}
        />
      </div>

      {/* Tarjeta de detalles de la transmisión actual */}
      {stream ? (
        <div className="preview-details-card">
          <div className="preview-title-block">
            <div className="preview-title-texts">
              <h3 title={stream.name}>{stream.name}</h3>
              <div className="preview-badges-line">
                <span className="detail-badge">
                  <Folder size={12} /> {stream.group}
                </span>
                <span className="detail-badge">
                  <Layers size={12} /> {stream.playlistName}
                </span>
              </div>
            </div>

            <button
              type="button"
              className="tv-btn primary-btn icon-only-btn"
              onClick={onToggleFullscreen}
              title="Expandir a Pantalla Completa"
              aria-label="Expandir a Pantalla Completa"
            >
              <Maximize2 size={19} />
            </button>
          </div>

          <div className="preview-action-buttons">
            <button
              type="button"
              className={`tv-btn yellow-action-btn full-width small ${
                isFavorite ? 'is-fav' : ''
              }`}
              onClick={() => onToggleFavorite(stream)}
            >
              <Star
                size={16}
                fill={isFavorite ? '#FACC15' : 'none'}
                color={isFavorite ? '#FACC15' : 'currentColor'}
              />
              <span>
                {isFavorite ? 'Quitar de Favoritos' : 'Favorito (Botón Amarillo)'}
              </span>
            </button>

            <div className="preview-nav-pair">
              <button
                type="button"
                className="tv-btn secondary-btn small"
                onClick={onPrevChannel}
              >
                <SkipBack size={15} /> Anterior
              </button>
              <button
                type="button"
                className="tv-btn secondary-btn small"
                onClick={onNextChannel}
              >
                Siguiente <SkipForward size={15} />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Si el cursor del Magic Remote apunta a otro canal distinto al que se reproduce */}
      {focusedStream && focusedStream.id !== stream?.id && (
        <div className="focused-candidate-card">
          <div className="candidate-header">
            <Sparkles size={14} className="yellow-text" />
            <span>Señalado con el control</span>
          </div>
          <h4>{focusedStream.name}</h4>
          <div className="candidate-actions">
            <button
              type="button"
              className="tv-btn small primary-btn"
              onClick={() => onPlayFocusedStream(focusedStream)}
            >
              Previsualizar
            </button>
            <button
              type="button"
              className="tv-btn small yellow-outline-btn"
              onClick={() => onToggleFavorite(focusedStream)}
              title="Botón Amarillo"
            >
              <Star
                size={14}
                fill={isFocusedFavorite ? '#FACC15' : 'none'}
                color="#FACC15"
              />
              <span>{isFocusedFavorite ? 'Favorito' : 'Amarillo'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Guía rápida de Magic Remote */}
      <div className="magic-remote-card">
        <div className="mr-header">
          <Info size={14} />
          <span>Atajos Magic Remote</span>
        </div>
        <ul>
          <li>
            <strong>1 Clic:</strong> Previsualiza • <strong>2 Clics:</strong> Pantalla Completa.
          </li>
          <li>
            <strong>Botón Amarillo:</strong> Favorito en{' '}
            <em>{activeTargetForYellow ? activeTargetForYellow.name : 'canal activo'}</em>.
          </li>
        </ul>
      </div>
    </aside>
  );
};

import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Maximize2,
  Minimize2,
  Volume2,
  VolumeX,
  RefreshCw,
  AlertTriangle,
  Star,
  SkipBack,
  SkipForward,
  Radio,
  Film,
} from 'lucide-react';
import { StreamItem } from '../types/iptv';

interface VideoPlayerProps {
  stream: StreamItem | null;
  isFullscreen: boolean;
  isFavorite: boolean;
  onToggleFullscreen: () => void;
  onToggleFavorite: (stream: StreamItem) => void;
  onPrevChannel: () => void;
  onNextChannel: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  stream,
  isFullscreen,
  isFavorite,
  onToggleFullscreen,
  onToggleFavorite,
  onPrevChannel,
  onNextChannel,
}) => {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [status, setStatus] = useState<'idle' | 'loading' | 'playing' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.85);
  const [resolutionLabel, setResolutionLabel] = useState<string>('');
  const [retryCounter, setRetryCounter] = useState<number>(0);
  const [showOsd, setShowOsd] = useState<boolean>(true);

  // Sincronizar con Fullscreen API nativa si está disponible en el navegador/webOS
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;

    if (isFullscreen) {
      if (!document.fullscreenElement && el.requestFullscreen) {
        el.requestFullscreen().catch(() => {
          // Si falla o el entorno usa CSS fullscreen fijo, el modo CSS 100vwx100vh ya lo cubre
        });
      }
    } else {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    const handleFsChange = () => {
      if (!document.fullscreenElement && isFullscreen) {
        // Si el usuario salió con tecla nativa del navegador
        onToggleFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, [isFullscreen, onToggleFullscreen]);

  useEffect(() => {
    if (!isFullscreen) {
      setShowOsd(true);
      return;
    }
    setShowOsd(true);
    const timer = window.setTimeout(() => setShowOsd(false), 4500);
    return () => window.clearTimeout(timer);
  }, [isFullscreen, stream?.id]);

  const wakeOsd = () => {
    if (!isFullscreen) return;
    setShowOsd(true);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !stream) {
      setStatus('idle');
      setResolutionLabel('');
      return;
    }

    setStatus('loading');
    setErrorMessage('');
    setResolutionLabel('');

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsUrl =
      stream.url.toLowerCase().includes('.m3u8') ||
      stream.url.toLowerCase().includes('/live/');

    const handleLoadedMetadata = () => {
      if (video.videoWidth && video.videoHeight) {
        setResolutionLabel(`${video.videoWidth}×${video.videoHeight}`);
      }
    };

    const handlePlaying = () => {
      setStatus('playing');
      if (video.videoWidth && video.videoHeight) {
        setResolutionLabel(`${video.videoWidth}×${video.videoHeight}`);
      }
    };

    const handleError = () => {
      setStatus('error');
      setErrorMessage('No se pudo cargar la señal de video o el canal está fuera de línea.');
    };

    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('playing', handlePlaying);
    video.addEventListener('error', handleError);

    if (isHlsUrl && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 30,
        manifestLoadingTimeOut: 12000,
        levelLoadingTimeOut: 12000,
      });
      hlsRef.current = hls;

      hls.loadSource(stream.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.muted = isMuted;
        video.volume = volume;
        video.play().catch(() => {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {
            setStatus('error');
            setErrorMessage('Presiona Reproducir para iniciar el stream.');
          });
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level && level.height) {
          setResolutionLabel(`${level.width || ''}×${level.height}p`.replace(/^×/, ''));
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setStatus('error');
              setErrorMessage('Error de red o bloqueo CORS en la transmisión.');
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setStatus('error');
              setErrorMessage('Formato de transmisión no compatible o fuera de línea.');
              hls.destroy();
              break;
          }
        }
      });
    } else {
      video.src = stream.url;
      video.muted = isMuted;
      video.volume = volume;
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {
          setStatus('error');
          setErrorMessage('El stream no pudo iniciarse o el formato no es soportado.');
        });
      });
    }

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('playing', handlePlaying);
      video.removeEventListener('error', handleError);
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [stream?.id, stream?.url, retryCounter]);

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !isMuted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextVol = parseFloat(e.target.value);
    setVolume(nextVol);
    if (videoRef.current) {
      videoRef.current.volume = nextVol;
      videoRef.current.muted = nextVol === 0;
      setIsMuted(nextVol === 0);
    }
  };

  const handleWheelInFullscreen = (e: React.WheelEvent) => {
    if (!isFullscreen) return;
    wakeOsd();
    if (e.deltaY < 0) {
      onPrevChannel();
    } else if (e.deltaY > 0) {
      onNextChannel();
    }
  };

  if (!stream) {
    return (
      <div className="video-empty-state">
        <Radio size={40} className="pulse-icon" />
        <h3>Selecciona un canal para previsualizar</h3>
        <p>Usa el puntero del Magic Remote o las flechas del control para elegir una transmisión.</p>
      </div>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className={`video-player-wrapper ${isFullscreen ? 'fullscreen-mode' : 'preview-mode'}`}
      onMouseMove={wakeOsd}
      onClick={wakeOsd}
      onWheel={handleWheelInFullscreen}
    >
      <video
        ref={videoRef}
        className="video-element"
        playsInline
        onDoubleClick={onToggleFullscreen}
      />

      {/* Estado de Carga */}
      {status === 'loading' && (
        <div className="video-overlay-state">
          <div className="spinner-ring" />
          <span>Conectando con {stream.name}...</span>
        </div>
      )}

      {/* Estado de Error */}
      {status === 'error' && (
        <div className="video-overlay-state error">
          <AlertTriangle size={32} />
          <p>{errorMessage}</p>
          <button
            type="button"
            className="tv-btn primary-btn small"
            onClick={() => setRetryCounter((c) => c + 1)}
          >
            <RefreshCw size={15} /> Reintentar señal
          </button>
        </div>
      )}

      {/* Insignia superior en vivo + resolución */}
      <div className={`video-top-badges ${isFullscreen && !showOsd ? 'hidden-osd' : ''}`}>
        <span className={`live-pill ${stream.contentType}`}>
          {stream.contentType === 'live' ? (
            <>
              <span className="live-dot" /> VIVO
            </>
          ) : (
            <>
              <Film size={12} /> {stream.contentType === 'movie' ? 'VOD' : 'SERIE'}
            </>
          )}
        </span>
        {resolutionLabel && <span className="res-pill">{resolutionLabel}</span>}
        <span className="quality-pill">{stream.quality}</span>
        {isFavorite && (
          <span className="fav-pill-badge" title="En Favoritos">
            <Star size={12} fill="#FACC15" color="#FACC15" />
          </span>
        )}
      </div>

      {/* Controles OSD inferiores (Solo iconos compactos para evitar desbordes) */}
      <div className={`video-controls-bar ${isFullscreen && !showOsd ? 'hidden-osd' : ''}`}>
        {isFullscreen && (
          <div className="fullscreen-channel-header">
            <div className="fs-ch-number">#{stream.channelNumber}</div>
            <div className="fs-ch-meta">
              <h2>{stream.name}</h2>
              <span>
                {stream.group} • {stream.playlistName}
              </span>
            </div>
          </div>
        )}

        <div className="video-controls-actions">
          <div className="left-controls">
            <button
              type="button"
              className="icon-control-btn"
              onClick={onPrevChannel}
              title="Canal Anterior (CH-)"
              aria-label="Canal Anterior"
            >
              <SkipBack size={17} />
            </button>
            <button
              type="button"
              className="icon-control-btn"
              onClick={onNextChannel}
              title="Canal Siguiente (CH+)"
              aria-label="Canal Siguiente"
            >
              <SkipForward size={17} />
            </button>

            <button
              type="button"
              className="icon-control-btn"
              onClick={toggleMute}
              title={isMuted ? 'Activar sonido' : 'Silenciar'}
              aria-label="Silenciar"
            >
              {isMuted ? <VolumeX size={17} /> : <Volume2 size={17} />}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={handleVolumeChange}
              className="volume-slider"
              aria-label="Volumen"
            />
          </div>

          <div className="right-controls">
            <button
              type="button"
              className={`icon-control-btn yellow-fav-btn ${isFavorite ? 'active' : ''}`}
              onClick={() => onToggleFavorite(stream)}
              title="Agregar/Quitar Favorito (Botón Amarillo)"
              aria-label="Favorito"
            >
              <Star
                size={17}
                fill={isFavorite ? '#FACC15' : 'none'}
                color={isFavorite ? '#FACC15' : 'currentColor'}
              />
            </button>

            <button
              type="button"
              className="icon-control-btn"
              onClick={() => setRetryCounter((c) => c + 1)}
              title="Recargar transmisión"
              aria-label="Recargar"
            >
              <RefreshCw size={16} />
            </button>

            <button
              type="button"
              className="icon-control-btn expand-btn"
              onClick={onToggleFullscreen}
              title={isFullscreen ? 'Salir de pantalla completa (Back/Esc)' : 'Expandir a pantalla completa'}
              aria-label={isFullscreen ? 'Salir de pantalla completa' : 'Expandir a pantalla completa'}
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useRef, useState } from 'react';
import {
  X,
  Link,
  FileText,
  Server,
  Trash2,
  RefreshCw,
  Upload,
  Download,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ListPlus,
} from 'lucide-react';
import { PlaylistSource, XtreamCredentials } from '../types/iptv';

interface PlaylistManagerModalProps {
  isOpen: boolean;
  playlists: PlaylistSource[];
  onClose: () => void;
  onAddUrlPlaylist: (name: string, url: string, useCorsProxy: boolean) => Promise<void>;
  onAddRawM3UPlaylist: (name: string, content: string) => Promise<void>;
  onAddXtreamPlaylist: (
    name: string,
    credentials: XtreamCredentials,
    useCorsProxy: boolean
  ) => Promise<void>;
  onRefreshPlaylist: (playlist: PlaylistSource) => Promise<void>;
  onDeletePlaylist: (playlistId: string) => Promise<void>;
  onLoadDemoPlaylist: () => Promise<void>;
  onExportBackup: () => void;
  onImportBackup: (jsonContent: string) => Promise<void>;
}

type ModalTab = 'url' | 'file' | 'xtream' | 'manage';

const URL_QUICK_TOKENS = [
  'https://',
  'http://',
  'www.',
  '.com',
  '.net',
  '.org',
  '/',
  ':8080',
  '.m3u8',
  '.m3u',
];

export const PlaylistManagerModal: React.FC<PlaylistManagerModalProps> = ({
  isOpen,
  playlists,
  onClose,
  onAddUrlPlaylist,
  onAddRawM3UPlaylist,
  onAddXtreamPlaylist,
  onRefreshPlaylist,
  onDeletePlaylist,
  onLoadDemoPlaylist,
  onExportBackup,
  onImportBackup,
}) => {
  const [activeTab, setActiveTab] = useState<ModalTab>('url');
  const [isLoading, setIsLoading] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Estado Pestaña URL
  const [urlName, setUrlName] = useState('');
  const [urlValue, setUrlValue] = useState('');
  const [useCorsProxy, setUseCorsProxy] = useState(false);
  const urlInputRef = useRef<HTMLInputElement | null>(null);

  // Estado Pestaña Archivo / Texto
  const [rawName, setRawName] = useState('');
  const [rawContent, setRawContent] = useState('');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const backupInputRef = useRef<HTMLInputElement | null>(null);

  // Estado Pestaña Xtream Codes
  const [xtreamName, setXtreamName] = useState('');
  const [xtreamServer, setXtreamServer] = useState('');
  const [xtreamUser, setXtreamUser] = useState('');
  const [xtreamPass, setXtreamPass] = useState('');
  const [xtreamCors, setXtreamCors] = useState(false);
  const xtreamUrlInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const clearFeedback = () => {
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  // Asegura que cuando se enfoque un input en webOS, el campo suba y sea visible sobre el teclado virtual
  const handleFieldFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setIsKeyboardOpen(true);
    const target = e.currentTarget;
    window.setTimeout(() => {
      target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 120);
  };

  const handleFieldBlur = () => {
    window.setTimeout(() => {
      const active = document.activeElement;
      if (
        !active ||
        (active.tagName !== 'INPUT' && active.tagName !== 'TEXTAREA')
      ) {
        setIsKeyboardOpen(false);
      }
    }, 150);
  };

  // Inserta o autocompleta fragmentos de URL (https://, .com, .m3u8, etc.)
  const insertUrlToken = (
    token: string,
    currentVal: string,
    setter: React.Dispatch<React.SetStateAction<string>>,
    inputRef: React.RefObject<HTMLInputElement | null>
  ) => {
    let nextVal = currentVal;
    if (token === 'https://' || token === 'http://') {
      const stripped = currentVal.replace(/^https?:\/\//i, '');
      nextVal = `${token}${stripped}`;
    } else {
      nextVal = `${currentVal}${token}`;
    }
    setter(nextVal);
    inputRef.current?.focus();
  };

  const normalizeEnteredUrl = (raw: string): string => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    if (!/^https?:\/\//i.test(trimmed)) {
      return `https://${trimmed}`;
    }
    return trimmed;
  };

  const handleUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    const finalUrl = normalizeEnteredUrl(urlValue);
    if (!finalUrl) {
      setErrorMsg('Ingresa una dirección URL M3U / M3U8 válida.');
      return;
    }

    let hostnameFallback = 'Remota';
    try {
      hostnameFallback = new URL(finalUrl).hostname || 'Remota';
    } catch {
      hostnameFallback = 'Remota';
    }

    const finalName = urlName.trim() || `Lista IPTV (${hostnameFallback})`;
    setIsLoading(true);
    try {
      await onAddUrlPlaylist(finalName, finalUrl, useCorsProxy);
      setSuccessMsg(`Lista "${finalName}" agregada correctamente.`);
      setUrlName('');
      setUrlValue('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'No se pudo descargar la lista desde la URL indicada.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearFeedback();
    const file = e.target.files?.[0];
    if (!file) return;
    if (!rawName.trim()) {
      setRawName(file.name.replace(/\.(m3u8?|txt)$/i, ''));
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setRawContent(reader.result);
        setSuccessMsg(
          `Archivo "${file.name}" leído (${reader.result.length} bytes). Presiona Guardar Lista.`
        );
      }
    };
    reader.readAsText(file);
  };

  const handleRawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    if (!rawContent.trim()) {
      setErrorMsg('Sube un archivo .m3u/.m3u8 o pega el contenido #EXTM3U.');
      return;
    }
    const finalName = rawName.trim() || `Lista Local ${playlists.length + 1}`;
    setIsLoading(true);
    try {
      await onAddRawM3UPlaylist(finalName, rawContent);
      setSuccessMsg(`Lista "${finalName}" importada con éxito.`);
      setRawName('');
      setRawContent('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al procesar el archivo M3U.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleXtreamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearFeedback();
    const normalizedServer = normalizeEnteredUrl(xtreamServer);
    if (!normalizedServer || !xtreamUser.trim() || !xtreamPass.trim()) {
      setErrorMsg('Completa Servidor, Usuario y Contraseña de Xtream Codes.');
      return;
    }
    const finalName = xtreamName.trim() || `Xtream (${xtreamUser.trim()})`;
    setIsLoading(true);
    try {
      await onAddXtreamPlaylist(
        finalName,
        {
          serverUrl: normalizedServer,
          username: xtreamUser.trim(),
          password: xtreamPass.trim(),
        },
        xtreamCors
      );
      setSuccessMsg(`Servidor Xtream "${finalName}" sincronizado con éxito.`);
      setXtreamName('');
      setXtreamServer('');
      setXtreamUser('');
      setXtreamPass('');
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : 'Error al conectar con el servidor Xtream Codes.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackupFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    clearFeedback();
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        setIsLoading(true);
        try {
          await onImportBackup(reader.result);
          setSuccessMsg('Copia de seguridad restaurada correctamente.');
        } catch (err) {
          setErrorMsg(
            err instanceof Error ? err.message : 'Archivo de respaldo inválido.'
          );
        } finally {
          setIsLoading(false);
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div
      className={`modal-backdrop ${isKeyboardOpen ? 'keyboard-active' : ''}`}
      onClick={onClose}
    >
      <div
        className={`modal-container ${isKeyboardOpen ? 'compact-for-keyboard' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div className="modal-title-group">
            <ListPlus size={21} className="accent-icon" />
            <div>
              <h2>Gestor de Listas IPTV</h2>
            </div>
          </div>

          <div className="modal-tabs">
            <button
              type="button"
              className={`modal-tab ${activeTab === 'url' ? 'active' : ''}`}
              onClick={() => {
                clearFeedback();
                setActiveTab('url');
              }}
            >
              <Link size={15} /> URL M3U/M3U8
            </button>

            <button
              type="button"
              className={`modal-tab ${activeTab === 'file' ? 'active' : ''}`}
              onClick={() => {
                clearFeedback();
                setActiveTab('file');
              }}
            >
              <FileText size={15} /> Archivo / Texto
            </button>

            <button
              type="button"
              className={`modal-tab ${activeTab === 'xtream' ? 'active' : ''}`}
              onClick={() => {
                clearFeedback();
                setActiveTab('xtream');
              }}
            >
              <Server size={15} /> Xtream API
            </button>

            <button
              type="button"
              className={`modal-tab ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => {
                clearFeedback();
                setActiveTab('manage');
              }}
            >
              Mis Listas ({playlists.length})
            </button>
          </div>

          <button
            type="button"
            className="modal-close-btn"
            onClick={onClose}
            title="Cerrar (Back / Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mensajes de estado */}
        {errorMsg && (
          <div className="modal-alert error">
            <AlertCircle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="modal-alert success">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Cuerpo compacto en la parte superior para que el teclado virtual nunca cubra los inputs */}
        <div className="modal-body">
          {activeTab === 'url' && (
            <form onSubmit={handleUrlSubmit} className="iptv-form" noValidate>
              <div className="form-row-url-layout">
                <div className="form-group">
                  <label>Nombre de la lista (opcional)</label>
                  <input
                    type="text"
                    value={urlName}
                    onFocus={handleFieldFocus}
                    onBlur={handleFieldBlur}
                    onChange={(e) => setUrlName(e.target.value)}
                    placeholder="Ej. TV Casa, Deportes..."
                  />
                </div>

                <div className="form-group">
                  <label>Dirección URL de la lista (.m3u / .m3u8)</label>
                  <input
                    ref={urlInputRef}
                    type="url"
                    inputMode="url"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={urlValue}
                    onFocus={handleFieldFocus}
                    onBlur={handleFieldBlur}
                    onChange={(e) => setUrlValue(e.target.value)}
                    placeholder="https://servidor.com/playlist.m3u8"
                    required
                  />
                </div>
              </div>

              {/* Botones de autocompletado rápido de URL para Magic Remote */}
              <div className="url-autocomplete-bar">
                <span className="autocomplete-label">Autocompletar URL:</span>
                <div className="autocomplete-chips">
                  {URL_QUICK_TOKENS.map((token) => (
                    <button
                      key={token}
                      type="button"
                      className="url-token-chip"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        insertUrlToken(token, urlValue, setUrlValue, urlInputRef)
                      }
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-bottom-inline">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={useCorsProxy}
                    onChange={(e) => setUseCorsProxy(e.target.checked)}
                  />
                  <span>Usar puente CORS automático</span>
                </label>

                <div className="form-actions">
                  <button
                    type="button"
                    className="tv-btn secondary-btn small"
                    disabled={isLoading}
                    onClick={() =>
                      setUrlValue('https://iptv-org.github.io/iptv/languages/spa.m3u')
                    }
                  >
                    Ejemplo IPTV Español
                  </button>

                  <button
                    type="submit"
                    className="tv-btn primary-btn small"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Descargando...' : 'Agregar Lista por URL'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'file' && (
            <form onSubmit={handleRawSubmit} className="iptv-form">
              <div className="form-row-split">
                <div className="form-group">
                  <label>Nombre de la lista</label>
                  <input
                    type="text"
                    value={rawName}
                    onFocus={handleFieldFocus}
                    onBlur={handleFieldBlur}
                    onChange={(e) => setRawName(e.target.value)}
                    placeholder="Ej. Mi Lista Personal M3U"
                  />
                </div>

                <div className="form-group file-upload-group">
                  <label>Subir archivo .m3u / .m3u8</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".m3u,.m3u8,.txt"
                    onChange={handleFileUpload}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="tv-btn secondary-btn small"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload size={15} /> Examinar archivo .m3u / .m3u8
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label>O pega aquí el contenido #EXTM3U</label>
                <textarea
                  rows={3}
                  value={rawContent}
                  onFocus={handleFieldFocus}
                  onBlur={handleFieldBlur}
                  onChange={(e) => setRawContent(e.target.value)}
                  placeholder={`#EXTM3U\n#EXTINF:-1 group-title="Deportes",Canal Ejemplo HD\nhttps://servidor.com/live/stream.m3u8`}
                />
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="tv-btn primary-btn small"
                  disabled={isLoading}
                >
                  {isLoading ? 'Procesando...' : 'Guardar y Cargar Lista M3U'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'xtream' && (
            <form onSubmit={handleXtreamSubmit} className="iptv-form" noValidate>
              <div className="form-row-xtream-grid">
                <div className="form-group">
                  <label>Nombre del perfil</label>
                  <input
                    type="text"
                    value={xtreamName}
                    onFocus={handleFieldFocus}
                    onBlur={handleFieldBlur}
                    onChange={(e) => setXtreamName(e.target.value)}
                    placeholder="Ej. Xtream Principal"
                  />
                </div>
                <div className="form-group">
                  <label>URL del Servidor Xtream</label>
                  <input
                    ref={xtreamUrlInputRef}
                    type="url"
                    inputMode="url"
                    autoCapitalize="off"
                    autoCorrect="off"
                    spellCheck={false}
                    value={xtreamServer}
                    onFocus={handleFieldFocus}
                    onBlur={handleFieldBlur}
                    onChange={(e) => setXtreamServer(e.target.value)}
                    placeholder="http://servidor.com:8080"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Usuario</label>
                  <input
                    type="text"
                    autoCapitalize="off"
                    value={xtreamUser}
                    onFocus={handleFieldFocus}
                    onBlur={handleFieldBlur}
                    onChange={(e) => setXtreamUser(e.target.value)}
                    placeholder="Usuario"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Contraseña</label>
                  <input
                    type="password"
                    value={xtreamPass}
                    onFocus={handleFieldFocus}
                    onBlur={handleFieldBlur}
                    onChange={(e) => setXtreamPass(e.target.value)}
                    placeholder="Contraseña"
                    required
                  />
                </div>
              </div>

              <div className="url-autocomplete-bar">
                <span className="autocomplete-label">Autocompletar Servidor:</span>
                <div className="autocomplete-chips">
                  {URL_QUICK_TOKENS.map((token) => (
                    <button
                      key={token}
                      type="button"
                      className="url-token-chip"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() =>
                        insertUrlToken(
                          token,
                          xtreamServer,
                          setXtreamServer,
                          xtreamUrlInputRef
                        )
                      }
                    >
                      {token}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-bottom-inline">
                <label className="checkbox-row">
                  <input
                    type="checkbox"
                    checked={xtreamCors}
                    onChange={(e) => setXtreamCors(e.target.checked)}
                  />
                  <span>Usar puente CORS para la API</span>
                </label>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="tv-btn primary-btn small"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Sincronizando...' : 'Conectar Cuenta Xtream'}
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'manage' && (
            <div className="manage-playlists-panel">
              <div className="manage-top-bar">
                <button
                  type="button"
                  className="tv-btn secondary-btn small"
                  onClick={async () => {
                    clearFeedback();
                    setIsLoading(true);
                    try {
                      await onLoadDemoPlaylist();
                      setSuccessMsg('Lista Demo de prueba restaurada.');
                    } finally {
                      setIsLoading(false);
                    }
                  }}
                >
                  <Sparkles size={15} /> Restaurar Lista Demo
                </button>

                <div className="backup-buttons">
                  <button
                    type="button"
                    className="tv-btn secondary-btn small"
                    onClick={onExportBackup}
                  >
                    <Download size={15} /> Exportar JSON
                  </button>
                  <input
                    ref={backupInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleBackupFileChange}
                    style={{ display: 'none' }}
                  />
                  <button
                    type="button"
                    className="tv-btn secondary-btn small"
                    onClick={() => backupInputRef.current?.click()}
                  >
                    <Upload size={15} /> Importar JSON
                  </button>
                </div>
              </div>

              <div className="saved-playlists-list">
                {playlists.map((pl) => (
                  <div key={pl.id} className="saved-playlist-item">
                    <div className="saved-pl-info">
                      <h4>{pl.name}</h4>
                      <p>
                        <span className="pl-type-badge">{pl.sourceType.toUpperCase()}</span>
                        <span>{pl.channelCount} canales</span>
                        <span>•</span>
                        <span>{pl.categoriesCount} categorías</span>
                        {pl.url && (
                          <>
                            <span>•</span>
                            <span className="pl-url-truncate">{pl.url}</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className="saved-pl-actions">
                      {(pl.sourceType === 'url' || pl.sourceType === 'xtream') && (
                        <button
                          type="button"
                          className="tv-btn small secondary-btn"
                          disabled={isLoading}
                          onClick={async () => {
                            clearFeedback();
                            setIsLoading(true);
                            try {
                              await onRefreshPlaylist(pl);
                              setSuccessMsg(`Lista "${pl.name}" actualizada.`);
                            } catch (err) {
                              setErrorMsg(
                                err instanceof Error
                                  ? err.message
                                  : 'Error al actualizar la lista.'
                              );
                            } finally {
                              setIsLoading(false);
                            }
                          }}
                        >
                          <RefreshCw size={14} /> Actualizar
                        </button>
                      )}

                      <button
                        type="button"
                        className="tv-btn small danger-btn"
                        disabled={isLoading}
                        onClick={async () => {
                          clearFeedback();
                          await onDeletePlaylist(pl.id);
                          setSuccessMsg(`Lista "${pl.name}" eliminada.`);
                        }}
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </div>
                ))}

                {playlists.length === 0 && (
                  <div className="empty-saved-playlists">
                    No tienes listas guardadas. Agrega una por URL o carga la Lista Demo.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

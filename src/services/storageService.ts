import { AppConfigBackup, AppSettings, PlaylistSource } from '../types/iptv';

const DB_NAME = 'smartiptv_webos_db';
const DB_VERSION = 1;
const PLAYLIST_STORE = 'playlists';

const FAVORITES_KEY = 'smartiptv_favorites_v1';
const RECENT_KEY = 'smartiptv_recent_v1';
const SETTINGS_KEY = 'smartiptv_settings_v1';

export const DEFAULT_SETTINGS: AppSettings = {
  viewMode: 'list',
  autoPlayPreview: true,
  defaultUseCorsProxy: false,
  lastSelectedPlaylistId: 'ALL',
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB no soportado en este entorno'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PLAYLIST_STORE)) {
        db.createObjectStore(PLAYLIST_STORE, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadAllPlaylists(): Promise<PlaylistSource[]> {
  try {
    const db = await openDatabase();
    return await new Promise<PlaylistSource[]>((resolve, reject) => {
      const tx = db.transaction(PLAYLIST_STORE, 'readonly');
      const store = tx.objectStore(PLAYLIST_STORE);
      const req = store.getAll();
      req.onsuccess = () => resolve((req.result as PlaylistSource[]) || []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

export async function savePlaylistToDb(playlist: PlaylistSource): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PLAYLIST_STORE, 'readwrite');
      const store = tx.objectStore(PLAYLIST_STORE);
      store.put(playlist);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error guardando lista en IndexedDB:', err);
  }
}

export async function deletePlaylistFromDb(playlistId: string): Promise<void> {
  try {
    const db = await openDatabase();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(PLAYLIST_STORE, 'readwrite');
      const store = tx.objectStore(PLAYLIST_STORE);
      store.delete(playlistId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error('Error eliminando lista de IndexedDB:', err);
  }
}

export function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveFavorites(ids: string[]): void {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
  } catch (err) {
    console.error('Error guardando favoritos:', err);
  }
}

export function loadRecentIds(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentIds(ids: string[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(ids.slice(0, 40)));
  } catch (err) {
    console.error('Error guardando recientes:', err);
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: AppSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.error('Error guardando configuración:', err);
  }
}

export function createBackupPayload(
  playlists: PlaylistSource[],
  favorites: string[],
  recentIds: string[],
  settings: AppSettings
): AppConfigBackup {
  return {
    version: 1,
    exportedAt: new Date().toISOString(),
    favorites,
    recentIds,
    settings,
    playlists,
  };
}

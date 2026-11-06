import { StreamItem, XtreamCredentials } from '../types/iptv';
import { createStreamId, detectQualityBadge } from './m3uParser';

interface XtreamCategory {
  category_id: string;
  category_name: string;
}

interface XtreamLiveStream {
  num?: number;
  name: string;
  stream_id: number;
  stream_icon?: string;
  epg_channel_id?: string;
  category_id?: string;
}

interface XtreamVodStream {
  num?: number;
  name: string;
  stream_id: number;
  stream_icon?: string;
  category_id?: string;
  container_extension?: string;
}

function normalizeServerUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

async function fetchJsonWithCorsFallback<T>(url: string, useCorsProxy = false): Promise<T> {
  const target = useCorsProxy
    ? `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`
    : url;

  try {
    const res = await fetch(target);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (error) {
    if (!useCorsProxy) {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const fallback = await fetch(proxyUrl);
      if (fallback.ok) {
        return (await fallback.json()) as T;
      }
    }
    throw error;
  }
}

export async function fetchXtreamPlaylist(
  credentials: XtreamCredentials,
  playlistId: string,
  playlistName: string,
  useCorsProxy = false
): Promise<StreamItem[]> {
  const baseUrl = normalizeServerUrl(credentials.serverUrl);
  const authQuery = `username=${encodeURIComponent(credentials.username)}&password=${encodeURIComponent(credentials.password)}`;
  const apiBase = `${baseUrl}/player_api.php?${authQuery}`;

  // 1. Obtener categorías y canales en vivo
  const [liveCategories, liveStreams, vodCategories, vodStreams] = await Promise.all([
    fetchJsonWithCorsFallback<XtreamCategory[]>(
      `${apiBase}&action=get_live_categories`,
      useCorsProxy
    ).catch(() => [] as XtreamCategory[]),
    fetchJsonWithCorsFallback<XtreamLiveStream[]>(
      `${apiBase}&action=get_live_streams`,
      useCorsProxy
    ),
    fetchJsonWithCorsFallback<XtreamCategory[]>(
      `${apiBase}&action=get_vod_categories`,
      useCorsProxy
    ).catch(() => [] as XtreamCategory[]),
    fetchJsonWithCorsFallback<XtreamVodStream[]>(
      `${apiBase}&action=get_vod_streams`,
      useCorsProxy
    ).catch(() => [] as XtreamVodStream[]),
  ]);

  const liveCatMap = new Map<string, string>();
  if (Array.isArray(liveCategories)) {
    liveCategories.forEach((c) => liveCatMap.set(String(c.category_id), c.category_name));
  }

  const vodCatMap = new Map<string, string>();
  if (Array.isArray(vodCategories)) {
    vodCategories.forEach((c) => vodCatMap.set(String(c.category_id), c.category_name));
  }

  const items: StreamItem[] = [];
  let counter = 1;

  if (Array.isArray(liveStreams)) {
    for (const s of liveStreams) {
      const group =
        (s.category_id && liveCatMap.get(String(s.category_id))) || 'TV en Vivo';
      const url = `${baseUrl}/live/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${s.stream_id}.m3u8`;
      const name = s.name || `Canal ${counter}`;
      items.push({
        id: createStreamId(playlistId, name, url),
        playlistId,
        playlistName,
        channelNumber: counter++,
        name,
        group,
        url,
        logo: s.stream_icon || undefined,
        tvgId: s.epg_channel_id || undefined,
        quality: detectQualityBadge(name, group),
        contentType: 'live',
        searchKey: `${name} ${group} ${playlistName}`.toLowerCase(),
      });
    }
  }

  if (Array.isArray(vodStreams)) {
    for (const v of vodStreams) {
      const ext = v.container_extension || 'mp4';
      const group =
        (v.category_id && vodCatMap.get(String(v.category_id))) || 'Películas VOD';
      const url = `${baseUrl}/movie/${encodeURIComponent(credentials.username)}/${encodeURIComponent(credentials.password)}/${v.stream_id}.${ext}`;
      const name = v.name || `Película ${counter}`;
      items.push({
        id: createStreamId(playlistId, name, url),
        playlistId,
        playlistName,
        channelNumber: counter++,
        name,
        group: `VOD • ${group}`,
        url,
        logo: v.stream_icon || undefined,
        quality: detectQualityBadge(name, group),
        contentType: 'movie',
        searchKey: `${name} VOD ${group} ${playlistName}`.toLowerCase(),
      });
    }
  }

  if (items.length === 0) {
    throw new Error('No se encontraron canales o las credenciales Xtream son inválidas.');
  }

  return items;
}

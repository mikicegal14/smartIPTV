import { ContentType, QualityBadge, StreamItem } from '../types/iptv';

/**
 * Detecta la insignia de calidad (4K, FHD, HD, SD) a partir del nombre del canal o grupo.
 */
export function detectQualityBadge(name: string, group: string = ''): QualityBadge {
  const combined = `${name} ${group}`.toUpperCase();
  if (/\b(4K|UHD|2160P)\b/.test(combined)) return '4K';
  if (/\b(FHD|1080P|1080I|FULL\s*HD)\b/.test(combined)) return 'FHD';
  if (/\b(HD|720P)\b/.test(combined)) return 'HD';
  if (/\b(SD|480P|360P)\b/.test(combined)) return 'SD';
  return 'AUTO';
}

/**
 * Clasifica una transmisión en TV en vivo ('live'), película ('movie') o serie ('series').
 */
export function detectContentType(name: string, group: string, url: string): ContentType {
  const combined = `${name} ${group}`.toLowerCase();
  const cleanUrl = url.toLowerCase().split('?')[0];

  // Patrones de Series (S01E01, 1x01, Series, Temporada)
  if (
    /\bs\d{1,2}\s*e\d{1,2}\b/i.test(name) ||
    /\b\d{1,2}x\d{1,2}\b/i.test(name) ||
    /\b(serie|series|temporada|season|episodio)\b/i.test(combined) ||
    cleanUrl.includes('/series/')
  ) {
    return 'series';
  }

  // Patrones de Películas / VOD
  if (
    /\b(vod|pel[ií]cula|pel[ií]culas|movie|movies|cinema|cine\s+vod|films?)\b/i.test(combined) ||
    cleanUrl.includes('/movie/') ||
    /\.(mp4|mkv|avi|mov)$/.test(cleanUrl)
  ) {
    return 'movie';
  }

  return 'live';
}

/**
 * Extrae el valor de un atributo como tvg-logo="..." o group-title="..."
 */
function extractAttribute(line: string, attrName: string): string | undefined {
  const regex = new RegExp(`${attrName}\\s*=\\s*"([^"]*)"`, 'i');
  const match = line.match(regex);
  if (match && match[1]) {
    return match[1].trim();
  }
  const singleQuoteRegex = new RegExp(`${attrName}\\s*=\\s*'([^']*)'`, 'i');
  const singleMatch = line.match(singleQuoteRegex);
  if (singleMatch && singleMatch[1]) {
    return singleMatch[1].trim();
  }
  return undefined;
}

/**
 * Genera un ID determinístico para que los favoritos se mantengan incluso al refrescar la lista.
 */
export function createStreamId(playlistId: string, name: string, url: string): string {
  const raw = `${playlistId}::${name.trim().toLowerCase()}::${url.trim()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const chr = raw.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return `stream_${playlistId}_${Math.abs(hash).toString(36)}`;
}

/**
 * Parsea el contenido de texto de un archivo .m3u / .m3u8 y devuelve la lista de StreamItem.
 */
export function parseM3UContent(
  content: string,
  playlistId: string,
  playlistName: string
): StreamItem[] {
  const lines = content.split(/\r?\n/);
  const items: StreamItem[] = [];

  let currentExtInf: string | null = null;
  let currentGroupFromExtGrp: string | null = null;
  let currentUserAgent: string | undefined = undefined;
  let channelCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTINF:')) {
      currentExtInf = line;
      continue;
    }

    if (line.startsWith('#EXTGRP:')) {
      currentGroupFromExtGrp = line.replace('#EXTGRP:', '').trim();
      continue;
    }

    if (line.startsWith('#EXTVLCOPT:http-user-agent=')) {
      currentUserAgent = line.replace('#EXTVLCOPT:http-user-agent=', '').trim();
      continue;
    }

    // Si es otro comentario o directiva (#EXTM3U, etc.), lo ignoramos
    if (line.startsWith('#')) {
      continue;
    }

    // Es una línea de URL de stream (http://, https://, rtmp://, etc.)
    if (/^(https?|rtmp|rtsp|mms):\/\//i.test(line)) {
      const url = line;
      let name = `Canal ${channelCounter}`;
      let group = currentGroupFromExtGrp || 'General';
      let logo: string | undefined;
      let tvgId: string | undefined;
      let tvgName: string | undefined;

      if (currentExtInf) {
        tvgId = extractAttribute(currentExtInf, 'tvg-id');
        tvgName = extractAttribute(currentExtInf, 'tvg-name');
        logo = extractAttribute(currentExtInf, 'tvg-logo') || extractAttribute(currentExtInf, 'logo');
        const extractedGroup =
          extractAttribute(currentExtInf, 'group-title') ||
          extractAttribute(currentExtInf, 'pltv-subgroup');

        if (extractedGroup) {
          group = extractedGroup;
        }

        // El nombre del canal suele estar después de la última coma fuera de comillas
        const lastCommaIdx = currentExtInf.lastIndexOf(',');
        if (lastCommaIdx !== -1 && lastCommaIdx < currentExtInf.length - 1) {
          const parsedName = currentExtInf.slice(lastCommaIdx + 1).trim();
          if (parsedName) {
            name = parsedName;
          }
        } else if (tvgName) {
          name = tvgName;
        }
      }

      // Limpiar nombre de categoría vacía
      group = group.trim() || 'Sin Categoría';

      const quality = detectQualityBadge(name, group);
      const contentType = detectContentType(name, group, url);

      items.push({
        id: createStreamId(playlistId, name, url),
        playlistId,
        playlistName,
        channelNumber: channelCounter++,
        name,
        group,
        url,
        logo: logo || undefined,
        tvgId: tvgId || undefined,
        tvgName: tvgName || undefined,
        quality,
        contentType,
        userAgent: currentUserAgent,
        searchKey: `${name} ${group} ${playlistName}`.toLowerCase(),
      });

      currentExtInf = null;
      currentGroupFromExtGrp = null;
      currentUserAgent = undefined;
    }
  }

  return items;
}

/**
 * Descarga una lista M3U remota desde una URL con soporte opcional de proxy CORS.
 */
export async function fetchM3UFromUrl(url: string, useCorsProxy = false): Promise<string> {
  const trimmedUrl = url.trim();
  const targetUrl = useCorsProxy
    ? `https://api.allorigins.win/raw?url=${encodeURIComponent(trimmedUrl)}`
    : trimmedUrl;

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        Accept: '*/*',
      },
    });

    if (!response.ok) {
      throw new Error(`Error HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    if (!text.includes('#EXT') && !text.includes('http')) {
      throw new Error('El contenido descargado no parece ser una lista M3U válida.');
    }
    return text;
  } catch (err) {
    // Si falló por CORS y no tenía activado el proxy, intentamos automáticamente con el proxy CORS de respaldo
    if (!useCorsProxy) {
      const fallbackUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(trimmedUrl)}`;
      const fallbackRes = await fetch(fallbackUrl);
      if (fallbackRes.ok) {
        const fallbackText = await fallbackRes.text();
        if (fallbackText.includes('#EXT') || fallbackText.includes('http')) {
          return fallbackText;
        }
      }
    }
    throw err;
  }
}

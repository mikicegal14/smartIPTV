import { describe, it, expect } from 'vitest';
import {
  parseM3UContent,
  detectQualityBadge,
  detectContentType,
  createStreamId,
} from '../m3uParser';
import { DEMO_M3U_CONTENT } from '../../data/demoPlaylist';

describe('M3U Parser Engine & Stream Classifier', () => {
  it('parses DEMO_M3U_CONTENT and extracts categories, logos, and URLs', () => {
    const items = parseM3UContent(DEMO_M3U_CONTENT, 'test_pl', 'Lista Test');
    expect(items.length).toBeGreaterThanOrEqual(10);

    const first = items[0];
    expect(first.name).toBe('DW Español FHD');
    expect(first.group).toBe('Noticias Internacionales');
    expect(first.quality).toBe('FHD');
    expect(first.contentType).toBe('live');
    expect(first.url).toContain('.m3u8');
    expect(first.logo).toContain('Deutsche_Welle');
  });

  it('detects quality badges accurately from channel names', () => {
    expect(detectQualityBadge('ESPN Deportes 4K UHD')).toBe('4K');
    expect(detectQualityBadge('Canal Cine 1080p FHD')).toBe('FHD');
    expect(detectQualityBadge('Noticias 720p HD')).toBe('HD');
    expect(detectQualityBadge('Canal Retro 480p SD')).toBe('SD');
    expect(detectQualityBadge('Canal Estándar')).toBe('AUTO');
  });

  it('classifies Live TV, Movies (VOD), and Series accurately', () => {
    expect(
      detectContentType('Noticias 24H', 'Noticias', 'https://srv.com/live/ch1.m3u8')
    ).toBe('live');
    expect(
      detectContentType('Avatar (2009)', 'Películas VOD', 'https://srv.com/movie/123.mp4')
    ).toBe('movie');
    expect(
      detectContentType('The Last of Us S01E03', 'Drama', 'https://srv.com/series/99.mkv')
    ).toBe('series');
  });

  it('generates deterministic IDs so favorites persist across refreshes', () => {
    const id1 = createStreamId('pl_1', 'Canal Uno HD', 'https://test.com/1.m3u8');
    const id2 = createStreamId('pl_1', 'Canal Uno HD', 'https://test.com/1.m3u8');
    expect(id1).toBe(id2);
  });
});

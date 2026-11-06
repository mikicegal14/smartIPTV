export type ContentType = 'live' | 'movie' | 'series';

export type QualityBadge = '4K' | 'FHD' | 'HD' | 'SD' | 'AUTO';

export interface StreamItem {
  id: string;
  playlistId: string;
  playlistName: string;
  channelNumber: number;
  name: string;
  group: string;
  url: string;
  logo?: string;
  tvgId?: string;
  tvgName?: string;
  quality: QualityBadge;
  contentType: ContentType;
  userAgent?: string;
  searchKey?: string;
}

export type PlaylistSourceType = 'url' | 'file' | 'xtream' | 'demo';

export interface XtreamCredentials {
  serverUrl: string;
  username: string;
  password: string;
}

export interface PlaylistSource {
  id: string;
  name: string;
  sourceType: PlaylistSourceType;
  url?: string;
  useCorsProxy?: boolean;
  xtream?: XtreamCredentials;
  channelCount: number;
  categoriesCount: number;
  updatedAt: string;
  items: StreamItem[];
}

export interface CategoryGroup {
  name: string;
  count: number;
}

export type GlobalFilterMode = 'all' | 'favorites' | 'recent' | 'live' | 'vod';

export interface AppSettings {
  viewMode: 'list' | 'grid';
  autoPlayPreview: boolean;
  defaultUseCorsProxy: boolean;
  lastSelectedPlaylistId: string; // 'ALL' or specific playlist id
}

export interface AppConfigBackup {
  version: number;
  exportedAt: string;
  favorites: string[];
  recentIds: string[];
  settings: AppSettings;
  playlists: PlaylistSource[];
}

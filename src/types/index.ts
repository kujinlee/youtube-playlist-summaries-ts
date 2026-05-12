export type VideoType =
  | 'Tutorial'
  | 'Talk'
  | 'Analysis'
  | 'Reference'
  | 'Framework'
  | 'Podcast'
  | 'News'
  | 'Case Study';

export type Audience = 'Beginner' | 'Intermediate' | 'Advanced' | 'All';

export interface Video {
  index: number;
  id: string;
  title: string;
  channel: string;
  lang: 'EN' | 'KR';
  type: VideoType;
  audience: Audience;
  U: number;
  D: number;
  O: number;
  R: number;
  C: number;
  filename: string;
  duration?: number;
}

export interface VideoWithMeta extends Video {
  score: number;
  archived: boolean;
}

export interface Manifest {
  playlist_url: string;
  videos: Video[];
}

export interface ArchiveData {
  archived: number[];
  playlist_removed: string[];
}

export interface Ratings {
  type: VideoType;
  audience: Audience;
  U: number;
  D: number;
  O: number;
  R: number;
  C: number;
}

export interface PlaylistEntry {
  id: string;
  title: string;
  uploader?: string;
  channel?: string;
  duration?: number;
  description?: string;
  webpage_url?: string;
}

export type SortCol = keyof Pick<VideoWithMeta, 'index' | 'title' | 'lang' | 'type' | 'audience' | 'U' | 'D' | 'O' | 'R' | 'C' | 'score'>;
export type SortDir = 1 | -1;

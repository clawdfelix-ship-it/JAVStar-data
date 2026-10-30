export type NewsCategory =
  | 'news'
  | 'interview'
  | 'gravure'
  | 'release'
  | 'event_report'
  | 'debut_retire'
  | 'industry'
  | 'entertainment';

export type NewsSource = {
  key: string;
  name: string;
  url: string;
  isAdult: boolean;
  defaultCategory: NewsCategory;
};

export const NEWS_SOURCES: NewsSource[] = [
  {
    key: 'sexy_video_sokuhou',
    name: 'セクシービデオ速報',
    url: 'https://sougomatomechannel.livedoor.blog/index.rdf',
    isAdult: true,
    defaultCategory: 'industry',
  },
  {
    key: 'dxbeppin_r',
    name: 'デラべっぴんR',
    url: 'https://dxbeppin-r.com/feed',
    isAdult: true,
    defaultCategory: 'news',
  },
  {
    key: 'bltweb',
    name: 'B.L.T.web',
    url: 'https://bltweb.jp/feed',
    isAdult: false,
    defaultCategory: 'gravure',
  },
];

export const NEWS_SOURCE_MAP = Object.fromEntries(NEWS_SOURCES.map((s) => [s.key, s]));

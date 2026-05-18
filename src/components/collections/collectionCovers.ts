export const COVER_IDS = [
  "river",
  "tea",
  "blossom",
  "temple",
  "courtyard",
  "mountains",
] as const;

export type CoverId = (typeof COVER_IDS)[number];

export interface CollectionCoverConfig {
  id: CoverId;
  title: string;
  light: string;
  dark: string;
}

export const DEFAULT_COVER: CoverId = "river";

export const COLLECTION_COVERS: Record<CoverId, CollectionCoverConfig> = {
  river: {
    id: "river",
    title: "Тихая река",
    light: "/collection-covers/river-light.png",
    dark: "/collection-covers/river-dark.png",
  },
  tea: {
    id: "tea",
    title: "Чайная тишина",
    light: "/collection-covers/tea-light.png",
    dark: "/collection-covers/tea-dark.png",
  },
  blossom: {
    id: "blossom",
    title: "Цветущая ветвь",
    light: "/collection-covers/blossom-light.png",
    dark: "/collection-covers/blossom-dark.png",
  },
  temple: {
    id: "temple",
    title: "Храмовые ворота",
    light: "/collection-covers/temple-light.png",
    dark: "/collection-covers/temple-dark.png",
  },
  courtyard: {
    id: "courtyard",
    title: "Тихий двор",
    light: "/collection-covers/courtyard-light.png",
    dark: "/collection-covers/courtyard-dark.png",
  },
  mountains: {
    id: "mountains",
    title: "Горная долина",
    light: "/collection-covers/mountains-light.png",
    dark: "/collection-covers/mountains-dark.png",
  },
};

export const FAVORITES_COVER = {
  id: "favorites",
  title: "Избранное",
  light: "/collection-covers/favorites-light.png",
  dark: "/collection-covers/favorites-dark.png",
} as const;

export const FAVORITES_COLLECTION_ID = "favorites";

const LEGACY_COVER_ID_MAP: Record<string, CoverId> = {
  "rice-paper": "river",
  watercolor: "blossom",
  bamboo: "temple",
  moon: "courtyard",
  calligraphy: "mountains",
};

const FAVORITES_NAMES = new Set(["избранное", "favorites"]);

export function normalizeCoverId(coverId: string | null | undefined): CoverId {
  if (coverId && coverId in COLLECTION_COVERS) {
    return coverId as CoverId;
  }
  if (coverId && coverId in LEGACY_COVER_ID_MAP) {
    return LEGACY_COVER_ID_MAP[coverId];
  }
  return DEFAULT_COVER;
}

export function isFavoritesCollectionName(name: string | null | undefined): boolean {
  return Boolean(name && FAVORITES_NAMES.has(name.trim().toLowerCase()));
}

export function getCollectionCover(
  coverId: string | null | undefined,
  collectionName?: string | null,
): CollectionCoverConfig | typeof FAVORITES_COVER {
  if (coverId === FAVORITES_COLLECTION_ID || isFavoritesCollectionName(collectionName)) {
    return FAVORITES_COVER;
  }
  return COLLECTION_COVERS[normalizeCoverId(coverId)];
}

export function coverLabel(coverId: string, collectionName?: string): string {
  return getCollectionCover(coverId, collectionName).title;
}

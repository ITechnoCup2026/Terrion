export const TILE_SIZE_STEPS = [100, 250, 500, 1000] as const;
export const MAX_TILES = 400;

export type BlockInput = { id: string; areaHa: number; orderIndex: number };

export type BlockRange = {
  blockId: string;
  blockIndex: number;
  startTile: number;
  tileCount: number;
};

export type TileLayout = {
  tileSizeM2: number;
  totalTiles: number;
  cols: number;
  rows: number;
  /** length cols*rows; 0 = empty, n = blockRanges[n-1] */
  tiles: Uint16Array;
  blockRanges: BlockRange[];
};

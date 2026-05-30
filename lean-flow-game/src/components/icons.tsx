// SVG-graphics als React-componenten (via vite-plugin-svgr). Allemaal tintbaar:
// ze gebruiken currentColor, dus zet `color` (CSS/style) om ze te kleuren.
import BrickSvg from '../assets/game/brick.svg?react';
import HouseSvg from '../assets/game/house.svg?react';
import SortColorSvg from '../assets/game/icon-sort-color.svg?react';
import SortSizeSvg from '../assets/game/icon-sort-size.svg?react';
import SetSvg from '../assets/game/icon-set.svg?react';
import BuilderSvg from '../assets/game/icon-builder.svg?react';
import CoinSvg from '../assets/game/coin.svg?react';
import CustomerSvg from '../assets/game/customer.svg?react';
import HouseStagesSvg from '../assets/game/house-stages.svg?react';

// Tileable textures als URL (CSS-achtergronden).
import beltTileUrl from '../assets/game/belt-tile.svg';
import floorTileUrl from '../assets/game/floor-tile.svg';
import hazardStripUrl from '../assets/game/hazard-strip.svg';

export {
  BrickSvg,
  HouseSvg,
  SortColorSvg,
  SortSizeSvg,
  SetSvg,
  BuilderSvg,
  CoinSvg,
  CustomerSvg,
  HouseStagesSvg,
  beltTileUrl,
  floorTileUrl,
  hazardStripUrl,
};

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

// Tileable textures staan in public/textures/ (raakt svgr niet aan, werkt in dev
// én build). BASE_URL respecteert de /LeanGame/ project-base in productie.
const tex = (name: string) => `${import.meta.env.BASE_URL}textures/${name}`;
const beltTileUrl = tex('belt-tile.svg');
const floorTileUrl = tex('floor-tile.svg');
const hazardStripUrl = tex('hazard-strip.svg');
const machineFrameUrl = tex('machine-frame.svg');

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
  machineFrameUrl,
};

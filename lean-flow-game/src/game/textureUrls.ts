// Tileable textures staan in public/textures/ (raakt svgr niet aan, werkt in dev
// en build). BASE_URL respecteert de /LeanGame/ project-base in productie.
const tex = (name: string) => `${import.meta.env.BASE_URL}textures/${name}`;

export const beltTileUrl = tex('belt-tile.svg');
export const floorTileUrl = tex('floor-tile.svg');
export const hazardStripUrl = tex('hazard-strip.svg');
export const machineFrameUrl = tex('machine-frame.svg');

import { readFileSync } from 'node:fs';
import { scenarioMaps } from '../src/scenario/maps.ts';
import { hasNavigation, installOpponentMaps } from '../src/opponent/geography.ts';
import type { Geography } from '../src/pacific/terrain.ts';

export function ensureOpponentTerrain() {
  if(hasNavigation('palawan-spratlys/focus'))return;
  const json=(path:string):Geography=>JSON.parse(readFileSync(path,'utf8'));
  installOpponentMaps(scenarioMaps({regional:json('public/terrain/pacific/regional-land.json'),shoal:json('public/terrain/pacific/shoal-detail.json'),senkaku:json('public/terrain/pacific/senkaku-detail.json')}));
}

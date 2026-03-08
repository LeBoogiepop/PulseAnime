/**
 * Registre centralisé des sketches.
 * Pour ajouter une scène : 1) créer le fichier .ts, 2) ajouter une ligne ici.
 */
import type { Sketch } from '../types';
import { BotanicalPond } from './BotanicalPond';
import { ColorShift } from './ColorShift';
import { GoldenScars } from './GoldenScars';
import { NoisePartition } from './NoisePartition';
import { TravelShader } from './TravelShader';
import { PlexusVoronoi } from './Library';
import { BoxTunnel } from './BoxTunnel';
import { SamuelYanShader } from './SamuelYanShader';

export const SKETCH_REGISTRY: Array<new () => Sketch> = [
  BotanicalPond,
  ColorShift,
  GoldenScars,
  NoisePartition,
  TravelShader,
  PlexusVoronoi,
  BoxTunnel,
  SamuelYanShader,
];

export function getSketchById(id: string): Sketch | null {
  for (const C of SKETCH_REGISTRY) {
    const s = new C();
    if (s.id === id) return s;
  }
  return null;
}

import { describe, it, expect } from 'vitest';
import { slugFromPlanetName } from './modelManifest';

describe('slugFromPlanetName', () => {
  it('handles spaces and capitalization', () => {
    expect(slugFromPlanetName('Kepler 22 b')).toBe('kepler22b');
  });

  it('handles hyphens and underscores', () => {
    expect(slugFromPlanetName('TRAPPIST-1 e')).toBe('trappist1e');
    expect(slugFromPlanetName('HD_209458 b')).toBe('hd209458b');
  });

  it('handles numerals and punctuation', () => {
    expect(slugFromPlanetName('K2-18b')).toBe('k218b');
    expect(slugFromPlanetName('GJ 1214 b')).toBe('gj1214b');
  });

  it('trims repeated separators', () => {
    expect(slugFromPlanetName('  WASP   12   b  ')).toBe('wasp12b');
  });
});



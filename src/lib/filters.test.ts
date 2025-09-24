import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  filterEarthLike, 
  filterWeird, 
  filterClosest, 
  getRandomPlanet,
  Planet 
} from '../lib/filters'

// Mock mlClassifier to ensure deterministic, fast tests and to avoid loading TF.js
vi.mock('../lib/mlClassifier', () => ({
  MODEL_VERSION: 'test-1',
  predict: async (_p: Planet) => ({ earthLike: 0.0, weird: 0.0 }),
  predictBatch: async (_ps: Planet[]) => _ps.map(() => ({ earthLike: 0.0, weird: 0.0 })),
}));

beforeEach(() => {
  // Clear any ML caches indirectly by re-importing filters if needed
});

// Mock planet data for testing
const mockPlanets: Planet[] = [
  {
    pl_name: 'Earth-like-1',
    hostname: 'Sun-like',
    pl_rade: 1.0,         // Earth radius
    pl_bmasse: 1.0,       // Earth mass  
    pl_eqt: 288,          // Earth-like temperature (15°C)
    pl_orbper: 365,       // Earth-like orbital period
    sy_dist: 1.0,         // Close distance
    pl_insol: 1.0,        // Earth-like insolation
    discoveryyear: 2020,
    discoverymethod: 'Transit'
  },
  {
    pl_name: 'Hot-Jupiter',
    hostname: 'Hot-Star',
    pl_rade: 11.0,        // Jupiter-like radius
    pl_bmasse: 300.0,     // Very massive
    pl_eqt: 1500,         // Very hot
    pl_orbper: 3,         // Very short period
    sy_dist: 100.0,       // Far distance
    pl_insol: 1000.0,     // Very high insolation
    discoveryyear: 2015,
    discoverymethod: 'Radial Velocity'
  },
  {
    pl_name: 'Super-Earth',
    hostname: 'Red-Dwarf',
    pl_rade: 1.5,         // Larger than Earth
    pl_bmasse: 2.0,       // More massive than Earth
    pl_eqt: 250,          // Cold but not frozen
    pl_orbper: 20,        // Short period
    sy_dist: 10.0,        // Medium distance
    pl_insol: 0.5,        // Lower insolation
    discoveryyear: 2018,
    discoverymethod: 'Transit'
  },
  {
    pl_name: 'Weird-Planet',
    hostname: 'Binary-Star',
    pl_rade: 0.1,         // Very small
    pl_bmasse: 0.01,      // Very light
    pl_eqt: 50,           // Very cold
    pl_orbper: 1000,      // Very long period
    sy_dist: 500.0,       // Very far
    pl_insol: 0.001,      // Very low insolation
    discoveryyear: 2010,
    discoverymethod: 'Microlensing'
  },
  {
    pl_name: 'Close-Planet',
    hostname: 'Proxima',
    pl_rade: 1.1,
    pl_bmasse: 1.3,
    pl_eqt: 234,
    pl_orbper: 11,
    sy_dist: 1.3,         // Very close (Proxima Centauri distance)
    pl_insol: 0.65,
    discoveryyear: 2016,
    discoverymethod: 'Radial Velocity'
  }
]

describe('Planet Filtering Functions', () => {
  describe('filterEarthLike', () => {
    it('should identify Earth-like planets correctly', () => {
      const earthLike = filterEarthLike(mockPlanets)
      
      // Should include the Earth-like planet
      expect(earthLike).toContainEqual(expect.objectContaining({
        pl_name: 'Earth-like-1'
      }))
      
      // Should not include the Hot Jupiter
      expect(earthLike).not.toContainEqual(expect.objectContaining({
        pl_name: 'Hot-Jupiter'
      }))
    })

    it('should handle planets with missing data', () => {
      const planetsWithMissingData = [
        { pl_name: 'Incomplete-Planet', hostname: 'Unknown' } as Planet,
        ...mockPlanets
      ]
      
      const result = filterEarthLike(planetsWithMissingData)
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('should return empty array for empty input', () => {
      const result = filterEarthLike([])
      expect(result).toEqual([])
    })
  })

  describe('filterWeird', () => {
    it('should identify weird planets correctly', () => {
      const weird = filterWeird(mockPlanets)
      
      // Should include the weird planet
      expect(weird).toContainEqual(expect.objectContaining({
        pl_name: 'Weird-Planet'
      }))
      
      // Should include the Hot Jupiter (extreme characteristics)
      expect(weird).toContainEqual(expect.objectContaining({
        pl_name: 'Hot-Jupiter'
      }))
      
      // Should not include the Earth-like planet
      expect(weird).not.toContainEqual(expect.objectContaining({
        pl_name: 'Earth-like-1'
      }))
    })

    it('should handle edge cases for weirdness scoring', () => {
      const extremePlanets = [
        {
          pl_name: 'Extreme-Hot',
          hostname: 'Hot-Star',
          pl_eqt: 3000,      // Extremely hot
          pl_rade: 20,       // Very large
          pl_orbper: 0.1,    // Extremely short period
          sy_dist: 1000,     // Very far
        } as Planet
      ]
      
      const result = filterWeird(extremePlanets)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('filterClosest', () => {
    it('should sort planets by distance correctly', () => {
      const closest = filterClosest(mockPlanets)
      
      // First planet should be the closest
      expect(closest[0]).toEqual(expect.objectContaining({
        pl_name: 'Earth-like-1'
      }))
      
      // Second should be Close-Planet
      expect(closest[1]).toEqual(expect.objectContaining({
        pl_name: 'Close-Planet'  
      }))
      
      // Last should be the farthest
      expect(closest[closest.length - 1]).toEqual(expect.objectContaining({
        pl_name: 'Weird-Planet'
      }))
    })

    it('should handle planets without distance data', () => {
      const planetsWithoutDistance = [
        { pl_name: 'No-Distance', hostname: 'Unknown', sy_dist: undefined } as Planet,
        ...mockPlanets
      ]
      
      const result = filterClosest(planetsWithoutDistance)
      expect(result).toBeDefined()
      const missingCount = planetsWithoutDistance.filter(p => (p as Planet).sy_dist == null).length
      expect(result.length).toBe(planetsWithoutDistance.length - missingCount)
    })

    it('should maintain all planets in result', () => {
      const result = filterClosest(mockPlanets)
      expect(result.length).toBe(mockPlanets.length)
    })
  })

  describe('getRandomPlanet', () => {
    it('should return a planet from the provided array', () => {
      const random = getRandomPlanet(mockPlanets)
      expect(mockPlanets).toContainEqual(random)
    })

    it('should return null for empty array', () => {
      const random = getRandomPlanet([])
      expect(random).toBeNull()
    })

    it('should return the only planet for single-planet array', () => {
      const singlePlanet = [mockPlanets[0]]
      const random = getRandomPlanet(singlePlanet)
      expect(random).toEqual(mockPlanets[0])
    })
  })

  describe('Earth-like Scoring Algorithm', () => {
    it('should give high scores to Earth-like characteristics', () => {
      // Test the scoring logic by examining filter results
      const earthLike = filterEarthLike(mockPlanets)
      const earthLikePlanet = earthLike.find(p => p.pl_name === 'Earth-like-1')
      
      expect(earthLikePlanet).toBeDefined()
      
      // Earth-like planet should be in top results
      const earthLikeIndex = earthLike.findIndex(p => p.pl_name === 'Earth-like-1')
      expect(earthLikeIndex).toBeLessThan(earthLike.length / 2) // Should be in top half
    })

    it('should penalize extreme characteristics', () => {
      const earthLike = filterEarthLike(mockPlanets)
      
      // Hot Jupiter should not appear in Earth-like results or be ranked very low
      const hotJupiterIndex = earthLike.findIndex(p => p.pl_name === 'Hot-Jupiter')
      expect(hotJupiterIndex).toBe(-1) // Should not be included, or
      // if included, should be at the end
    })
  })

  describe('Weirdness Scoring Algorithm', () => {
    it('should give high scores to extreme characteristics', () => {
      const weird = filterWeird(mockPlanets)
      
      // Weird planet should be highly ranked
      const weirdIndex = weird.findIndex(p => p.pl_name === 'Weird-Planet')
      expect(weirdIndex).toBeLessThan(weird.length / 2) // Should be in top half
      
      // Hot Jupiter should also be highly ranked for weirdness
      const hotJupiterIndex = weird.findIndex(p => p.pl_name === 'Hot-Jupiter')
      expect(hotJupiterIndex).toBeLessThan(weird.length / 2)
    })

    it('should not highly rank normal planets', () => {
      const weird = filterWeird(mockPlanets)
      
      // Earth-like planet should not be in weird results or ranked low
      const earthLikeIndex = weird.findIndex(p => p.pl_name === 'Earth-like-1')
      if (earthLikeIndex !== -1) {
        expect(earthLikeIndex).toBeGreaterThan(weird.length / 2) // Should be in bottom half if included
      }
    })
  })

  describe('Filter Consistency', () => {
    it('should handle the same planet appearing in multiple filters', () => {
      const earthLike = filterEarthLike(mockPlanets)
      const weird = filterWeird(mockPlanets)
      const closest = filterClosest(mockPlanets)
      
      // All filters should return arrays
      expect(Array.isArray(earthLike)).toBe(true)
      expect(Array.isArray(weird)).toBe(true)
      expect(Array.isArray(closest)).toBe(true)
      
      // Closest should preserve all planets
      expect(closest.length).toBe(mockPlanets.length)
    })

    it('should handle numerical edge cases', () => {
      const edgeCasePlanets = [
        {
          pl_name: 'Zero-Values',
          hostname: 'Edge-Star',
          pl_rade: 0,
          pl_bmasse: 0,
          pl_eqt: 0,
          pl_orbper: 0,
          sy_dist: 0,
          pl_insol: 0,
        } as Planet,
        {
          pl_name: 'Negative-Values',
          hostname: 'Edge-Star-2',
          pl_rade: -1,
          pl_bmasse: -1,
          pl_eqt: -1,
          pl_orbper: -1,
          sy_dist: -1,
          pl_insol: -1,
        } as Planet
      ]
      
      // Functions should not crash with edge values
      expect(() => filterEarthLike(edgeCasePlanets)).not.toThrow()
      expect(() => filterWeird(edgeCasePlanets)).not.toThrow()
      expect(() => filterClosest(edgeCasePlanets)).not.toThrow()
    })
  })
})
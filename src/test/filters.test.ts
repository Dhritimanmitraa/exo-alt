import { describe, it, expect } from 'vitest'
import { earthLikeScore, weirdnessScore, filterEarthLike, filterWeird, filterClosest, getRandomPlanet, Planet } from '../lib/filters'

describe('earthLikeScore', () => {
  it('should return 0 for planets missing required data', () => {
    const planet: Planet = { pl_name: 'Test-1' }
    expect(earthLikeScore(planet)).toBe(0)
  })

  it('should return high score for Earth-like planet', () => {
    const earthLike: Planet = {
      pl_name: 'Earth-like',
      pl_rade: 1.0,
      pl_insol: 1.0,
      pl_eqt: 255
    }
    const score = earthLikeScore(earthLike)
    expect(score).toBeGreaterThan(90)
  })

  it('should return lower score for non-Earth-like planet', () => {
    const nonEarthLike: Planet = {
      pl_name: 'Hot Jupiter',
      pl_rade: 5.0,
      pl_insol: 100.0,
      pl_eqt: 1200
    }
    const score = earthLikeScore(nonEarthLike)
    expect(score).toBeLessThan(30)
  })

  it('should handle planets with partial data', () => {
    const partial: Planet = {
      pl_name: 'Partial',
      pl_rade: 1.2,
      pl_insol: 0.8
      // no temperature data
    }
    const score = earthLikeScore(partial)
    expect(score).toBeGreaterThan(0)
    expect(score).toBeLessThan(100)
  })

  it('should penalize extreme radius values', () => {
    const largeRadius: Planet = {
      pl_name: 'Large',
      pl_rade: 3.0,
      pl_insol: 1.0,
      pl_eqt: 255
    }
    const smallRadius: Planet = {
      pl_name: 'Small',
      pl_rade: 0.5,
      pl_insol: 1.0,
      pl_eqt: 255
    }
    const perfect: Planet = {
      pl_name: 'Perfect',
      pl_rade: 1.0,
      pl_insol: 1.0,
      pl_eqt: 255
    }
    
    const perfectScore = earthLikeScore(perfect)
    expect(earthLikeScore(largeRadius)).toBeLessThan(perfectScore)
    expect(earthLikeScore(smallRadius)).toBeLessThan(perfectScore)
  })
})

describe('weirdnessScore', () => {
  it('should return 0 for normal planet', () => {
    const normal: Planet = {
      pl_name: 'Normal',
      pl_rade: 1.0,
      pl_insol: 1.0,
      pl_eqt: 300,
      pl_orbper: 365,
      pl_bmasse: 1.0
    }
    expect(weirdnessScore(normal)).toBe(0)
  })

  it('should return high score for extremely hot planet', () => {
    const hotPlanet: Planet = {
      pl_name: 'Hot',
      pl_eqt: 2000
    }
    expect(weirdnessScore(hotPlanet)).toBeGreaterThan(25)
  })

  it('should return high score for extremely cold planet', () => {
    const coldPlanet: Planet = {
      pl_name: 'Cold',
      pl_eqt: 50
    }
    expect(weirdnessScore(coldPlanet)).toBeGreaterThan(25)
  })

  it('should penalize extreme insolation', () => {
    const highInsol: Planet = {
      pl_name: 'High Insol',
      pl_insol: 500
    }
    const lowInsol: Planet = {
      pl_name: 'Low Insol',
      pl_insol: 0.01
    }
    
    expect(weirdnessScore(highInsol)).toBeGreaterThan(20)
    expect(weirdnessScore(lowInsol)).toBeGreaterThan(20)
  })

  it('should penalize very large and very small planets', () => {
    const giant: Planet = {
      pl_name: 'Giant',
      pl_rade: 10.0
    }
    const tiny: Planet = {
      pl_name: 'Tiny',
      pl_rade: 0.2
    }
    
    expect(weirdnessScore(giant)).toBeGreaterThan(15)
    expect(weirdnessScore(tiny)).toBeGreaterThan(15)
  })

  it('should penalize short orbital periods', () => {
    const fastOrbit: Planet = {
      pl_name: 'Fast',
      pl_orbper: 0.5
    }
    expect(weirdnessScore(fastOrbit)).toBeGreaterThan(10)
  })

  it('should penalize very massive planets', () => {
    const massive: Planet = {
      pl_name: 'Massive',
      pl_bmasse: 500
    }
    expect(weirdnessScore(massive)).toBeGreaterThan(5)
  })

  it('should cap weirdness score at 100', () => {
    const superWeird: Planet = {
      pl_name: 'Super Weird',
      pl_eqt: 3000,
      pl_insol: 1000,
      pl_rade: 20,
      pl_orbper: 0.1,
      pl_bmasse: 1000
    }
    expect(weirdnessScore(superWeird)).toBe(100)
  })

  it('should accumulate weirdness from multiple factors', () => {
    const multiWeird: Planet = {
      pl_name: 'Multi Weird',
      pl_eqt: 2000,  // +30
      pl_insol: 500, // +25
      pl_rade: 10    // +20
    }
    expect(weirdnessScore(multiWeird)).toBe(75)
  })
})

describe('filterEarthLike', () => {
  const testPlanets: Planet[] = [
    {
      pl_name: 'Earth-twin',
      pl_rade: 1.0,
      pl_insol: 1.0,
      pl_eqt: 255
    },
    {
      pl_name: 'Almost-Earth',
      pl_rade: 1.2,
      pl_insol: 0.8,
      pl_eqt: 280
    },
    {
      pl_name: 'Hot Jupiter',
      pl_rade: 5.0,
      pl_insol: 100,
      pl_eqt: 1200
    },
    {
      pl_name: 'Missing-data',
    }
  ]

  it('should filter planets with Earth-like score > 30', () => {
    const filtered = filterEarthLike(testPlanets)
    expect(filtered.length).toBeGreaterThan(0)
    filtered.forEach(planet => {
      expect(earthLikeScore(planet)).toBeGreaterThan(30)
    })
  })

  it('should sort by Earth-like score descending', () => {
    const filtered = filterEarthLike(testPlanets)
    if (filtered.length > 1) {
      for (let i = 0; i < filtered.length - 1; i++) {
        expect(earthLikeScore(filtered[i])).toBeGreaterThanOrEqual(earthLikeScore(filtered[i + 1]))
      }
    }
  })

  it('should exclude planets with low Earth-like scores', () => {
    const filtered = filterEarthLike(testPlanets)
    expect(filtered.find(p => p.pl_name === 'Hot Jupiter')).toBeUndefined()
    expect(filtered.find(p => p.pl_name === 'Missing-data')).toBeUndefined()
  })
})

describe('filterWeird', () => {
  const testPlanets: Planet[] = [
    {
      pl_name: 'Normal',
      pl_rade: 1.0,
      pl_insol: 1.0,
      pl_eqt: 300
    },
    {
      pl_name: 'Super Hot',
      pl_eqt: 2000
    },
    {
      pl_name: 'Giant',
      pl_rade: 15.0
    },
    {
      pl_name: 'Multi-weird',
      pl_eqt: 1500,
      pl_rade: 8.0,
      pl_orbper: 0.3
    }
  ]

  it('should filter planets with weirdness score > 40', () => {
    const filtered = filterWeird(testPlanets)
    filtered.forEach(planet => {
      expect(weirdnessScore(planet)).toBeGreaterThan(40)
    })
  })

  it('should sort by weirdness score descending', () => {
    const filtered = filterWeird(testPlanets)
    if (filtered.length > 1) {
      for (let i = 0; i < filtered.length - 1; i++) {
        expect(weirdnessScore(filtered[i])).toBeGreaterThanOrEqual(weirdnessScore(filtered[i + 1]))
      }
    }
  })

  it('should exclude normal planets', () => {
    const filtered = filterWeird(testPlanets)
    expect(filtered.find(p => p.pl_name === 'Normal')).toBeUndefined()
  })
})

describe('filterClosest', () => {
  const testPlanets: Planet[] = [
    {
      pl_name: 'Far',
      sy_dist: 100.5
    },
    {
      pl_name: 'Close',
      sy_dist: 4.2
    },
    {
      pl_name: 'Medium',
      sy_dist: 50.0
    },
    {
      pl_name: 'No-distance'
    }
  ]

  it('should filter out planets without distance data', () => {
    const filtered = filterClosest(testPlanets)
    expect(filtered.find(p => p.pl_name === 'No-distance')).toBeUndefined()
    filtered.forEach(planet => {
      expect(planet.sy_dist).toBeDefined()
    })
  })

  it('should sort by distance ascending', () => {
    const filtered = filterClosest(testPlanets)
    for (let i = 0; i < filtered.length - 1; i++) {
      expect(filtered[i].sy_dist).toBeLessThanOrEqual(filtered[i + 1].sy_dist || 0)
    }
  })

  it('should return closest planet first', () => {
    const filtered = filterClosest(testPlanets)
    expect(filtered[0]?.pl_name).toBe('Close')
  })
})

describe('getRandomPlanet', () => {
  it('should return null for empty array', () => {
    expect(getRandomPlanet([])).toBeNull()
  })

  it('should return the single planet from array of one', () => {
    const planets = [{ pl_name: 'Only-one' }]
    expect(getRandomPlanet(planets)).toEqual(planets[0])
  })

  it('should return a planet from the array', () => {
    const planets = [
      { pl_name: 'Planet-1' },
      { pl_name: 'Planet-2' },
      { pl_name: 'Planet-3' }
    ]
    const result = getRandomPlanet(planets)
    expect(planets).toContainEqual(result)
  })

  it('should return different planets on multiple calls (probabilistic)', () => {
    const planets = Array.from({ length: 10 }, (_, i) => ({ pl_name: `Planet-${i}` }))
    const results = new Set()
    
    // Run multiple times to check randomness
    for (let i = 0; i < 50; i++) {
      const result = getRandomPlanet(planets)
      if (result) results.add(result.pl_name)
    }
    
    // Should get multiple different planets (probabilistic test)
    expect(results.size).toBeGreaterThan(1)
  })
})
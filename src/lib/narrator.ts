import { Planet, earthLikeScore, weirdnessScore } from './filters';

export type NarrativeContext = 'earthlike' | 'weird' | 'closest' | 'random';

export function narrate(planet: Planet, context: NarrativeContext = 'earthlike'): string {
  if (!planet) return '';
  
  const name = planet.pl_name;
  const host = planet.hostname || 'its star';
  const distance = planet.sy_dist ? (planet.sy_dist.toFixed(1) + ' parsecs') : 'unknown distance';
  
  switch (context) {
    case 'earthlike':
      return narrateEarthLike(planet, name, host);
    
    case 'weird':
      return narrateWeird(planet, name, host);
    
    case 'closest':
      return narrateClosest(planet, name, host, distance);
    
    case 'random':
      return narrateRandom(planet, name, host);
    
    default:
      return narrateGeneric(planet, name, host);
  }
}

function narrateEarthLike(planet: Planet, name: string, host: string): string {
  const score = earthLikeScore(planet);
  const radius = planet.pl_rade ? (planet.pl_rade.toFixed(2) + ' R') : 'unknown';
  const insolation = planet.pl_insol ? (planet.pl_insol.toFixed(2) + '') : 'unknown';
  
  let explanation = '';
  if (score > 70) {
    explanation = "it's remarkably similar to Earth in size and sunlight received.";
  } else if (score > 50) {
    explanation = "it shares some key characteristics with Earth but differs in important ways.";
  } else {
    explanation = "it falls short in one or more key habitability metrics.";
  }
  
  return name + ' orbits ' + host + ' with a radius of ~' + radius + ' and receives ~' + insolation + ' Earth\'s sunlight. It scores ' + score + '/100 on our Earth-likeness scale — interesting because ' + explanation;
}

function narrateWeird(planet: Planet, name: string, _host: string): string {
  const weirdness = weirdnessScore(planet);
  const temp = planet.pl_eqt ? (planet.pl_eqt + 'K') : 'unknown';
  const radius = planet.pl_rade ? (planet.pl_rade.toFixed(1) + ' R') : 'unknown';
  
  let weirdFeature = '';
  if (planet.pl_eqt && planet.pl_eqt > 1000) {
    weirdFeature = 'Its surface is hot enough to melt copper!';
  } else if (planet.pl_insol && planet.pl_insol > 100) {
    weirdFeature = 'It receives hundreds of times more radiation than Earth.';
  } else if (planet.pl_orbper && planet.pl_orbper < 1) {
    weirdFeature = 'It completes an orbit faster than Earth rotates once.';
  } else if (planet.pl_rade && planet.pl_rade > 3) {
    weirdFeature = 'This super-Earth is much larger than our home planet.';
  } else {
    weirdFeature = 'Its extreme conditions make it a fascinating laboratory for atmospheric science.';
  }
  
  return name + ' is a bizarre world with temperature ~' + temp + ' and radius ' + radius + '. ' + weirdFeature + ' These extreme conditions (weirdness score: ' + weirdness + '/100) help scientists understand planetary formation and atmospheric physics.';
}

function narrateClosest(planet: Planet, name: string, host: string, distance: string): string {
  const travelTime = planet.sy_dist ? Math.round(planet.sy_dist * 3.26 * 1000000) : null;
  
  let proximityNote = '';
  if (planet.sy_dist && planet.sy_dist < 5) {
    proximityNote = "practically next door in cosmic terms.";
  } else if (planet.sy_dist && planet.sy_dist < 20) {
    proximityNote = "close enough for detailed telescope observations.";
  } else {
    proximityNote = "within range of our most powerful instruments.";
  }
  
  const travelText = travelTime ? (' At light speed, it would take ' + travelTime.toLocaleString() + ' years to reach.') : '';
  
  return name + ' orbits ' + host + ' just ' + distance + ' away — ' + proximityNote + travelText + ' Its proximity makes it an ideal target for atmospheric studies and potential future exploration missions.';
}

function narrateRandom(planet: Planet, name: string, host: string): string {
  const discoveryYear = planet.discoveryyear || 'unknown';
  const method = planet.discoverymethod || 'unknown method';
  
  return name + ' was discovered in ' + discoveryYear + ' using the ' + method + ' technique. This ' + getRandomDescriptor(planet) + ' world orbiting ' + host + ' represents the incredible diversity of planets in our galaxy. Each discovery like this expands our understanding of how planetary systems form and evolve.';
}

function narrateGeneric(_planet: Planet, name: string, host: string): string {
  return name + ' is an exoplanet orbiting ' + host + '. This distant world helps us understand the incredible variety of planets that exist beyond our solar system.';
}

function getRandomDescriptor(planet: Planet): string {
  const descriptors = ['fascinating', 'intriguing', 'remarkable', 'extraordinary', 'captivating'];
  
  if (planet.pl_eqt && planet.pl_eqt > 1000) return 'scorching hot';
  if (planet.pl_eqt && planet.pl_eqt < 200) return 'frigid';
  if (planet.pl_rade && planet.pl_rade > 2) return 'super-Earth';
  if (planet.sy_dist && planet.sy_dist < 10) return 'nearby';
  
  return descriptors[Math.floor(Math.random() * descriptors.length)];
}

export function getShareText(planet: Planet, context: NarrativeContext): string {
  const narrative = narrate(planet, context);
  return ' Check out ' + planet.pl_name + '! ' + narrative + ' #ExoArchive #Exoplanets #SpaceExploration';
}

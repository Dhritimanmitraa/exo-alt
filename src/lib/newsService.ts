/**
 * News Service
 * 
 * Service for fetching news from various sources including APIs and local files
 */

import { NewsConfig, NewsApiResponse, transformApiResponse, DEFAULT_NEWS_CONFIG } from './newsConfig';
import { Planet } from './filters';

export interface ExoplanetNews {
  id: string;
  title: string;
  summary: string;
  fullContent: string;
  planet?: Planet;
  discoveryDate: Date;
  source: string;
  significance: 'breakthrough' | 'interesting' | 'routine';
  imageUrl?: string;
  tags: string[];
}

class NewsService {
  private config: NewsConfig;
  private cache: Map<string, { data: ExoplanetNews[]; timestamp: number }> = new Map();

  constructor(config: NewsConfig = DEFAULT_NEWS_CONFIG) {
    this.config = config;
  }

  /**
   * Update the news configuration
   */
  updateConfig(newConfig: Partial<NewsConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Fetch news from all enabled sources
   */
  async fetchNews(planets: Planet[]): Promise<ExoplanetNews[]> {
    if (!this.config.useRealData) {
      return this.getMockNews(planets);
    }

    const allNews: ExoplanetNews[] = [];
    const enabledSources = this.config.sources.filter(source => source.enabled);

    // If no sources are enabled, fall back to mock data
    if (enabledSources.length === 0) {
      if (this.config.fallbackToMock) {
        console.warn('No news sources enabled, falling back to mock data');
        return this.getMockNews(planets);
      }
      return [];
    }

    // Fetch from all enabled sources
    for (const source of enabledSources) {
      try {
        const news = await this.fetchFromSource(source, planets);
        allNews.push(...news);
      } catch (error) {
        console.error(`Failed to fetch news from ${source.name}:`, error);
        
        // If this is the only source and fallback is enabled, use mock data
        if (enabledSources.length === 1 && this.config.fallbackToMock) {
          console.warn('Failed to fetch from only source, falling back to mock data');
          return this.getMockNews(planets);
        }
      }
    }

    // If no news was fetched and fallback is enabled, use mock data
    if (allNews.length === 0 && this.config.fallbackToMock) {
      console.warn('No news fetched from any source, falling back to mock data');
      return this.getMockNews(planets);
    }

    // Sort by date and remove duplicates
    return this.deduplicateNews(allNews);
  }

  /**
   * Fetch news from a specific source
   */
  private async fetchFromSource(source: any, planets: Planet[]): Promise<ExoplanetNews[]> {
    // Check cache first
    const cacheKey = source.url;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.config.refreshInterval) {
      return cached.data;
    }

    let response: Response;
    
    try {
      response = await fetch(source.url, {
        headers: {
          'Accept': 'application/json',
          ...source.headers
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // If it's a local file that doesn't exist, that's expected
      if (source.url.startsWith('/data/') || source.url.startsWith('./data/')) {
        throw new Error(`Local news file not found: ${source.url}`);
      }
      throw error;
    }

    const data: NewsApiResponse = await response.json();
    const transformedNews = transformApiResponse(data);
    
    // Match planets to news articles
    const newsWithPlanets = transformedNews.map(news => ({
      ...news,
      planet: this.findMatchingPlanet(news, planets)
    }));

    // Cache the results
    this.cache.set(cacheKey, {
      data: newsWithPlanets,
      timestamp: Date.now()
    });

    return newsWithPlanets;
  }

  /**
   * Find a planet that matches the news article
   */
  private findMatchingPlanet(news: any, planets: Planet[]): Planet | undefined {
    const searchText = `${news.title} ${news.summary} ${news.fullContent}`.toLowerCase();
    
    return planets.find(planet => {
      const planetName = planet.pl_name.toLowerCase();
      const systemName = planet.hostname?.toLowerCase() || '';
      
      return searchText.includes(planetName) || 
             searchText.includes(systemName) ||
             (news.relatedPlanet && news.relatedPlanet.toLowerCase() === planetName);
    });
  }

  /**
   * Remove duplicate news articles
   */
  private deduplicateNews(news: ExoplanetNews[]): ExoplanetNews[] {
    const seen = new Set<string>();
    const unique: ExoplanetNews[] = [];

    for (const article of news) {
      const key = article.title.toLowerCase().trim();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push(article);
      }
    }

    return unique.sort((a, b) => b.discoveryDate.getTime() - a.discoveryDate.getTime());
  }

  /**
   * Get mock news data (fallback)
   */
  private getMockNews(planets: Planet[]): ExoplanetNews[] {
    // Comprehensive news coverage for all 12 planets in the database
    const MOCK_NEWS = [
      // BREAKTHROUGH NEWS
      {
        title: "James Webb Detects Water Vapor and Clouds on K2-18b",
        summary: "The James Webb Space Telescope has made a groundbreaking discovery by detecting water vapor, methane, and carbon dioxide in the atmosphere of K2-18b, bringing us closer to understanding habitability beyond Earth.",
        fullContent: "In a discovery that has sent shockwaves through the astronomical community, the James Webb Space Telescope has detected compelling evidence of water vapor, methane, and carbon dioxide in the atmosphere of K2-18b, a sub-Neptune exoplanet located 124 light-years away.\\n\\nK2-18b, which is 2.6 times the radius and 8.6 times the mass of Earth, orbits within the habitable zone of its cool red dwarf star K2-18. The planet completes an orbit every 33 days, receiving similar amounts of stellar radiation as Earth receives from the Sun.\\n\\nThe detection was made possible through transmission spectroscopy, analyzing starlight filtered through K2-18b's atmosphere as it transited in front of its host star. Webb's unprecedented infrared sensitivity revealed spectral signatures that indicate not only water vapor but also methane - a combination that on Earth is associated with life processes.\\n\\nPerhaps most intriguingly, the observations suggest the presence of clouds and hazes high in the planet's atmosphere. The abundance of methane and carbon dioxide, combined with the scarcity of ammonia, supports the hypothesis that K2-18b may have a water ocean beneath a hydrogen-rich atmosphere.\\n\\n'This is the first time we've detected water vapor, carbon dioxide, and methane simultaneously in the atmosphere of a planet in the habitable zone,' said Dr. Nikku Madhusudhan, the lead researcher. 'K2-18b is now our best bet for an exoplanet that could have a liquid water ocean and potentially support life as we know it.'\\n\\nFuture observations with James Webb will search for additional atmospheric components and attempt to detect potential biosignature gases that might indicate the presence of life on this distant world.",
        source: "NASA/ESA Webb",
        significance: "breakthrough" as const,
        imageUrl: "/images/k2-18b.jpg",
        tags: ["water-vapor", "habitable-zone", "jwst", "atmosphere", "methane", "biosignatures"]
      },
      {
        title: "KELT-9b: The Hottest Planet Ever Discovered Challenges Physics",
        summary: "KELT-9b, with temperatures exceeding 4,600K, is hotter than most stars and is literally evaporating into space, revealing exotic atmospheric chemistry never seen before.",
        fullContent: "KELT-9b has shattered every expectation about planetary physics. Located 670 light-years away, this ultra-hot Jupiter orbits so close to its host star that it completes a full year in just 36 hours, reaching temperatures of 4,600K - hotter than many red dwarf stars.\\n\\nThe planet's extreme proximity to KELT-9, a massive A-type star, subjects it to stellar radiation so intense that molecules cannot survive on the day side. Instead, the atmosphere is composed of individual atoms of metals like iron, titanium, sodium, and magnesium, detected through spectroscopy as they rain down from the upper atmosphere.\\n\\n'KELT-9b is basically evaporating before our eyes,' explains Dr. Kevin Heng, an atmospheric physicist. 'The planet is losing atmospheric material at such a rate that it's creating a comet-like tail of escaping gas. We're witnessing planetary destruction in real-time.'\\n\\nWhat makes KELT-9b particularly fascinating is its inefficient heat redistribution. While the day side reaches scorching temperatures, atmospheric modeling suggests the night side remains 'only' around 3,000K. This extreme temperature gradient creates unprecedented atmospheric dynamics, with supersonic winds and exotic weather patterns.\\n\\nThe planet's atmosphere is so hot that it's undergoing thermal dissociation - molecules are being broken apart into individual atoms. Iron and titanium exist as gases, creating an alien atmospheric chemistry that challenges our understanding of planetary formation and evolution.\\n\\nRecent observations have detected atmospheric escape in real-time, with the planet losing mass at an extraordinary rate. KELT-9b represents a glimpse into the ultimate fate of planets that venture too close to their stars - a cautionary tale written in vaporized rock and metal.",
        source: "Multiple Observatories",
        significance: "breakthrough" as const,
        imageUrl: "/images/kelt-9b.jpg",
        tags: ["ultra-hot", "atmospheric-escape", "extreme-conditions", "metal-atmosphere", "evaporation"]
      },
      {
        title: "Kepler-186f: The First Earth-Size Planet in the Habitable Zone",
        summary: "Kepler-186f's discovery marked a turning point in exoplanet science as the first Earth-size world confirmed to orbit in the habitable zone of another star.",
        fullContent: "The discovery of Kepler-186f in 2014 represented a watershed moment in the search for potentially habitable worlds. Located 500 light-years away in the constellation Cygnus, this planet made history as the first Earth-size exoplanet confirmed to orbit within the habitable zone of its host star.\\n\\nKepler-186f is remarkably similar to Earth in size, with a radius only 10% larger than our planet. It orbits the red dwarf star Kepler-186 every 130 days, placing it at the outer edge of the habitable zone where liquid water could potentially exist on its surface.\\n\\nThe planet receives about one-third the energy from its star that Earth receives from the Sun, suggesting that if it has a substantial atmosphere with greenhouse gases, it could maintain temperatures suitable for liquid water. The discovery was made using NASA's Kepler Space Telescope through the transit method, detecting the slight dimming of starlight as the planet passed in front of its star.\\n\\n'Kepler-186f represents a significant step toward finding worlds that are truly similar to Earth,' said Elisa Quintana, the lead researcher on the discovery team. 'The fact that it exists tells us that Earth-size planets in habitable zones are not just possible, but likely common in our galaxy.'\\n\\nThe Kepler-186 system contains five known planets, with Kepler-186f being the outermost. The other four planets orbit much closer to their star and are too hot to be habitable. The star itself is an M-dwarf, smaller and cooler than our Sun but potentially much longer-lived, giving planets in the habitable zone billions of additional years for life to potentially develop.\\n\\nWhile we don't yet know the atmospheric composition or surface conditions of Kepler-186f, its Earth-like size and orbital location make it one of the most promising candidates for habitability discovered to date. Future space telescopes may be able to analyze its atmosphere and search for signs of water vapor or other atmospheric components that could indicate habitability.",
        source: "NASA Kepler",
        significance: "breakthrough" as const,
        imageUrl: "/images/kepler-186f.jpg",
        tags: ["first", "earth-size", "habitable-zone", "kepler", "milestone", "potentially-habitable"]
      },
      
      // INTERESTING NEWS
      {
        title: "TOI-715b: A Fresh Discovery in the Conservative Habitable Zone",
        summary: "Astronomers have discovered TOI-715b, a super-Earth orbiting within the conservative habitable zone of a nearby red dwarf, making it an excellent target for atmospheric studies.",
        fullContent: "TOI-715b represents one of the most recent and promising additions to the catalog of potentially habitable exoplanets. Discovered using NASA's Transiting Exoplanet Survey Satellite (TESS), this super-Earth orbits a red dwarf star just 137 light-years away, making it an ideal candidate for detailed atmospheric characterization.\\n\\nWith a radius 1.55 times that of Earth, TOI-715b completes an orbit around its host star every 19.3 days. What makes this planet particularly interesting is its location within what astronomers call the 'conservative habitable zone' - a more restrictive definition of the habitable zone that accounts for different atmospheric compositions and increases the likelihood of surface liquid water.\\n\\nThe host star, TOI-715, is a red dwarf significantly smaller and cooler than our Sun. While this means the planet must orbit much closer to receive sufficient energy for habitability, red dwarf stars are also much more stable and longer-lived than sun-like stars, potentially providing billions of additional years for life to develop and evolve.\\n\\n'TOI-715b is exciting because it's close enough and bright enough that we should be able to study its atmosphere with current and future telescopes,' explains Dr. Georgina Dransfield, the lead author of the discovery paper. 'If it has retained an atmosphere, we might be able to detect water vapor, carbon dioxide, or other atmospheric components that could tell us about its potential habitability.'\\n\\nThe discovery team used precise measurements of the star's brightness as the planet transited in front of it, revealing not only the planet's size but also its orbital characteristics. Follow-up observations are already planned using the James Webb Space Telescope to search for atmospheric signatures.\\n\\nTOI-715b joins a growing list of nearby super-Earths that are becoming prime targets for atmospheric studies. Its recent discovery in 2024 demonstrates that new potentially habitable worlds are still being found regularly, expanding our understanding of where life might exist in the galaxy.",
        source: "NASA TESS",
        significance: "interesting" as const,
        imageUrl: "/images/toi-715-b.jpg",
        tags: ["super-earth", "habitable-zone", "recent-discovery", "tess", "atmospheric-study"]
      },
      {
        title: "Proxima Centauri b: Our Nearest Exoplanet Gets Closer Scrutiny",
        summary: "New observations of Proxima Centauri b, the closest potentially habitable exoplanet at just 4.2 light-years away, reveal insights about its atmosphere and magnetic field.",
        fullContent: "Proxima Centauri b continues to captivate astronomers as the closest known exoplanet to Earth. Located just 4.2 light-years away in the Alpha Centauri system, this potentially rocky world orbits within the habitable zone of Proxima Centauri, a red dwarf star.\\n\\nRecent observations have provided new insights into this intriguing world. The planet has a minimum mass of 1.27 times that of Earth and orbits its star every 11.2 days. While this orbital period seems incredibly short compared to Earth's year, Proxima Centauri is much dimmer than our Sun, requiring planets to orbit much closer to receive adequate energy for liquid water.\\n\\nOne of the biggest challenges for Proxima Centauri b's habitability is the activity of its host star. Proxima Centauri is known for producing powerful stellar flares that could potentially strip away the planet's atmosphere and bombard its surface with harmful radiation. Recent studies using radio telescopes have searched for signs of a magnetic field around the planet, which would be crucial for protecting any atmosphere from stellar wind erosion.\\n\\n'The question isn't just whether Proxima Centauri b has an atmosphere, but whether it can keep one,' notes Dr. Ansgar Reiners from the University of Göttingen. 'Red dwarf stars like Proxima Centauri can be quite active, especially when they're young. If the planet has a strong magnetic field, it might be able to deflect the worst of the stellar radiation.'\\n\\nInterestingly, if Proxima Centauri b is tidally locked to its star - meaning the same side always faces the star - it could create unique climate conditions. The day side might be scorching hot while the night side remains frozen, but atmospheric circulation could potentially redistribute heat around the planet.\\n\\nDue to its proximity to Earth, Proxima Centauri b is the primary target for several proposed interstellar missions, including Breakthrough Starshot's concept for tiny robotic probes that could reach the system within decades using light sails propelled by powerful lasers.",
        source: "ESO/Multiple Observatories",
        significance: "interesting" as const,
        imageUrl: "/images/proxima-centauri-b.jpg",
        tags: ["nearest", "habitable-zone", "stellar-activity", "magnetic-field", "tidally-locked"]
      },
      {
        title: "TRAPPIST-1e Shows Atmospheric Resilience Despite Stellar Flares",
        summary: "New studies suggest TRAPPIST-1e, considered the most Earth-like planet in the famous seven-planet system, may retain a substantial atmosphere despite intense stellar radiation.",
        fullContent: "TRAPPIST-1e, the fourth planet in the remarkable seven-planet TRAPPIST-1 system, is emerging as one of the most promising candidates for habitability among known exoplanets. Recent atmospheric studies suggest this Earth-size world may have successfully retained a substantial atmosphere despite the challenging radiation environment of its red dwarf host star.\\n\\nThe TRAPPIST-1 system, located 40 light-years away, contains seven terrestrial planets, three of which orbit within the star's habitable zone. TRAPPIST-1e stands out as the most Earth-like, with a radius of 0.91 Earth radii and a mass of 0.69 Earth masses, giving it a density very similar to our planet.\\n\\nUsing transit spectroscopy with the Hubble Space Telescope and ground-based observations, astronomers have detected what appears to be atmospheric absorption features as the planet passes in front of its star. The data suggests the presence of water vapor and possibly other atmospheric components, indicating that the planet has managed to retain at least some of its atmosphere.\\n\\n'TRAPPIST-1e is particularly exciting because it receives almost exactly the same amount of energy from its star as Earth receives from the Sun,' explains Dr. Michaël Gillon, who led the original discovery of the TRAPPIST-1 system. 'If it has an atmosphere similar to Earth's, it could have very Earth-like surface temperatures.'\\n\\nThe challenge for planets around red dwarf stars like TRAPPIST-1 is that these stars tend to be active, producing flares that can be thousands of times more powerful than solar flares. Over billions of years, this activity could strip away planetary atmospheres. The fact that TRAPPIST-1e appears to have retained its atmosphere is encouraging for its habitability prospects.\\n\\nThe planet's location within a chain of resonant orbits with its six siblings creates a unique dynamical environment that may have helped protect it from the worst stellar radiation effects. Future observations with the James Webb Space Telescope are planned to better characterize the atmospheric composition and search for potential biosignature gases.",
        source: "Multiple Observatories",
        significance: "interesting" as const,
        imageUrl: "/images/trappist-1e.jpg",
        tags: ["trappist-1", "earth-like", "atmosphere", "stellar-flares", "habitability"]
      },
      {
        title: "HD 40307g: A Super-Earth Paradise 42 Light-Years Away",
        summary: "HD 40307g represents one of the most promising super-Earth candidates for habitability, orbiting a stable K-dwarf star in a multi-planet system.",
        fullContent: "HD 40307g stands out among exoplanets as a potential 'super-Earth paradise' located just 42 light-years away in the constellation Pictor. This massive planet, with at least 7 times the mass of Earth, orbits within the habitable zone of HD 40307, a K-dwarf star that may provide ideal conditions for life.\\n\\nThe planet takes 198 days to complete one orbit around its host star, placing it at a distance where liquid water could potentially exist on its surface. With a radius of 1.8 times that of Earth, HD 40307g represents the class of planets known as super-Earths - worlds larger than Earth but smaller than Neptune.\\n\\nWhat makes HD 40307g particularly appealing for habitability is its host star. K-dwarf stars like HD 40307 are considered the 'Goldilocks stars' for life - they're more stable and longer-lived than our Sun, burning for 15-45 billion years compared to the Sun's 10-billion-year lifespan, while still providing enough energy for complex chemistry to occur on nearby planets.\\n\\n'K-dwarf stars might actually be better for life than sun-like stars,' suggests Dr. Edward Guinan from Villanova University. 'They provide a more stable energy output over much longer timescales, giving life billions of additional years to develop and evolve to complexity.'\\n\\nThe HD 40307 system is remarkably well-populated, containing at least six known planets. This multi-planet architecture suggests a mature, stable system that has existed for billions of years without major disruptions that could have scattered or destroyed planets.\\n\\nIf HD 40307g has retained a substantial atmosphere, its larger mass would create stronger surface gravity than Earth, potentially allowing it to hold onto its atmosphere more effectively over geological time. The increased atmospheric pressure could also extend the liquid water range to higher and lower temperatures than possible on Earth.\\n\\nFuture observations with next-generation telescopes may be able to detect atmospheric signatures from HD 40307g and determine whether this super-Earth truly represents a potential haven for life in our cosmic neighborhood.",
        source: "ESO/HARPS",
        significance: "interesting" as const,
        imageUrl: "/images/hd-40307g.jpg",
        tags: ["super-earth", "k-dwarf", "multi-planet", "long-lived-star", "stable-system"]
      },
      {
        title: "55 Cancri e: The Extreme Super-Earth with Lava Rain",
        summary: "New atmospheric studies of 55 Cancri e reveal a world of molten rock rain, extreme temperature gradients, and exotic weather patterns unlike anything in our solar system.",
        fullContent: "55 Cancri e continues to defy expectations as one of the most extreme worlds ever discovered. This super-Earth, located 40 light-years away, orbits so close to its sun-like host star that it completes a full orbit in just 18 hours, creating conditions so extreme that rock exists as vapor in its atmosphere.\\n\\nWith temperatures reaching 2,573K on its day side - hot enough to melt copper - 55 Cancri e experiences weather patterns that are completely alien to Earth. Recent atmospheric modeling suggests that the planet may experience 'lava rain,' where vaporized rock condenses in the cooler upper atmosphere and falls as molten droplets toward the surface.\\n\\nThe planet's extreme tidal locking means that one side permanently faces the star while the other remains in eternal darkness. This creates a temperature gradient so severe that the day side can be over 1,000K hotter than the night side, driving atmospheric circulation patterns with wind speeds that likely exceed anything found in our solar system.\\n\\n'55 Cancri e is like a natural laboratory for studying matter under extreme conditions,' explains Dr. Renyu Hu from NASA's Jet Propulsion Laboratory. 'The atmospheric chemistry is completely unlike anything we see in our solar system, with metals like iron and titanium existing as gases.'\\n\\nObservations with the Spitzer Space Telescope have detected evidence of atmospheric circulation that transports heat from the day side to the night side, though the process appears to be surprisingly inefficient. This suggests that the planet's atmosphere might be thinner than expected, or that exotic atmospheric dynamics are at play.\\n\\nThe planet's carbon-rich composition has led to speculation about diamond formation deep within its interior, earning it the nickname 'the diamond planet.' While the surface conditions are utterly hostile to life as we know it, 55 Cancri e provides valuable insights into the behavior of super-Earth atmospheres under extreme conditions, helping astronomers understand the diversity of planetary environments that exist throughout the galaxy.",
        source: "Spitzer/Hubble",
        significance: "interesting" as const,
        imageUrl: "/images/55-cancri-e.jpg",
        tags: ["super-earth", "extreme-conditions", "lava-rain", "tidally-locked", "atmospheric-circulation"]
      },
      {
        title: "Gliese 667Cc: A Compact Habitable World in a Triple Star System",
        summary: "Gliese 667Cc offers a unique perspective on habitability as a super-Earth orbiting in the habitable zone of a red dwarf that's part of a triple star system.",
        fullContent: "Gliese 667Cc presents a fascinating case study in planetary habitability within a complex stellar environment. This super-Earth, located just 24 light-years away, orbits within the habitable zone of Gliese 667C, which is itself part of a triple star system that adds complexity to the planet's potential climate.\\n\\nWith a mass of 3.7 times that of Earth and a radius 1.54 times larger, Gliese 667Cc receives about 90% of the energy that Earth receives from the Sun, placing it in a sweet spot for potential liquid water on its surface. The planet completes an orbit around its red dwarf host star every 28 days.\\n\\nWhat makes Gliese 667Cc particularly intriguing is its location within a triple star system. While the planet orbits the smallest and dimmest of the three stars (Gliese 667C), the other two stars in the system are located about 230 AU away - roughly six times the distance from our Sun to Pluto. This means they would appear as bright stars in Gliese 667Cc's sky, potentially affecting its climate and atmospheric dynamics.\\n\\n'The triple star system adds an extra layer of complexity to understanding the planet's potential habitability,' notes Dr. Guillem Anglada-Escudé, who was involved in confirming the planet's existence. 'The additional stars could provide supplementary heating, but they might also create gravitational perturbations that affect the planet's climate over long timescales.'\\n\\nGliese 667C itself is a red dwarf star with about one-third the mass of our Sun. Red dwarfs are known for their longevity - Gliese 667C will continue shining for hundreds of billions of years, providing a stable energy source for potential life on any planets in its habitable zone.\\n\\nThe planet's higher mass compared to Earth would create stronger surface gravity, potentially allowing it to retain a thicker atmosphere. This could extend the range of temperatures suitable for liquid water and provide better protection from cosmic radiation and stellar flares.\\n\\nRecent studies have attempted to model the planet's potential climate, suggesting that if it has an Earth-like atmosphere, it could maintain temperate conditions suitable for liquid water across much of its surface.",
        source: "ESO/HARPS",
        significance: "interesting" as const,
        imageUrl: "/images/gliese-667cc.jpg",
        tags: ["super-earth", "triple-star", "habitable-zone", "red-dwarf", "complex-system"]
      },

      // ROUTINE NEWS
      {
        title: "GJ 1002b: A Nearby Earth-Like World Offers New Research Opportunities",
        summary: "The recent discovery of GJ 1002b, an Earth-size planet just 16 light-years away, provides astronomers with a new nearby target for atmospheric characterization studies.",
        fullContent: "GJ 1002b represents an exciting addition to the catalog of nearby potentially habitable exoplanets. Discovered in 2022 using the radial velocity method, this Earth-size world orbits within the habitable zone of GJ 1002, a red dwarf star located just 16 light-years away in the constellation Cetus.\\n\\nWith a radius 1.08 times that of Earth and a mass of 1.08 Earth masses, GJ 1002b is remarkably similar to our planet in size and mass. It completes an orbit around its host star every 10.3 days, receiving about 2.3 times the energy that Earth receives from the Sun - still within the range where liquid water could potentially exist with the right atmospheric conditions.\\n\\nThe discovery was made by the CARMENES survey, which uses precise radial velocity measurements to detect the gravitational wobble that planets induce in their host stars. The proximity of the GJ 1002 system makes it an excellent target for future atmospheric studies with next-generation telescopes.\\n\\n'GJ 1002b is particularly valuable because it's so close to us,' explains Dr. Alejandro Suárez Mascareño, lead author of the discovery study. 'Its proximity means we can study it in much greater detail than more distant planets, potentially learning about its atmospheric composition and surface conditions.'\\n\\nThe host star, GJ 1002, is a quiet red dwarf with relatively low stellar activity compared to many other M-dwarf stars. This could be beneficial for the planet's atmospheric retention, as excessive stellar flares and radiation can strip away planetary atmospheres over time.\\n\\nInterestingly, the discovery team also found evidence for a second planet in the system, GJ 1002c, which orbits farther out and may also be within the habitable zone. This makes the GJ 1002 system particularly interesting as it may contain multiple potentially habitable worlds.\\n\\nFuture observations with the James Webb Space Telescope and other advanced instruments may be able to detect atmospheric signatures from GJ 1002b, helping astronomers understand whether this nearby Earth-like world truly offers conditions suitable for life.",
        source: "CARMENES Survey",
        significance: "routine" as const,
        imageUrl: "/images/gj-1002b.jpg",
        tags: ["earth-like", "nearby", "radial-velocity", "quiet-star", "recent-discovery"]
      },
      {
        title: "WASP-12b: A Planet Being Devoured by Its Star in Real-Time",
        summary: "Continued observations of WASP-12b reveal the ongoing destruction of this hot Jupiter as it's slowly consumed by its host star, offering insights into planetary evolution.",
        fullContent: "WASP-12b continues to provide astronomers with a dramatic example of planetary destruction in action. This hot Jupiter, located 426 light-years away, is so close to its host star that it's being slowly torn apart and consumed in a process that will ultimately lead to its complete destruction.\\n\\nWith a mass 434 times that of Earth, WASP-12b is a gas giant that orbits its sun-like host star every 26 hours. This extreme proximity subjects the planet to intense gravitational forces that have distorted it into an egg-like shape, with material streaming from the planet toward the star in a process called Roche lobe overflow.\\n\\nRecent observations using the Hubble Space Telescope have detected a stream of hot gas flowing from the planet to its star, confirming that WASP-12b is losing mass at an extraordinary rate. The planet is estimated to be losing about 6 billion tons of material every second - a rate that will consume the entire planet in approximately 10 million years.\\n\\n'WASP-12b is giving us a real-time view of planetary death,' notes Dr. Carole Haswell from the Open University. 'We can actually watch as the star slowly devours its planet, material by material. It's both fascinating and terrifying from a planetary perspective.'\\n\\nThe extreme heating from the nearby star has inflated the planet's atmosphere to nearly twice the radius of Jupiter, making it one of the largest known exoplanets. The day side of the planet reaches temperatures of 2,516K, hot enough to dissociate water molecules and create exotic atmospheric chemistry.\\n\\nSpectroscopic observations have detected various elements in the planet's escaping atmosphere, including hydrogen, oxygen, and carbon. This atmospheric escape is creating a disk of material around the star, which may eventually form new planets or simply be absorbed into the star itself.\\n\\nWASP-12b serves as an important laboratory for studying tidal interactions between planets and stars, helping astronomers understand the ultimate fate of planets that migrate too close to their host stars during their formation and evolution.",
        source: "Hubble/Multiple Observatories",
        significance: "routine" as const,
        imageUrl: "/images/wasp-12b.jpg",
        tags: ["hot-jupiter", "planetary-destruction", "mass-loss", "tidal-interaction", "atmospheric-escape"]
      },
      {
        title: "PSR B1620-26b: The Ancient Planet That Survived Stellar Death",
        summary: "At 12.7 billion years old, PSR B1620-26b is one of the oldest known planets, having survived the violent evolution of its host stars in a dense globular cluster.",
        fullContent: "PSR B1620-26b, nicknamed the 'Methuselah Planet,' represents one of the most remarkable survival stories in the galaxy. At an estimated age of 12.7 billion years - nearly three times older than Earth - this ancient world has survived the violent evolution of its host stars and continues to orbit the remnants in the dense M4 globular cluster.\\n\\nThe planet, with a mass about 2.5 times that of Jupiter, orbits a binary system consisting of a pulsar (the remnant of a massive star) and a white dwarf (the remnant of a sun-like star). Located 12,400 light-years away in the constellation Scorpius, the planet takes about 100 years to complete one orbit around this stellar graveyard.\\n\\nWhat makes PSR B1620-26b extraordinary is not just its age, but the environment it has survived. Globular clusters are dense collections of ancient stars where planetary formation was thought to be nearly impossible due to the lack of heavy elements and the disruptive gravitational effects of nearby stars.\\n\\n'This planet formed when the universe was very young, probably when it was less than 1 billion years old,' explains Dr. Steinn Sigurdsson from Pennsylvania State University. 'It has witnessed the entire history of stellar evolution in its cluster, surviving supernova explosions, stellar mergers, and the gradual death of its parent stars.'\\n\\nThe planet's discovery was made using pulsar timing, a technique that detects tiny variations in the precisely regular radio pulses emitted by the pulsar. These variations are caused by the gravitational influence of the planet as it orbits, slightly altering the pulsar's motion and thus the timing of its radio signals.\\n\\nThe survival of PSR B1620-26b through such extreme stellar evolution suggests that planets may be more resilient than previously thought. The planet likely formed around normal stars that later evolved into the current pulsar-white dwarf binary, somehow maintaining its orbit through multiple phases of stellar evolution including at least one supernova explosion.\\n\\nThis ancient world offers a glimpse into planetary formation in the early universe and demonstrates that planets can survive in some of the most extreme stellar environments known to exist.",
        source: "Hubble/Radio Observatories",
        significance: "routine" as const,
        imageUrl: "/images/psr-b1620-26b.jpg",
        tags: ["ancient", "pulsar-planet", "globular-cluster", "stellar-evolution", "survivor"]
      }
    ];

    return MOCK_NEWS.map((news, index) => {
      // Find matching planet if available
      const matchingPlanet = planets.find(p => 
        news.title.toLowerCase().includes(p.pl_name.toLowerCase()) ||
        news.summary.toLowerCase().includes(p.pl_name.toLowerCase())
      );

      // Generate dates from the last 30 days
      const daysAgo = Math.floor(Math.random() * 30);
      const discoveryDate = new Date();
      discoveryDate.setDate(discoveryDate.getDate() - daysAgo);

      return {
        id: `mock-${index}`,
        ...news,
        planet: matchingPlanet,
        discoveryDate
      };
    });
  }

  /**
   * Clear the news cache
   */
  clearCache() {
    this.cache.clear();
  }
}

// Export a singleton instance
export const newsService = new NewsService();
export default NewsService;
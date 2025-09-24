import React from 'react';

export type FilterType = 'all' | 'earthlike' | 'weird' | 'closest';

interface FilterPillsProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}

const FilterPills: React.FC<FilterPillsProps> = ({ activeFilter, onFilterChange }) => {
  const filters = [
    { 
      id: 'all' as const, 
      label: 'All Planets', 
      emoji: '🌍',
      tooltip: 'Show all discovered exoplanets'
    },
    { 
      id: 'earthlike' as const, 
      label: 'Earth-like', 
      emoji: '🌎',
      tooltip: 'Planets with Earth-like size and potentially habitable conditions'
    },
    { 
      id: 'weird' as const, 
      label: 'Weird Worlds', 
      emoji: '👽',
      tooltip: 'Unusual planets with extreme conditions'
    },
    { 
      id: 'closest' as const, 
      label: 'Nearby', 
      emoji: '⭐',
      tooltip: 'Closest exoplanets to our solar system'
    },
  ];

  return (
    <div className="flex flex-wrap gap-3 p-4">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          title={filter.tooltip}
          className={'pill-btn px-4 py-3 rounded-full text-sm font-medium flex items-center gap-3 min-h-[44px] ' +
            (activeFilter === filter.id
              ? 'pill-active'
              : 'pill-inactive'
            )}
        >
          <span className="pill-icon flex items-center justify-center w-9 h-9 rounded-full bg-white/10 text-sm">{filter.emoji}</span>
          <span className="pill-label">{filter.label}</span>
          {activeFilter === filter.id && (
            <span className="pill-check ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full text-xs">✓</span>
          )}
        </button>
      ))}
    </div>
  );
};

export default FilterPills;

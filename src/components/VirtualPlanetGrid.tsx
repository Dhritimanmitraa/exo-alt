import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FixedSizeGrid, areEqual, GridChildComponentProps } from 'react-window';
import PlanetCard from './PlanetCard';
import { Planet } from '../lib/filters';
import type { FilterType } from './FilterPills';

interface VirtualPlanetGridProps {
  planets: Planet[];
  onPlanetClick: (planet: Planet) => void;
  onView3D: (planet: Planet) => void;
  filterType: FilterType;
  className?: string;
}

const useContainerSize = (ref: React.RefObject<HTMLDivElement>) => {
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setSize({ width: cr.width, height: cr.height });
      }
    });
    ro.observe(el);
    setSize({ width: el.clientWidth, height: el.clientHeight });
    return () => ro.disconnect();
  }, [ref]);

  return size;
};

type CellData = {
  planets: Planet[];
  columnCount: number;
  onPlanetClick: (planet: Planet) => void;
  onView3D: (planet: Planet) => void;
  filterType: FilterType;
};

const PlanetGridCell = React.memo((props: GridChildComponentProps<CellData>) => {
  const { columnIndex, rowIndex, style, data } = props;
  const index = rowIndex * data.columnCount + columnIndex;
  const planet = data.planets[index];
  if (!planet) return null;
  return (
    <div style={style} className="p-3">
      <PlanetCard
        planet={planet}
        onClick={() => data.onPlanetClick(planet)}
        filterType={data.filterType}
        onView3D={data.onView3D}
      />
    </div>
  );
}, areEqual);

const VirtualPlanetGrid: React.FC<VirtualPlanetGridProps> = ({ planets, onPlanetClick, onView3D, filterType, className }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useContainerSize(containerRef);

  // Responsive columns
  const columnCount = useMemo(() => {
    if (width < 640) return 1; // mobile
    if (width < 1024) return 2; // tablet
    if (width < 1280) return 3; // desktop
    return 4; // xl
  }, [width]);

  const itemWidth = useMemo(() => {
    if (columnCount === 0) return 0;
    const gap = 24; // tailwind gap-6 ~ 24px between items
    // Total gaps per row = (columns - 1) * gap, include padding margins ~ 0 here
    const totalGap = (columnCount - 1) * gap;
    return Math.max(280, Math.floor((width - totalGap) / columnCount));
  }, [width, columnCount]);

  const itemHeight = 400; // approximate height of PlanetCard as specified

  const rowCount = useMemo(() => {
    if (columnCount === 0) return 0;
    return Math.ceil(planets.length / columnCount);
  }, [planets.length, columnCount]);

  const cellData = useMemo<CellData>(() => ({ planets, columnCount, onPlanetClick, onView3D, filterType }), [planets, columnCount, onPlanetClick, onView3D, filterType]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Preserve basic keyboard navigation focus ring inside cards
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      // Let browser handle focus traversal
    }
  }, []);

  return (
    <div ref={containerRef} className={className} onKeyDown={handleKeyDown} aria-label="Planet results grid" role="grid">
      {width > 0 && height >= 0 && (
        <FixedSizeGrid
          columnCount={columnCount}
          columnWidth={itemWidth}
          height={Math.min(Math.max( (height || 600), 400), 1200)}
          rowCount={rowCount}
          rowHeight={itemHeight}
          width={width}
          itemData={cellData}
          overscanCount={2}
        >
          {PlanetGridCell}
        </FixedSizeGrid>
      )}
    </div>
  );
};

export default VirtualPlanetGrid;



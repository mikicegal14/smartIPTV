import React, { memo, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Folder, Search, Sparkles } from 'lucide-react';
import { CategoryGroup } from '../types/iptv';

interface CategorySidebarProps {
  categories: CategoryGroup[];
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  totalFilteredByMode: number;
  isFocusZone: boolean;
}

const CAT_ROW_HEIGHT = 44;
const CAT_OVERSCAN = 6;

interface CategoryRowProps {
  name: string;
  count: number;
  isSelected: boolean;
  onSelect: (name: string) => void;
}

const CategoryRow = memo<CategoryRowProps>(
  ({ name, count, isSelected, onSelect }) => (
    <button
      type="button"
      className={`category-item ${isSelected ? 'active' : ''}`}
      onClick={() => onSelect(name)}
    >
      <div className="cat-name-wrap">
        <span className="cat-bullet" />
        <span className="cat-name" title={name}>
          {name}
        </span>
      </div>
      <span className="cat-count">{count}</span>
    </button>
  ),
  (prev, next) =>
    prev.name === next.name &&
    prev.count === next.count &&
    prev.isSelected === next.isSelected
);

export const CategorySidebar: React.FC<CategorySidebarProps> = ({
  categories,
  selectedCategory,
  onSelectCategory,
  totalFilteredByMode,
  isFocusZone,
}) => {
  const [catFilter, setCatFilter] = useState('');
  const deferredCatFilter = React.useDeferredValue(catFilter);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [listHeight, setListHeight] = useState(600);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => setListHeight(el.clientHeight || 600);
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const obs = new ResizeObserver(measure);
      obs.observe(el);
      return () => obs.disconnect();
    }
  }, []);

  const visibleCategories = useMemo(() => {
    const q = deferredCatFilter.trim().toLowerCase();
    if (!q) return categories;
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, deferredCatFilter]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const totalHeight = visibleCategories.length * CAT_ROW_HEIGHT;
  const startIdx = Math.max(0, Math.floor(scrollTop / CAT_ROW_HEIGHT) - CAT_OVERSCAN);
  const endIdx = Math.min(
    visibleCategories.length,
    Math.ceil((scrollTop + listHeight) / CAT_ROW_HEIGHT) + CAT_OVERSCAN
  );
  const offsetY = startIdx * CAT_ROW_HEIGHT;
  const slice = visibleCategories.slice(startIdx, endIdx);

  return (
    <aside className={`category-sidebar ${isFocusZone ? 'zone-focused' : ''}`}>
      <div className="sidebar-header">
        <h2>
          <Folder size={16} /> Categorías
        </h2>
        <span className="category-total-badge">{categories.length}</span>
      </div>

      {categories.length > 6 && (
        <div className="category-filter-input">
          <Search size={14} />
          <input
            type="text"
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            placeholder="Filtrar categoría..."
          />
        </div>
      )}

      <div className="category-top-pinned">
        <button
          type="button"
          className={`category-item ${selectedCategory === 'ALL' ? 'active' : ''}`}
          onClick={() => onSelectCategory('ALL')}
        >
          <div className="cat-name-wrap">
            <Sparkles size={14} className="cat-icon-accent" />
            <span className="cat-name">Todas las categorías</span>
          </div>
          <span className="cat-count">{totalFilteredByMode}</span>
        </button>
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="category-list-virtual"
        role="listbox"
        aria-label="Categorías de canales"
      >
        {visibleCategories.length === 0 ? (
          <div className="empty-categories-msg">
            No hay categorías para "{catFilter}"
          </div>
        ) : (
          <div
            className="category-virtual-spacer"
            style={{ height: `${totalHeight}px` }}
          >
            <div
              className="category-virtual-window"
              style={{ transform: `translate3d(0, ${offsetY}px, 0)` }}
            >
              {slice.map((cat) => (
                <CategoryRow
                  key={cat.name}
                  name={cat.name}
                  count={cat.count}
                  isSelected={selectedCategory === cat.name}
                  onSelect={onSelectCategory}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

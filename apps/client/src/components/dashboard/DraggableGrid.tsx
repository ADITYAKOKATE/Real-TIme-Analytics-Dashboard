'use client';

// This file is intentionally NOT dynamically imported —
// react-grid-layout is CJS-only and its WidthProvider HOC must be
// called at module-evaluation time (not inside a dynamic() callback).
// The parent Builder page uses `dynamic({ ssr: false })` on THIS component.

import { Responsive, WidthProvider } from 'react-grid-layout';
import type { Layout, Layouts } from 'react-grid-layout';

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DraggableGridProps {
  layouts: Layouts;
  isDraggable: boolean;
  isResizable: boolean;
  onLayoutChange: (currentLayout: Layout[], allLayouts: Layouts) => void;
  children: React.ReactNode;
}

export default function DraggableGrid({
  layouts,
  isDraggable,
  isResizable,
  onLayoutChange,
  children,
}: DraggableGridProps) {
  return (
    <ResponsiveGridLayout
      className="layout"
      layouts={layouts}
      breakpoints={{ lg: 1200, md: 768, sm: 480 }}
      cols={{ lg: 12, md: 8, sm: 4 }}
      rowHeight={80}
      isDraggable={isDraggable}
      isResizable={isResizable}
      onLayoutChange={onLayoutChange}
      draggableHandle=".drag-handle"
    >
      {children}
    </ResponsiveGridLayout>
  );
}

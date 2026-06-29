import React, { useMemo } from 'react';

export type BurndownDataPoint = {
  date: string;
  ideal: number;
  actual: number | null;
};

interface BurndownChartProps {
  data: BurndownDataPoint[];
  width?: number | string;
  height?: number | string;
}

export function BurndownChart({ data, width = '100%', height = 300 }: BurndownChartProps) {
  // SVG Dimensions & Padding
  const viewBoxWidth = 800;
  const viewBoxHeight = 400;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };

  const chartWidth = viewBoxWidth - padding.left - padding.right;
  const chartHeight = viewBoxHeight - padding.top - padding.bottom;

  // Calculate Scales
  const { maxPoints, xStep, points } = useMemo(() => {
    if (!data || data.length === 0) return { maxPoints: 0, xStep: 0, points: [] };

    const maxPoints = Math.max(
      ...data.map(d => Math.max(d.ideal, d.actual || 0)),
      10 // Fallback minimum scale
    );
    
    // add 10% padding to top
    const maxY = maxPoints * 1.1; 
    
    const xStep = chartWidth / Math.max(1, data.length - 1);
    
    const points = data.map((d, i) => {
      const x = padding.left + i * xStep;
      const idealY = padding.top + chartHeight - (d.ideal / maxY) * chartHeight;
      const actualY = d.actual !== null ? padding.top + chartHeight - (d.actual / maxY) * chartHeight : null;
      return { ...d, x, idealY, actualY, rawActual: d.actual, rawIdeal: d.ideal, maxY };
    });

    return { maxPoints: maxY, xStep, points };
  }, [data, chartWidth, chartHeight, padding.left, padding.top]);

  if (!data || data.length === 0) {
    return <div className="flex items-center justify-center h-full w-full text-muted-foreground">No data available</div>;
  }

  // Generate path strings
  const idealPath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.idealY}`).join(' ');
  const actualPoints = points.filter(p => p.actualY !== null);
  const actualPath = actualPoints.length > 0 
    ? actualPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.actualY}`).join(' ')
    : '';

  // Generate Y-axis labels (0, 25%, 50%, 75%, 100%)
  const yLabels = [0, 0.25, 0.5, 0.75, 1].map(pct => {
    const value = maxPoints * pct;
    const y = padding.top + chartHeight - (pct * chartHeight);
    return { value: Math.round(value), y };
  });

  return (
    <div style={{ width, height }} className="relative font-sans text-xs">
      <svg 
        viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`} 
        className="w-full h-full overflow-visible"
        preserveAspectRatio="none"
      >
        {/* Grid lines (horizontal) */}
        {yLabels.map((label, i) => (
          <g key={i} className="text-muted-foreground/30">
            <line 
              x1={padding.left} 
              y1={label.y} 
              x2={viewBoxWidth - padding.right} 
              y2={label.y} 
              stroke="currentColor" 
              strokeDasharray="4 4" 
              strokeWidth={1}
            />
            <text 
              x={padding.left - 10} 
              y={label.y + 4} 
              textAnchor="end" 
              className="fill-muted-foreground text-xs font-medium"
            >
              {label.value}
            </text>
          </g>
        ))}

        {/* X-axis labels */}
        {points.map((p, i) => {
          // Show every Nth label to avoid crowding if there are many days
          const skip = points.length > 15 ? Math.ceil(points.length / 10) : 1;
          if (i % skip !== 0 && i !== points.length - 1) return null;
          
          // Format date as "Oct 12"
          const date = new Date(p.date);
          const formatted = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          
          return (
            <text 
              key={i} 
              x={p.x} 
              y={viewBoxHeight - 15} 
              textAnchor="middle" 
              className="fill-muted-foreground text-xs font-medium"
            >
              {formatted}
            </text>
          );
        })}

        {/* Ideal Line */}
        <path 
          d={idealPath} 
          fill="none" 
          stroke="hsl(var(--muted-foreground))" 
          strokeWidth="3" 
          strokeDasharray="8 8" 
          strokeLinecap="round"
          strokeLinejoin="round"
          className="opacity-50"
        />

        {/* Actual Line */}
        {actualPath && (
          <path 
            d={actualPath} 
            fill="none" 
            stroke="hsl(var(--primary))" 
            strokeWidth="4" 
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />
        )}

        {/* Ideal Points */}
        {points.map((p, i) => (
          <circle 
            key={`ideal-${i}`} 
            cx={p.x} 
            cy={p.idealY} 
            r={3} 
            fill="hsl(var(--background))" 
            stroke="hsl(var(--muted-foreground))" 
            strokeWidth="2"
          />
        ))}

        {/* Actual Points */}
        {actualPoints.map((p, i) => (
          <g key={`actual-${i}`} className="group cursor-pointer">
            <circle 
              cx={p.x} 
              cy={p.actualY!} 
              r={5} 
              fill="hsl(var(--background))" 
              stroke="hsl(var(--primary))" 
              strokeWidth="2.5"
              className="transition-all group-hover:r-7 group-hover:stroke-[3px]"
            />
            {/* Simple tooltip (native SVG) */}
            <title>{`Date: ${p.date}\nRemaining: ${p.rawActual} pts`}</title>
          </g>
        ))}
      </svg>
      
      {/* Legend */}
      <div className="absolute top-2 right-4 flex gap-4 text-xs font-medium bg-background/80 px-3 py-1.5 rounded-full border shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 border-b-2 border-dashed border-muted-foreground"></div>
          <span className="text-muted-foreground">Ideal</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-1 bg-primary rounded-full"></div>
          <span className="text-foreground">Actual</span>
        </div>
      </div>
    </div>
  );
}

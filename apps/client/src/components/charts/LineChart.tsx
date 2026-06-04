'use client';

import * as d3 from 'd3';
import { useRef, useEffect, useState } from 'react';
import { TimeSeriesDataPoint } from '@analytics/shared';

interface LineChartProps {
  data: TimeSeriesDataPoint[];
  color?: string;
  height?: number;
  showArea?: boolean;
  label?: string;
}

export function LineChart({
  data,
  color = '#6c63ff',
  height = 220,
  showArea = true,
  label = '',
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      setWidth(entries[0].contentRect.width);
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;

    const margin = { top: 10, right: 20, bottom: 30, left: 45 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const parsedData = data.map((d) => ({ ...d, ts: new Date(d.timestamp) }));

    const xScale = d3.scaleTime()
      .domain(d3.extent(parsedData, (d) => d.ts) as [Date, Date])
      .range([0, innerW]);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(parsedData, (d) => d.value) || 1])
      .nice()
      .range([innerH, 0]);

    // Gridlines
    g.append('g').attr('class', 'grid')
      .call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(() => ''))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line')
        .attr('stroke', '#252535')
        .attr('stroke-dasharray', '3,3'));

    // Area fill
    if (showArea) {
      const area = d3.area<{ ts: Date; value: number }>()
        .x((d) => xScale(d.ts))
        .y0(innerH)
        .y1((d) => yScale(d.value))
        .curve(d3.curveCatmullRom);

      const gradient = svg.append('defs').append('linearGradient')
        .attr('id', `area-gradient-${label}`)
        .attr('gradientUnits', 'userSpaceOnUse')
        .attr('x1', 0).attr('y1', 0).attr('x2', 0).attr('y2', innerH + margin.top);

      gradient.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.3);
      gradient.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.02);

      g.append('path')
        .datum(parsedData)
        .attr('fill', `url(#area-gradient-${label})`)
        .attr('d', area as unknown as string);
    }

    // Line
    const line = d3.line<{ ts: Date; value: number }>()
      .x((d) => xScale(d.ts))
      .y((d) => yScale(d.value))
      .curve(d3.curveCatmullRom);

    const path = g.append('path')
      .datum(parsedData)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 2)
      .attr('d', line as unknown as string);

    // Animate line drawing
    const totalLength = (path.node() as SVGPathElement).getTotalLength();
    path
      .attr('stroke-dasharray', `${totalLength} ${totalLength}`)
      .attr('stroke-dashoffset', totalLength)
      .transition().duration(800).ease(d3.easeCubicOut)
      .attr('stroke-dashoffset', 0);

    // Axes
    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat((d) => d3.timeFormat('%H:%M')(d as Date)))
      .call((g) => g.select('.domain').attr('stroke', '#252535'))
      .call((g) => g.selectAll('text').attr('fill', '#606080').attr('font-size', '11px'));

    g.append('g')
      .call(d3.axisLeft(yScale).ticks(4))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('text').attr('fill', '#606080').attr('font-size', '11px'));

    // Tooltip overlay
    const bisect = d3.bisector<{ ts: Date; value: number }, Date>((d) => d.ts).left;
    const tooltip = d3.select(tooltipRef.current);
    const vLine = g.append('line').attr('class', 'v-line')
      .attr('stroke', '#252535').attr('stroke-width', 1).attr('stroke-dasharray', '4,4')
      .attr('y1', 0).attr('y2', innerH).style('opacity', 0);
    const dot = g.append('circle').attr('r', 4).attr('fill', color).style('opacity', 0);

    svg.append('rect')
      .attr('width', innerW)
      .attr('height', innerH)
      .attr('transform', `translate(${margin.left},${margin.top})`)
      .attr('fill', 'transparent')
      .on('mousemove', (event) => {
        const [mx] = d3.pointer(event);
        const x0 = xScale.invert(mx - margin.left);
        const idx = bisect(parsedData, x0, 1);
        const d0 = parsedData[idx - 1];
        const d1 = parsedData[idx];
        if (!d0) return;
        const d = d1 && x0.getTime() - d0.ts.getTime() > d1.ts.getTime() - x0.getTime() ? d1 : d0;
        const px = xScale(d.ts);
        const py = yScale(d.value);
        vLine.attr('x1', px).attr('x2', px).style('opacity', 1);
        dot.attr('cx', px).attr('cy', py).style('opacity', 1);
        tooltip
          .style('opacity', 1)
          .style('left', `${mx + 12}px`)
          .style('top', `${py + margin.top}px`)
          .html(`<div class="font-medium">${d3.timeFormat('%H:%M %b %d')(d.ts)}</div><div style="color:${color}">${d.value.toLocaleString()}</div>`);
      })
      .on('mouseleave', () => {
        vLine.style('opacity', 0);
        dot.style('opacity', 0);
        tooltip.style('opacity', 0);
      });

  }, [data, width, height, color, showArea, label]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="d3-chart w-full" />
      <div ref={tooltipRef} className="d3-tooltip" style={{ opacity: 0, position: 'absolute' }} />
    </div>
  );
}

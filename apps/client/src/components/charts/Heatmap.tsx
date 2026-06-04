'use client';

import * as d3 from 'd3';
import { useRef, useEffect, useState } from 'react';

interface HeatmapCell {
  _id: { dayOfWeek: number; hour: number };
  count: number;
}

interface HeatmapProps {
  data: HeatmapCell[];
  height?: number;
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => `${i}:00`);

export function Heatmap({ data, height = 180 }: HeatmapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const margin = { top: 5, right: 10, bottom: 30, left: 40 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand().domain(HOURS).range([0, innerW]).padding(0.05);
    const yScale = d3.scaleBand().domain(DAYS).range([0, innerH]).padding(0.05);

    const maxCount = d3.max(data, (d) => d.count) || 1;
    const colorScale = d3.scaleSequential()
      .domain([0, maxCount])
      .interpolator(d3.interpolate('#1a1a26', '#6c63ff'));

    // Cells
    g.selectAll('.cell')
      .data(data)
      .join('rect')
      .attr('class', 'cell')
      .attr('x', (d) => xScale(HOURS[d._id.hour]) || 0)
      .attr('y', (d) => yScale(DAYS[d._id.dayOfWeek - 1]) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('rx', 2)
      .attr('fill', '#1a1a26')
      .on('mouseover', function (event, d) {
        d3.select(tooltipRef.current)
          .style('opacity', 1)
          .style('left', `${event.offsetX + 10}px`)
          .style('top', `${event.offsetY - 10}px`)
          .html(`<strong>${DAYS[d._id.dayOfWeek - 1]} ${HOURS[d._id.hour]}</strong><br/>${d.count} events`);
      })
      .on('mouseleave', () => d3.select(tooltipRef.current).style('opacity', 0))
      .transition().duration(600).delay((_, i) => i * 2)
      .attr('fill', (d) => colorScale(d.count));

    // Axes
    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale).tickValues(HOURS.filter((_, i) => i % 3 === 0)))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('text').attr('fill', '#606080').attr('font-size', '10px'));

    g.append('g').call(d3.axisLeft(yScale))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('text').attr('fill', '#606080').attr('font-size', '10px'));

  }, [data, width, height]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="d3-chart w-full" />
      <div ref={tooltipRef} className="d3-tooltip" style={{ opacity: 0, position: 'absolute' }} />
    </div>
  );
}

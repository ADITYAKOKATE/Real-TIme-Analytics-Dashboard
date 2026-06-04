'use client';

import * as d3 from 'd3';
import { useRef, useEffect, useState } from 'react';

interface BarChartProps {
  data: Array<{ label: string; value: number; color?: string }>;
  height?: number;
  color?: string;
}

export function BarChart({ data, height = 220, color = '#6c63ff' }: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;
    const margin = { top: 10, right: 20, bottom: 40, left: 45 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);
    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand()
      .domain(data.map((d) => d.label))
      .range([0, innerW])
      .padding(0.25);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, (d) => d.value) || 1])
      .nice()
      .range([innerH, 0]);

    // Gridlines
    g.append('g').call(d3.axisLeft(yScale).tickSize(-innerW).tickFormat(() => ''))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('.tick line').attr('stroke', '#252535').attr('stroke-dasharray', '3,3'));

    // Bars with animation
    g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', (d) => xScale(d.label) || 0)
      .attr('width', xScale.bandwidth())
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', (d) => d.color || color)
      .attr('y', innerH)
      .attr('height', 0)
      .on('mouseover', function (event, d) {
        d3.select(this).attr('fill', d3.color(d.color || color)?.brighter(0.3)?.toString() || color);
        d3.select(tooltipRef.current)
          .style('opacity', 1)
          .style('left', `${event.offsetX + 10}px`)
          .style('top', `${event.offsetY - 10}px`)
          .html(`<strong>${d.label}</strong><br/>${d.value.toLocaleString()}`);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr('fill', d.color || color);
        d3.select(tooltipRef.current).style('opacity', 0);
      })
      .transition().duration(700).ease(d3.easeBounceOut)
      .attr('y', (d) => yScale(d.value))
      .attr('height', (d) => innerH - yScale(d.value));

    // Axes
    g.append('g').attr('transform', `translate(0,${innerH})`)
      .call(d3.axisBottom(xScale))
      .call((g) => g.select('.domain').attr('stroke', '#252535'))
      .call((g) => g.selectAll('text').attr('fill', '#606080').attr('font-size', '11px')
        .attr('transform', 'rotate(-15)').style('text-anchor', 'end'));

    g.append('g').call(d3.axisLeft(yScale).ticks(4))
      .call((g) => g.select('.domain').remove())
      .call((g) => g.selectAll('text').attr('fill', '#606080').attr('font-size', '11px'));

  }, [data, width, height, color]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="d3-chart w-full" />
      <div ref={tooltipRef} className="d3-tooltip" style={{ opacity: 0, position: 'absolute' }} />
    </div>
  );
}

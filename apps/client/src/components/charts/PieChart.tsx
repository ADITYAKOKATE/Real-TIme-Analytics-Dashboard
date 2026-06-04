'use client';

import * as d3 from 'd3';
import { useRef, useEffect, useState } from 'react';

interface PieChartProps {
  data: Array<{ label: string; value: number }>;
  height?: number;
}

const COLORS = ['#6c63ff', '#00d4ff', '#00e5a0', '#ff6b35', '#ff4d8b', '#ffd93d'];

export function PieChart({ data, height = 220 }: PieChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((e) => setWidth(e[0].contentRect.width));
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || !data.length) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const radius = Math.min(width, height) / 2 - 20;
    const g = svg.append('g').attr('transform', `translate(${width / 2},${height / 2})`);

    const pie = d3.pie<{ label: string; value: number }>().value((d) => d.value).sort(null);
    const arc = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius);
    const arcHover = d3.arc<d3.PieArcDatum<{ label: string; value: number }>>()
      .innerRadius(radius * 0.5)
      .outerRadius(radius + 8);

    const arcs = g.selectAll('.arc')
      .data(pie(data))
      .join('g')
      .attr('class', 'arc');

    arcs.append('path')
      .attr('fill', (_, i) => COLORS[i % COLORS.length])
      .attr('stroke', '#0a0a0f')
      .attr('stroke-width', 2)
      .on('mouseover', function (_, d) {
        d3.select(this).transition().duration(200).attr('d', arcHover(d) as string);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).transition().duration(200).attr('d', arc(d) as string);
      })
      .transition().duration(800)
      .attrTween('d', function (d) {
        const i = d3.interpolate({ startAngle: 0, endAngle: 0 }, d);
        return (t) => arc(i(t)) as string;
      });

    // Legend
    const legend = svg.append('g').attr('transform', `translate(${width / 2 + radius + 10}, 20)`);
    data.forEach((d, i) => {
      const row = legend.append('g').attr('transform', `translate(0, ${i * 22})`);
      row.append('rect').attr('width', 10).attr('height', 10).attr('rx', 2).attr('fill', COLORS[i % COLORS.length]);
      row.append('text').attr('x', 15).attr('y', 9)
        .attr('fill', '#9090b0').attr('font-size', '11px')
        .text(`${d.label} (${d.value.toLocaleString()})`);
    });

  }, [data, width, height]);

  return (
    <div ref={containerRef} className="relative w-full">
      <svg ref={svgRef} className="d3-chart w-full" />
    </div>
  );
}

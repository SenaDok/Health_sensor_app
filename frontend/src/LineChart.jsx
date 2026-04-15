import { useEffect, useRef } from 'react'
import * as d3 from 'd3'

const MARGIN = { top: 16, right: 24, bottom: 36, left: 56 }

export default function LineChart({ data, label, unit, color = '#00d4aa' }) {
  const svgRef = useRef(null)

  useEffect(() => {
    if (!data || data.length === 0) return
    const el = svgRef.current
    const W = el.clientWidth || 600
    const H = el.clientHeight || 220
    const w = W - MARGIN.left - MARGIN.right
    const h = H - MARGIN.top - MARGIN.bottom

    d3.select(el).selectAll('*').remove()

    const svg = d3.select(el)
      .attr('width', W)
      .attr('height', H)
      .append('g')
      .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)

    const parsed = data.map(d => ({
      t: new Date(d.effective_datetime),
      v: +d.value_quantity,
    }))

    const xScale = d3.scaleTime()
      .domain(d3.extent(parsed, d => d.t))
      .range([0, w])

    const [vMin, vMax] = d3.extent(parsed, d => d.v)
    const pad = (vMax - vMin) * 0.15 || 5
    const yScale = d3.scaleLinear()
      .domain([vMin - pad, vMax + pad])
      .range([h, 0])

    // Grid lines
    svg.append('g')
      .attr('class', 'grid')
      .call(d3.axisLeft(yScale).ticks(5).tickSize(-w).tickFormat(''))
      .call(g => g.select('.domain').remove())
      .call(g => g.selectAll('line')
        .attr('stroke', 'rgba(255,255,255,0.05)')
        .attr('stroke-dasharray', '3,3'))

    // Axes
    svg.append('g')
      .attr('transform', `translate(0,${h})`)
      .call(d3.axisBottom(xScale).ticks(5).tickFormat(d3.timeFormat('%H:%M:%S')))
      .call(g => {
        g.select('.domain').attr('stroke', 'rgba(255,255,255,0.15)')
        g.selectAll('text').attr('fill', '#6b7280').attr('font-size', '11px').attr('font-family', 'inherit')
        g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.1)')
      })

    svg.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .call(g => {
        g.select('.domain').attr('stroke', 'rgba(255,255,255,0.15)')
        g.selectAll('text').attr('fill', '#6b7280').attr('font-size', '11px').attr('font-family', 'inherit')
        g.selectAll('line').attr('stroke', 'rgba(255,255,255,0.1)')
      })

    // Area fill
    const area = d3.area()
      .x(d => xScale(d.t))
      .y0(h)
      .y1(d => yScale(d.v))
      .curve(d3.curveCatmullRom)

    const gradient = svg.append('defs')
      .append('linearGradient')
      .attr('id', `grad-${label}`)
      .attr('x1', '0').attr('y1', '0').attr('x2', '0').attr('y2', '1')
    gradient.append('stop').attr('offset', '0%').attr('stop-color', color).attr('stop-opacity', 0.25)
    gradient.append('stop').attr('offset', '100%').attr('stop-color', color).attr('stop-opacity', 0.02)

    svg.append('path')
      .datum(parsed)
      .attr('fill', `url(#grad-${label})`)
      .attr('d', area)

    // Line
    const line = d3.line()
      .x(d => xScale(d.t))
      .y(d => yScale(d.v))
      .curve(d3.curveCatmullRom)

    svg.append('path')
      .datum(parsed)
      .attr('fill', 'none')
      .attr('stroke', color)
      .attr('stroke-width', 1.5)
      .attr('d', line)

    // Latest dot
    const last = parsed[parsed.length - 1]
    svg.append('circle')
      .attr('cx', xScale(last.t))
      .attr('cy', yScale(last.v))
      .attr('r', 4)
      .attr('fill', color)
      .attr('stroke', '#0d0f14')
      .attr('stroke-width', 2)

    // Y-axis label
    svg.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('x', -h / 2)
      .attr('y', -44)
      .attr('text-anchor', 'middle')
      .attr('fill', '#6b7280')
      .attr('font-size', '11px')
      .attr('font-family', 'inherit')
      .text(unit)

  }, [data, label, unit, color])

  return <svg ref={svgRef} style={{ width: '100%', height: '220px', display: 'block' }} />
}

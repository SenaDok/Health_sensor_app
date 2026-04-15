import { useState, useEffect, useCallback, useRef } from 'react'
import { postObservation, fetchObservations, createWebSocket } from './api.js'
import LineChart from './LineChart.jsx'

const SENSOR_PRESETS = [
  { code: '8867-4', display: 'Heart rate',     unit: 'beats/minute', min: 50,  max: 120, color: '#ef4444' },
  { code: '59408-5', display: 'SpO2',           unit: '%',            min: 92,  max: 100, color: '#3b82f6' },
  { code: '8310-5', display: 'Body temperature',unit: '°C',           min: 36,  max: 38,  color: '#f59e0b' },
  { code: '55284-4', display: 'Blood pressure', unit: 'mmHg',         min: 80,  max: 160, color: '#a855f7' },
]

function randomReading(preset) {
  return +(preset.min + Math.random() * (preset.max - preset.min)).toFixed(1)
}

const S = {
  app: { display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px 24px', gap: '20px', overflow: 'auto' },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 },
  title: { fontSize: '16px', fontWeight: 600, letterSpacing: '0.08em', color: '#e8eaf0' },
  wsChip: (ok) => ({
    fontSize: '11px', padding: '3px 10px', borderRadius: '999px',
    background: ok ? 'rgba(0,212,170,0.12)' : 'rgba(107,114,128,0.2)',
    color: ok ? '#00d4aa' : '#6b7280',
    border: `1px solid ${ok ? 'rgba(0,212,170,0.3)' : 'rgba(107,114,128,0.3)'}`,
  }),
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px', flexShrink: 0 },
  card: { background: '#161920', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '16px 20px' },
  cardLabel: { fontSize: '11px', color: '#6b7280', letterSpacing: '0.06em', marginBottom: '6px' },
  cardValue: { fontSize: '28px', fontWeight: 600 },
  cardUnit: { fontSize: '13px', color: '#6b7280', marginLeft: '6px' },
  mainRow: { display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', flex: 1, minHeight: 0 },
  panel: { background: '#161920', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' },
  select: {
    width: '100%', background: '#1e2230', border: '1px solid rgba(255,255,255,0.1)',
    color: '#e8eaf0', borderRadius: '6px', padding: '9px 12px', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
  },
  btn: (loading) => ({
    width: '100%', padding: '14px', borderRadius: '8px', border: 'none',
    background: loading ? '#1e2230' : '#00d4aa',
    color: loading ? '#6b7280' : '#0d0f14',
    fontSize: '14px', fontWeight: 600, fontFamily: 'inherit',
    cursor: loading ? 'not-allowed' : 'pointer',
    transition: 'all 0.15s', letterSpacing: '0.04em',
  }),
  chartPanel: { background: '#161920', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '10px', padding: '20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '12px' },
  tabRow: { display: 'flex', gap: '8px', flexWrap: 'wrap' },
  tab: (active, color) => ({
    padding: '5px 14px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', border: 'none',
    background: active ? `${color}22` : 'transparent',
    color: active ? color : '#6b7280',
    outline: active ? `1px solid ${color}44` : '1px solid transparent',
    fontFamily: 'inherit', transition: 'all 0.1s',
  }),
  feedItem: { display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  feedDot: (color) => ({ width: '7px', height: '7px', borderRadius: '50%', background: color, flexShrink: 0 }),
  feedLabel: { fontSize: '12px', color: '#9ca3af', flex: 1 },
  feedVal: { fontSize: '13px', fontWeight: 500 },
  feedTime: { fontSize: '11px', color: '#4b5563' },
  sectionLabel: { fontSize: '11px', color: '#6b7280', letterSpacing: '0.06em' },
}

export default function App() {
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState(null)
  const [allObs, setAllObs] = useState([])
  const [wsOk, setWsOk] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const wsRef = useRef(null)

  const loadObs = useCallback(async () => {
    try {
      const data = await fetchObservations({ limit: 100 })
      setAllObs(data.items || [])
    } catch {}
  }, [])

  useEffect(() => {
    loadObs()
  }, [loadObs])

  useEffect(() => {
    function connect() {
      const ws = createWebSocket(
        (msg) => {
          if (msg.event === 'new_observation') {
            setAllObs(prev => [msg.data, ...prev].slice(0, 200))
          }
        },
        () => { setWsOk(false); setTimeout(connect, 3000) }
      )
      ws.onopen = () => setWsOk(true)
      wsRef.current = ws
    }
    connect()
    return () => wsRef.current?.close()
  }, [])

  const handleRecord = async () => {
    const preset = SENSOR_PRESETS[selectedPreset]
    setLoading(true)
    setStatus(null)
    try {
      await postObservation({
        code_value: preset.code,
        code_display: preset.display,
        value_quantity: randomReading(preset),
        value_unit: preset.unit,
      })
      setStatus({ ok: true, msg: 'Observation recorded' })
    } catch (e) {
      setStatus({ ok: false, msg: e.message })
    } finally {
      setLoading(false)
    }
  }

  // Latest value per sensor
  const latest = SENSOR_PRESETS.map(p => {
    const obs = allObs.find(o => o.code_value === p.code)
    return obs ? +obs.value_quantity : null
  })

  // Chart data for active tab
  const chartPreset = SENSOR_PRESETS[activeTab]
  const chartData = allObs
    .filter(o => o.code_value === chartPreset.code)
    .slice(0, 60)
    .reverse()

  // Feed: last 12 observations
  const feed = allObs.slice(0, 12)

  return (
    <div style={S.app}>
      {/* Header */}
      <div style={S.header}>
        <span style={S.title}>HEALTH SENSOR DASHBOARD</span>
        <span style={S.wsChip(wsOk)}>{wsOk ? '● LIVE' : '○ CONNECTING'}</span>
      </div>

      {/* Metric cards */}
      <div style={S.grid}>
        {SENSOR_PRESETS.map((p, i) => (
          <div key={p.code} style={{ ...S.card, borderTop: `2px solid ${p.color}` }}>
            <div style={S.cardLabel}>{p.display.toUpperCase()}</div>
            <div>
              <span style={{ ...S.cardValue, color: p.color }}>
                {latest[i] !== null ? latest[i] : '—'}
              </span>
              <span style={S.cardUnit}>{p.unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main row */}
      <div style={S.mainRow}>
        {/* Left: controls */}
        <div style={S.panel}>
          <div>
            <div style={{ ...S.sectionLabel, marginBottom: '8px' }}>SENSOR TYPE</div>
            <select
              style={S.select}
              value={selectedPreset}
              onChange={e => setSelectedPreset(+e.target.value)}
            >
              {SENSOR_PRESETS.map((p, i) => (
                <option key={p.code} value={i}>{p.display}</option>
              ))}
            </select>
          </div>

          <button
            style={S.btn(loading)}
            onClick={handleRecord}
            disabled={loading}
          >
            {loading ? 'RECORDING…' : '⬤  RECORD OBSERVATION'}
          </button>

          {status && (
            <div style={{ fontSize: '12px', color: status.ok ? '#00d4aa' : '#ef4444', textAlign: 'center' }}>
              {status.msg}
            </div>
          )}

          <div style={{ flex: 1, overflow: 'auto' }}>
            <div style={{ ...S.sectionLabel, marginBottom: '10px' }}>RECENT FEED</div>
            {feed.length === 0 && (
              <div style={{ fontSize: '12px', color: '#4b5563' }}>No observations yet.</div>
            )}
            {feed.map((o, i) => {
              const p = SENSOR_PRESETS.find(p => p.code === o.code_value)
              return (
                <div key={o.id || i} style={S.feedItem}>
                  <div style={S.feedDot(p?.color || '#6b7280')} />
                  <span style={S.feedLabel}>{o.code_display}</span>
                  <span style={{ ...S.feedVal, color: p?.color || '#e8eaf0' }}>
                    {(+o.value_quantity).toFixed(1)}
                  </span>
                  <span style={S.feedTime}>
                    {new Date(o.effective_datetime).toLocaleTimeString()}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right: D3 chart */}
        <div style={S.chartPanel}>
          <div style={S.tabRow}>
            {SENSOR_PRESETS.map((p, i) => (
              <button key={p.code} style={S.tab(activeTab === i, p.color)} onClick={() => setActiveTab(i)}>
                {p.display}
              </button>
            ))}
          </div>
          <div style={{ ...S.sectionLabel }}>
            {chartPreset.display.toUpperCase()} — LAST {chartData.length} READINGS
          </div>
          {chartData.length < 2 ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4b5563', fontSize: '13px' }}>
              Record at least 2 observations to see the chart.
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              <LineChart
                data={chartData}
                label={chartPreset.code}
                unit={chartPreset.unit}
                color={chartPreset.color}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const BASE = import.meta.env.VITE_API_URL || ''

export async function postObservation(payload) {
  const res = await fetch(`${BASE}/api/v1/observations`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.detail || `HTTP ${res.status}`)
  }
  return res.json()
}

export async function fetchObservations({ limit = 50, code } = {}) {
  const params = new URLSearchParams({ limit })
  if (code) params.set('code', code)
  const res = await fetch(`${BASE}/api/v1/observations?${params}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

export function createWebSocket(onMessage, onClose) {
  const wsBase = import.meta.env.VITE_WS_URL || `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}`
  const ws = new WebSocket(`${wsBase}/ws`)
  ws.onmessage = (e) => {
    try { onMessage(JSON.parse(e.data)) } catch {}
  }
  ws.onclose = onClose
  ws.onerror = () => ws.close()
  return ws
}

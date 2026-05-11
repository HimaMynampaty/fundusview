/**
 * api/client.js
 *
 * Sends analysis requests to the FastAPI backend.
 * If the backend is unreachable (e.g. running frontend-only with npm run dev)
 * the caller can catch the error and fall back to in-browser analysis.
 *
 * Set VITE_API_URL in .env to point at the backend.
 * Defaults to /api (works when Nginx proxies /api/* → backend:8000).
 */

const API_BASE = import.meta.env.VITE_API_URL ?? '/api'

/**
 * analyzeImage(imageUrl, modeId, actionId)
 * Converts the base64 data URL to a Blob and POSTs it as multipart/form-data.
 * Returns the parsed JSON response from the backend.
 */
export async function analyzeImage(imageUrl, modeId, actionId) {
  // Convert base64 data URL → Blob
  const res  = await fetch(imageUrl)
  const blob = await res.blob()

  const form = new FormData()
  form.append('image', blob, 'fundus.png')

  const response = await fetch(`${API_BASE}/analyze/${modeId}/${actionId}`, {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    throw new Error(`Backend error ${response.status}: ${await response.text()}`)
  }

  return response.json()
}

/**
 * checkBackendHealth()
 * Returns true if the backend is reachable, false otherwise.
 * Used to decide whether to show the "backend connected" indicator.
 */
export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) })
    return res.ok
  } catch {
    return false
  }
}

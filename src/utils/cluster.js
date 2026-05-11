/**
 * cluster(pts, dist)
 * Merges an array of {x, y, type} points that are within `dist` pixels
 * of each other into a single averaged point.
 *
 * Purpose: pixel sampling produces many hits per lesion. Clustering
 * reduces them to one marker per physical lesion.
 */
export function cluster(pts, dist) {
  const used = new Set()
  const out = []

  for (let i = 0; i < pts.length; i++) {
    if (used.has(i)) continue

    let cx = pts[i].x, cy = pts[i].y, n = 1
    used.add(i)

    for (let j = i + 1; j < pts.length; j++) {
      if (used.has(j)) continue
      if (Math.hypot(pts[i].x - pts[j].x, pts[i].y - pts[j].y) < dist) {
        cx += pts[j].x
        cy += pts[j].y
        n++
        used.add(j)
      }
    }

    out.push({ ...pts[i], x: cx / n, y: cy / n })
  }

  return out
}

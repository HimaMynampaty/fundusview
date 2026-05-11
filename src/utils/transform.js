/**
 * fitTransform(imageWidth, imageHeight, canvasWidth, canvasHeight)
 * Returns {x, y, scale} so the image fits centred in the canvas
 * with a small margin (88% of the available space).
 */
export function fitTransform(iW, iH, cW, cH) {
  const scale = Math.min(cW / iW, cH / iH) * 0.88
  return {
    scale,
    x: (cW - iW * scale) / 2,
    y: (cH - iH * scale) / 2,
  }
}

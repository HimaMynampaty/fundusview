/**
 * renderer.js — All canvas drawing. Completely mode-agnostic.
 *
 * Marker shape types:
 *   "circle/diamond/triangle" – point markers, r is in SCREEN pixels (constant size)
 *   "ring"                    – structural overlay, r is in IMAGE pixels (scales with zoom)
 *
 * Each marker carries its own style: { x, y, type, color, shape, r }
 */

function drawMarker(ctx, marker, scale) {
  const { x: mx, y: my, color, shape, r: rawR } = marker
  const r = shape === 'ring' ? rawR : rawR / scale

  ctx.strokeStyle = color
  ctx.lineWidth = shape === 'ring' ? 2 / scale : 1.8 / scale
  ctx.fillStyle = color + (shape === 'ring' ? '18' : '25')
  ctx.beginPath()

  if (shape === 'circle') {
    ctx.arc(mx, my, r, 0, Math.PI * 2)
  } else if (shape === 'diamond') {
    ctx.moveTo(mx, my - r); ctx.lineTo(mx + r, my)
    ctx.lineTo(mx, my + r); ctx.lineTo(mx - r, my)
    ctx.closePath()
  } else if (shape === 'triangle') {
    const h = r
    ctx.moveTo(mx, my - h)
    ctx.lineTo(mx + h * 0.87, my + h * 0.5)
    ctx.lineTo(mx - h * 0.87, my + h * 0.5)
    ctx.closePath()
  } else if (shape === 'ring') {
    ctx.arc(mx, my, r, 0, Math.PI * 2)
  }

  ctx.stroke(); ctx.fill()

  if (shape === 'ring') {
    const cs = 6 / scale
    ctx.lineWidth = 1.5 / scale
    ctx.beginPath(); ctx.moveTo(mx - cs, my); ctx.lineTo(mx + cs, my); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(mx, my - cs); ctx.lineTo(mx, my + cs); ctx.stroke()
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x+r,y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

function drawHeatmap(ctx, iW, iH) {
  [[iW*.28,iH*.52,.9],[iW*.55,iH*.38,.7],[iW*.18,iH*.28,.55],[iW*.65,iH*.65,.65]]
    .forEach(([sx,sy,intens]) => {
      const r = Math.min(iW,iH)*.28
      for (let ring=4;ring>=0;ring--) {
        const fr=ring/4, alpha=intens*(1-fr)*.38, gr=Math.round(50+fr*90)
        ctx.beginPath(); ctx.arc(sx,sy,r*(.2+fr*.8),0,Math.PI*2)
        ctx.fillStyle=`rgba(255,${gr},20,${alpha})`; ctx.fill()
      }
    })
}

function drawMagnifier(ctx, hover, img, W, H) {
  const {cx:hcx,cy:hcy,transform:{x,y,scale}} = hover
  const iW=img.naturalWidth,iH=img.naturalHeight
  const MR=58,MX=W-MR-14,MY=MR+14,MZ=4
  const imgX=(hcx-x)/scale, imgY=(hcy-y)/scale, sw=(MR*2)/MZ

  ctx.save()
  ctx.beginPath(); ctx.arc(MX,MY,MR,0,Math.PI*2); ctx.clip()
  ctx.fillStyle='#050810'; ctx.fill()
  if (imgX>0&&imgY>0&&imgX<iW&&imgY<iH)
    ctx.drawImage(img,imgX-sw/2,imgY-sw/2,sw,sw,MX-MR,MY-MR,MR*2,MR*2)
  ctx.strokeStyle='rgba(255,255,255,0.5)'; ctx.lineWidth=0.8
  ctx.beginPath(); ctx.moveTo(MX-8,MY); ctx.lineTo(MX+8,MY); ctx.stroke()
  ctx.beginPath(); ctx.moveTo(MX,MY-8); ctx.lineTo(MX,MY+8); ctx.stroke()
  ctx.restore()
  ctx.beginPath(); ctx.arc(MX,MY,MR,0,Math.PI*2)
  ctx.strokeStyle='rgba(180,200,255,0.22)'; ctx.lineWidth=1.5; ctx.stroke()
  ctx.fillStyle='rgba(180,200,255,0.4)'; ctx.font='9px monospace'
  ctx.textAlign='center'; ctx.fillText('4×',MX,MY+MR+11); ctx.textAlign='left'
}

export function renderFrame(canvas, img, state) {
  if (!canvas||!img||!img.naturalWidth||!canvas.width||!canvas.height) return
  const ctx=canvas.getContext('2d'),W=canvas.width,H=canvas.height
  const {transform:{x,y,scale},markers,visible,showHeatmap,hover,tool,measPts}=state
  const iW=img.naturalWidth,iH=img.naturalHeight

  ctx.clearRect(0,0,W,H); ctx.fillStyle='#05080f'; ctx.fillRect(0,0,W,H)

  ctx.save(); ctx.translate(x,y); ctx.scale(scale,scale)
  ctx.drawImage(img,0,0,iW,iH)
  if (showHeatmap) drawHeatmap(ctx,iW,iH)
  markers.filter(m=>visible[m.type]!==false).forEach(m=>drawMarker(ctx,m,scale))
  ctx.restore()

  if (tool==='measure'&&measPts.length>0) {
    const toC=p=>({cx:p.x*scale+x,cy:p.y*scale+y})
    const cps=measPts.map(toC)
    if (cps.length===2) {
      ctx.beginPath(); ctx.moveTo(cps[0].cx,cps[0].cy); ctx.lineTo(cps[1].cx,cps[1].cy)
      ctx.strokeStyle='#AFA9EC'; ctx.lineWidth=1.5; ctx.setLineDash([5,3]); ctx.stroke(); ctx.setLineDash([])
      const dist=Math.hypot(measPts[1].x-measPts[0].x,measPts[1].y-measPts[0].y)
      const mx=(cps[0].cx+cps[1].cx)/2,my=(cps[0].cy+cps[1].cy)/2
      roundRect(ctx,mx-30,my-13,60,18,4); ctx.fillStyle='rgba(8,12,24,0.85)'; ctx.fill()
      ctx.fillStyle='#AFA9EC'; ctx.font='11px monospace'; ctx.textAlign='center'
      ctx.fillText(`${dist.toFixed(1)} px`,mx,my); ctx.textAlign='left'
    }
    measPts.map(toC).forEach((p,i)=>{
      ctx.beginPath(); ctx.arc(p.cx,p.cy,5,0,Math.PI*2); ctx.fillStyle='#7F77DD'; ctx.fill()
      ctx.fillStyle='#fff'; ctx.font='bold 10px monospace'; ctx.textAlign='center'
      ctx.fillText(i+1,p.cx,p.cy+3.5); ctx.textAlign='left'
    })
  }

  if (hover) {
    const{cx:hcx,cy:hcy}=hover
    ctx.strokeStyle='rgba(255,255,255,0.18)'; ctx.lineWidth=1; ctx.setLineDash([4,5])
    ctx.beginPath(); ctx.moveTo(hcx,0); ctx.lineTo(hcx,H); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(0,hcy); ctx.lineTo(W,hcy); ctx.stroke()
    ctx.setLineDash([])
    drawMagnifier(ctx,hover,img,W,H)
  }
}

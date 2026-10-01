class FieldMap {
  /* Terrain palettes. `map` is exactly what this map has always drawn, and
     it is the default, so nothing changes anywhere until a map is asked for
     another one. */
  static TERRAINS = {
    map: {
      label: 'Map',
      bg: '#e8e0d4', block: '#f5f0e8', blockEdge: '#d4cdc0',
      water: '#93c5fd', road: '#ffffff', roadEdge: '#e5e0d8',
    },
    satellite: {
      label: 'Satellite',
      bg: '#3d4a38', block: '#49573f', blockEdge: '#5b6a4f',
      water: '#1e3c5c', road: '#8d9683', roadEdge: '#6d7864',
    },
    terrain: {
      label: 'Terrain',
      bg: '#dfe7d6', block: '#eef2e6', blockEdge: '#c3cfb4',
      water: '#9ec9e8', road: '#ffffff', roadEdge: '#d2dcc6',
    },
  };

  constructor(canvasId, areaId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx    = this.canvas.getContext('2d');
    this.area   = document.getElementById(areaId);

    this.panX   = 0;
    this.panY   = 0;
    this.scale  = 1;

    this.isDragging = false;
    this.lastX = 0;
    this.lastY = 0;
    this.animFrame = null;

    this.activeModule = 'all';
    this.terrain = 'map';

    /* True on a map that has the screen to itself — one in a sheet or a
       modal, with no page behind it to scroll. Such a map takes the wheel
       and a single finger for itself, the way a full map should. An
       embedded one leaves both to the page; see takeGestures(). */
    this.ownsGestures = false;

    /* pin bounce: Map<pin object → animation start timestamp> */
    this._bouncingPins  = new Map();
    this._bounceLooping = false;

    /* pick-location mode */
    this.pickMode   = false;
    this.previewPin = null; /* { x, y } world coords */

    /* Pointer image for pick-mode preview */
    this._pointerImg = new Image();
    this._pointerImg.src = 'src/pointer.svg';

    /* Pre-render SVG pin images per colour */
    this._pinImages = {};
    [
      '#10b981', /* contacts */
      '#8b5cf6', /* accounts */
      '#f59e0b', /* deals    */
      '#3b82f6', /* leads    */
      '#ef4444', /* preview / pick mode */
      '#9ca3af', /* fallback */
    ].forEach(color => {
      const img = new Image();
      img.src = this._makePinSvg(color);
      this._pinImages[color] = img;
    });

    this._bindEvents();
    this._observeResize();
  }

  /* ── Build a data-URL SVG with `color` applied to the recordpoint shape ── */
  _makePinSvg(color) {
    const svg = [
      '<svg width="24" height="35" viewBox="0 0 24 35" fill="none" xmlns="http://www.w3.org/2000/svg">',
      '<path d="M24 12.2857C24 21.1429 13.1163 34.2857 12 34.2857C10.8837 34.2857 0 20.8571 0 12.2857C0 5.5005 5.37258 0 12 0C18.6274 0 24 5.5005 24 12.2857Z" fill="white"/>',
      `<path d="M12 6C15.3137 6 18 8.68629 18 12C18 15.3137 15.3137 18 12 18C8.68629 18 6 15.3137 6 12C6 8.68629 8.68629 6 12 6Z" fill="${color}"/>`,
      `<path fill-rule="evenodd" clip-rule="evenodd" d="M12 0C18.6274 0 24 5.50092 24 12.2861L23.9922 12.7041C23.6622 21.5505 13.0988 34.2861 12 34.2861L11.9404 34.2764C10.5681 33.8739 0.332732 21.1376 0.0078125 12.6914L0 12.2861C0 5.50092 5.37258 3.29809e-07 12 0ZM12 2C6.52126 2 2 6.56087 2 12.2861C2.00009 14.0473 2.57062 16.2105 3.56152 18.5635C4.54131 20.8899 5.87423 23.2669 7.26172 25.415C8.64784 27.561 10.0623 29.4384 11.1816 30.7627C11.489 31.1263 11.7677 31.4392 12.0107 31.7002C12.2509 31.4465 12.5263 31.1426 12.8291 30.79C13.9463 29.4894 15.3583 27.6413 16.7422 25.5156C18.1275 23.3881 19.459 21.0236 20.4375 18.6875C21.4254 16.3289 21.9999 14.1261 22 12.2861C22 6.56087 17.4787 2 12 2Z" fill="${color}"/>`,
      '</svg>',
    ].join('');
    return 'data:image/svg+xml,' + encodeURIComponent(svg);
  }

  /* ── Module colour lookup ── */
  _colorForPin(p) {
    return {
      contacts: '#10b981',
      accounts: '#8b5cf6',
      deals:    '#f59e0b',
      leads:    '#3b82f6',
    }[p.module.toLowerCase()] || p.color || '#9ca3af';
  }

  setModule(module) {
    this.activeModule = module;
    this.draw();
  }

  /* Multi-select: pass an array of module keys (empty = show all) */
  setModules(arr) {
    this._activeModules = arr;
    this.draw();
  }

  _visiblePins() {
    const pins = this._visiblePinsOverride || PINS;
    if (this._activeModules && this._activeModules.length > 0) {
      return pins.filter(p => this._activeModules.includes(p.module.toLowerCase()));
    }
    return pins;
  }

  resize() {
    this.canvas.width  = this.area.offsetWidth;
    this.canvas.height = this.area.offsetHeight;
    this.draw();
  }

  /* ── Pick mode ── */
  enterPickMode() {
    this.pickMode   = true;
    this.previewPin = null;
    this.canvas.classList.add('pick-mode');
    this.draw();
  }

  exitPickMode() {
    this.pickMode   = false;
    this.previewPin = null;
    this.canvas.classList.remove('pick-mode');
    this.draw();
  }

  setPreviewPin(wx, wy) {
    this.previewPin = { x: wx, y: wy };
    this.draw();
  }

  clearPreviewPin() {
    this.previewPin = null;
    this.draw();
  }

  /* ── Bounce animation ── */
  startPinBounce(pin) {
    this._bouncingPins.set(pin, performance.now());
    if (!this._bounceLooping) {
      this._bounceLooping = true;
      this._bounceLoop();
    }
  }

  _bounceLoop() {
    const now = performance.now();
    this._bouncingPins.forEach((t0, pin) => {
      if (now - t0 >= 900) this._bouncingPins.delete(pin);
    });
    this.draw();
    if (this._bouncingPins.size > 0) {
      requestAnimationFrame(() => this._bounceLoop());
    } else {
      this._bounceLooping = false;
    }
  }

  /* Returns world-unit Y offset (negative = above resting position) */
  _bounceY(t) {
    if (t < 0.42) return -55 * (1 - t / 0.42) ** 2;
    if (t < 0.62) return -18 * Math.sin(((t - 0.42) / 0.20) * Math.PI);
    if (t < 0.78) return  -6 * Math.sin(((t - 0.62) / 0.16) * Math.PI);
    if (t < 0.90) return  -2 * Math.sin(((t - 0.78) / 0.12) * Math.PI);
    return 0;
  }

  /* ── Render ── */
  draw() {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);

    this._drawBackground();
    this._drawBlocks();
    this._drawWater();
    this._drawRoads();
    this._drawPins();

    ctx.restore();
  }

  /* Call on a map that fills a sheet or modal: the wheel zooms with no
     modifier and one finger pans, because there is nothing behind it that
     either gesture could belong to instead. */
  takeGestures() {
    this.ownsGestures = true;
    this.canvas.classList.add('fm-owns-gestures');
    return this;
  }

  get palette() { return FieldMap.TERRAINS[this.terrain] || FieldMap.TERRAINS.map; }

  setTerrain(name) {
    if (!FieldMap.TERRAINS[name] || name === this.terrain) return;
    this.terrain = name;
    this.draw();
  }

  /* Centre and scale so every one of these world points is in view —
     what the map's "back to the day" control asks for. */
  fitBounds(points, pad = 70) {
    if (!points || !points.length) return;
    const w = this.canvas.width - pad * 2;
    const h = this.canvas.height - pad * 2;
    if (w <= 0 || h <= 0) return;
    const xs = points.map(p => p.x);
    const ys = points.map(p => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);
    const spanX = Math.max(maxX - minX, 1);
    const spanY = Math.max(maxY - minY, 1);
    this.scale = Math.max(0.4, Math.min(5, Math.min(w / spanX, h / spanY)));
    this.panX = this.canvas.width / 2 - ((minX + maxX) / 2) * this.scale;
    this.panY = this.canvas.height / 2 - ((minY + maxY) / 2) * this.scale;
    this._clamp();
    this.draw();
  }

  _drawBackground() {
    const { ctx, canvas } = this;
    ctx.fillStyle = this.palette.bg;
    ctx.fillRect(-this.panX / this.scale, -this.panY / this.scale,
                  canvas.width / this.scale, canvas.height / this.scale);
  }

  _drawBlocks() {
    const { ctx } = this;
    BLOCKS.forEach(b => {
      ctx.fillStyle = this.palette.block; ctx.strokeStyle = this.palette.blockEdge;
      ctx.lineWidth = 0.5 / this.scale;
      ctx.beginPath(); ctx.rect(b.x, b.y, b.w, b.h); ctx.fill(); ctx.stroke();
    });
  }

  _drawWater() {
    const { ctx } = this;
    WATER.forEach(poly => {
      ctx.beginPath(); ctx.moveTo(poly[0][0], poly[0][1]);
      poly.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.closePath(); ctx.fillStyle = this.palette.water; ctx.fill();
    });
  }

  _drawRoads() {
    const { ctx } = this;
    ROADS.forEach(r => {
      ctx.beginPath(); ctx.moveTo(r.path[0][0], r.path[0][1]);
      r.path.slice(1).forEach(p => ctx.lineTo(p[0], p[1]));
      ctx.strokeStyle = this.palette.road; ctx.lineWidth = (r.w || 3) / this.scale; ctx.stroke();
      ctx.strokeStyle = this.palette.roadEdge; ctx.lineWidth = 0.5 / this.scale; ctx.stroke();
    });
  }

  _drawPins() {
    const now = performance.now();
    const DURATION = 900;

    /* Dim existing pins while in pick mode */
    if (this.pickMode) this.ctx.globalAlpha = 0.25;

    this._visiblePins().forEach(p => {
      let yOff = 0;
      if (this._bouncingPins.has(p)) {
        const t = Math.min((now - this._bouncingPins.get(p)) / DURATION, 1);
        yOff = this._bounceY(t);
      }
      this._drawSinglePin(p.x, p.y, this._colorForPin(p), yOff, false);
    });

    if (this.pickMode) this.ctx.globalAlpha = 1;

    /* Pointer.png preview pin — fixed at chosen location */
    if (this.pickMode && this.previewPin) {
      this._drawPointerPin(this.previewPin.x, this.previewPin.y);
    }
  }

  /* SVG dimensions: 24 × 35 — tip at bottom-centre (12, 34.3) */
  _drawSinglePin(wx, wy, color, yOff, isPreview) {
    const { ctx } = this;

    /* constant 28 screen-pixel width regardless of zoom */
    const pinW = 28 / this.scale;
    const pinH = pinW * (35 / 24);

    /* Tip position (animated during bounce) */
    const tipY = wy + yOff;

    /* Shadow at ground level — squishes and fades as pin rises */
    const rise   = Math.abs(yOff) / 55;
    const sAlpha = Math.max(0.06, 0.18 * (1 - rise));
    const sScaleX = Math.max(0.25, 1 - rise * 0.7);
    ctx.save();
    ctx.translate(wx, wy);
    ctx.scale(sScaleX, 0.15);
    ctx.beginPath();
    ctx.arc(0, 0, pinW * 0.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(0,0,0,${sAlpha})`;
    ctx.fill();
    ctx.restore();

    /* Draw SVG pin: tip = bottom of image → top = tipY - pinH */
    const img = this._pinImages[color] || this._pinImages['#9ca3af'];
    if (img && img.complete) {
      ctx.drawImage(img, wx - pinW / 2, tipY - pinH, pinW, pinH);
    }

    /* Pulsing halo on the red preview pin */
    if (isPreview) {
      /* Circle centre in SVG coords: y=12 of 35 from top */
      const circY = tipY - pinH + pinH * (12 / 35);
      ctx.beginPath();
      ctx.arc(wx, circY, pinW * 0.72, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(239,68,68,0.45)';
      ctx.lineWidth   = 2 / this.scale;
      ctx.stroke();
    }
  }

  /* Draw pointer.png at world pos (wx, wy) at a constant 20×42 screen pixels.
     Hotspot of the image is at (10, 40) — tip of the pin stem. */
  _drawPointerPin(wx, wy) {
    const img = this._pointerImg;
    if (!img || !img.complete) return;
    const w = 20 / this.scale;
    const h = 42 / this.scale;
    this.ctx.drawImage(img, wx - 10 / this.scale, wy - 40 / this.scale, w, h);
  }

  _clamp() {
    this.panX = Math.max(-800 * this.scale + 80, Math.min(100, this.panX));
    this.panY = Math.max(-640 * this.scale + 80, Math.min(100, this.panY));
  }

  screenToWorld(sx, sy) {
    return [(sx - this.panX) / this.scale, (sy - this.panY) / this.scale];
  }

  worldToScreen(wx, wy) {
    return [wx * this.scale + this.panX, wy * this.scale + this.panY];
  }

  pinAtScreen(mx, my) {
    const [wx, wy] = this.screenToWorld(mx, my);
    const pinW = 28 / this.scale;
    const pinH = pinW * (35 / 24);
    return this._visiblePins().find(p =>
      wx >= p.x - pinW / 2 && wx <= p.x + pinW / 2 &&
      wy <= p.y && wy >= p.y - pinH
    ) || null;
  }

  zoom(factor, cx, cy) {
    const [wx, wy] = this.screenToWorld(cx, cy);
    this.scale = Math.max(0.4, Math.min(5, this.scale * factor));
    this.panX  = cx - wx * this.scale;
    this.panY  = cy - wy * this.scale;
    this._clamp();
    this.draw();
  }

  pan(dx, dy) {
    this.panX += dx;
    this.panY += dy;
    this._clamp();
    cancelAnimationFrame(this.animFrame);
    this.animFrame = requestAnimationFrame(() => this.draw());
  }

  /* A few pixels of travel during a click is a click, not a pan */
  static DRAG_SLOP = 3;

  _bindEvents() {
    const canvas = this.canvas;
    FieldMap._installStyles();
    canvas.classList.add('fm-canvas');

    const endDrag = () => {
      /* The click that follows a real drag is the end of a pan, not a click
         on whatever happens to be under the pointer */
      this.didDrag = this.dragMoved;
      this.isDragging = false;
      this.dragMoved = false;
      canvas.classList.remove('dragging');
    };

    canvas.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      this.isDragging = true;
      this.dragMoved = false;
      /* Cleared on the way in, not just on the way out: a fresh press has
         not dragged anything yet, and leaving the last press's verdict
         standing made every later click look like the end of a pan. */
      this.didDrag = false;
      this.lastX = e.clientX; this.lastY = e.clientY;
      /* Or the drag selects the text around the map as it goes */
      e.preventDefault();
    });

    window.addEventListener('mouseup', endDrag);

    window.addEventListener('mousemove', e => {
      if (!this.isDragging) return;
      /* A button released outside the window never sends us its mouseup,
         which used to leave the map panning with nothing held down */
      if (e.buttons === 0) { endDrag(); return; }
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      if (!this.dragMoved) {
        if (Math.abs(dx) < FieldMap.DRAG_SLOP && Math.abs(dy) < FieldMap.DRAG_SLOP) return;
        this.dragMoved = true;
        canvas.classList.add('dragging');
      }
      this.pan(dx, dy);
      this.lastX = e.clientX; this.lastY = e.clientY;
    });

    /* An embedded map leaves a bare wheel to the page and zooms only on
       Ctrl / ⌘, so the record scrolls as it would over anything else — this
       map used to swallow every wheel. A map that owns its gestures zooms
       on a bare wheel, there being no page behind it to scroll. Either way
       a trackpad pinch arrives as a wheel with ctrlKey already set, so
       pinch to zoom needs nothing extra. */
    canvas.addEventListener('wheel', e => {
      if (!this.ownsGestures && !e.ctrlKey && !e.metaKey) { this._hintZoom(); return; }
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      this.zoom(e.deltaY > 0 ? 0.85 : 1.18, e.clientX - rect.left, e.clientY - rect.top);
    }, { passive: false });

    /* On an embedded map one finger scrolls the page — see touch-action on
       .fm-canvas — and two pan the map, tracked by the midpoint between
       them. Before this a one-finger swipe dragged the map and scrolled the
       record at once. A map that owns its gestures pans on one finger too. */
    const point = touches => (touches.length === 2
      ? { x: (touches[0].clientX + touches[1].clientX) / 2,
          y: (touches[0].clientY + touches[1].clientY) / 2 }
      : { x: touches[0].clientX, y: touches[0].clientY });

    const panningTouch = n => n === 2 || (n === 1 && this.ownsGestures);

    canvas.addEventListener('touchstart', e => {
      if (!panningTouch(e.touches.length)) { this.isDragging = false; return; }
      const m = point(e.touches);
      this.isDragging = true;
      this.dragMoved = true;
      this.lastX = m.x; this.lastY = m.y;
    }, { passive: true });

    canvas.addEventListener('touchmove', e => {
      if (!this.isDragging || !panningTouch(e.touches.length)) return;
      e.preventDefault();
      const m = point(e.touches);
      this.pan(m.x - this.lastX, m.y - this.lastY);
      this.lastX = m.x; this.lastY = m.y;
    }, { passive: false });

    canvas.addEventListener('touchend', endDrag);
    canvas.addEventListener('touchcancel', endDrag);
  }

  /* Says why the wheel did nothing, the one time it does nothing. Shown on
     a bare wheel and gone again shortly after. */
  _hintZoom() {
    if (!this.area) return;
    if (!this._hintEl) {
      this._hintEl = document.createElement('p');
      this._hintEl.className = 'fm-zoom-hint';
      this._hintEl.setAttribute('aria-hidden', 'true');
      this._hintEl.textContent =
        `Use ${FieldMap._cmdKey()} + scroll to zoom the map`;
      this.area.appendChild(this._hintEl);
    }
    this._hintEl.classList.add('show');
    clearTimeout(this._hintTimer);
    this._hintTimer = setTimeout(() => this._hintEl.classList.remove('show'), 1400);
  }

  static _cmdKey() {
    return /Mac|iP(hone|ad|od)/.test(navigator.platform || navigator.userAgent)
      ? '\u2318' : 'Ctrl';
  }

  /* The touch rules and the hint belong to the map wherever it is used, and
     the pages that use it load four different stylesheets — so the
     component brings its own, once. */
  static _installStyles() {
    if (document.getElementById('fm-styles')) return;
    const el = document.createElement('style');
    el.id = 'fm-styles';
    el.textContent = `
      /* One finger is the page's: a swipe scrolls the record rather than
         dragging the map out from under it. Two fingers are the map's. */
      .fm-canvas { touch-action: pan-y; }

      /* Unless the map owns its gestures, in which case every touch is its
         own — there is no page behind it to scroll */
      .fm-canvas.fm-owns-gestures { touch-action: none; }

      .fm-zoom-hint {
        position: absolute;
        left: 50%;
        bottom: 16px;
        z-index: 3;
        transform: translate(-50%, 6px);
        padding: 7px 14px;
        background: rgba(32, 33, 35, 0.86);
        border-radius: 100px;
        font-family: inherit;
        font-size: 12.5px;
        line-height: 17px;
        color: #fff;
        white-space: nowrap;
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.18s ease, transform 0.18s ease;
      }

      .fm-zoom-hint.show { opacity: 1; transform: translate(-50%, 0); }

      @media (prefers-reduced-motion: reduce) {
        .fm-zoom-hint { transition: none; }
      }
    `;
    document.head.appendChild(el);
  }

  _observeResize() {
    new ResizeObserver(() => this.resize()).observe(this.area);
  }
}

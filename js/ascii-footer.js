// ASCII-арт в футере — упрощённая версия эффекта good-fella.com (их футер:
// две ASCII-панели по бокам, оранжевый #ff6b4a, reveal-волна при появлении).
// 2D-canvas без three.js: фото → сетка символов по яркости.
// Левая панель — фото как есть, правая — зеркально (у них левая/правая рука).
(async () => {
  const panels = document.querySelectorAll('.footer-ascii');
  if (!panels.length || !window.matchMedia('(min-width: 1024px)').matches) return;

  // На file:// canvas с картинкой «tainted» — getImageData запрещён.
  // На хостинге (http) это работает; при ошибке панели скрываются тихо.

  const CHARS = " .:,'-^=*+?!|0#X%WM@";
  const COLOR_BRIGHT = '#ff7a45';
  const COLOR_MID = '#a03324';
  const CELL = 15;        // размер ячейки, px
  const IMG_SRC = 'assets/anton.jpg';
  const REVEAL_MS = 3000; // длительность reveal-волны (~3s, как у них)

  // ---------- вырезка фона: заливка от краёв по близости к цвету углов ----------
  function makeCutout(img) {
    const c = document.createElement('canvas');
    const scale = Math.min(1, 900 / Math.max(img.width, img.height));
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, c.width, c.height);

    const data = ctx.getImageData(0, 0, c.width, c.height);
    const px = data.data, W = c.width, H = c.height;
    // вместо вырезки фона — фильтр «тёплых» пикселей: кожа/борода заметно
    // теплее серого неба и тёмной куртки (r заметно больше b). Оранжевые
    // символы поверх тёмного футера дают эффект «парящих рук» с их сайта
    for (let i = 0; i < px.length; i += 4) {
      const warm = px[i] - px[i + 2];
      const lum = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
      if (!(warm > 18 && lum > 0.1)) px[i + 3] = 0;
    }
    ctx.putImageData(data, 0, 0);

    // обрезка по содержимому + поле 3%
    let minX = W, minY = H, maxX = 0, maxY = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (px[(y * W + x) * 4 + 3] > 0) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    if (maxX <= minX) return c;
    const mx = Math.round((maxX - minX) * 0.03), my = Math.round((maxY - minY) * 0.03);
    minX = Math.max(0, minX - mx); minY = Math.max(0, minY - my);
    maxX = Math.min(W - 1, maxX + mx); maxY = Math.min(H - 1, maxY + my);
    const cropped = document.createElement('canvas');
    cropped.width = maxX - minX + 1; cropped.height = maxY - minY + 1;
    cropped.getContext('2d').drawImage(c, minX, minY, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
    return cropped;
  }

  // ---------- рендер ASCII в offscreen-канвас ----------
  function renderAscii(src, mirror) {
    const buf = document.createElement('canvas');
    buf.width = src.width; buf.height = src.height;
    const bctx = buf.getContext('2d', { willReadFrequently: true });
    if (mirror) { bctx.translate(buf.width, 0); bctx.scale(-1, 1); }
    bctx.drawImage(src, 0, 0);

    const bdata = bctx.getImageData(0, 0, buf.width, buf.height).data;
    const cols = Math.ceil(buf.width / CELL), rows = Math.ceil(buf.height / CELL);

    const out = document.createElement('canvas');
    out.width = cols * CELL; out.height = rows * CELL;
    const octx = out.getContext('2d');
    octx.font = `700 ${CELL - 3}px Consolas, "Cascadia Mono", monospace`;
    octx.textAlign = 'center';
    octx.textBaseline = 'middle';

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const sx = Math.floor((c + 0.5) * buf.width / cols);
        const sy = Math.floor((r + 0.5) * buf.height / rows);
        const o = (sy * buf.width + sx) * 4;
        if (bdata[o + 3] < 40) continue;
        const lum = (0.299 * bdata[o] + 0.587 * bdata[o + 1] + 0.114 * bdata[o + 2]) / 255;
        if (lum < 0.1) continue; // тёмный шум не рисуем
        // гамма < 1: средне-яркая кожа получает более плотные символы
        const ci = Math.max(1, Math.floor((CHARS.length - 1) * Math.pow(lum, 0.6)));
        octx.fillStyle = lum > 0.55 ? COLOR_BRIGHT : COLOR_MID;
        octx.globalAlpha = 0.45 + 0.55 * lum;
        octx.fillText(CHARS[ci], c * CELL + CELL / 2, r * CELL + CELL / 2);
      }
    }
    octx.globalAlpha = 1;
    return out;
  }

  // ---------- панели ----------
  const img = new Image();
  img.decoding = 'async';
  img.onerror = () => {
    panels.forEach((p) => { p.style.display = 'none'; });
  };
  img.onload = () => {
    let cut;
    try {
      cut = makeCutout(img);
    } catch (e) {
      // tainted canvas (file://) — эффекта не будет, панели не мешают
      panels.forEach((p) => { p.style.display = 'none'; });
      return;
    }
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    panels.forEach((panel, idx) => {
      const canvas = panel.querySelector('canvas');
      if (!canvas) return;
      const mirror = idx === 1; // правая — зеркально

      let state = null;
      const build = () => {
        const box = panel.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
        canvas.width = Math.max(2, Math.round(box.width * dpr));
        canvas.height = Math.max(2, Math.round(box.height * dpr));
        const art = renderAscii(cut, mirror);
        // положение ASCII: фигура ограничена (не на всю панель, как «руки»
        // у good-fella), прижата к низу; левая — к левому краю, правая — к правому
        const s = Math.min((canvas.width * 0.75) / art.width, (canvas.height * 0.68) / art.height);
        const w = art.width * s, h = art.height * s;
        state = {
          art,
          dpr,
          dx: idx === 0 ? 0 : canvas.width - w,
          dy: canvas.height - h,
          dw: w, dh: h,
        };
      };

      // reveal: радиальная маска от ближнего края (левая — слева, правая — справа),
      // у good-fella revealOriginX 0/1, revealOriginY 0.5
      const drawAt = (progress) => {
        const { art, dx, dy, dw, dh, dpr } = state;
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(art, dx, dy, dw, dh);
        if (progress < 1) {
          const band = 0.08;
          const cx = idx === 0 ? 0 : canvas.width;
          const cy = canvas.height * 0.5;
          ctx.save();
          ctx.globalCompositeOperation = 'destination-in';
          const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, progress * (canvas.width + canvas.height / 2)));
          const solid = Math.max(0, 1 - band / Math.max(progress, 0.02));
          grd.addColorStop(0, 'rgba(0,0,0,1)');
          grd.addColorStop(solid, 'rgba(0,0,0,1)');
          grd.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = grd;
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
        }
      };

      // DPR через transform: canvas в CSS-пикселях масштабируется,
      // поэтому всё рисуем в физических — dpr учтён в размерах canvas
      build();
      if (reduced) { drawAt(1); }
      else {
        drawAt(0);
        let started = false;
        const io = new IntersectionObserver((entries) => {
          if (!entries[0].isIntersecting || started) return;
          started = true;
          io.disconnect();
          const t0 = performance.now();
          const tick = (t) => {
            const p = Math.min(1, (t - t0) / REVEAL_MS);
            drawAt(1 - Math.pow(1 - p, 3)); // ease-out cubic
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        }, { threshold: 0.15 });
        io.observe(panel);

        // перестройка при ресайзе (только после анимации — до неё панель пустая)
        let resizeT;
        window.addEventListener('resize', () => {
          clearTimeout(resizeT);
          resizeT = setTimeout(() => { build(); drawAt(1); }, 200);
        });
      }
    });
  };
  img.src = IMG_SRC;
})();
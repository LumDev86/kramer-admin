// Captura una ruta del panel en los tres tamaños y arma un tablero SVG como los del artefacto.
const DEVICES = [
  { key: 'd', label: 'Escritorio · 1280 px', w: 1280, h: 820, r: 18 },
  { key: 't', label: 'Tablet · 834 px', w: 834, h: 1112, r: 18 },
  { key: 'p', label: 'Celular · 390 px', w: 390, h: 844, r: 30 },
];
const SRV = 'http://127.0.0.1:8765';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function renderDevice(path, dev, extraWait) {
  const f = document.createElement('iframe');
  f.style.cssText = `position:fixed;left:0;top:0;width:${dev.w}px;height:${dev.h}px;border:0;opacity:0.01;pointer-events:none;z-index:-1`;
  f.src = path;
  document.body.appendChild(f);
  await new Promise((r) => (f.onload = r));
  const d = f.contentDocument;
  // esperar a que carguen los datos (sin esqueletos animados)
  for (let i = 0; i < 40; i++) {
    await sleep(500);
    const main = d.querySelector('main');
    // solo importan las imágenes visibles (las de abajo son lazy y no cargan nunca)
    const imgsOk = [...d.images].filter((im) => im.getBoundingClientRect().top < dev.h).every((im) => im.complete);
    if (!d.querySelector('.animate-pulse, .animate-spin') && main && main.innerText.trim().length > 40 && imgsOk) break;
  }
  await d.fonts.ready;
  await sleep(1200 + extraWait);
  d.querySelectorAll('nextjs-portal, [data-nextjs-toast], script').forEach((n) => n.remove());
  const m = await f.contentWindow.eval(`import('${SRV}/dom2svg.js?v=${Date.now()}')`);
  await m.loadImages(d.body);
  const svg = m.deviceSvg(d.body, 0, 0, dev.w, dev.h, dev.key, dev.label);
  f.remove();
  return svg;
}

export async function board(path, name, extraWait = 0) {
  const pad = 40, gap = 56, labelH = 34;
  let x = pad;
  let parts = '';
  let maxH = 0;
  for (const dev of DEVICES) {
    const inner = await renderDevice(path, dev, extraWait);
    const y = pad + labelH;
    parts += `<g id="${dev.label.replace(/[^A-Za-z0-9]+/g, '-')}">`;
    parts += `<text id="etiqueta" x="${x}" y="${pad + 16}" font-family="Nunito" font-size="16" font-weight="800" fill="#5B6275">${dev.label}</text>`;
    parts += `<rect id="sombra" x="${x + 4}" y="${y + 4}" width="${dev.w}" height="${dev.h}" rx="${dev.r}" fill="#0F1A3C"/>`;
    parts += `<clipPath id="clip-${dev.key}"><rect x="${x}" y="${y}" width="${dev.w}" height="${dev.h}" rx="${dev.r}"/></clipPath>`;
    parts += `<g clip-path="url(#clip-${dev.key})">${inner.replace('x="0" y="0"', `x="${x}" y="${y}"`)}</g>`;
    parts += `<rect id="marco" x="${x + 1}" y="${y + 1}" width="${dev.w - 2}" height="${dev.h - 2}" rx="${dev.r - 1}" fill="none" stroke="#0F1A3C" stroke-width="2"/>`;
    parts += '</g>';
    x += dev.w + gap;
    maxH = Math.max(maxH, dev.h);
  }
  const W = x - gap + pad, H = pad + labelH + maxH + pad;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><g id="${name}"><rect id="fondo-tablero" width="${W}" height="${H}" fill="#E9E1CF"/>${parts}</g></svg>`;
  await fetch(`${SRV}/save?name=${encodeURIComponent(name)}.svg`, { method: 'POST', body: svg });
  return { name, kb: Math.round(svg.length / 1024), texts: (svg.match(/<text/g) || []).length };
}

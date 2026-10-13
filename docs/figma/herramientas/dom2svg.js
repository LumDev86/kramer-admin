// Convierte la página ya dibujada en un SVG con capas: rectángulos, textos, íconos e imágenes.
// Pensado para importar en Figma (arrastrar el .svg al lienzo).

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const r2 = (n) => Math.round(n * 100) / 100;
let uid = 0;
const usedIds = new Map();

function layerId(base) {
  const b = (base || 'capa').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40) || 'capa';
  const n = (usedIds.get(b) || 0) + 1;
  usedIds.set(b, n);
  return n === 1 ? b : `${b}_${n}`;
}

function parseColor(c) {
  if (!c) return null;
  const m = c.match(/rgba?\(([^)]+)\)/);
  if (!m) return null;
  const p = m[1].split(/[ ,/]+/).filter(Boolean).map(Number);
  const a = p.length > 3 ? p[3] : 1;
  if (a === 0) return null;
  return { hex: '#' + p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join(''), a };
}
const fillAttr = (c, name = 'fill') => (c ? `${name}="${c.hex}"${c.a < 1 ? ` ${name}-opacity="${r2(c.a)}"` : ''}` : `${name}="none"`);

function radii(cs, w, h) {
  const g = (k) => parseFloat(cs[k]) || 0;
  let r = [g('borderTopLeftRadius'), g('borderTopRightRadius'), g('borderBottomRightRadius'), g('borderBottomLeftRadius')];
  const max = Math.min(w, h) / 2;
  return r.map((v) => Math.min(v, max));
}

function shapeFor(x, y, w, h, r, attrs) {
  if (r.every((v) => v === r[0])) {
    return `<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}"${r[0] ? ` rx="${r2(r[0])}"` : ''} ${attrs}/>`;
  }
  const [tl, tr, br, bl] = r;
  const d = `M${x + tl},${y}H${x + w - tr}${tr ? `A${tr},${tr} 0 0 1 ${x + w},${y + tr}` : ''}V${y + h - br}${br ? `A${br},${br} 0 0 1 ${x + w - br},${y + h}` : ''}H${x + bl}${bl ? `A${bl},${bl} 0 0 1 ${x},${y + h - bl}` : ''}V${y + tl}${tl ? `A${tl},${tl} 0 0 1 ${x + tl},${y}` : ''}Z`;
  return `<path d="${d.replace(/(\d+\.\d{3,})/g, (m) => r2(+m))}" ${attrs}/>`;
}

function parseShadows(s) {
  if (!s || s === 'none') return [];
  const parts = s.split(/,(?![^(]*\))/);
  return parts.map((p) => {
    const color = (p.match(/rgba?\([^)]+\)/) || [])[0];
    const nums = p.replace(/rgba?\([^)]+\)/, '').trim().split(/\s+/).filter((t) => t && t !== 'inset').map(parseFloat);
    return { color: parseColor(color), x: nums[0] || 0, y: nums[1] || 0, blur: nums[2] || 0, spread: nums[3] || 0, inset: /inset/.test(p) };
  }).filter((sh) => sh.color && !sh.inset);
}

const fontMetricsCache = new Map();
const ctx = document.createElement('canvas').getContext('2d');
function metrics(cs) {
  const key = `${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
  if (!fontMetricsCache.has(key)) {
    ctx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    const m = ctx.measureText('Hg');
    fontMetricsCache.set(key, { asc: m.fontBoundingBoxAscent, desc: m.fontBoundingBoxDescent });
  }
  return fontMetricsCache.get(key);
}

function transformText(t, cs) {
  if (cs.textTransform === 'uppercase') return t.toUpperCase();
  if (cs.textTransform === 'lowercase') return t.toLowerCase();
  if (cs.textTransform === 'capitalize') return t.replace(/\b\p{L}/gu, (c) => c.toUpperCase());
  return t;
}

function textAttrs(cs, colorOverride) {
  let fam = cs.fontFamily.split(',')[0].replace(/["']/g, '').trim();
  // next/font renombra las fuentes ("__Nunito_5f3c2a"): volvemos al nombre real para Figma
  const nf = fam.match(/^__(.+?)_(?:Fallback_)?[0-9a-f]{4,}$/i);
  if (nf) fam = nf[1].replace(/_/g, ' ');
  const color = colorOverride || parseColor(cs.color);
  const ls = parseFloat(cs.letterSpacing);
  return `font-family="${esc(fam)}" font-size="${parseFloat(cs.fontSize)}" font-weight="${cs.fontWeight}"${cs.fontStyle === 'italic' ? ' font-style="italic"' : ''}${ls ? ` letter-spacing="${r2(ls)}"` : ''} ${fillAttr(color)}`;
}

// un nodo de texto → una línea <text> por renglón
function textNodeSvg(node, cs) {
  const raw = node.nodeValue;
  if (!raw.trim()) return '';
  const range = document.createRange();
  const tokens = [];
  const re = /\S+/g;
  let m;
  while ((m = re.exec(raw))) {
    range.setStart(node, m.index);
    range.setEnd(node, m.index + m[0].length);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    if (!rects.length) continue;
    if (rects.length === 1) { tokens.push({ text: m[0], rect: rects[0] }); continue; }
    // palabra partida en dos renglones (break-words): la cortamos letra por letra
    let cur = null;
    for (let i = 0; i < m[0].length; i++) {
      range.setStart(node, m.index + i);
      range.setEnd(node, m.index + i + 1);
      const cr = range.getBoundingClientRect();
      if (!cr.width) continue;
      if (cur && Math.abs(cur.rect.top - cr.top) < 3) { cur.text += m[0][i]; cur.rect = { top: cur.rect.top, height: cur.rect.height, left: cur.rect.left, right: cr.right }; }
      else { cur = { text: m[0][i], rect: { top: cr.top, height: cr.height, left: cr.left, right: cr.right } }; tokens.push(cur); }
    }
  }
  if (!tokens.length) return '';
  const lines = [];
  for (const t of tokens) {
    const last = lines[lines.length - 1];
    if (last && Math.abs(last.top - t.rect.top) < 3) { last.tokens.push(t); last.right = t.rect.right; }
    else lines.push({ top: t.rect.top, height: t.rect.height, left: t.rect.left, right: t.rect.right, tokens: [t] });
  }
  const { asc, desc } = metrics(cs);
  const attrs = textAttrs(cs);
  const pre = /pre/.test(cs.whiteSpace);
  return lines.map((ln) => {
    const baseline = ln.top + (ln.height - (asc + desc)) / 2 + asc;
    const txt = transformText(pre ? ln.tokens.map((t) => t.text).join(' ') : ln.tokens.map((t) => t.text).join(' '), cs);
    return `<text id="${layerId(txt.slice(0, 30))}" x="${r2(ln.left)}" y="${r2(baseline)}" ${attrs} xml:space="preserve">${esc(txt)}</text>`;
  }).join('');
}

function inlineSvg(el, rect, cs) {
  const clone = el.cloneNode(true);
  const color = cs.color;
  const pl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
  const pt = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth);
  const pr = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
  const pb = parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
  clone.removeAttribute('style');
  clone.removeAttribute('class');
  clone.removeAttribute('aria-hidden');
  clone.setAttribute('x', r2(rect.left + pl));
  clone.setAttribute('y', r2(rect.top + pt));
  clone.setAttribute('width', r2(rect.width - pl - pr));
  clone.setAttribute('height', r2(rect.height - pt - pb));
  if (!clone.getAttribute('viewBox')) clone.setAttribute('viewBox', `0 0 ${el.getAttribute('width') || 24} ${el.getAttribute('height') || 24}`);
  let s = new XMLSerializer().serializeToString(clone).replace(/ xmlns="[^"]*"/, '');
  const c = parseColor(color);
  s = s.replace(/currentColor/g, c ? c.hex : '#000');
  return s.replace('<svg', `<svg id="${layerId('icono')}"`);
}

function gridLines(el, rect, cs) {
  const bg = cs.backgroundImage;
  if (!/linear-gradient/.test(bg)) return '';
  const col = parseColor((bg.match(/rgba?\([^)]+\)/) || [])[0]);
  const lw = parseFloat((bg.match(/\)\s*([\d.]+)px/) || [])[1]) || 1;
  const size = parseFloat(cs.backgroundSize) || 28;
  let out = '';
  for (let x = rect.left; x < rect.right; x += size) out += `<rect x="${r2(x)}" y="${r2(rect.top)}" width="${lw}" height="${r2(rect.height)}" ${fillAttr(col)}/>`;
  for (let y = rect.top; y < rect.bottom; y += size) out += `<rect x="${r2(rect.left)}" y="${r2(y)}" width="${r2(rect.width)}" height="${lw}" ${fillAttr(col)}/>`;
  return `<g id="${layerId('grilla-mapa')}">${out}</g>`;
}

function borders(rect, cs, r) {
  const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({
    w: parseFloat(cs[`border${s}Width`]) || 0,
    c: parseColor(cs[`border${s}Color`]),
    st: cs[`border${s}Style`],
  }));
  const vis = sides.filter((s) => s.w > 0 && s.c && s.st !== 'none' && s.st !== 'hidden');
  if (!vis.length) return '';
  const dash = (s) => (s.st === 'dashed' ? ` stroke-dasharray="${s.w * 3},${s.w * 2}"` : s.st === 'dotted' ? ` stroke-dasharray="${s.w},${s.w}"` : '');
  const uniform = vis.length === 4 && vis.every((s) => s.w === vis[0].w && s.c.hex === vis[0].c.hex && s.c.a === vis[0].c.a && s.st === vis[0].st);
  if (uniform) {
    const w = vis[0].w;
    return shapeFor(rect.left + w / 2, rect.top + w / 2, rect.width - w, rect.height - w, r.map((v) => Math.max(0, v - w / 2)), `fill="none" ${fillAttr(vis[0].c, 'stroke')} stroke-width="${w}"${dash(vis[0])}`);
  }
  let out = '';
  const [t, rt, b, l] = sides;
  const line = (s, x1, y1, x2, y2) => (s.w > 0 && s.c && s.st !== 'none' ? `<line x1="${r2(x1)}" y1="${r2(y1)}" x2="${r2(x2)}" y2="${r2(y2)}" ${fillAttr(s.c, 'stroke')} stroke-width="${s.w}"${dash(s)}/>` : '');
  out += line(t, rect.left, rect.top + t.w / 2, rect.right, rect.top + t.w / 2);
  out += line(rt, rect.right - rt.w / 2, rect.top, rect.right - rt.w / 2, rect.bottom);
  out += line(b, rect.left, rect.bottom - b.w / 2, rect.right, rect.bottom - b.w / 2);
  out += line(l, rect.left + l.w / 2, rect.top, rect.left + l.w / 2, rect.bottom);
  return out;
}

function fieldText(el, rect, cs) {
  let text = '';
  let color = null;
  if (el.tagName === 'SELECT') text = el.options[el.selectedIndex]?.text || '';
  else if (el.type === 'checkbox' || el.type === 'radio' || el.type === 'range' || el.type === 'hidden') return '';
  else {
    text = el.value;
    if (!text && el.placeholder) {
      text = el.placeholder;
      color = parseColor(getComputedStyle(el, '::placeholder').color);
      const base = parseColor(cs.color);
      // si el navegador no informa el color del placeholder, lo aclaramos a mano
      if (!color || (base && color.hex === base.hex && color.a === base.a)) color = { hex: '#5B6275', a: 0.75 };
    }
  }
  if (!text) return '';
  const { asc, desc } = metrics(cs);
  const pl = parseFloat(cs.paddingLeft) + parseFloat(cs.borderLeftWidth);
  const align = cs.textAlign;
  const pr = parseFloat(cs.paddingRight) + parseFloat(cs.borderRightWidth);
  const baseline = rect.top + (rect.height - (asc + desc)) / 2 + asc;
  let x = rect.left + pl;
  let anchor = '';
  if (align === 'right' || align === 'end') { x = rect.right - pr; anchor = ' text-anchor="end"'; }
  else if (align === 'center') { x = rect.left + rect.width / 2; anchor = ' text-anchor="middle"'; }
  let out = `<text id="${layerId(text.slice(0, 30))}" x="${r2(x)}" y="${r2(baseline)}"${anchor} ${textAttrs(cs, color)} xml:space="preserve">${esc(transformText(text, cs))}</text>`;
  if (el.tagName === 'SELECT' && cs.appearance !== 'none') {
    const cx = rect.right - 14, cy = rect.top + rect.height / 2;
    const c = parseColor(cs.color);
    out += `<path id="${layerId('flecha')}" d="M${r2(cx - 4)},${r2(cy - 2)}L${r2(cx)},${r2(cy + 2)}L${r2(cx + 4)},${r2(cy - 2)}" fill="none" ${fillAttr(c, 'stroke')} stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`;
  }
  return out;
}

const defs = [];
let PFX = '';
let IMAGES = {};

function walk(el) {
  const cs = getComputedStyle(el);
  if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return '';
  const tag = el.tagName;
  if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'TEMPLATE' || tag === 'HEAD') return '';
  const rect = el.getBoundingClientRect();
  const isBox = cs.display !== 'contents';
  // fuera de la pantalla visible: no se ve en el dispositivo, no lo exportamos
  const vw = el.ownerDocument.defaultView;
  if (isBox && rect.height > 0 && (rect.top > vw.innerHeight + 20 || rect.bottom < -20 || rect.left > vw.innerWidth + 20 || rect.right < -20)) return '';
  let own = '';
  let inner = '';

  if (isBox && rect.width > 0 && rect.height > 0) {
    // transformaciones: solo rotaciones (logo); usamos la caja sin rotar
    let box = { left: rect.left, top: rect.top, width: rect.width, height: rect.height, right: rect.right, bottom: rect.bottom };
    let rot = '';
    if (cs.transform && cs.transform !== 'none') {
      const mm = cs.transform.match(/matrix\(([^)]+)\)/);
      if (mm) {
        const [a, b] = mm[1].split(',').map(Number);
        const ang = Math.atan2(b, a) * 180 / Math.PI;
        if (Math.abs(ang) > 0.5) {
          const w = el.offsetWidth, h = el.offsetHeight;
          const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
          box = { left: cx - w / 2, top: cy - h / 2, width: w, height: h, right: cx + w / 2, bottom: cy + h / 2 };
          rot = ` transform="rotate(${r2(ang)} ${r2(cx)} ${r2(cy)})"`;
        }
      }
    }
    const r = radii(cs, box.width, box.height);
    for (const sh of parseShadows(cs.boxShadow)) {
      if (sh.blur === 0) {
        own += shapeFor(box.left + sh.x - sh.spread, box.top + sh.y - sh.spread, box.width + sh.spread * 2, box.height + sh.spread * 2, r, `id="${layerId('sombra')}" ${fillAttr(sh.color)}`);
      } else {
        const fid = `${PFX}f${++uid}`;
        defs.push(`<filter id="${fid}" x="-50%" y="-50%" width="200%" height="200%"><feDropShadow dx="${sh.x}" dy="${sh.y}" stdDeviation="${sh.blur / 2}" flood-color="${sh.color.hex}" flood-opacity="${sh.color.a}"/></filter>`);
        own += shapeFor(box.left, box.top, box.width, box.height, r, `id="${layerId('sombra')}" fill="#ffffff" filter="url(#${fid})"`);
      }
    }
    const bg = parseColor(cs.backgroundColor);
    if (bg) own += shapeFor(box.left, box.top, box.width, box.height, r, `id="${layerId('fondo')}" ${fillAttr(bg)}`);
    own += gridLines(el, box, cs);
    if (tag === 'IMG' && el.currentSrc) {
      const fit = cs.objectFit === 'cover' ? 'xMidYMid slice' : cs.objectFit === 'fill' ? 'none' : 'xMidYMid meet';
      const p = (k) => parseFloat(cs[k]) || 0;
      const ix = box.left + p('paddingLeft') + p('borderLeftWidth'), iy = box.top + p('paddingTop') + p('borderTopWidth');
      const iw = box.width - p('paddingLeft') - p('paddingRight') - p('borderLeftWidth') - p('borderRightWidth');
      const ih = box.height - p('paddingTop') - p('paddingBottom') - p('borderTopWidth') - p('borderBottomWidth');
      own += `<image id="${layerId(el.alt || 'imagen')}" x="${r2(ix)}" y="${r2(iy)}" width="${r2(iw)}" height="${r2(ih)}" preserveAspectRatio="${fit}" xlink:href="${IMAGES[el.currentSrc] || el.currentSrc}"/>`;
    }
    own += borders(box, cs, r);
    if (tag === 'svg') own += inlineSvg(el, box, cs);
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') own += fieldText(el, box, cs);
    if (rot) own = `<g${rot}>${own}</g>`;

    if (tag !== 'svg' && tag !== 'SELECT' && tag !== 'TEXTAREA') {
      for (const ch of el.childNodes) {
        if (ch.nodeType === 3) inner += textNodeSvg(ch, cs);
        else if (ch.nodeType === 1) inner += walk(ch);
      }
    }
    // recorte (overflow) para pantallas con scroll interno y bordes redondeados
    if (inner && cs.overflow !== 'visible' && (cs.overflowX !== 'visible' || cs.overflowY !== 'visible')) {
      const cid = `${PFX}c${++uid}`;
      defs.push(`<clipPath id="${cid}">${shapeFor(box.left, box.top, box.width, box.height, r, '')}</clipPath>`);
      inner = `<g clip-path="url(#${cid})">${inner}</g>`;
    }
  } else {
    for (const ch of el.childNodes) {
      if (ch.nodeType === 3) inner += textNodeSvg(ch, cs);
      else if (ch.nodeType === 1) inner += walk(ch);
    }
  }
  if (!own && !inner) return '';
  const name = el.getAttribute('aria-label') || (typeof el.className === 'string' && el.className.split(' ')[0]) || tag.toLowerCase();
  const op = +cs.opacity < 1 ? ` opacity="${cs.opacity}"` : '';
  return `<g id="${layerId(name)}"${op}>${own}${inner}</g>`;
}

async function toDataUrl(url) {
  if (url.startsWith('data:')) return url;
  try {
    const ctl = new AbortController();
    const to = setTimeout(() => ctl.abort(), 8000);
    const b = await fetch(url, { mode: 'cors', signal: ctl.signal }).then((r) => r.blob());
    clearTimeout(to);
    // achicamos a 320 px de lado mayor: alcanza para 2x de lo que se ve en pantalla
    const bmp = await createImageBitmap(b);
    const k = Math.min(1, 320 / Math.max(bmp.width, bmp.height));
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * k); cv.height = Math.round(bmp.height * k);
    cv.getContext('2d').drawImage(bmp, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/png');
  } catch { return url; }
}

// imágenes como data: para que Figma no tenga que bajarlas
export async function loadImages(root) {
  const vh = root.ownerDocument.defaultView.innerHeight;
  const urls = [...new Set([...root.querySelectorAll('img')].filter((i) => i.complete && i.getBoundingClientRect().top < vh).map((i) => i.currentSrc).filter(Boolean))];
  for (const u of urls) if (!IMAGES[u]) IMAGES[u] = await toDataUrl(u);
}

export function resetIds() { uid = 0; usedIds.clear(); }

// contenido de un dispositivo, para anidar dentro de un tablero
export function deviceSvg(root, x, y, w, h, prefix, name) {
  PFX = prefix; defs.length = 0;
  const bodyBg = parseColor(getComputedStyle(root.ownerDocument.body).backgroundColor) || parseColor(getComputedStyle(root.ownerDocument.documentElement).backgroundColor) || { hex: '#ffffff', a: 1 };
  const content = walk(root);
  return `<svg id="${layerId(name)}" x="${x}" y="${y}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs.join('')}</defs><rect id="fondo-pantalla" width="${w}" height="${h}" ${fillAttr(bodyBg)}/>${content}</svg>`;
}

export function toSvg(root, w, h, title) {
  resetIds(); defs.length = 0; PFX = '';
  const bodyBg = parseColor(getComputedStyle(document.body).backgroundColor) || { hex: '#ffffff', a: 1 };
  const content = walk(root);
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs.join('')}</defs><g id="${layerId(title)}"><rect id="fondo-pagina" width="${w}" height="${h}" ${fillAttr(bodyBg)}/>${content}</g></svg>`;
}

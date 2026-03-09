/**
 * notas5 — app principal
 *
 * Interfaz neubrutalist para explorar notas personales en markdown.
 * Escritorio con carpetas de colores → ventana tipo Finder con 3 vistas:
 *   - grid:    tarjetas masonry con título, preview y fecha
 *   - lista:   filas compactas con día, fecha y hora
 *   - lectura: scroll continuo con todas las notas renderizadas
 *
 * Las notas se importan de notas.js (generado por generar_notas_js.py).
 */

import { categorias } from './notas.js';

// ── DOM refs ──

const carpetasDiv = document.getElementById('carpetas');
const ventana = document.getElementById('ventana');
const ventanaTitlebar = document.getElementById('ventana-titlebar');
const ventanaTitulo = document.getElementById('ventana-titulo');
const ventanaCount = document.getElementById('ventana-count');
const ventanaContenido = document.getElementById('ventana-contenido');
const cerrarBtn = document.getElementById('ventana-cerrar');
const buscador = document.getElementById('buscar');
const btnCycle = document.getElementById('btn-vista-cycle');
const btnZoomIn = document.getElementById('btn-zoom-in');
const btnZoomOut = document.getElementById('btn-zoom-out');
const sneakPeek = document.getElementById('sneak-peek');
const sneakPeekTitulo = document.getElementById('sneak-peek-titulo');
const sneakPeekFecha = document.getElementById('sneak-peek-fecha');

// modal de contraseña (sanchai)
const modalPass = document.getElementById('modal-pass');
const modalPassInput = document.getElementById('modal-pass-input');
const modalPassBtn = document.getElementById('modal-pass-btn');
const modalPassError = document.getElementById('modal-pass-error');
const modalPassBox = document.querySelector('.modal-pass-box');

// iconos dentro del botón cycle
const iconGrid = btnCycle.querySelector('.icon-grid');
const iconLista = btnCycle.querySelector('.icon-lista');
const iconLectura = btnCycle.querySelector('.icon-lectura');

// ── estado ──

let categoriaActual = null;
let vistaActual = 'grid';
let zoomLevel = 1;       // CSS zoom: 1 = 100%
const ZOOM_STEP = 0.15;
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;
const vistas = ['grid', 'lista', 'lectura'];

// colores por categoría — fuente única de verdad, también se inyectan
// como CSS custom property --cat-color en cada carpeta del escritorio
const catColors = {
  diario:          '#ff6b6b',
  thincc:          '#748ffc',
  comentarios:     '#69db7c',
  'sueños':        '#d0bfff',
  ideas:           '#ffd43b',
  historias:       '#f783ac',
  doctorat:        '#66d9e8',
  'somos normales':'#ffa94d',
  main:            '#a9e34b',
  misc:            '#dee2e6',
  sueltas:         '#e8d5b7',
  sanchai:         '#e599f7',
  apuntes:         '#99e9f2',
  demos:           '#ffc078',
};

// cache de archivos .md ya descargados (archivo → texto)
// evita re-fetch al cambiar de vista o buscar en lectura
const mdCache = new Map();

// ── búsqueda y highlight ──

// quita acentos: "así" → "asi", "sueños" → "suenos"
function strip(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getQuery() {
  return buscador.value.toLowerCase().trim();
}

// construye un regex que matchea cada letra con o sin acento
// "asi" matchea "así", "cafe" matchea "café", etc.
function accentRegex(query) {
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  // para cada carácter ASCII que tiene variantes acentuadas,
  // reemplazar por una clase de caracteres que incluya todas las variantes
  const flexed = strip(escaped).replace(/a/g, '[aáàäâã]')
    .replace(/e/g, '[eéèëê]')
    .replace(/i/g, '[iíìïî]')
    .replace(/o/g, '[oóòöôõ]')
    .replace(/u/g, '[uúùüû]')
    .replace(/n/g, '[nñ]');
  return new RegExp(`(${flexed})`, 'gi');
}

// highlight para texto plano (títulos, previews en grid/lista)
function highlightText(text, query) {
  if (!query) return text;
  return text.replace(accentRegex(query), '<mark class="highlight">$1</mark>');
}

// highlight para HTML renderizado (lectura) — solo reemplaza en
// segmentos de texto, nunca dentro de tags HTML
function highlightHtml(html, query) {
  if (!query) return html;
  const re = accentRegex(query);
  return html.replace(/(<[^>]+>)|([^<]+)/g, (match, tag, text) => {
    if (tag) return tag;
    return text.replace(re, '<mark class="highlight">$1</mark>');
  });
}

// filtra notas de la categoría actual por el texto de búsqueda
function notasFiltradas() {
  const notas = categorias[categoriaActual] || [];
  const q = getQuery();
  if (!q) return notas;
  const qNorm = strip(q);
  return notas.filter(n =>
    strip((n.titulo || '').toLowerCase()).includes(qNorm) ||
    strip((n.preview || '').toLowerCase()).includes(qNorm)
  );
}

// debounce en búsqueda: 300ms en lectura (evita re-fetch), 50ms en grid/lista
let searchTimer = null;
buscador.addEventListener('input', () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(renderVista, vistaActual === 'lectura' ? 300 : 50);
});

// ── markdown básico → HTML ──
// soporta: h1-h3, bold, italic, imágenes, links, párrafos
// las rutas relativas de imágenes se resuelven desde la carpeta de la nota
function mdToHtml(md, archivo) {
  const base = archivo.includes('/')
    ? 'notas/' + archivo.substring(0, archivo.lastIndexOf('/') + 1)
    : 'notas/';
  return md
    .replace(/^#{1,6}\s*$/gm, '')                     // quitar # sueltos
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, src) => {
      const fullSrc = src.startsWith('http') ? src : base + src;
      return `<img src="${fullSrc}" alt="${alt}">`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+\.(mp4|mov|webm))\)/gi, (_, label, src) => {
      const fullSrc = src.startsWith('http') ? src : base + src;
      return `<video src="${fullSrc}" controls playsinline preload="metadata" style="max-width:100%"></video>`;
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// ── escritorio (home) ──
// genera las carpetas de colores, ordenadas por cantidad de notas
function construirEscritorio() {
  carpetasDiv.innerHTML = '';
  const cats = Object.entries(categorias).sort((a, b) => b[1].length - a[1].length);

  let idx = 0;
  for (const [nombre, notas] of cats) {
    if (notas.length === 0) continue;

    const carpeta = document.createElement('div');
    carpeta.className = 'carpeta';
    carpeta.dataset.cat = nombre;
    carpeta.style.setProperty('--cat-color', catColors[nombre] || '#dee2e6');
    carpeta.style.setProperty('--i', idx++);

    carpeta.innerHTML = `
      <span class="carpeta-nombre">${nombre}</span>
      <span class="carpeta-count">${notas.length}</span>
    `;
    carpeta.addEventListener('click', () => {
      if (nombre === 'sanchai' && !sanchiDesbloqueado) {
        mostrarModalPass();
      } else {
        abrirCarpeta(nombre);
      }
    });
    carpetasDiv.appendChild(carpeta);
  }
}

// ── contraseña sanchai ──

let sanchiDesbloqueado = false;
const SANCHAI_HASH = 'wushu';

function mostrarModalPass() {
  modalPass.classList.remove('hidden');
  modalPassInput.value = '';
  modalPassError.textContent = '';
  modalPassInput.focus();
}

function cerrarModalPass() {
  modalPass.classList.add('hidden');
  modalPassInput.value = '';
  modalPassError.textContent = '';
}

function intentarPass() {
  if (modalPassInput.value === SANCHAI_HASH) {
    sanchiDesbloqueado = true;
    cerrarModalPass();
    abrirCarpeta('sanchai');
  } else {
    modalPassError.textContent = 'nope';
    modalPassBox.classList.remove('shake');
    void modalPassBox.offsetWidth; // force reflow para re-trigger animación
    modalPassBox.classList.add('shake');
    modalPassInput.value = '';
    modalPassInput.focus();
  }
}

modalPassBtn.addEventListener('click', intentarPass);
modalPassInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') intentarPass();
  if (e.key === 'Escape') cerrarModalPass();
});
modalPass.addEventListener('click', (e) => {
  if (e.target === modalPass) cerrarModalPass();
});

// ── ventana (abrir / cerrar) ──

function abrirCarpeta(nombre) {
  categoriaActual = nombre;
  zoomLevel = 1;
  applyZoom();
  ventanaTitulo.textContent = nombre;
  ventanaCount.textContent = `${categorias[nombre].length} notas`;
  ventanaTitlebar.style.background = catColors[nombre] || '#dee2e6';
  ventana.classList.remove('hidden');
  buscador.value = '';
  renderVista();
}

function cerrar() {
  if (ventana.classList.contains('closing') || ventana.classList.contains('hidden')) return;
  ventana.classList.add('closing');
  ventana.addEventListener('animationend', () => {
    ventana.classList.add('hidden');
    ventana.classList.remove('closing');
    sneakPeek.style.display = 'none';
    categoriaActual = null;
  }, { once: true });
}

cerrarBtn.addEventListener('click', cerrar);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrar();
});

// ── cambio de vista (cycle) ──

function updateVistaIcon() {
  iconGrid.classList.toggle('active', vistaActual === 'grid');
  iconLista.classList.toggle('active', vistaActual === 'lista');
  iconLectura.classList.toggle('active', vistaActual === 'lectura');
}

function setVista(v) {
  vistaActual = v;
  updateVistaIcon();
  sneakPeek.style.display = v === 'lectura' ? 'flex' : 'none';
  renderVista();
}

// click en el icono cycle → avanza a la siguiente vista
btnCycle.addEventListener('click', () => {
  const idx = vistas.indexOf(vistaActual);
  setVista(vistas[(idx + 1) % vistas.length]);
});

// ── zoom ──
// aplica CSS zoom al contenido — escala toda la UI uniformemente

function applyZoom() {
  ventanaContenido.style.zoom = zoomLevel;
}

btnZoomIn.addEventListener('click', () => {
  zoomLevel = Math.min(ZOOM_MAX, +(zoomLevel + ZOOM_STEP).toFixed(2));
  applyZoom();
});

btnZoomOut.addEventListener('click', () => {
  zoomLevel = Math.max(ZOOM_MIN, +(zoomLevel - ZOOM_STEP).toFixed(2));
  applyZoom();
});

// ── render dispatcher ──

function renderVista() {
  if (!categoriaActual) return;
  const notas = notasFiltradas();
  if (vistaActual === 'grid') renderGrid(notas);
  else if (vistaActual === 'lista') renderLista(notas);
  else if (vistaActual === 'lectura') return renderLectura(notas);
}

// navegar a una nota concreta: cambia a lectura y hace scroll hasta ella.
// usa polling porque renderLectura es async (fetch de archivos .md)
async function irANota(archivo) {
  setVista('lectura');
  await new Promise(r => setTimeout(r, 0));
  for (let i = 0; i < 20; i++) {
    const el = ventanaContenido.querySelector(`[data-archivo="${CSS.escape(archivo)}"]`);
    if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
    await new Promise(r => setTimeout(r, 100));
  }
}

// ── badges ──
// genera HTML con badges compactos para cada tipo aplicable a una nota.
// una nota puede tener varios badges a la vez (ej. LNK + IMG + AUD)
function badgeIcons(nota) {
  let html = '';
  if (nota.links) html += '<span class="badge-tag">LNK</span>';
  if (nota.img) html += '<span class="badge-tag">IMG</span>';
  if (nota.video) html += '<span class="badge-tag">VID</span>';
  if (nota.audio) html += '<span class="badge-tag">AUD</span>';
  return html;
}

// ── vista grid ──
// tarjetas masonry con título, preview y mordisco de fecha abajo a la derecha.
// badges de tipo (LNK/IMG/VID) como mini icons junto a la fecha.
function renderGrid(notas) {
  const container = document.createElement('div');
  container.className = 'vista-grid';
  const q = getQuery();

  notas.forEach(nota => {
    const item = document.createElement('div');
    item.className = 'grid-item';
    item.style.setProperty('--grid-accent', catColors[categoriaActual] || '#dee2e6');

    const tituloHtml = highlightText(nota.titulo || nota.archivo, q);
    const previewHtml = nota.preview ? highlightText(nota.preview, q) : '';

    item.innerHTML = `
      <span class="grid-item-nombre">${tituloHtml}</span>
      ${previewHtml ? `<div class="grid-item-preview">${previewHtml}</div>` : ''}
      <div class="grid-item-footer">
        ${badgeIcons(nota)}
        <span class="grid-item-fecha">${nota.fecha || ''}</span>
      </div>
    `;

    item.addEventListener('click', () => irANota(nota.archivo));
    container.appendChild(item);
  });

  ventanaContenido.innerHTML = '';
  ventanaContenido.appendChild(container);
}

// ── vista lista ──
// filas compactas tipo Finder: badges + nombre + día + fecha + hora.
// muestra todos los badges aplicables (no solo uno).
function renderLista(notas) {
  const container = document.createElement('div');
  container.className = 'vista-lista';
  const q = getQuery();

  notas.forEach(nota => {
    const item = document.createElement('div');
    item.className = 'lista-item';

    const nombreHtml = highlightText(nota.titulo || nota.archivo, q);
    const badges = badgeIcons(nota);

    item.innerHTML = `
      <span class="lista-badges">${badges}</span>
      <span class="lista-nombre">${nombreHtml}</span>
      <span class="lista-dia">${nota.dia || ''}</span>
      <span class="lista-fecha">${nota.fecha ? nota.fecha.slice(0, -3) : ''}<span class="lista-fecha-year">${nota.fecha ? nota.fecha.slice(-3) : ''}</span></span>
      <span class="lista-hora">${nota.hora || ''}</span>
    `;

    item.addEventListener('click', () => irANota(nota.archivo));
    container.appendChild(item);
  });

  ventanaContenido.innerHTML = '';
  ventanaContenido.appendChild(container);
}

// ── vista lectura continua ──
// carga todos los .md en paralelo (con cache), los renderiza como HTML
// y los presenta en scroll continuo. la barra sneak-peek se actualiza
// con el título y fecha de la nota visible al hacer scroll.
async function renderLectura(notas) {
  const container = document.createElement('div');
  container.className = 'vista-lectura';
  const q = getQuery();

  const promises = notas.map(async (nota) => {
    try {
      if (!mdCache.has(nota.archivo)) {
        const res = await fetch(encodeURI(`notas/${nota.archivo}`));
        if (!res.ok) return { nota, html: '<p>No se pudo cargar.</p>' };
        mdCache.set(nota.archivo, await res.text());
      }
      let html = mdToHtml(mdCache.get(nota.archivo), nota.archivo);
      if (q) html = highlightHtml(html, q);
      return { nota, html };
    } catch {
      return { nota, html: '<p>No se pudo cargar.</p>' };
    }
  });

  const resultados = await Promise.all(promises);

  resultados.forEach(({ nota, html }) => {
    const div = document.createElement('div');
    div.className = 'lectura-nota';
    div.dataset.archivo = nota.archivo;

    div.innerHTML = `
      <div class="lectura-meta">
        <span>${nota.dia || ''} ${nota.fecha || ''}</span>
        <span>${nota.hora || ''}</span>
        <span>${categoriaActual}</span>
      </div>
      <div class="lectura-texto">${html}</div>
    `;

    container.appendChild(div);
  });

  ventanaContenido.innerHTML = '';
  ventanaContenido.appendChild(container);
  ventanaContenido.scrollTop = 0;
}

// ── sneak peek ──
// barra inferior en lectura que muestra título y fecha de la nota
// que está en el centro del viewport mientras haces scroll
ventanaContenido.addEventListener('scroll', () => {
  if (vistaActual !== 'lectura') return;

  const notas = ventanaContenido.querySelectorAll('.lectura-nota');
  const scrollTop = ventanaContenido.scrollTop + ventanaContenido.clientHeight / 2;

  let current = null;
  for (const nota of notas) {
    if (nota.offsetTop <= scrollTop) {
      current = nota;
    } else {
      break;
    }
  }

  if (current) {
    const titulo = current.querySelector('.lectura-texto h1')?.textContent
      || current.querySelector('.lectura-texto p')?.textContent?.substring(0, 60)
      || '';
    const meta = current.querySelector('.lectura-meta')?.textContent || '';
    sneakPeekTitulo.textContent = titulo;
    sneakPeekFecha.textContent = meta.trim();
  }
});

// ── init ──
updateVistaIcon();
construirEscritorio();

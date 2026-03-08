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
const btnGrid = document.getElementById('btn-vista-grid');
const btnLista = document.getElementById('btn-vista-lista');
const btnLectura = document.getElementById('btn-vista-lectura');
const sneakPeek = document.getElementById('sneak-peek');
const sneakPeekTitulo = document.getElementById('sneak-peek-titulo');
const sneakPeekFecha = document.getElementById('sneak-peek-fecha');

// ── estado ──

let categoriaActual = null;
let vistaActual = 'grid';

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
};

// cache de archivos .md ya descargados (archivo → texto)
// evita re-fetch al cambiar de vista o buscar en lectura
const mdCache = new Map();

// ── búsqueda y highlight ──

function getQuery() {
  return buscador.value.toLowerCase().trim();
}

// highlight para texto plano (títulos, previews en grid/lista)
function highlightText(text, query) {
  if (!query) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
  return text.replace(re, '<mark class="highlight">$1</mark>');
}

// highlight para HTML renderizado (lectura) — solo reemplaza en
// segmentos de texto, nunca dentro de tags HTML
function highlightHtml(html, query) {
  if (!query) return html;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`(${escaped})`, 'gi');
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
  return notas.filter(n =>
    (n.titulo || '').toLowerCase().includes(q) ||
    (n.preview || '').toLowerCase().includes(q)
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

  for (const [nombre, notas] of cats) {
    if (notas.length === 0) continue;

    const carpeta = document.createElement('div');
    carpeta.className = 'carpeta';
    carpeta.dataset.cat = nombre;
    carpeta.style.setProperty('--cat-color', catColors[nombre] || '#dee2e6');

    carpeta.innerHTML = `
      <span class="carpeta-nombre">${nombre}</span>
      <span class="carpeta-count">${notas.length} notas</span>
    `;

    carpeta.addEventListener('click', () => abrirCarpeta(nombre));
    carpetasDiv.appendChild(carpeta);
  }
}

// ── ventana (abrir / cerrar) ──

function abrirCarpeta(nombre) {
  categoriaActual = nombre;
  ventanaTitulo.textContent = nombre;
  ventanaCount.textContent = `${categorias[nombre].length} notas`;
  ventanaTitlebar.style.background = catColors[nombre] || '#dee2e6';
  ventana.classList.remove('hidden');
  buscador.value = '';
  renderVista();
}

function cerrar() {
  ventana.classList.add('hidden');
  sneakPeek.style.display = 'none';
  categoriaActual = null;
}

cerrarBtn.addEventListener('click', cerrar);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') cerrar();
});

// ── cambio de vista ──

function setVista(v) {
  vistaActual = v;
  [btnGrid, btnLista, btnLectura].forEach(b => b.classList.remove('active'));
  if (v === 'grid') btnGrid.classList.add('active');
  if (v === 'lista') btnLista.classList.add('active');
  if (v === 'lectura') btnLectura.classList.add('active');
  sneakPeek.style.display = v === 'lectura' ? 'flex' : 'none';
  renderVista();
}

btnGrid.addEventListener('click', () => setVista('grid'));
btnLista.addEventListener('click', () => setVista('lista'));
btnLectura.addEventListener('click', () => setVista('lectura'));

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

// ── vista grid ──
// tarjetas masonry con título, preview y mordisco de fecha abajo a la derecha.
// si la nota tiene imágenes o vídeo, aparece un badge (IMG/VID) junto a la fecha.
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

    let mediaBadgeHtml = '';
    if (nota.media === 'img') mediaBadgeHtml = '<span class="grid-item-media">IMG</span>';
    else if (nota.media === 'video') mediaBadgeHtml = '<span class="grid-item-media">VID</span>';

    item.innerHTML = `
      <span class="grid-item-nombre">${tituloHtml}</span>
      ${previewHtml ? `<div class="grid-item-preview">${previewHtml}</div>` : ''}
      <div class="grid-item-footer">
        ${mediaBadgeHtml}
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
// filas compactas tipo Finder: icono de tipo, nombre, día, fecha y hora.
function renderLista(notas) {
  const container = document.createElement('div');
  container.className = 'vista-lista';
  const q = getQuery();

  notas.forEach(nota => {
    const item = document.createElement('div');
    item.className = 'lista-item';

    const icono = nota.media === 'video' ? 'VID' : nota.media === 'img' ? 'IMG' : 'TXT';
    const nombreHtml = highlightText(nota.titulo || nota.archivo, q);

    item.innerHTML = `
      <span class="lista-icono">${icono}</span>
      <span class="lista-nombre">${nombreHtml}</span>
      <span class="lista-dia">${nota.dia || ''}</span>
      <span class="lista-fecha">${nota.fecha || ''}</span>
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
        const res = await fetch(`notas/${nota.archivo}`);
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
construirEscritorio();

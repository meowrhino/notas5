import { categorias } from './notas.js';

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

let categoriaActual = null;
let vistaActual = 'grid';

// colores por categoría
const catColors = {
  diario:          '#ff6b6b',
  thincc:          '#748ffc',
  comentarios:     '#69db7c',
  'sueños':        '#b197fc',
  ideas:           '#ffd43b',
  historias:       '#f783ac',
  doctorat:        '#66d9e8',
  'somos normales':'#ffa94d',
  main:            '#a9e34b',
  misc:            '#dee2e6',
  sueltas:         '#e8d5b7',
};

// ── markdown básico → HTML ──
function mdToHtml(md, archivo) {
  const base = archivo.includes('/') ? 'notas/' + archivo.substring(0, archivo.lastIndexOf('/') + 1) : 'notas/';
  return md
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

// ── construir escritorio ──
function construirEscritorio() {
  carpetasDiv.innerHTML = '';
  const cats = Object.entries(categorias).sort((a, b) => b[1].length - a[1].length);

  for (const [nombre, notas] of cats) {
    if (notas.length === 0) continue;

    const carpeta = document.createElement('div');
    carpeta.className = 'carpeta';
    carpeta.dataset.cat = nombre;

    carpeta.innerHTML = `
      <span class="carpeta-nombre">${nombre}</span>
      <span class="carpeta-count">${notas.length}</span>
    `;

    carpeta.addEventListener('click', () => abrirCarpeta(nombre));
    carpetasDiv.appendChild(carpeta);
  }
}

// ── abrir carpeta ──
function abrirCarpeta(nombre) {
  categoriaActual = nombre;
  ventanaTitulo.textContent = nombre;
  ventanaCount.textContent = `${categorias[nombre].length} notas`;
  ventanaTitlebar.style.background = catColors[nombre] || '#dee2e6';
  ventana.classList.remove('hidden');
  buscador.value = '';
  renderVista();
}

// ── cerrar ventana ──
function cerrar() {
  ventana.classList.add('hidden');
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
  renderVista();
}

btnGrid.addEventListener('click', () => setVista('grid'));
btnLista.addEventListener('click', () => setVista('lista'));
btnLectura.addEventListener('click', () => setVista('lectura'));

// ── filtrar notas ──
function notasFiltradas() {
  const notas = categorias[categoriaActual] || [];
  const q = buscador.value.toLowerCase().trim();
  if (!q) return notas;
  return notas.filter(n =>
    (n.titulo || '').toLowerCase().includes(q) ||
    (n.preview || '').toLowerCase().includes(q)
  );
}

buscador.addEventListener('input', () => renderVista());

// ── render ──
function renderVista() {
  if (!categoriaActual) return;
  const notas = notasFiltradas();
  if (vistaActual === 'grid') renderGrid(notas);
  else if (vistaActual === 'lista') renderLista(notas);
  else if (vistaActual === 'lectura') renderLectura(notas);
}

// ── vista grid ──
function renderGrid(notas) {
  const container = document.createElement('div');
  container.className = 'vista-grid';

  notas.forEach(nota => {
    const item = document.createElement('div');
    item.className = 'grid-item';

    let mediaBadge = '';
    if (nota.media === 'img') mediaBadge = '<span class="media-badge">IMG</span>';
    if (nota.media === 'video') mediaBadge = '<span class="media-badge">VID</span>';

    item.innerHTML = `
      <span class="grid-item-nombre">${nota.titulo || nota.archivo}</span>
      <span class="grid-item-fecha">${nota.fecha || ''}</span>
      ${nota.preview ? `<div class="grid-item-preview">${nota.preview}</div>` : ''}
      ${mediaBadge}
    `;

    item.addEventListener('click', () => {
      setVista('lectura');
      setTimeout(() => {
        const el = ventanaContenido.querySelector(`[data-archivo="${CSS.escape(nota.archivo)}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    });

    container.appendChild(item);
  });

  ventanaContenido.innerHTML = '';
  ventanaContenido.appendChild(container);
}

// ── vista lista ──
function renderLista(notas) {
  const container = document.createElement('div');
  container.className = 'vista-lista';

  notas.forEach(nota => {
    const item = document.createElement('div');
    item.className = 'lista-item';

    const icono = nota.media === 'video' ? 'VID' : nota.media === 'img' ? 'IMG' : 'TXT';

    item.innerHTML = `
      <span class="lista-icono">${icono}</span>
      <span class="lista-nombre">${nota.titulo || nota.archivo}</span>
      <span class="lista-fecha">${nota.fecha || ''}</span>
    `;

    item.addEventListener('click', () => {
      setVista('lectura');
      setTimeout(() => {
        const el = ventanaContenido.querySelector(`[data-archivo="${CSS.escape(nota.archivo)}"]`);
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    });

    container.appendChild(item);
  });

  ventanaContenido.innerHTML = '';
  ventanaContenido.appendChild(container);
}

// ── vista lectura continua ──
async function renderLectura(notas) {
  const container = document.createElement('div');
  container.className = 'vista-lectura';

  const promises = notas.map(async (nota) => {
    try {
      const res = await fetch(`notas/${nota.archivo}`);
      if (!res.ok) return { nota, html: '<p>No se pudo cargar.</p>' };
      const md = await res.text();
      return { nota, html: mdToHtml(md, nota.archivo) };
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
        <span>${nota.fecha || ''}</span>
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

// ── init ──
construirEscritorio();

import { categorias } from './notas.js';

const estanteria = document.getElementById('estanteria');
const overlay = document.getElementById('overlay');
const popup = document.getElementById('popup-contenido');
const cerrarBtn = document.getElementById('cerrar-popup');
const buscador = document.getElementById('buscar');

// colores por categoría (fallback para las que no estén definidas)
const colores = {
  diario:          'cat-diario',
  thincc:          'cat-thincc',
  comentarios:     'cat-comentarios',
  sueños:          'cat-sueños',
  ideas:           'cat-ideas',
  historias:       'cat-historias',
  doctorat:        'cat-doctorat',
  'somos normales':'cat-somos-normales',
  main:            'cat-main',
  misc:            'cat-misc',
  sueltas:         'cat-sueltas',
};

// alturas pseudo-aleatorias para los lomos
const alturas = ['h1','h2','h3','h4','h5'];
function alturaRandom(i) {
  // mezclar un poco más con hash simple
  return alturas[(i * 7 + 3) % alturas.length];
}

// ── markdown básico → HTML ──
function mdToHtml(md) {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="notas/$2" alt="$1">')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>')
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>');
}

// ── construir estantería ──
function construir() {
  estanteria.innerHTML = '';

  for (const [nombre, notas] of Object.entries(categorias)) {
    if (notas.length === 0) continue;

    const balda = document.createElement('div');
    balda.className = 'balda';
    balda.dataset.categoria = nombre;

    // header
    balda.innerHTML = `
      <div class="balda-header">
        <span class="balda-nombre">${nombre}</span>
        <span class="balda-count">${notas.length}</span>
      </div>
    `;

    // libros wrapper (para flechas)
    const wrapper = document.createElement('div');
    wrapper.className = 'libros-wrapper';

    const libros = document.createElement('div');
    libros.className = 'libros';

    notas.forEach((nota, i) => {
      const colorClass = colores[nombre] || 'cat-sueltas';
      const libro = document.createElement('div');
      libro.className = `libro ${colorClass} ${alturaRandom(i)}`;
      libro.dataset.archivo = nota.archivo;
      libro.dataset.categoria = nombre;

      // titulo en el lomo
      const titulo = document.createElement('span');
      titulo.className = 'libro-titulo';
      titulo.textContent = nota.titulo || nota.archivo.replace('.md','');
      libro.appendChild(titulo);

      // icono si tiene media
      if (nota.media) {
        const media = document.createElement('span');
        media.className = 'libro-media';
        media.textContent = nota.media === 'video' ? '▶' : '◻';
        libro.appendChild(media);
      }

      // preview tooltip
      const preview = document.createElement('div');
      preview.className = 'libro-preview';
      preview.innerHTML = `
        <div class="libro-preview-fecha">${nota.fecha || ''}</div>
        <div class="libro-preview-texto">${nota.preview || ''}</div>
      `;
      libro.appendChild(preview);

      // click → abrir
      libro.addEventListener('click', () => abrirNota(nota, nombre));

      libros.appendChild(libro);
    });

    wrapper.appendChild(libros);

    // flechas scroll
    const flechaIzq = document.createElement('div');
    flechaIzq.className = 'scroll-arrow izq';
    flechaIzq.textContent = '‹';
    flechaIzq.addEventListener('click', () => {
      libros.scrollBy({ left: -200, behavior: 'smooth' });
    });

    const flechaDer = document.createElement('div');
    flechaDer.className = 'scroll-arrow der';
    flechaDer.textContent = '›';
    flechaDer.addEventListener('click', () => {
      libros.scrollBy({ left: 200, behavior: 'smooth' });
    });

    wrapper.appendChild(flechaIzq);
    wrapper.appendChild(flechaDer);

    // madera
    const madera = document.createElement('div');
    madera.className = 'madera';

    balda.appendChild(wrapper);
    balda.appendChild(madera);
    estanteria.appendChild(balda);
  }
}

// ── abrir nota en popup ──
async function abrirNota(nota, categoria) {
  overlay.classList.remove('hidden');
  popup.innerHTML = '<p style="color:#aaa">cargando…</p>';

  try {
    const res = await fetch(`notas/${nota.archivo}`);
    if (!res.ok) throw new Error('No encontrada');
    const md = await res.text();
    popup.innerHTML = mdToHtml(md);
  } catch (e) {
    popup.innerHTML = `<p>No se pudo cargar la nota.</p>`;
  }
}

// ── cerrar popup ──
cerrarBtn.addEventListener('click', () => overlay.classList.add('hidden'));
overlay.addEventListener('click', (e) => {
  if (e.target === overlay) overlay.classList.add('hidden');
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') overlay.classList.add('hidden');
});

// ── buscar ──
buscador.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  document.querySelectorAll('.libro').forEach(libro => {
    const titulo = libro.querySelector('.libro-titulo')?.textContent.toLowerCase() || '';
    const preview = libro.querySelector('.libro-preview-texto')?.textContent.toLowerCase() || '';
    const visible = !q || titulo.includes(q) || preview.includes(q);
    libro.style.display = visible ? '' : 'none';
  });
});

// ── init ──
construir();

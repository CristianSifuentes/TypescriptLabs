/**
 * Generador de TypeScript Atlas.
 *
 * Fuentes únicas de verdad:
 *   data/versiones.csv         una fila por versión menor (fechas reales de npm)
 *   data/caracteristicas.csv   una fila por característica del lenguaje o del compilador
 *   data/verificacion.json     informe que escribe tools/verificar-ejemplos.ts
 *
 * Salidas:
 *   docs/22-catalogo-a-z.md
 *   assets/ts-atlas-banner.svg
 *   assets/ts-atlas-tabla-periodica-{oscuro,claro}.svg
 *   assets/ts-atlas-linea-de-tiempo-{oscuro,claro}.svg
 *   bloques marcados con <!-- atlas:inicio X --> … <!-- atlas:fin X --> en README.md y docs/
 *
 * Uso:  node tools/generar-atlas.ts      (Node 22.18 o posterior, sin dependencias)
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CORTE, EDICION, RAIZ, clave, cmp, escaparXml as x, fechaCorta, fechaLarga, leerCsv, leerVersiones, mesAnio, sinTildes } from './comun.ts';
import type { Version } from './comun.ts';

// --------------------------------------------------------------------------- datos

interface Caracteristica {
  id: string;
  nombre: string;
  version: string;
  familia: string;
  clase: string;
  estado: string;
  fin: string;
  ecma: string;
  descripcion: string;
  simbolo: string;
  etiqueta: string;
  poster: string;
}

/**
 * Ocho familias, ocho matices: el orden es el de la paleta categórica validada
 * (separación para daltonismo comprobada con el validador, en claro y en oscuro).
 * Cada familia tiene además un glifo propio: la identidad nunca depende solo del color.
 */
const FAMILIAS = [
  { clave: 'tipos', nombre: 'Tipos y datos', claro: '#2a78d6', oscuro: '#3987e5', glifo: 'circulo' },
  { clave: 'nivel', nombre: 'Genéricos y nivel de tipos', claro: '#eb6834', oscuro: '#d95926', glifo: 'cuadrado' },
  { clave: 'flujo', nombre: 'Flujo y estrictez', claro: '#1baf7a', oscuro: '#199e70', glifo: 'triangulo' },
  { clave: 'clases', nombre: 'Clases y decoradores', claro: '#eda100', oscuro: '#c98500', glifo: 'rombo' },
  { clave: 'modulos', nombre: 'Módulos', claro: '#e87ba4', oscuro: '#d55181', glifo: 'hexagono' },
  { clave: 'ecma', nombre: 'Sintaxis y API de ECMAScript', claro: '#008300', oscuro: '#008300', glifo: 'cruz' },
  { clave: 'compilador', nombre: 'Compilador y proyecto', claro: '#6250d6', oscuro: '#9085e9', glifo: 'trianguloInvertido' },
  { clave: 'editor', nombre: 'JavaScript, JSX y editor', claro: '#e34948', oscuro: '#e66767', glifo: 'estrella' },
] as const;
type ClaveFamilia = (typeof FAMILIAS)[number]['clave'];
const FAMILIA = new Map(FAMILIAS.map((f) => [f.clave as string, f]));

const CLASES: Record<string, { nombre: string; explicacion: string }> = {
  T: { nombre: 'Solo tipos', explicacion: 'Se borra al compilar: no deja rastro en el JavaScript' },
  S: { nombre: 'Sintaxis ES', explicacion: 'Sintaxis de ECMAScript: pasa tal cual si el destino la soporta, o se transforma' },
  E: { nombre: 'Emisión propia', explicacion: 'Sintaxis de TypeScript que genera código en ejecución (no es «borrable»)' },
  L: { nombre: 'Biblioteca', explicacion: 'Declaraciones de tipos de una API: el runtime debe tenerla' },
  C: { nombre: 'Opción', explicacion: 'Opción del compilador o de tsconfig.json' },
  H: { nombre: 'Herramienta', explicacion: 'Capacidad del compilador, del editor o del servicio de lenguaje' },
};

const ESTADOS: Record<string, string> = { GA: '🟢', Beta: '🟡 beta', Retirada: '⛔' };

const ERAS: Record<string, { nombre: string; lema: string }> = {
  origenes: { nombre: 'Orígenes', lema: 'JavaScript que escala' },
  fundacion: { nombre: 'Fundación', lema: 'Alcanzar a ES6' },
  solidez: { nombre: 'Solidez', lema: 'null bajo control' },
  escala: { nombre: 'Escala', lema: 'Proyectos enormes' },
  expresividad: { nombre: 'Expresividad', lema: 'Tipos que calculan' },
  estandares: { nombre: 'Estándares', lema: 'Converger con TC39' },
  transicion: { nombre: 'Transición', lema: 'El puente' },
  nativa: { nombre: 'Nativa', lema: 'Diez veces más rápido' },
};

const MOTORES = [
  { clave: 'original', nombre: 'Compilador original (0.8–1.0)', claro: '#1baf7a', oscuro: '#199e70' },
  { clave: 'strada', nombre: 'Strada: escrito en TypeScript (1.1–6.0)', claro: '#2a78d6', oscuro: '#3987e5' },
  { clave: 'corsa', nombre: 'Corsa: escrito en Go (7.x)', claro: '#eb6834', oscuro: '#d95926' },
] as const;

interface Tema {
  modo: 'oscuro' | 'claro';
  fondo: string;
  panel: string;
  tinta: string;
  tinta2: string;
  muda: string;
  rejilla: string;
  eje: string;
}
const TEMAS: Record<'oscuro' | 'claro', Tema> = {
  oscuro: { modo: 'oscuro', fondo: '#0b1220', panel: '#131d35', tinta: '#f0efec', tinta2: '#c3c2b7', muda: '#898781', rejilla: '#1f2a44', eje: '#33405c' },
  claro: { modo: 'claro', fondo: '#ffffff', panel: '#f6f8fa', tinta: '#0b0b0b', tinta2: '#52514e', muda: '#898781', rejilla: '#e1e0d9', eje: '#c3c2b7' },
};

const FUENTE = "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const MONO = "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace";

function leerCaracteristicas(versiones: Version[]): Caracteristica[] {
  const filas = leerCsv(join(RAIZ, 'data', 'caracteristicas.csv')) as unknown as Caracteristica[];
  const conocidas = new Set(versiones.map((v) => v.version));
  const errores: string[] = [];
  const ids = new Set<string>();
  const simbolos = new Map<string, string>();
  for (const f of filas) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(f.id)) errores.push(`id inválido: «${f.id}»`);
    if (ids.has(f.id)) errores.push(`id repetido: ${f.id}`);
    ids.add(f.id);
    if (!conocidas.has(f.version)) errores.push(`${f.id}: versión desconocida ${f.version}`);
    if (!FAMILIA.has(f.familia)) errores.push(`${f.id}: familia desconocida ${f.familia}`);
    if (!(f.clase in CLASES)) errores.push(`${f.id}: clase desconocida ${f.clase}`);
    if (!(f.estado in ESTADOS)) errores.push(`${f.id}: estado desconocido ${f.estado}`);
    if (f.estado === 'Retirada' && !conocidas.has(f.fin)) errores.push(`${f.id}: una característica retirada necesita la versión en «fin»`);
    if (f.poster === '1') {
      if (!f.simbolo || !f.etiqueta) errores.push(`${f.id}: en el póster hacen falta símbolo y etiqueta`);
      if (simbolos.has(f.simbolo)) errores.push(`símbolo repetido «${f.simbolo}»: ${f.id} y ${simbolos.get(f.simbolo)}`);
      simbolos.set(f.simbolo, f.id);
      for (const linea of f.etiqueta.split('|')) if (linea.length > 15) errores.push(`${f.id}: la etiqueta «${linea}» no cabe en la ficha (máx. 15)`);
      if (f.etiqueta.split('|').length > 2) errores.push(`${f.id}: la etiqueta admite dos líneas como máximo`);
    }
  }
  const porVersion = new Map<string, number>();
  for (const f of filas.filter((r) => r.poster === '1')) porVersion.set(f.version, (porVersion.get(f.version) ?? 0) + 1);
  for (const [v, n] of porVersion) if (n > 4) errores.push(`TypeScript ${v} tiene ${n} fichas en el póster (máx. 4)`);
  if (errores.length) throw new Error(`data/caracteristicas.csv:\n  ${errores.join('\n  ')}`);
  return filas;
}

// --------------------------------------------------------------------------- utilidades SVG

function glifo(nombre: string, cx: number, cy: number, r: number, color: string): string {
  const p = (pares: number[][]): string => pares.map(([a, b]) => `${(cx + a * r).toFixed(1)},${(cy + b * r).toFixed(1)}`).join(' ');
  switch (nombre) {
    case 'circulo': return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${color}"/>`;
    case 'cuadrado': return `<rect x="${cx - r * 0.88}" y="${cy - r * 0.88}" width="${r * 1.76}" height="${r * 1.76}" rx="1.5" fill="${color}"/>`;
    case 'triangulo': return `<polygon points="${p([[0, -1.05], [1, 0.8], [-1, 0.8]])}" fill="${color}"/>`;
    case 'trianguloInvertido': return `<polygon points="${p([[0, 1.05], [1, -0.8], [-1, -0.8]])}" fill="${color}"/>`;
    case 'rombo': return `<polygon points="${p([[0, -1.15], [1.05, 0], [0, 1.15], [-1.05, 0]])}" fill="${color}"/>`;
    case 'hexagono': return `<polygon points="${p([[1.05, 0], [0.52, 0.91], [-0.52, 0.91], [-1.05, 0], [-0.52, -0.91], [0.52, -0.91]])}" fill="${color}"/>`;
    case 'cruz': return `<path d="M${cx - r} ${cy}H${cx + r}M${cx} ${cy - r}V${cy + r}" stroke="${color}" stroke-width="${(r * 0.7).toFixed(1)}" stroke-linecap="round"/>`;
    case 'estrella': {
      const puntos: number[][] = [];
      for (let i = 0; i < 10; i++) {
        const radio = i % 2 === 0 ? 1.2 : 0.5;
        const angulo = -Math.PI / 2 + (i * Math.PI) / 5;
        puntos.push([Math.cos(angulo) * radio, Math.sin(angulo) * radio]);
      }
      return `<polygon points="${p(puntos)}" fill="${color}"/>`;
    }
    default: throw new Error(`glifo desconocido: ${nombre}`);
  }
}

/** Generador pseudoaleatorio determinista: el mismo cielo en cada ejecución. */
function azar(semilla: number): () => number {
  let a = semilla;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dia = (iso: string): number => Date.parse(`${iso}T00:00:00Z`) / 86_400_000;
const mayorDe = (v: string): number => Number(v.split('.')[0]);
const menorDe = (v: string): number => Number(v.split('.')[1]);
/** Fecha con la que se dibuja una versión: la estable o, si aún no existe, la de su beta. */
const fechaDe = (v: Version): string => v.fecha || v.beta;

// --------------------------------------------------------------------------- tabla periódica

function generarPoster(filas: Caracteristica[], versiones: Version[], tema: Tema): string {
  const T = 88, GT = 6, CABECERA = 24;
  const CW = 2 * T + GT, CH = CABECERA + 2 * T + GT;
  const GX = 14, GY = 20, IZQ = 132, ARR = 64, DER = 36, ABAJO = 58;
  const ancho = IZQ + 10 * CW + 9 * GX + DER;
  const alto = ARR + 8 * CH + 7 * GY + ABAJO;
  const cx = (grupo: number): number => IZQ + grupo * (CW + GX);
  const cy = (periodo: number): number => ARR + periodo * (CH + GY);
  const color = (f: string): string => (FAMILIA.get(f) as (typeof FAMILIAS)[number])[tema.modo];
  const enPoster = filas.filter((f) => f.poster === '1');
  const s: string[] = [];

  s.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${ancho} ${alto}" width="${ancho}" height="${alto}" font-family="${FUENTE}" role="img" aria-labelledby="pt pd">`);
  s.push(`<title id="pt">Tabla periódica de TypeScript, edición ${EDICION}</title>`);
  s.push(`<desc id="pd">${enPoster.length} características clave de TypeScript 0.8 a 7.1. Cada fila (periodo) es una versión mayor y cada columna (grupo) una versión menor. El color y el glifo indican la familia. La lista completa está en el catálogo A–Z.</desc>`);
  if (tema.modo === 'oscuro') {
    s.push('<defs><linearGradient id="pf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b1220"/><stop offset="1" stop-color="#0e1730"/></linearGradient></defs>');
    s.push(`<rect width="${ancho}" height="${alto}" rx="18" fill="url(#pf)"/>`);
  } else {
    s.push(`<rect width="${ancho}" height="${alto}" rx="18" fill="${tema.fondo}"/>`);
    s.push(`<rect x="0.5" y="0.5" width="${ancho - 1}" height="${alto - 1}" rx="18" fill="none" stroke="${tema.rejilla}"/>`);
  }

  // Grupos (.0 – .9)
  for (let g = 0; g < 10; g++) {
    s.push(`<text x="${cx(g) + CW / 2}" y="${ARR - 22}" font-size="15" font-weight="600" fill="${tema.muda}" text-anchor="middle">.${g}</text>`);
  }
  s.push(`<text x="${IZQ - 16}" y="${ARR - 22}" font-size="12" fill="${tema.muda}" text-anchor="end">periodo ╲ grupo</text>`);

  // Bloque de título en el hueco del periodo 0 (grupos .0 a .7)
  const tx = cx(0), ty = cy(0);
  s.push(`<text x="${tx}" y="${ty + 78}" font-size="62" font-weight="700" fill="${tema.tinta}" letter-spacing="-1">Tabla periódica de TypeScript</text>`);
  s.push(`<text x="${tx + 2}" y="${ty + 122}" font-size="22" fill="${tema.tinta2}">${enPoster.length} características clave, de la 0.8 a la 7.1 beta · periodo = versión mayor · grupo = versión menor</text>`);
  s.push(`<text x="${tx + 2}" y="${ty + 156}" font-size="17" fill="${tema.muda}">Edición ${EDICION} · fechas de npm · el catálogo completo tiene ${filas.length} entradas (docs/22-catalogo-a-z.md)</text>`);

  // Periodos y celdas
  const porVersion = new Map(versiones.map((v) => [v.version, v]));
  for (let p = 0; p <= 7; p++) {
    const delPeriodo = versiones.filter((v) => mayorDe(v.version) === p);
    const anios = delPeriodo.map((v) => fechaDe(v).slice(0, 4));
    const era = ERAS[delPeriodo[0].era];
    const y = cy(p);
    s.push(`<text x="${IZQ - 22}" y="${y + CABECERA + 48}" font-size="40" font-weight="700" fill="${tema.tinta}" text-anchor="end">${p}.x</text>`);
    s.push(`<text x="${IZQ - 22}" y="${y + CABECERA + 74}" font-size="14" fill="${tema.tinta2}" text-anchor="end">${x(era.nombre)}</text>`);
    s.push(`<text x="${IZQ - 22}" y="${y + CABECERA + 94}" font-size="13" fill="${tema.muda}" text-anchor="end">${anios[0]}${anios.at(-1) !== anios[0] ? `–${anios.at(-1)}` : ''}</text>`);
    for (let g = 0; g < 10; g++) {
      const v = porVersion.get(`${p}.${g}`);
      if (!v) continue;
      const fichas = enPoster.filter((f) => f.version === v.version);
      const x0 = cx(g);
      const beta = v.estado === 'beta';
      s.push(`<text x="${x0}" y="${y + 16}" font-size="17" font-weight="700" fill="${tema.tinta}">${v.version}${beta ? ' beta' : ''}<tspan font-size="12.5" font-weight="400" fill="${tema.muda}">  ${mesAnio(fechaDe(v))}</tspan></text>`);
      fichas.forEach((f, i) => {
        const fx = x0 + (i % 2) * (T + GT);
        const fy = y + CABECERA + Math.floor(i / 2) * (T + GT);
        const c = color(f.familia);
        const lineas = f.etiqueta.split('|');
        s.push(`<g transform="translate(${fx},${fy})">`);
        s.push(`<rect width="${T}" height="${T}" rx="10" fill="${tema.panel}"/>`);
        s.push(`<rect width="${T}" height="${T}" rx="10" fill="${c}" fill-opacity="${tema.modo === 'oscuro' ? 0.13 : 0.09}" stroke="${c}" stroke-opacity="0.75" stroke-width="1.2"${beta ? ' stroke-dasharray="5 4"' : ''}/>`);
        s.push(glifo((FAMILIA.get(f.familia) as (typeof FAMILIAS)[number]).glifo, 15, 16, 5.6, c));
        if (f.estado === 'Retirada') s.push(`<text x="${T - 10}" y="21" font-size="15" fill="${tema.tinta2}" text-anchor="end">†</text>`);
        s.push(`<text x="${T / 2}" y="${lineas.length === 2 ? 46 : 50}" font-size="${f.simbolo.length > 2 ? 23 : 27}" font-weight="700" fill="${tema.tinta}" text-anchor="middle">${x(f.simbolo)}</text>`);
        lineas.forEach((l, n) => {
          s.push(`<text x="${T / 2}" y="${(lineas.length === 2 ? 63 : 70) + n * 13}" font-size="10.8" fill="${tema.tinta2}" text-anchor="middle">${x(l)}</text>`);
        });
        s.push('</g>');
      });
    }
  }

  // Leyenda en el hueco del periodo 6 (grupos .1 a .9)
  const lx = cx(1) + 6, ly = cy(6);
  s.push(`<text x="${lx}" y="${ly + 18}" font-size="15" font-weight="700" fill="${tema.tinta}">Familias</text>`);
  FAMILIAS.forEach((f, i) => {
    const px = lx + (i % 4) * 420;
    const py = ly + 52 + Math.floor(i / 4) * 44;
    s.push(glifo(f.glifo, px + 9, py - 6, 8, f[tema.modo]));
    s.push(`<text x="${px + 28}" y="${py}" font-size="17" fill="${tema.tinta2}">${x(f.nombre)}</text>`);
  });
  const my = ly + 150;
  s.push(`<text x="${lx}" y="${my}" font-size="15" font-weight="700" fill="${tema.tinta}">Marcas</text>`);
  s.push(`<text x="${lx + 84}" y="${my}" font-size="16" fill="${tema.tinta2}">†  retirada o sustituida en una versión posterior   ·   borde discontinuo: en beta al ${fechaLarga(CORTE)}</text>`);
  s.push(`<text x="${lx}" y="${my + 34}" font-size="15" fill="${tema.muda}">Los huecos son reales: no hubo TypeScript 1.2 ni 1.9, TypeScript 6 tuvo una sola versión menor y la serie 7 acaba de empezar.</text>`);

  // Cómo leer, en el hueco del periodo 7 (grupos .2 a .9)
  const hx = cx(2) + 6, hy = cy(7);
  s.push(`<text x="${hx}" y="${hy + 18}" font-size="15" font-weight="700" fill="${tema.tinta}">Cómo leerla</text>`);
  const notas = [
    'De izquierda a derecha, las versiones menores de cada serie; de arriba abajo, catorce años de lenguaje.',
    'El símbolo es una abreviatura propia de este atlas; el glifo y el color indican la familia.',
    'Cada ficha tiene su capítulo, su ejemplo verificado y su fila en el catálogo A–Z.',
    'Guía no oficial: TypeScript es una marca de Microsoft.',
  ];
  notas.forEach((n, i) => s.push(`<text x="${hx}" y="${hy + 52 + i * 30}" font-size="16.5" fill="${i === 3 ? tema.muda : tema.tinta2}">${x(n)}</text>`));

  s.push(`<text x="${IZQ}" y="${alto - 22}" font-size="13.5" fill="${tema.muda}">Fuente: data/caracteristicas.csv y data/versiones.csv · generado con tools/generar-atlas.ts · TypeScript Atlas, ${EDICION}</text>`);
  s.push('</svg>');
  return `${s.join('\n')}\n`;
}

// --------------------------------------------------------------------------- línea de tiempo

interface Punto { v: Version; px: number; py: number; beta: boolean }

function generarLineaDeTiempo(versiones: Version[], tema: Tema): string {
  const W = 1600, H = 660;
  const M = { izq: 76, der: 44, arr: 168, abajo: 62 };
  const x0 = dia('2012-07-01'), x1 = dia('2027-03-01');
  const sx = (iso: string): number => M.izq + ((dia(iso) - x0) / (x1 - x0)) * (W - M.izq - M.der);
  const sy = (menor: number): number => H - M.abajo - (menor / 9) * (H - M.arr - M.abajo);
  const colorMotor = (clave: string): string => (MOTORES.find((m) => m.clave === clave) as (typeof MOTORES)[number])[tema.modo];
  const puntos: Punto[] = versiones.map((v) => ({ v, px: sx(fechaDe(v)), py: sy(menorDe(v.version)), beta: v.estado === 'beta' }));
  const s: string[] = [];

  s.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FUENTE}" role="img" aria-labelledby="lt ld">`);
  s.push(`<title id="lt">El pulso de TypeScript: todas las versiones menores, de 2012 a 2026</title>`);
  s.push(`<desc id="ld">Gráfico de puntos. El eje horizontal es el tiempo y el vertical el número de versión menor (.0 a .9). Cada trazo une las versiones menores de una versión mayor. Los datos están en la tabla maestra del capítulo 01.</desc>`);
  s.push(`<rect width="${W}" height="${H}" rx="16" fill="${tema.fondo}"/>`);
  if (tema.modo === 'claro') s.push(`<rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="16" fill="none" stroke="${tema.rejilla}"/>`);

  s.push(`<text x="${M.izq - 36}" y="48" font-size="27" font-weight="700" fill="${tema.tinta}">El pulso de TypeScript</text>`);
  s.push(`<text x="${M.izq - 36}" y="76" font-size="15.5" fill="${tema.tinta2}">Cada punto es una versión menor en la fecha de su primer paquete estable en npm; cada trazo, una versión mayor.</text>`);

  // Leyenda: la identidad no depende solo del color (nombre junto a cada clave)
  let lx = M.izq - 36;
  for (const m of MOTORES) {
    const c = m[tema.modo];
    s.push(`<line x1="${lx}" y1="103" x2="${lx + 26}" y2="103" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`);
    s.push(`<circle cx="${lx + 13}" cy="103" r="5" fill="${c}" stroke="${tema.fondo}" stroke-width="2"/>`);
    s.push(`<text x="${lx + 36}" y="108" font-size="14" fill="${tema.tinta2}">${x(m.nombre)}</text>`);
    lx += 62 + m.nombre.length * 7.4;
  }
  s.push(`<circle cx="${lx + 8}" cy="103" r="5" fill="${tema.fondo}" stroke="${colorMotor('corsa')}" stroke-width="2"/>`);
  s.push(`<text x="${lx + 22}" y="108" font-size="14" fill="${tema.tinta2}">en beta</text>`);

  // Franja de eras
  const eras: { clave: string; desde: string; hasta: string }[] = [];
  for (const v of versiones) {
    const ultima = eras.at(-1);
    if (ultima && ultima.clave === v.era) ultima.hasta = fechaDe(v);
    else eras.push({ clave: v.era, desde: fechaDe(v), hasta: fechaDe(v) });
  }
  eras.forEach((e, i) => {
    const a = i === 0 ? M.izq : sx(e.desde) - 9;
    const b = i === eras.length - 1 ? W - M.der : sx(eras[i + 1].desde) - 9;
    const medio = (a + b) / 2;
    if (i > 0) s.push(`<line x1="${a.toFixed(1)}" y1="128" x2="${a.toFixed(1)}" y2="${H - M.abajo}" stroke="${tema.rejilla}" stroke-width="1"/>`);
    const estrecha = b - a < 96;
    const ultima = i === eras.length - 1;
    if (estrecha && !ultima) {
      s.push(`<text x="${(b - 6).toFixed(1)}" y="156" font-size="12" font-weight="600" fill="${tema.tinta2}" text-anchor="end">${x(ERAS[e.clave].nombre)}</text>`);
    } else {
      s.push(`<text x="${medio.toFixed(1)}" y="140" font-size="13" font-weight="600" fill="${tema.tinta2}" text-anchor="middle">${x(ERAS[e.clave].nombre)}</text>`);
      if (!estrecha) s.push(`<text x="${medio.toFixed(1)}" y="156" font-size="11.5" fill="${tema.muda}" text-anchor="middle">${x(ERAS[e.clave].lema)}</text>`);
    }
  });

  // Rejilla y ejes: líneas finas, sólidas y discretas
  for (let m = 0; m <= 9; m++) {
    const y = sy(m);
    s.push(`<line x1="${M.izq}" y1="${y.toFixed(1)}" x2="${W - M.der}" y2="${y.toFixed(1)}" stroke="${tema.rejilla}" stroke-width="1"/>`);
    s.push(`<text x="${M.izq - 12}" y="${(y + 4.5).toFixed(1)}" font-size="12.5" fill="${tema.muda}" text-anchor="end">.${m}</text>`);
  }
  s.push(`<text x="${M.izq - 12}" y="${sy(9) - 16}" font-size="11.5" fill="${tema.muda}" text-anchor="end">menor</text>`);
  for (let a = 2013; a <= 2027; a++) {
    const px = sx(`${a}-01-01`);
    s.push(`<line x1="${px.toFixed(1)}" y1="${H - M.abajo}" x2="${px.toFixed(1)}" y2="${H - M.abajo + 6}" stroke="${tema.eje}" stroke-width="1"/>`);
    s.push(`<text x="${px.toFixed(1)}" y="${H - M.abajo + 24}" font-size="12.5" fill="${tema.muda}" text-anchor="middle">${a}</text>`);
  }
  s.push(`<line x1="${M.izq}" y1="${H - M.abajo}" x2="${W - M.der}" y2="${H - M.abajo}" stroke="${tema.eje}" stroke-width="1"/>`);

  // Hoy
  const hoy = sx(CORTE);
  s.push(`<line x1="${hoy.toFixed(1)}" y1="${M.arr - 6}" x2="${hoy.toFixed(1)}" y2="${H - M.abajo}" stroke="${tema.muda}" stroke-width="1"/>`);
  s.push(`<text x="${(hoy - 7).toFixed(1)}" y="${M.arr + 8}" font-size="11.5" fill="${tema.muda}" text-anchor="end">corte: ${fechaCorta(CORTE)}</text>`);

  // Trazos por versión mayor
  for (let p = 0; p <= 7; p++) {
    const serie = puntos.filter((q) => mayorDe(q.v.version) === p);
    const estables = serie.filter((q) => !q.beta);
    if (estables.length > 1) {
      s.push(`<polyline points="${estables.map((q) => `${q.px.toFixed(1)},${q.py.toFixed(1)}`).join(' ')}" fill="none" stroke="${colorMotor(estables.at(-1)!.v.motor)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`);
    }
    const beta = serie.find((q) => q.beta);
    if (beta && estables.length) {
      const u = estables.at(-1)!;
      s.push(`<line x1="${u.px.toFixed(1)}" y1="${u.py.toFixed(1)}" x2="${beta.px.toFixed(1)}" y2="${beta.py.toFixed(1)}" stroke="${colorMotor(beta.v.motor)}" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/>`);
    }
  }
  for (const q of puntos) {
    const c = colorMotor(q.v.motor);
    s.push(q.beta
      ? `<circle cx="${q.px.toFixed(1)}" cy="${q.py.toFixed(1)}" r="5" fill="${tema.fondo}" stroke="${c}" stroke-width="2"/>`
      : `<circle cx="${q.px.toFixed(1)}" cy="${q.py.toFixed(1)}" r="5" fill="${c}" stroke="${tema.fondo}" stroke-width="2"/>`);
  }

  // Etiquetas directas, pocas: el inicio de cada serie y los extremos
  for (const q of puntos) {
    const menor = menorDe(q.v.version);
    const primeraDeSerie = !puntos.some((o) => mayorDe(o.v.version) === mayorDe(q.v.version) && cmp(o.v.version, q.v.version) < 0);
    if (!primeraDeSerie && !q.beta) continue;
    void menor;
    if (q.beta) s.push(`<text x="${(q.px + 10).toFixed(1)}" y="${(q.py + 4.5).toFixed(1)}" font-size="13.5" font-weight="700" fill="${tema.tinta}">${q.v.version} beta</text>`);
    else s.push(`<text x="${(q.px - 9).toFixed(1)}" y="${(q.py - 10).toFixed(1)}" font-size="13.5" font-weight="700" fill="${tema.tinta}" text-anchor="end">${q.v.version}</text>`);
  }

  // Anotación: la pausa más larga entre versiones menores desde 2.0
  const estables = versiones.filter((v) => v.fecha);
  const desde20 = estables.filter((v) => cmp(v.version, '2.0') >= 0);
  let pausa = { dias: 0, a: desde20[0], b: desde20[0] };
  for (let i = 1; i < desde20.length; i++) {
    const dias = dia(desde20[i].fecha) - dia(desde20[i - 1].fecha);
    if (dias > pausa.dias) pausa = { dias, a: desde20[i - 1], b: desde20[i] };
  }
  const trimestrales = desde20.filter((v) => cmp(v.version, '5.9') <= 0);
  const media = Math.round((dia(trimestrales.at(-1)!.fecha) - dia(trimestrales[0].fecha)) / (trimestrales.length - 1));
  const ax = sx(pausa.a.fecha), bx = sx(pausa.b.fecha), ay = sy(4.6);
  s.push(`<path d="M${ax.toFixed(1)} ${ay - 6}V${ay}H${bx.toFixed(1)}V${ay - 6}" fill="none" stroke="${tema.muda}" stroke-width="1"/>`);
  s.push(`<text x="${((ax + bx) / 2).toFixed(1)}" y="${ay + 18}" font-size="12.5" font-weight="600" fill="${tema.tinta2}" text-anchor="middle">${pausa.dias} días sin versión menor</text>`);
  s.push(`<text x="${((ax + bx) / 2).toFixed(1)}" y="${ay + 34}" font-size="12" fill="${tema.muda}" text-anchor="middle">de ${pausa.a.version} a ${pausa.b.version}: la reescritura en Go</text>`);
  s.push(`<text x="${W - M.der}" y="${H - 14}" font-size="12" fill="${tema.muda}" text-anchor="end">De 2.0 a 5.9: una versión menor cada ${media} días de media · fuente: registro npm · TypeScript Atlas, ${EDICION}</text>`);
  s.push('</svg>');
  return `${s.join('\n')}\n`;
}

// --------------------------------------------------------------------------- banner

function generarBanner(filas: Caracteristica[], versiones: Version[], compiladores: number): string {
  const W = 1600, H = 500;
  const s: string[] = [];
  const x0 = dia('2012-05-01'), x1 = dia('2027-02-01');
  const sx = (iso: string): number => 96 + ((dia(iso) - x0) / (x1 - x0)) * (W - 192);
  const sy = (menor: number): number => 440 - (menor / 9) * 150;
  const aleatorio = azar(20261109);

  s.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" font-family="${FUENTE}" role="img" aria-labelledby="bt bd">`);
  s.push('<title id="bt">TypeScript Atlas · La evolución del lenguaje, versión a versión</title>');
  s.push('<desc id="bd">Portada. Bajo el título, una constelación trazada con datos reales: cada estrella es una versión menor de TypeScript colocada en su fecha de publicación, y cada trazo une las de una misma versión mayor, de la 0.8 de 2012 a la 7.1 beta de 2026.</desc>');
  s.push('<defs>'
    + '<linearGradient id="bf" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#070b16"/><stop offset="0.55" stop-color="#0b1730"/><stop offset="1" stop-color="#12306b"/></linearGradient>'
    + '<radialGradient id="bh" cx="0.84" cy="0.2" r="0.6"><stop offset="0" stop-color="#3178c6" stop-opacity="0.42"/><stop offset="1" stop-color="#3178c6" stop-opacity="0"/></radialGradient>'
    + '<linearGradient id="bl" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7fb2f0"/><stop offset="1" stop-color="#3178c6"/></linearGradient>'
    + '<filter id="bg" x="-200%" y="-200%" width="500%" height="500%"><feGaussianBlur stdDeviation="3.2"/></filter>'
    + '</defs>');
  s.push(`<rect width="${W}" height="${H}" rx="20" fill="url(#bf)"/><rect width="${W}" height="${H}" rx="20" fill="url(#bh)"/>`);

  // Cielo de fondo
  for (let i = 0; i < 150; i++) {
    const px = aleatorio() * W, py = aleatorio() * H, r = 0.4 + aleatorio() * 1.1;
    s.push(`<circle cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="${r.toFixed(2)}" fill="#ffffff" fill-opacity="${(0.05 + aleatorio() * 0.22).toFixed(2)}"/>`);
  }

  // Emblema, título y lema
  s.push('<g transform="translate(96,70)"><rect width="108" height="108" rx="16" fill="#3178c6"/>'
    + '<text x="98" y="94" font-size="58" font-weight="700" fill="#ffffff" text-anchor="end" letter-spacing="-1">TS</text></g>');
  s.push('<text x="236" y="128" font-size="78" font-weight="700" fill="#f0efec" letter-spacing="-1.5">TypeScript Atlas</text>');
  s.push('<text x="239" y="172" font-size="27" fill="#c9dcf5">La evolución del lenguaje, versión a versión</text>');
  s.push(`<text x="96" y="232" font-size="19" fill="#9fb4d6">De TypeScript 0.8 a 7.1 beta · ${versiones.length} versiones · ${filas.length} características · ejemplos verificados con ${compiladores} compiladores reales · ${EDICION}</text>`);

  // Constelación de versiones
  const puntos = versiones.map((v) => ({ v, px: sx(fechaDe(v)), py: sy(menorDe(v.version)) }));
  for (let p = 0; p <= 7; p++) {
    const serie = puntos.filter((q) => mayorDe(q.v.version) === p);
    if (serie.length > 1) {
      s.push(`<polyline points="${serie.map((q) => `${q.px.toFixed(1)},${q.py.toFixed(1)}`).join(' ')}" fill="none" stroke="${p === 7 ? '#ffb38a' : 'url(#bl)'}" stroke-opacity="0.75" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>`);
    }
    const primera = serie[0];
    const anio = fechaDe(primera.v).slice(0, 4);
    // Dos series que empiezan casi juntas (6.0 y 7.0) se etiquetan hacia lados opuestos.
    const vecina = (q: number): number | undefined => puntos.find((o) => mayorDe(o.v.version) === q)?.px;
    const pegadaALaSiguiente = Math.abs((vecina(p + 1) ?? Infinity) - primera.px) < 44;
    const pegadaALaAnterior = Math.abs((vecina(p - 1) ?? -Infinity) - primera.px) < 44;
    const ancla = pegadaALaSiguiente ? 'end' : pegadaALaAnterior ? 'start' : 'middle';
    const tx = primera.px + (pegadaALaSiguiente ? 7 : pegadaALaAnterior ? -7 : 0);
    s.push(`<text x="${tx.toFixed(1)}" y="472" font-size="17" font-weight="700" fill="#f0efec" text-anchor="${ancla}">${primera.v.version}</text>`);
    s.push(`<text x="${tx.toFixed(1)}" y="490" font-size="12.5" fill="#8ea3c7" text-anchor="${ancla}">${anio}</text>`);
  }
  for (const q of puntos) {
    const nativa = q.v.motor === 'corsa';
    const principal = menorDe(q.v.version) === 0 || q.v.version === '0.8';
    const c = nativa ? '#ffb38a' : '#a9cdf8';
    s.push(`<circle cx="${q.px.toFixed(1)}" cy="${q.py.toFixed(1)}" r="${principal ? 7 : 4.5}" fill="${c}" opacity="0.5" filter="url(#bg)"/>`);
    s.push(`<circle cx="${q.px.toFixed(1)}" cy="${q.py.toFixed(1)}" r="${principal ? 4.2 : 2.6}" fill="${q.v.estado === 'beta' ? '#0b1730' : c}" stroke="${c}" stroke-width="${q.v.estado === 'beta' ? 1.6 : 0}"/>`);
  }
  s.push('</svg>');
  return `${s.join('\n')}\n`;
}

// --------------------------------------------------------------------------- catálogo

const celda = (t: string): string => t.replace(/\|/g, '\\|');

function generarCatalogo(filas: Caracteristica[], versiones: Version[], pruebas: Set<string>): string {
  const cap = new Map(versiones.map((v) => [v.version, v.capitulo]));
  const total = filas.length;
  const l: string[] = [
    '<div align="center">', '',
    '# 22 · Catálogo A–Z de características de TypeScript', '',
    `**${total} características con su versión, familia, lo que exigen en ejecución, su relación con ECMAScript y su prueba de debut · edición ${EDICION}**`, '',
    '[⬅ 21 · Guías de decisión](21-guias-de-decision.md) · [🏠 Índice](../README.md) · [23 · Migración ➡](23-migracion-y-ciclo-de-vida.md)', '',
    '</div>', '',
    '> [!NOTE]',
    '> Este archivo se **genera automáticamente** desde [`data/caracteristicas.csv`](../data/caracteristicas.csv) con',
    '> `node tools/generar-atlas.ts`. Para corregir o añadir una característica, edita el CSV y vuelve a ejecutar el script.', '',
    '<picture>',
    '  <source media="(prefers-color-scheme: dark)" srcset="../assets/ts-atlas-tabla-periodica-oscuro.svg">',
    '  <img src="../assets/ts-atlas-tabla-periodica-claro.svg" alt="Tabla periódica de las características de TypeScript" width="100%">',
    '</picture>', '',
    '## Contenido', '',
    '1. [Cómo leer el catálogo](#cómo-leer-el-catálogo)',
    '2. [Resumen por versión](#resumen-por-versión)',
    '3. [Resumen por familia](#resumen-por-familia)',
    '4. [Lo que ya no existe](#lo-que-ya-no-existe)',
    '5. [Catálogo](#catálogo)', '',
    '---', '',
    '## Cómo leer el catálogo', '',
    '| Columna | Significado |',
    '|---|---|',
    '| **TS** | Versión en la que debutó, con enlace a su capítulo |',
    '| **Familia** | Una de las ocho familias del atlas (las mismas del póster) |',
    '| **Exige** | Qué necesita la característica más allá del compilador (tabla siguiente) |',
    '| **ECMAScript** | Edición del estándar o etapa de TC39 a la que corresponde, si refleja una propuesta de JavaScript |',
    '| **Estado** | 🟢 vigente · 🟡 en beta · ⛔ retirada (se indica la versión en que dejó de aceptarse) |',
    `| **🧪** | Enlace a su [prueba de debut](25-pruebas-de-debut.md): un fragmento mínimo que compila con esa versión y **falla con la anterior** |`, '',
    '| Exige | Qué significa | Consecuencia práctica |',
    '|---|---|---|',
    ...Object.entries(CLASES).map(([, c]) => `| **${c.nombre}** | ${c.explicacion} | ${consecuencia(c.nombre)} |`), '',
    '---', '',
    '## Resumen por versión', '',
    `| Versión | Publicación | Características | ${Object.values(CLASES).map((c) => c.nombre).join(' | ')} |`,
    `|---|---|---:|${Object.keys(CLASES).map(() => '---:').join('|')}|`,
  ];
  const cuenta = (v: string, c: string): number => filas.filter((f) => f.version === v && f.clase === c).length;
  for (const v of versiones) {
    const n = filas.filter((f) => f.version === v.version).length;
    l.push(`| [TypeScript ${v.version}](${v.capitulo}) | ${v.fecha ? mesAnio(v.fecha) : `beta, ${mesAnio(v.beta)}`} | ${n} | ${Object.keys(CLASES).map((c) => cuenta(v.version, c) || '·').join(' | ')} |`);
  }
  l.push(`| **Total** | | **${total}** | ${Object.keys(CLASES).map((c) => `**${filas.filter((f) => f.clase === c).length}**`).join(' | ')} |`, '');

  l.push('## Resumen por familia', '', '| Familia | Características | Con prueba de debut |', '|---|---:|---:|');
  for (const f of FAMILIAS) {
    const suyas = filas.filter((r) => r.familia === f.clave);
    l.push(`| ${f.nombre} | ${suyas.length} | ${suyas.filter((r) => pruebas.has(r.id)).length} |`);
  }
  l.push(`| **Total** | **${total}** | **${filas.filter((r) => pruebas.has(r.id)).length}** |`, '');

  const retiradas = filas.filter((f) => f.estado === 'Retirada').sort((a, b) => cmp(a.fin, b.fin) || cmp(a.version, b.version));
  l.push('## Lo que ya no existe', '',
    'TypeScript casi nunca retira nada, y por eso esta lista es corta. Casi todo lo que contiene salió del compilador entre la 6.0 y la 7.0; el detalle está en',
    '[11 · TypeScript 6.0](11-typescript-6.0-el-puente.md) y en [23 · Migración](23-migracion-y-ciclo-de-vida.md).', '',
    '| Característica | Debutó en | Dejó de aceptarse en | Descripción |', '|---|---|---|---|');
  for (const f of retiradas) l.push(`| ${celda(f.nombre)} | [${f.version}](${cap.get(f.version)}) | **${f.fin}** | ${celda(f.descripcion)} |`);
  l.push('', '---', '', '## Catálogo', '');

  const orden = (t: string): string => sinTildes(t).toLowerCase().replace(/^[^a-z0-9]+/, '');
  let letra = '';
  for (const f of [...filas].sort((a, b) => orden(a.nombre).localeCompare(orden(b.nombre), 'es'))) {
    const inicial = /[a-z]/.test(orden(f.nombre)[0]) ? orden(f.nombre)[0].toUpperCase() : '#';
    if (inicial !== letra) {
      letra = inicial;
      l.push('', `### ${letra}`, '', '| Característica | TS | Familia | Exige | ECMAScript | Estado | Descripción | 🧪 |', '|---|---|---|---|---|---|---|:-:|');
    }
    const estado = f.estado === 'Retirada' ? `⛔ ${f.fin}` : ESTADOS[f.estado];
    l.push(`| ${celda(f.nombre)} | [${f.version}](${cap.get(f.version)}) | ${(FAMILIA.get(f.familia) as (typeof FAMILIAS)[number]).nombre} | ${CLASES[f.clase].nombre} | ${f.ecma || '—'} | ${estado} | ${celda(f.descripcion)} | ${pruebas.has(f.id) ? `[🧪](25-pruebas-de-debut.md#${f.id})` : '—'} |`);
  }
  return `${l.join('\n')}\n`;
}

function consecuencia(clase: string): string {
  switch (clase) {
    case 'Solo tipos': return 'Funciona con cualquier `target` y con la eliminación de tipos de Node';
    case 'Sintaxis ES': return 'Revisa `target` y el runtime; TypeScript la transforma si hace falta';
    case 'Emisión propia': return 'Incompatible con `erasableSyntaxOnly` y con la eliminación de tipos';
    case 'Biblioteca': return 'Revisa `lib` y que el runtime la implemente; TypeScript no añade *polyfills*';
    case 'Opción': return 'Se activa en `tsconfig.json`';
    default: return 'No cambia el lenguaje';
  }
}

// --------------------------------------------------------------------------- fragmentos inyectados

function inyectar(ruta: string, nombre: string, contenido: string): boolean {
  if (!existsSync(ruta)) return false;
  const texto = readFileSync(ruta, 'utf8');
  const patron = new RegExp(`(<!-- atlas:inicio ${nombre} -->)[\\s\\S]*?(<!-- atlas:fin ${nombre} -->)`);
  if (!patron.test(texto)) return false;
  const nuevo = texto.replace(patron, (_, a: string, b: string) => `${a}\n${contenido.trimEnd()}\n${b}`);
  if (nuevo !== texto) writeFileSync(ruta, nuevo);
  return true;
}

function tablaMaestra(versiones: Version[]): string {
  const l = [
    '| TS | Publicación | Beta | RC | Días desde la anterior | Motor | Tema dominante | Capítulo |',
    '|---|---|---|---|---:|---|---|---|',
  ];
  let previa: Version | undefined;
  for (const v of versiones) {
    const dias = previa && v.fecha && previa.fecha ? String(dia(v.fecha) - dia(previa.fecha)) : '—';
    const marca = v.estado === 'actual' ? ' 🟢' : v.estado === 'beta' ? ' 🟡' : v.estado === 'puente' ? ' 🔵' : '';
    const motor = v.motor === 'corsa' ? 'Corsa (Go)' : v.motor === 'strada' ? 'Strada' : 'Original';
    l.push(`| **${v.version}**${marca} | ${v.fecha ? fechaCorta(v.fecha) : '—'} | ${v.beta ? fechaCorta(v.beta) : '—'} | ${v.rc ? fechaCorta(v.rc) : '—'} | ${dias} | ${motor} | ${celda(v.tema)} | [${v.capitulo.slice(0, 2)}](${v.capitulo}) |`);
    if (v.fecha) previa = v;
  }
  return l.join('\n');
}

function insignias(n: Record<string, string | number>): string {
  const insignia = (alt: string, etiqueta: string, valor: string | number, color: string): string =>
    `  <img alt="${alt}" src="https://img.shields.io/badge/${encodeURIComponent(etiqueta).replace(/-/g, '--')}-${encodeURIComponent(String(valor)).replace(/-/g, '--')}-${color}?style=for-the-badge">`;
  return [
    '<p align="center">',
    insignia(`Actualizado al ${fechaLarga(CORTE)}`, 'actualizado', fechaCorta(CORTE).replace(/-/g, ' '), '3178C6'),
    insignia('Idioma: español', 'idioma', 'español', '235A97'),
    insignia(`${n.capitulos} capítulos`, 'capítulos', n.capitulos, '3987E5'),
    insignia(`${n.versiones} versiones documentadas`, 'versiones', n.versiones, '6250D6'),
    insignia(`${n.caracteristicas} características catalogadas`, 'características', n.caracteristicas, 'D95926'),
    insignia(`${n.verificables} ejemplos verificados`, 'ejemplos verificados', n.verificables, '199E70'),
    insignia(`${n.compiladores} compiladores reales`, 'compiladores reales', n.compiladores, 'C98500'),
    insignia(`${n.diagramas} diagramas Mermaid`, 'diagramas', n.diagramas, 'D55181'),
    '</p>',
  ].join('\n');
}

// --------------------------------------------------------------------------- principal

function principal(): void {
  const versiones = leerVersiones().sort((a, b) => cmp(a.version, b.version));
  const filas = leerCaracteristicas(versiones);
  mkdirSync(join(RAIZ, 'assets'), { recursive: true });
  mkdirSync(join(RAIZ, 'docs'), { recursive: true });

  // Pruebas de debut: cada ancla <a id="…"> de docs/25 debe corresponder a una fila del CSV con la misma versión.
  const pruebas = new Set<string>();
  const rutaPruebas = join(RAIZ, 'docs', '25-pruebas-de-debut.md');
  if (existsSync(rutaPruebas)) {
    const porId = new Map(filas.map((f) => [f.id, f]));
    const lineas = readFileSync(rutaPruebas, 'utf8').split('\n');
    let seccion = '';
    const problemas: string[] = [];
    lineas.forEach((linea, n) => {
      const titulo = /^## TypeScript ([\d.]+)/.exec(linea);
      if (titulo) seccion = titulo[1];
      for (const m of linea.matchAll(/<a id="([a-z0-9-]+)"><\/a>/g)) {
        const f = porId.get(m[1]);
        if (!f) problemas.push(`línea ${n + 1}: la prueba «${m[1]}» no existe en el catálogo`);
        else if (f.version !== seccion) problemas.push(`línea ${n + 1}: «${m[1]}» está bajo TypeScript ${seccion} y el catálogo dice ${f.version}`);
        else if (pruebas.has(m[1])) problemas.push(`línea ${n + 1}: prueba repetida «${m[1]}»`);
        pruebas.add(m[1]);
      }
    });
    if (problemas.length) throw new Error(`docs/25-pruebas-de-debut.md:\n  ${problemas.join('\n  ')}`);
  }

  const rutaInforme = join(RAIZ, 'data', 'verificacion.json');
  const informe = existsSync(rutaInforme) ? JSON.parse(readFileSync(rutaInforme, 'utf8')) : { verificables: 0, compiladores: {} };
  const compiladores = Object.keys(informe.compiladores ?? {}).length || versiones.filter((v) => v.parche).length;

  writeFileSync(join(RAIZ, 'docs', '22-catalogo-a-z.md'), generarCatalogo(filas, versiones, pruebas));
  writeFileSync(join(RAIZ, 'assets', 'ts-atlas-banner.svg'), generarBanner(filas, versiones, compiladores));
  for (const modoTema of ['oscuro', 'claro'] as const) {
    writeFileSync(join(RAIZ, 'assets', `ts-atlas-tabla-periodica-${modoTema}.svg`), generarPoster(filas, versiones, TEMAS[modoTema]));
    writeFileSync(join(RAIZ, 'assets', `ts-atlas-linea-de-tiempo-${modoTema}.svg`), generarLineaDeTiempo(versiones, TEMAS[modoTema]));
  }

  const docs = readdirSync(join(RAIZ, 'docs')).filter((f) => /^\d\d-.*\.md$/.test(f));
  const markdown = [join(RAIZ, 'README.md'), ...docs.map((f) => join(RAIZ, 'docs', f))].filter(existsSync);
  const diagramas = markdown.reduce((n, f) => n + (readFileSync(f, 'utf8').match(/^```mermaid/gm)?.length ?? 0), 0);
  const cifras = {
    capitulos: docs.length,
    versiones: versiones.length,
    caracteristicas: filas.length,
    verificables: informe.verificables ?? 0,
    compiladores,
    diagramas,
  };
  const inyectados = [
    inyectar(join(RAIZ, 'README.md'), 'insignias', insignias(cifras)) && 'README: insignias',
    inyectar(join(RAIZ, 'docs', '01-modelo-de-versiones.md'), 'tabla-maestra', tablaMaestra(versiones)) && '01: tabla maestra',
  ].filter(Boolean);

  const enPoster = filas.filter((f) => f.poster === '1').length;
  console.log(`${filas.length} características (${enPoster} en el póster, ${pruebas.size} con prueba de debut) · ${versiones.length} versiones · ${docs.length} capítulos · ${diagramas} diagramas`);
  console.log(`→ docs/22-catalogo-a-z.md, assets/ts-atlas-*.svg${inyectados.length ? ` · inyectado: ${inyectados.join(', ')}` : ''}`);
  void clave;
}

principal();

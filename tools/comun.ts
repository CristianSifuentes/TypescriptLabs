/**
 * Utilidades compartidas por las herramientas de TypeScript Atlas.
 *
 * Todo el directorio tools/ está escrito con sintaxis borrable (TypeScript 5.8,
 * `erasableSyntaxOnly`), así que Node lo ejecuta directamente, sin compilar:
 *
 *     node tools/generar-atlas.ts
 *     node tools/verificar-ejemplos.ts
 *
 * Requiere Node 22.18 o posterior (eliminación de tipos activada por defecto).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const CACHE = process.env.ATLAS_CACHE ?? join(RAIZ, '.atlas-cache');

/** Fecha de corte del atlas: todo lo que se afirma está verificado a este día. */
export const CORTE = '2026-11-10';
export const EDICION = 'noviembre 2026';

// --------------------------------------------------------------------------- CSV

/** Lector mínimo de CSV (RFC 4180): comillas dobles, comas y saltos de línea dentro de comillas. */
export function leerCsv(ruta: string): Record<string, string>[] {
  const texto = readFileSync(ruta, 'utf8').replace(/^﻿/, '');
  const filas: string[][] = [];
  let campo = '';
  let fila: string[] = [];
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') { campo += '"'; i++; }
      else if (c === '"') entreComillas = false;
      else campo += c;
    } else if (c === '"') entreComillas = true;
    else if (c === ',') { fila.push(campo); campo = ''; }
    else if (c === '\n') { fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else if (c !== '\r') campo += c;
  }
  if (campo !== '' || fila.length > 0) { fila.push(campo); filas.push(fila); }
  const [cabecera, ...resto] = filas.filter((f) => f.some((x) => x !== ''));
  return resto.map((f, n) => {
    if (f.length !== cabecera.length) {
      throw new Error(`${ruta}: la fila ${n + 2} tiene ${f.length} campos y se esperaban ${cabecera.length}: ${f.join(',')}`);
    }
    return Object.fromEntries(cabecera.map((k, i) => [k, f[i]]));
  });
}

// --------------------------------------------------------------------------- versiones

export interface Version {
  /** Versión menor: "4.1". */
  version: string;
  /** Parche que usa el verificador ("4.1.6"); vacío si no hay paquete estable en npm. */
  parche: string;
  /** Fecha ISO de la primera versión estable en npm; vacía si aún no existe. */
  fecha: string;
  beta: string;
  rc: string;
  era: string;
  motor: string;
  tema: string;
  capitulo: string;
  estado: string;
}

export function leerVersiones(): Version[] {
  return leerCsv(join(RAIZ, 'data', 'versiones.csv')) as unknown as Version[];
}

/** Clave numérica de una versión menor: "4.10" > "4.9". */
export function clave(version: string): number {
  const [mayor, menor = '0'] = version.split('.');
  return Number(mayor) * 1000 + Number(menor);
}
export const cmp = (a: string, b: string): number => clave(a) - clave(b);
export const ge = (a: string, b: string): boolean => cmp(a, b) >= 0;
export const lt = (a: string, b: string): boolean => cmp(a, b) < 0;

/** Cómo se invoca cada compilador. */
export type Modo = 'cli' | 'api' | 'nativo';
export function modo(version: string): Modo {
  if (lt(version, '1.5')) return 'cli'; // compilador original y primeras versiones: solo línea de comandos
  if (lt(version, '7.0')) return 'api'; // Strada: se carga en proceso con require()
  return 'nativo'; // Corsa: binario nativo
}

export function dirPaquete(parche: string): string {
  return join(CACHE, `ts-${parche}`, 'node_modules', 'typescript');
}

/** Descarga un compilador de npm a la caché local si todavía no está. */
export function asegurarCompilador(parche: string): string {
  const destino = dirPaquete(parche);
  if (existsSync(join(destino, 'package.json'))) return destino;
  const base = join(CACHE, `ts-${parche}`);
  mkdirSync(base, { recursive: true });
  writeFileSync(join(base, 'package.json'), '{"name":"compilador","private":true}\n');
  const r = spawnSync('npm', ['install', `typescript@${parche}`, '--no-audit', '--no-fund', '--no-package-lock', '--loglevel=error'], {
    cwd: base,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0 || !existsSync(join(destino, 'package.json'))) {
    throw new Error(`No se pudo instalar typescript@${parche}:\n${r.stderr || r.stdout}`);
  }
  return destino;
}

// --------------------------------------------------------------------------- opciones del compilador

export type Opciones = Record<string, string | boolean | string[]>;

/** Convierte opciones a argumentos de línea de comandos (`--strict`, `--target ES2022`…). */
export function aArgumentos(opciones: Opciones): string[] {
  const args: string[] = [];
  for (const [k, v] of Object.entries(opciones)) {
    if (v === true) args.push(`--${k}`);
    else if (v === false) args.push(`--${k}`, 'false');
    else if (Array.isArray(v)) args.push(`--${k}`, v.join(','));
    else args.push(`--${k}`, v);
  }
  return args;
}

/**
 * Opciones con las que se comprueba un ejemplo en una versión dada.
 * La política es «lo más estricto y moderno que esa versión conozca».
 */
export function opcionesDeComprobacion(version: string, extra: Opciones, lenguaje: string): Opciones {
  const o: Opciones = {};
  if (lt(version, '1.4')) o.target = 'ES5';
  else if (lt(version, '2.1')) o.target = 'ES6';
  else o.target = 'ESNext';

  if (ge(version, '2.3')) o.strict = true;
  else if (ge(version, '1.0')) {
    o.noImplicitAny = true;
    if (ge(version, '2.0')) { o.strictNullChecks = true; o.noImplicitThis = true; }
  }

  if (ge(version, '2.4')) o.module = 'ESNext';
  else if (ge(version, '1.7')) o.module = 'commonjs';

  if (ge(version, '5.0')) o.moduleResolution = 'bundler';
  else if (ge(version, '1.6')) o.moduleResolution = 'node';

  if (ge(version, '4.7')) o.moduleDetection = 'force';
  if (ge(version, '2.0')) o.skipLibCheck = true;
  if (lenguaje === 'tsx') o.jsx = 'preserve';
  if (lenguaje === 'js') { o.allowJs = true; o.checkJs = true; }
  const final: Opciones = { ...o, ...extra };
  conciliar(version, final, extra);
  return final;
}

/**
 * Ajusta combinaciones que cada época rechaza. Un ejemplo que pide `module: commonjs` o
 * `target: es5` no debe fallar por una opción que el atlas añadió por su cuenta.
 */
function conciliar(version: string, final: Opciones, extra: Opciones): void {
  const destinoAntiguo = typeof final.target === 'string' && /^es[35]$/i.test(final.target);
  const moduloClasico = typeof extra.module === 'string' && /^(commonjs|amd|umd|system|none)$/i.test(extra.module);
  // 1.5 y 1.6: con destino ES5 hace falta un formato de módulo explícito.
  if (ge(version, '1.5') && lt(version, '1.7') && destinoAntiguo && extra.module === undefined) final.module = 'commonjs';
  // De 1.7 a 2.3 el atlas ya usa commonjs; desde 2.4 usa ESNext, incompatible con un destino ES5 hasta la 2.0.
  // `bundler` solo admite módulos ES hasta la 5.9; con la 6.0 también acepta commonjs.
  if (moduloClasico && extra.moduleResolution === undefined && ge(version, '5.0') && lt(version, '6.0')) final.moduleResolution = 'node10';
}

/** Opciones con las que se emite JavaScript para ejecutarlo en Node. */
export function opcionesDeEmision(version: string, extra: Opciones, esm: boolean): Opciones {
  const o: Opciones = {};
  // La 1.5 y la 1.6 no saben combinar destino ES6 con módulos CommonJS: para ejecutar, emiten ES5.
  if (lt(version, '1.7')) o.target = 'ES5';
  else if (lt(version, '2.1')) o.target = 'ES6';
  else if (lt(version, '3.8')) o.target = 'ES2017';
  else if (lt(version, '4.6')) o.target = 'ES2020';
  else o.target = 'ES2022';

  if (esm && ge(version, '2.4')) o.module = 'ESNext';
  else if (ge(version, '1.0')) o.module = 'commonjs';
  if (ge(version, '5.0')) o.moduleResolution = 'bundler';
  else if (ge(version, '1.6')) o.moduleResolution = 'node';
  if (ge(version, '4.7')) o.moduleDetection = 'force';
  if (ge(version, '2.0')) o.skipLibCheck = true;

  const resultado: Opciones = { ...o, ...extra };
  // El destino de ejecución manda: un ejemplo puede pedir `target` para comprobar, no para ejecutar.
  if (typeof extra.target === 'string' && /^es(3|5)$/i.test(extra.target)) resultado.target = extra.target;
  else resultado.target = o.target;
  delete resultado.noEmit;
  delete resultado.lib;
  conciliar(version, resultado, extra);
  return resultado;
}

// --------------------------------------------------------------------------- texto

export function sinTildes(texto: string): string {
  return texto.normalize('NFKD').replace(/[̀-ͯ]/g, '');
}

export function escaparXml(texto: string): string {
  return texto.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

/** "2026-07-08" → "8-jul-2026". */
export function fechaCorta(iso: string): string {
  if (!iso) return '—';
  const [a, m, d] = iso.split('-').map(Number);
  return `${d}-${MESES[m - 1]}-${a}`;
}
/** "2026-07-08" → "jul-2026". */
export function mesAnio(iso: string): string {
  if (!iso) return '—';
  const [a, m] = iso.split('-').map(Number);
  return `${MESES[m - 1]}-${a}`;
}
/** "2026-07-08" → "8 de julio de 2026". */
export function fechaLarga(iso: string): string {
  const [a, m, d] = iso.split('-').map(Number);
  return `${d} de ${MESES_LARGOS[m - 1]} de ${a}`;
}

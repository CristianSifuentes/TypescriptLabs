/**
 * Verificador de TypeScript Atlas.
 *
 * TypeScript no tiene un `-langversion` como C#: cada versión del compilador ES una versión del
 * lenguaje. Por eso este verificador descarga de npm los compiladores REALES de cada época y
 * comprueba cada bloque ```ts del atlas contra ellos.
 *
 * Marcas en Markdown
 *   <!-- ts=4.1 -->            versión de debut por defecto para los bloques siguientes del archivo
 *   ```ts ts=4.1               versión de debut de este bloque: debe compilar con TypeScript 4.1
 *   ```ts debut                además debe FALLAR con la versión menor anterior (prueba de debut)
 *   ```ts run                  se emite, se ejecuta en Node y la salida se compara con los `// → texto`
 *   ```ts err=TS2322           debe fallar con ese código (alternativas con `/`, varios con `,`)
 *   ```ts hasta=5.9            compila hasta 5.9 y debe fallar a partir de la versión siguiente
 *   ```ts luego=TS5107         código esperado tras `hasta`
 *   ```ts solo=6.0             se comprueba únicamente con esa versión
 *   ```ts opts=a,b:valor       opciones extra del compilador (listas con `+`: lib:es2022+dom)
 *   ```ts esm                  se ejecuta como módulo ES (para `await` de nivel superior)
 *   ```ts script               el archivo es un script global, no un módulo
 *   ```ts predeterminado       sin las opciones del atlas: solo los valores por defecto del compilador
 *   ```ts omitir               no se comprueba (fragmento ilustrativo)
 *   `// @filename: a.ts`       dentro de un bloque: empieza un archivo virtual nuevo
 *   `//    ^? const x: number` el editor debe mostrar exactamente ese tipo en la columna del ^
 *
 * Además de su versión de debut, cada bloque se comprueba con las versiones vigentes
 * (5.9, 6.0 y 7.0; con --beta, también 7.1), salvo que `hasta` diga lo contrario.
 *
 * Uso:
 *   node tools/verificar-ejemplos.ts [--solo TEXTO] [--lista] [--beta] [--node RUTA] [--hilos N]
 */
import { execFile, spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { cpus, tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import {
  CORTE, RAIZ, aArgumentos, asegurarCompilador, cmp, ge, leerVersiones, lt, modo,
  opcionesDeComprobacion, opcionesDeEmision,
} from './comun.ts';
import type { Opciones, Version } from './comun.ts';
import type { Diagnostico, Resultado, Trabajo } from './obrero-compilador.ts';

const ejecutar = promisify(execFile);
const AQUI = dirname(fileURLToPath(import.meta.url));

// --------------------------------------------------------------------------- modelo

interface Consulta { archivo: string; posicion: number; esperado: string; linea: number }

interface Bloque {
  archivo: string;
  linea: number;
  lenguaje: 'ts' | 'tsx' | 'js';
  codigo: string;
  ts: string;
  hasta?: string;
  luego: string[];
  solo?: string;
  debut: boolean;
  run: boolean;
  esm: boolean;
  script: boolean;
  predeterminado: boolean;
  omitir: boolean;
  err: string[][];
  opts: Opciones;
}

type Expectativa = 'compila' | 'error' | 'falla' | 'sin-codigos';

interface Comprobacion {
  bloque: Bloque;
  version: string;
  expectativa: Expectativa;
  codigos: string[][];
  ejecutar: boolean;
  consultar: boolean;
}

const ACTUAL = '7.0';
const ORACULO = '6.0'; // última versión con servicio de lenguaje cargable en proceso

// --------------------------------------------------------------------------- lectura de Markdown

function leerBloques(ruta: string, porDefecto: string): Bloque[] {
  const bloques: Bloque[] = [];
  const lineas = readFileSync(ruta, 'utf8').split('\n');
  let ts = porDefecto;
  for (let i = 0; i < lineas.length; i++) {
    const directiva = /^\s*<!--\s*ts=([\d.]+)\s*-->\s*$/.exec(lineas[i]);
    if (directiva) { ts = directiva[1]; continue; }
    const apertura = /^(\s*)(`{3,})(ts|tsx|js)\b(.*)$/.exec(lineas[i]);
    if (!apertura) {
      // Cualquier otro bloque de código se salta entero para no confundir su contenido con marcas.
      const otra = /^(\s*)(`{3,})/.exec(lineas[i]);
      if (otra) { i++; while (i < lineas.length && !lineas[i].trimStart().startsWith(otra[2])) i++; }
      continue;
    }
    const [, sangria, valla, lenguaje, info] = apertura;
    const inicio = i + 1;
    const cuerpo: string[] = [];
    i++;
    while (i < lineas.length && !new RegExp(`^\\s*${valla}\\s*$`).test(lineas[i])) {
      cuerpo.push(lineas[i].startsWith(sangria) ? lineas[i].slice(sangria.length) : lineas[i]);
      i++;
    }
    const b: Bloque = {
      archivo: ruta, linea: inicio, lenguaje: lenguaje as Bloque['lenguaje'], codigo: cuerpo.join('\n'),
      ts, luego: [], debut: false, run: false, esm: false, script: false, predeterminado: false, omitir: false, err: [], opts: {},
    };
    let verificarJs = false;
    for (const palabra of info.trim().split(/\s+/).filter(Boolean)) {
      const [k, v] = palabra.includes('=') ? [palabra.slice(0, palabra.indexOf('=')), palabra.slice(palabra.indexOf('=') + 1)] : [palabra, ''];
      if (k === 'ts' && v) b.ts = v;
      else if (k === 'hasta' && v) b.hasta = v;
      else if (k === 'solo' && v) b.solo = v;
      else if (k === 'luego' && v) b.luego = v.split(',');
      else if (k === 'err' && v) b.err = v.split(',').map((g) => g.split('/'));
      else if (k === 'opts' && v) {
        for (const par of v.split(',')) {
          const [nombre, valor] = par.includes(':') ? [par.slice(0, par.indexOf(':')), par.slice(par.indexOf(':') + 1)] : [par, 'true'];
          const esLista = /^(lib|types|typeRoots|rootDirs|moduleSuffixes|customConditions)$/.test(nombre);
          b.opts[nombre] = valor === 'true' ? true : valor === 'false' ? false : esLista || valor.includes('+') ? valor.split('+') : valor;
        }
      }
      else if (k === 'debut') b.debut = true;
      else if (k === 'run') b.run = true;
      else if (k === 'esm') b.esm = true;
      else if (k === 'script') b.script = true;
      else if (k === 'predeterminado') b.predeterminado = true;
      else if (k === 'omitir') b.omitir = true;
      else if (k === 'verificar') verificarJs = true;
      else throw new Error(`${relative(RAIZ, ruta)}:${inicio}: marca desconocida «${palabra}»`);
    }
    if (lenguaje === 'js' && !verificarJs) b.omitir = true;
    bloques.push(b);
  }
  return bloques;
}

/** Divide un bloque en archivos virtuales (`// @filename: x.ts`) y localiza las consultas `// ^?`. */
function archivosDe(b: Bloque): { archivos: { nombre: string; texto: string }[]; consultas: Consulta[] } {
  const archivos: { nombre: string; lineas: string[]; primera: number }[] = [];
  let actual = { nombre: `ejemplo.${b.lenguaje}`, lineas: [] as string[], primera: b.linea + 1 };
  const lineas = b.codigo.split('\n');
  lineas.forEach((l, n) => {
    const m = /^\/\/\s*@filename:\s*(\S+)\s*$/.exec(l);
    if (m) {
      if (actual.lineas.some((x) => x.trim() !== '')) archivos.push(actual);
      actual = { nombre: m[1], lineas: [], primera: b.linea + n + 2 };
    } else actual.lineas.push(l);
  });
  archivos.push(actual);

  const consultas: Consulta[] = [];
  for (const a of archivos) {
    let desplazamiento = 0;
    const inicios = a.lineas.map((l) => { const d = desplazamiento; desplazamiento += l.length + 1; return d; });
    a.lineas.forEach((l, n) => {
      const m = /^(\s*\/\/\s*)\^\?\s?(.*)$/.exec(l);
      if (!m) return;
      let objetivo = n - 1;
      while (objetivo >= 0 && /^\s*\/\/\s*\^\?/.test(a.lineas[objetivo])) objetivo--;
      if (objetivo < 0) throw new Error(`${relative(RAIZ, b.archivo)}:${a.primera + n}: consulta ^? sin línea anterior`);
      consultas.push({ archivo: a.nombre, posicion: inicios[objetivo] + m[1].length, esperado: m[2].trim(), linea: a.primera + n });
    });
  }
  return { archivos: archivos.map((a) => ({ nombre: a.nombre, texto: a.lineas.join('\n') })), consultas };
}

// --------------------------------------------------------------------------- planificación

function planificar(bloques: Bloque[], versiones: Version[], vigentes: string[]): Comprobacion[] {
  const verificables = versiones.filter((v) => v.parche !== '').map((v) => v.version);
  const anterior = (v: string): string | undefined => verificables.filter((x) => lt(x, v)).at(-1);
  const siguiente = (v: string): string | undefined => verificables.find((x) => cmp(x, v) > 0 && cmp(x, vigentes.at(-1) as string) <= 0);
  const plan: Comprobacion[] = [];

  for (const b of bloques.filter((x) => !x.omitir)) {
    const donde = `${relative(RAIZ, b.archivo)}:${b.linea}`;
    if (!verificables.includes(b.ts)) throw new Error(`${donde}: no hay compilador verificable para ts=${b.ts}`);
    const positiva: Expectativa = b.err.length ? 'error' : 'compila';
    const validas = b.solo
      ? [b.solo]
      : [...new Set([b.ts, ...vigentes.filter((v) => ge(v, b.ts))])].filter((v) => !b.hasta || cmp(v, b.hasta) <= 0);
    const oraculo = validas.includes(ORACULO) ? ORACULO : validas.filter((v) => modo(v) === 'api').at(-1);
    for (const v of validas) {
      plan.push({
        bloque: b, version: v, expectativa: positiva, codigos: b.err,
        ejecutar: b.run && (v === b.ts || v === ACTUAL || v === b.solo),
        consultar: v === oraculo,
      });
    }
    if (b.debut && !b.solo) {
      const previa = anterior(b.ts);
      if (!previa) throw new Error(`${donde}: «debut» sin versión anterior verificable`);
      plan.push({ bloque: b, version: previa, expectativa: b.err.length ? 'sin-codigos' : 'falla', codigos: b.err, ejecutar: false, consultar: false });
    }
    if (b.hasta && !b.solo) {
      const posteriores = new Set([siguiente(b.hasta), ...vigentes.filter((v) => cmp(v, b.hasta as string) > 0)].filter(Boolean) as string[]);
      for (const v of posteriores) {
        plan.push({ bloque: b, version: v, expectativa: 'falla', codigos: b.luego.map((c) => c.split('/')), ejecutar: false, consultar: false });
      }
    }
  }
  return plan;
}

/** Opciones de comprobación y de emisión de un bloque para una versión concreta. */
function opcionesDe(b: Bloque, version: string): { comprobar: Opciones; emitir: Opciones } {
  const opts = { ...b.opts };
  if (b.script && ge(version, '4.7')) opts.moduleDetection = 'auto';
  return {
    comprobar: b.predeterminado ? opts : opcionesDeComprobacion(version, opts, b.lenguaje),
    emitir: opcionesDeEmision(version, opts, b.esm),
  };
}

function trabajoDe(c: Comprobacion, id: string): { trabajo: Trabajo; consultas: Consulta[] } {
  const b = c.bloque;
  const { archivos, consultas } = archivosDe(b);
  // Antes de `moduleDetection` (4.7), un archivo es módulo solo si importa o exporta algo.
  const forzarModulo = !b.script && !b.predeterminado && ge(c.version, '1.5') && lt(c.version, '4.7');
  const opciones = opcionesDe(b, c.version);
  const trabajo: Trabajo = {
    id,
    archivos: archivos.map((a) => ({
      nombre: a.nombre,
      texto: forzarModulo && /\.tsx?$/.test(a.nombre) && !a.nombre.endsWith('.d.ts') ? `${a.texto}\nexport {};\n` : a.texto,
    })),
    opciones: opciones.comprobar,
  };
  if (c.ejecutar) trabajo.opcionesEmision = opciones.emitir;
  if (c.consultar && consultas.length) trabajo.consultas = consultas.map((q) => ({ archivo: q.archivo, posicion: q.posicion }));
  return { trabajo, consultas };
}

// --------------------------------------------------------------------------- compiladores

function ejecutarObrero(dirPaquete: string, trabajos: Trabajo[]): Promise<Resultado[]> {
  return new Promise((resolver, rechazar) => {
    const hijo = spawn(process.execPath, ['--max-old-space-size=4096', join(AQUI, 'obrero-compilador.ts'), dirPaquete], { stdio: ['pipe', 'pipe', 'pipe'] });
    let salida = '';
    let errores = '';
    hijo.stdout.on('data', (d) => { salida += d; });
    hijo.stderr.on('data', (d) => { errores += d; });
    hijo.on('error', rechazar);
    hijo.on('close', () => {
      const m = /@@ATLAS-INICIO@@([\s\S]*)@@ATLAS-FIN@@/.exec(salida);
      if (!m) rechazar(new Error(`El obrero de ${dirPaquete} no respondió:\n${errores.slice(0, 2000)}`));
      else resolver(JSON.parse(m[1]));
    });
    hijo.stdin.end(JSON.stringify(trabajos));
  });
}

const PATRON_ERROR = /^(?:(.+?)\((\d+),\d+\): )?error (TS\d+): (.*)$/;

function leerErrores(texto: string, dir: string): Diagnostico[] {
  const errores: Diagnostico[] = [];
  for (const linea of texto.split(/\r?\n/)) {
    const m = PATRON_ERROR.exec(linea.trim());
    if (m) errores.push({ codigo: m[3], mensaje: m[4], archivo: m[1] ? relative(dir, join(dir, m[1])) : '', linea: Number(m[2] ?? 0) });
  }
  return errores;
}

function leerSalida(dir: string, base = dir): Record<string, string> {
  const js: Record<string, string> = {};
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const ruta = join(dir, e.name);
    if (e.isDirectory()) Object.assign(js, leerSalida(ruta, base));
    else if (/\.[cm]?js$/.test(e.name)) js[relative(base, ruta)] = readFileSync(ruta, 'utf8');
  }
  return js;
}

async function invocar(args: string[], cwd: string): Promise<{ texto: string; codigo: number }> {
  try {
    const r = await ejecutar(process.execPath, args, { cwd, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, timeout: 120_000 });
    return { texto: r.stdout + r.stderr, codigo: 0 };
  } catch (e) {
    const x = e as { stdout?: string; stderr?: string; code?: number; message: string };
    return { texto: `${x.stdout ?? ''}${x.stderr ?? ''}` || x.message, codigo: typeof x.code === 'number' ? x.code : 1 };
  }
}

/** Compiladores sin API cargable: el original (0.8–1.4) y el nativo (7.x). Se invocan por línea de comandos. */
async function compilarPorCli(version: string, dirPaquete: string, t: Trabajo, opciones: Opciones, emision?: Opciones): Promise<Resultado> {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-'));
  try {
    for (const a of t.archivos) {
      mkdirSync(dirname(join(dir, a.nombre)), { recursive: true });
      writeFileSync(join(dir, a.nombre), a.texto);
    }
    const nombres = t.archivos.map((a) => a.nombre).filter((n) => !n.endsWith('.json'));
    if (modo(version) === 'cli') {
      const r = await invocar([join(dirPaquete, 'bin', 'tsc.js'), ...nombres, ...aArgumentos(opciones)], dir);
      const errores = leerErrores(r.texto, dir);
      // Los compiladores más antiguos avisan de una opción desconocida, pero terminan con código 0.
      const desconocida = /Unknown (?:compiler )?option '?([\w-]+)'?/i.exec(r.texto);
      if (desconocida) errores.push({ codigo: 'TS5023', mensaje: `Unknown option '${desconocida[1]}'`, archivo: '', linea: 0 });
      if (r.codigo !== 0 && errores.length === 0) errores.push({ codigo: 'TS0', mensaje: r.texto.trim().slice(0, 400), archivo: '', linea: 0 });
      return { id: t.id, errores, js: emision ? leerSalida(dir) : undefined };
    }
    const tsc = join(dirPaquete, 'bin', 'tsc');
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { ...opciones, noEmit: true, types: [] }, files: nombres }, null, 2));
    const r = await invocar([tsc, '-p', dir, '--pretty', 'false'], dir);
    const errores = leerErrores(r.texto, dir);
    if (r.codigo !== 0 && errores.length === 0) errores.push({ codigo: 'TS0', mensaje: r.texto.trim().slice(0, 400), archivo: '', linea: 0 });
    let js: Record<string, string> | undefined;
    if (emision) {
      writeFileSync(join(dir, 'tsconfig.emision.json'), JSON.stringify({ compilerOptions: { ...emision, types: [], outDir: 'salida', rootDir: '.' }, files: nombres }, null, 2));
      await invocar([tsc, '-p', join(dir, 'tsconfig.emision.json'), '--pretty', 'false'], dir);
      try { js = leerSalida(join(dir, 'salida')); } catch { js = {}; }
    }
    return { id: t.id, errores, js };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function ejecutarJs(js: Record<string, string>, entrada: string, esm: boolean, node: string): Promise<{ salida: string[]; error?: string }> {
  const dir = mkdtempSync(join(tmpdir(), 'atlas-run-'));
  try {
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ type: esm ? 'module' : 'commonjs' }));
    for (const [nombre, texto] of Object.entries(js)) {
      mkdirSync(dirname(join(dir, nombre)), { recursive: true });
      writeFileSync(join(dir, nombre), texto);
    }
    try {
      const r = await ejecutar(node, [join(dir, entrada)], { cwd: dir, encoding: 'utf8', timeout: 30_000 });
      return { salida: r.stdout.split('\n').map((l) => l.trimEnd()).filter((l, i, a) => !(i === a.length - 1 && l === '')) };
    } catch (e) {
      const x = e as { stdout?: string; stderr?: string; message: string };
      return { salida: (x.stdout ?? '').split('\n'), error: (x.stderr || x.message).split('\n').filter((l) => l.trim()).slice(0, 6).join('\n') };
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function enParalelo<T, R>(elementos: T[], limite: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const resultados: R[] = new Array(elementos.length);
  let siguiente = 0;
  await Promise.all(Array.from({ length: Math.min(limite, elementos.length) }, async () => {
    while (siguiente < elementos.length) {
      const i = siguiente++;
      resultados[i] = await f(elementos[i]);
    }
  }));
  return resultados;
}

// --------------------------------------------------------------------------- evaluación

const normalizar = (s: string): string => s.replace(/\s+/g, ' ').trim();

function evaluar(c: Comprobacion, r: Resultado): string | undefined {
  if (r.fallo) return c.expectativa === 'falla' ? undefined : `el compilador lanzó una excepción: ${r.fallo}`;
  const codigos = new Set(r.errores.map((e) => e.codigo));
  const listado = r.errores.slice(0, 6).map((e) => `    ${e.archivo}:${e.linea} ${e.codigo} ${e.mensaje.split('\n')[0].slice(0, 180)}`).join('\n');
  const faltan = c.codigos.filter((grupo) => !grupo.some((x) => codigos.has(x))).map((g) => g.join('/'));
  switch (c.expectativa) {
    case 'compila':
      return r.errores.length ? `debía compilar y dio ${r.errores.length} error(es):\n${listado}` : undefined;
    case 'error':
      if (!r.errores.length) return `debía fallar con ${c.codigos.map((g) => g.join('/')).join(', ')} y compiló`;
      return faltan.length ? `faltan los códigos ${faltan.join(', ')}; se obtuvo:\n${listado}` : undefined;
    case 'falla':
      if (!r.errores.length) return 'debía fallar (la característica no existía o ya fue retirada) y compiló';
      return faltan.length ? `falló, pero sin ${faltan.join(', ')}; se obtuvo:\n${listado}` : undefined;
    case 'sin-codigos': {
      const presentes = c.codigos.flat().filter((x) => codigos.has(x));
      return presentes.length ? `la comprobación ${presentes.join(', ')} ya existía en esta versión` : undefined;
    }
  }
}

// --------------------------------------------------------------------------- principal

async function principal(): Promise<number> {
  const args = process.argv.slice(2);
  const opcion = (nombre: string): string | undefined => { const i = args.indexOf(nombre); return i >= 0 ? args[i + 1] : undefined; };
  const solo = opcion('--solo');
  const node = opcion('--node') ?? process.env.ATLAS_NODE ?? process.execPath;
  const hilos = Number(opcion('--hilos') ?? Math.max(2, cpus().length));
  const vigentes = ['5.9', '6.0', ACTUAL, ...(args.includes('--beta') ? ['7.1'] : [])];

  const versiones = leerVersiones();
  const parche = new Map(versiones.map((v) => [v.version, v.parche]));
  const archivos = [join(RAIZ, 'README.md'), ...readdirSync(join(RAIZ, 'docs')).filter((f) => f.endsWith('.md')).sort().map((f) => join(RAIZ, 'docs', f))];
  const bloques = archivos.filter((f) => !solo || f.includes(solo)).flatMap((f) => leerBloques(f, ACTUAL));
  const activos = bloques.filter((b) => !b.omitir);

  if (args.includes('--lista')) {
    console.log(`${bloques.length} bloques, ${activos.length} verificables, ${bloques.length - activos.length} ilustrativos`);
    return 0;
  }

  const plan = planificar(bloques, versiones, vigentes);
  const porVersion = new Map<string, Comprobacion[]>();
  for (const c of plan) porVersion.set(c.version, [...(porVersion.get(c.version) ?? []), c]);
  const usadas = [...porVersion.keys()].sort(cmp);
  console.log(`TypeScript Atlas · ${activos.length} bloques verificables de ${bloques.length} · ${plan.length} comprobaciones con ${usadas.length} compiladores`);
  for (const v of usadas) asegurarCompilador(parche.get(v) as string);

  const { stdout: versionNode } = await ejecutar(node, ['--version'], { encoding: 'utf8' });
  const fallos: string[] = [];
  let ejecutados = 0;
  let consultasComprobadas = 0;

  const procesarVersion = async (v: string): Promise<void> => {
    const comprobaciones = porVersion.get(v) as Comprobacion[];
    const dir = asegurarCompilador(parche.get(v) as string);
    const preparados = comprobaciones.map((c, i) => ({ c, ...trabajoDe(c, String(i)) }));
    let resultados: Resultado[];
    if (modo(v) === 'api') {
      resultados = await ejecutarObrero(dir, preparados.map((p) => p.trabajo));
    } else {
      resultados = await enParalelo(preparados, modo(v) === 'nativo' ? hilos : 2, (p) => {
        const opciones = opcionesDe(p.c.bloque, v);
        return compilarPorCli(v, dir, p.trabajo, opciones.comprobar, p.c.ejecutar ? opciones.emitir : undefined);
      });
    }
    for (const [i, p] of preparados.entries()) {
      const r = resultados[i];
      const b = p.c.bloque;
      const donde = `${relative(RAIZ, b.archivo)}:${b.linea} · TypeScript ${parche.get(v)}`;
      const problema = evaluar(p.c, r);
      if (problema) { fallos.push(`✗ ${donde}\n  ${problema}`); continue; }
      if (p.c.consultar && p.consultas.length) {
        p.consultas.forEach((q, n) => {
          consultasComprobadas++;
          const obtenido = r.tipos?.[n] ?? null;
          if (obtenido === null || normalizar(obtenido) !== normalizar(q.esperado)) {
            fallos.push(`✗ ${relative(RAIZ, b.archivo)}:${q.linea} · TypeScript ${parche.get(v)}\n  tipo distinto\n    esperado: ${q.esperado}\n    obtenido: ${obtenido === null ? '(nada)' : normalizar(obtenido)}`);
          }
        });
      }
      if (p.c.ejecutar && p.c.expectativa === 'compila') {
        ejecutados++;
        const js = r.js ?? {};
        const ultimo = p.trabajo.archivos.filter((a) => /\.(ts|tsx|js)$/.test(a.nombre) && !a.nombre.endsWith('.d.ts')).at(-1)?.nombre ?? '';
        const entrada = ultimo.replace(/\.tsx?$/, '.js');
        if (!(entrada in js)) { fallos.push(`✗ ${donde}\n  no se emitió ${entrada}; se emitió: ${Object.keys(js).join(', ') || 'nada'}`); continue; }
        const esperado = [...b.codigo.matchAll(/\/\/\s*→\s?(.*)$/gm)].map((m) => m[1].trimEnd());
        const { salida, error } = await ejecutarJs(js, entrada, b.esm, node);
        if (error || salida.length !== esperado.length || salida.some((l, n) => l !== esperado[n])) {
          fallos.push(`✗ ${donde}\n  salida distinta al ejecutar\n    esperado: ${JSON.stringify(esperado)}\n    obtenido: ${JSON.stringify(salida)}${error ? `\n    ${error.replace(/\n/g, '\n    ')}` : ''}`);
        }
      }
    }
  };

  // Los obreros en proceso consumen memoria: se limita cuántas versiones se comprueban a la vez.
  await enParalelo(usadas, Math.max(1, Math.min(hilos, 4)), procesarVersion);

  const negativos = activos.filter((b) => b.err.length).length;
  const debuts = activos.filter((b) => b.debut).length;
  for (const f of fallos.sort()) console.log(`\n${f}`);
  console.log(
    `\n${plan.length - fallos.length}/${plan.length} comprobaciones correctas · ${activos.length} bloques · ${ejecutados} ejecuciones en Node ${versionNode.trim()} · ` +
    `${negativos} con error esperado · ${debuts} pruebas de debut · ${consultasComprobadas} tipos consultados · ${bloques.length - activos.length} ilustrativos`,
  );

  if (!solo) {
    const informe = {
      corte: CORTE,
      node: versionNode.trim(),
      compiladores: Object.fromEntries(usadas.map((v) => [v, parche.get(v)])),
      bloques: bloques.length,
      verificables: activos.length,
      ilustrativos: bloques.length - activos.length,
      comprobaciones: plan.length,
      ejecutados: activos.filter((b) => b.run).length,
      ejecuciones: ejecutados,
      negativos,
      debuts,
      tiposConsultados: consultasComprobadas,
      fallos: fallos.length,
    };
    writeFileSync(join(RAIZ, 'data', 'verificacion.json'), `${JSON.stringify(informe, null, 2)}\n`);
  }
  return fallos.length ? 1 : 0;
}

principal().then((codigo) => { process.exitCode = codigo; }, (e) => { console.error(e instanceof Error ? e.message : e); process.exitCode = 2; });

/**
 * Extrae de los compiladores reales el ciclo de vida de cada opción de `tsconfig.json`.
 *
 * Para cada versión de TypeScript en caché se pregunta al propio compilador qué opciones declara
 * y qué responde al usarlas: nada (vigente), «is deprecated» (obsoleta: TS5101/TS5107),
 * «has been removed» (retirada: TS5102/TS5108) o «Unknown compiler option» (ausente: TS5023).
 *
 * Salidas:
 *   data/opciones.csv              opcion, tipo, categoria, desde, obsoleta, retirada, descripcion
 *   data/valores-de-opciones.csv   opcion, valor, desde, obsoleta, retirada
 *
 * Uso:  node tools/extraer-opciones.ts      (tarda alrededor de un minuto)
 */
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { RAIZ, asegurarCompilador, cmp, leerVersiones, modo } from './comun.ts';

type Estado = 'vigente' | 'obsoleta' | 'retirada';

interface DatosDeVersion {
  /** Opciones que la versión reconoce, con su estado. */
  opciones: Record<string, { estado: Estado; tipo: string; categoria: string; descripcion: string }>;
  /** `true` si las descripciones vienen de la traducción oficial al español. */
  traducida?: boolean;
  /** Valores de las opciones enumeradas, con su estado. */
  valores: Record<string, Record<string, Estado>>;
}

const AQUI = fileURLToPath(import.meta.url);
const ENUMERADAS = ['target', 'module', 'moduleResolution', 'jsx', 'moduleDetection', 'newLine', 'lib'];
/** Solo existen en la línea de comandos: no son opciones de `tsconfig.json`. */
const SOLO_CLI = ['help', 'all', 'version', 'init', 'project', 'build', 'watch', 'showConfig', 'listFilesOnly', 'locale', 'ignoreConfig'];
/** Opciones del compilador nativo cuya ayuda no declara el tipo. */
const TIPOS_NATIVOS: Record<string, string> = { checkers: 'number', quiet: 'boolean', singleThreaded: 'boolean', pprofDir: 'string' };

function estadoDe(codigos: string[]): Estado | undefined {
  // TS4124: «is unstable. Use nightly TypeScript»: el valor existía en el código, pero no en la versión estable.
  if (codigos.includes('TS4124')) return undefined;
  if (codigos.some((c) => c === 'TS5102' || c === 'TS5108')) return 'retirada';
  if (codigos.some((c) => c === 'TS5101' || c === 'TS5107')) return 'obsoleta';
  return 'vigente';
}

// --------------------------------------------------------------------------- compiladores cargables (1.5 – 6.x)

function obrero(dirPaquete: string): void {
  const requerir = createRequire(import.meta.url);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ts: any = requerir(dirPaquete);
  const dirLib = dirname(ts.getDefaultLibFilePath({}));
  const rutaEs = join(dirLib, 'es', 'diagnosticMessages.generated.json');
  const es: Record<string, string> = existsSync(rutaEs) ? JSON.parse(readFileSync(rutaEs, 'utf8')) : {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const texto = (m: any): string => (m ? es[m.key] ?? m.message ?? '' : '');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cache = new Map<string, any>();
  const archivo = '/atlas/a.ts';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function diagnosticar(opciones: Record<string, unknown>, nombre: string, valor?: string): string[] {
    const json = { ...opciones };
    const r = typeof ts.convertCompilerOptionsFromJson === 'function'
      ? ts.convertCompilerOptionsFromJson(json, '/atlas')
      : { options: ts.parseCommandLine(Object.entries(json).flatMap(([k, v]) => (v === true ? [`--${k}`] : [`--${k}`, String(v)]))).options, errors: [] };
    const o = r.options;
    if (!o.noEmit && !o.outDir && !o.outFile && !o.out) o.outDir = '/atlas/salida';
    const host = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getSourceFile(f: string, lv: any) {
        if (f === archivo) return ts.createSourceFile(f, 'export {};', lv, true);
        const k = `${f}|${JSON.stringify(lv)}`;
        if (!cache.has(k) && f.startsWith(dirLib) && existsSync(f)) cache.set(k, ts.createSourceFile(f, readFileSync(f, 'utf8'), lv, true));
        return cache.get(k);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getDefaultLibFileName: (x: any) => ts.getDefaultLibFilePath(x),
      getDefaultLibLocation: () => dirLib,
      writeFile: () => undefined,
      getCurrentDirectory: () => '/atlas',
      getDirectories: () => [],
      getCanonicalFileName: (f: string) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (f: string) => f === archivo || (f.startsWith(dirLib) && existsSync(f)),
      readFile: (f: string) => (f === archivo ? 'export {};' : f.startsWith(dirLib) && existsSync(f) ? readFileSync(f, 'utf8') : undefined),
      directoryExists: (d: string) => d === '/atlas' || d.startsWith(dirLib),
      realpath: (f: string) => f,
    };
    let diagnosticos = [...(r.errors ?? [])];
    try {
      const programa = ts.createProgram([archivo], o, host);
      diagnosticos = diagnosticos.concat(programa.getOptionsDiagnostics?.() ?? [], programa.getGlobalDiagnostics?.() ?? []);
    } catch { /* una combinación imposible no dice nada sobre la opción */ }
    // Un alias se anuncia con su nombre canónico ('moduleResolution=node10' para `node`): basta con que nombre la opción.
    const marca = valor === undefined ? `'${nombre}'` : `'${nombre}=`;
    return diagnosticos
      .filter((d) => [4124, 5101, 5102, 5107, 5108].includes(d.code))
      .filter((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n').toLowerCase().includes(marca.toLowerCase()))
      .map((d) => `TS${d.code}`);
  }

  const datos: DatosDeVersion = { opciones: {}, valores: {}, traducida: Object.keys(es).length > 0 };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const d of ts.optionDeclarations as any[]) {
    if (d.isCommandLineOnly || SOLO_CLI.includes(d.name)) continue;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const claves = (t: any): string[] => (t instanceof Map ? [...t.keys()] : t && typeof t === 'object' ? Object.keys(t) : []);
    const esEnum = typeof d.type === 'object';
    const tipo = esEnum ? 'enumerada' : d.type === 'list' ? 'lista' : String(d.type);
    // De una enumerada se prueba el último valor: el primero suele ser el predeterminado y no dispara avisos.
    const muestra: unknown = d.type === 'boolean' ? true : d.type === 'number' ? 1 : d.type === 'list' ? [] : d.type === 'object' ? {} : esEnum ? claves(d.type).at(-1) : 'x';
    datos.opciones[d.name] = {
      estado: (ENUMERADAS.includes(d.name) ? 'vigente' : estadoDe(diagnosticar({ [d.name]: muestra }, d.name))) ?? 'vigente',
      tipo,
      categoria: texto(d.category),
      descripcion: texto(d.description),
    };
    if (ENUMERADAS.includes(d.name)) {
      const valores = d.name === 'lib' ? claves(d.element?.type) : claves(d.type);
      datos.valores[d.name] = {};
      for (const v of valores) {
        const estado = d.name === 'lib' ? 'vigente' : estadoDe(diagnosticar({ [d.name]: v }, d.name, v));
        if (estado) datos.valores[d.name][v] = estado;
      }
    }
  }
  process.stdout.write(`@@INICIO@@${JSON.stringify(datos)}@@FIN@@`);
}

// --------------------------------------------------------------------------- compilador nativo (7.x)

function nativo(dirPaquete: string, candidatas: Map<string, string>, valoresCandidatos: Map<string, Set<string>>): DatosDeVersion {
  const tsc = join(dirPaquete, 'bin', 'tsc');
  const ayuda = execFileSync(process.execPath, [tsc, '--help', '--all'], { encoding: 'utf8' });
  const declaradas = new Map<string, { tipo: string; descripcion: string; valores: string[] }>();
  const lineas = ayuda.split('\n');
  for (let i = 0; i < lineas.length; i++) {
    const m = /^--([A-Za-z0-9]+)/.exec(lineas[i].trim());
    if (!m) continue;
    const bloque: string[] = [];
    for (let j = i + 1; j < lineas.length && lineas[j].trim() !== '' && !lineas[j].trim().startsWith('--'); j++) bloque.push(lineas[j].trim());
    const de = bloque.find((l) => /^one (of|or more):/.test(l));
    const tipo = bloque.find((l) => l.startsWith('type:'))?.slice(5).trim() ?? (de ? (de.startsWith('one or more') ? 'lista' : 'enumerada') : 'string');
    declaradas.set(m[1], {
      tipo: tipo === 'list' ? 'lista' : tipo,
      descripcion: bloque.find((l) => !/^(type|default|one of|one or more):/.test(l)) ?? '',
      valores: de ? de.replace(/^one (of|or more):/, '').split(',').map((v) => v.trim().split('/')[0]) : [],
    });
  }

  const dir = mkdtempSync(join(tmpdir(), 'atlas-opc-'));
  const probar = (opciones: Record<string, unknown>): string[] => {
    writeFileSync(join(dir, 'a.ts'), 'export {};\n');
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { noEmit: true, ...opciones }, files: ['a.ts'] }));
    const r = spawnSync(process.execPath, [tsc, '-p', dir, '--pretty', 'false'], { encoding: 'utf8' });
    return [...`${r.stdout}${r.stderr}`.matchAll(/error (TS\d+): (.*)/g)].map((m) => `${m[1]}|${m[2]}`);
  };
  const datos: DatosDeVersion = { opciones: {}, valores: {} };
  try {
    const nombres = new Set([...candidatas.keys(), ...declaradas.keys()]);
    for (const nombre of nombres) {
      if (SOLO_CLI.includes(nombre)) continue;
      const d = declaradas.get(nombre);
      const tipo = TIPOS_NATIVOS[nombre] ?? d?.tipo ?? candidatas.get(nombre) ?? 'string';
      const muestra: unknown = tipo === 'boolean' ? true : tipo === 'number' ? 1 : tipo === 'lista' ? [] : tipo === 'object' ? {} : tipo === 'enumerada' ? d?.valores[0] ?? 'x' : 'x';
      const errores = probar({ [nombre]: muestra });
      // TS5023: desconocida. TS6266: «can only be specified on command line» (no es una opción de tsconfig.json).
      if (errores.some((e) => /^TS(5023|6266)/.test(e) && e.includes(`'${nombre}'`))) continue;
      const propios = errores.filter((e) => e.toLowerCase().includes(`'${nombre.toLowerCase()}'`)).map((e) => e.split('|')[0]);
      datos.opciones[nombre] = { estado: estadoDe(propios) ?? 'vigente', tipo, categoria: '', descripcion: d?.descripcion ?? '' };
    }
    for (const nombre of ENUMERADAS) {
      const valores = new Set([...(valoresCandidatos.get(nombre) ?? []), ...(declaradas.get(nombre)?.valores ?? [])]);
      datos.valores[nombre] = {};
      for (const v of valores) {
        const errores = probar({ [nombre]: nombre === 'lib' ? [v] : v });
        const invalido = errores.some((e) => /^TS(6046|5024|5025)/.test(e) || (e.startsWith('TS6046') && e.includes(nombre)));
        if (invalido) continue;
        const propios = errores.filter((e) => e.toLowerCase().includes(`'${nombre.toLowerCase()}=`)).map((e) => e.split('|')[0]);
        const estado = estadoDe(propios);
        if (estado) datos.valores[nombre][v] = estado;
      }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  return datos;
}

// --------------------------------------------------------------------------- principal

function csv(celda: string): string {
  return /[",\n]/.test(celda) ? `"${celda.replace(/"/g, '""')}"` : celda;
}

function principal(): void {
  const versiones = leerVersiones().filter((v) => v.parche !== '').sort((a, b) => cmp(a.version, b.version));
  const porVersion = new Map<string, DatosDeVersion>();
  const cargables = versiones.filter((v) => modo(v.version) === 'api');
  for (const v of cargables) {
    const dir = asegurarCompilador(v.parche);
    const r = spawnSync(process.execPath, ['--max-old-space-size=4096', AQUI, '--obrero', dir], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    const m = /@@INICIO@@([\s\S]*)@@FIN@@/.exec(r.stdout);
    if (!m) throw new Error(`TypeScript ${v.parche} no respondió:\n${r.stderr.slice(0, 800)}`);
    porVersion.set(v.version, JSON.parse(m[1]));
    process.stdout.write(`${v.version} `);
  }
  // Lo que cualquier versión anterior haya declarado se le pregunta también al compilador nativo.
  const candidatas = new Map<string, string>();
  const valoresCandidatos = new Map<string, Set<string>>();
  for (const d of porVersion.values()) {
    for (const [nombre, o] of Object.entries(d.opciones)) candidatas.set(nombre, o.tipo);
    for (const [nombre, vs] of Object.entries(d.valores)) {
      const conjunto = valoresCandidatos.get(nombre) ?? new Set<string>();
      for (const v of Object.keys(vs)) conjunto.add(v);
      valoresCandidatos.set(nombre, conjunto);
    }
  }
  for (const v of versiones.filter((x) => modo(x.version) === 'nativo')) {
    porVersion.set(v.version, nativo(asegurarCompilador(v.parche), candidatas, valoresCandidatos));
    process.stdout.write(`${v.version} `);
  }
  console.log();

  const orden = [...porVersion.keys()].sort(cmp);
  const estable = versiones.filter((v) => v.estado !== 'beta').map((v) => v.version).filter((v) => porVersion.has(v));
  const ciclo = (estados: (Estado | undefined)[]): { desde: string; obsoleta: string; retirada: string } => {
    const primera = estados.findIndex((e) => e !== undefined);
    const obsoleta = estados.findIndex((e) => e === 'obsoleta');
    let retirada = estados.findIndex((e, i) => i > primera && (e === 'retirada' || e === undefined));
    // Una opción que reaparece (o que solo falta en una versión intermedia) no se da por retirada.
    if (retirada >= 0 && estados.slice(retirada).some((e) => e === 'vigente')) retirada = -1;
    return { desde: orden[primera], obsoleta: obsoleta >= 0 ? orden[obsoleta] : '', retirada: retirada >= 0 ? orden[retirada] : '' };
  };

  const nombres = new Set<string>();
  for (const d of porVersion.values()) for (const n of Object.keys(d.opciones)) nombres.add(n);
  const filas = [...nombres].map((nombre) => {
    const c = ciclo(orden.map((v) => porVersion.get(v)?.opciones[nombre]?.estado));
    // La descripción es la traducción oficial al español de la última versión que la incluye; si no hay, el texto en inglés.
    const descritas = [...orden].reverse().map((v) => ({ o: porVersion.get(v)?.opciones[nombre], es: porVersion.get(v)?.traducida }));
    const ultima = (descritas.find((x) => x.es && x.o?.descripcion) ?? descritas.find((x) => x.o?.descripcion))?.o;
    const conCategoria = [...orden].reverse().map((v) => porVersion.get(v)?.opciones[nombre]).find((o) => o && o.categoria);
    const tipo = [...orden].reverse().map((v) => porVersion.get(v)?.opciones[nombre]?.tipo).find(Boolean) ?? '';
    return { nombre, tipo, categoria: conCategoria?.categoria ?? '', ...c, descripcion: ultima?.descripcion ?? '' };
  }).sort((a, b) => cmp(a.desde, b.desde) || a.nombre.localeCompare(b.nombre));

  writeFileSync(join(RAIZ, 'data', 'opciones.csv'),
    `opcion,tipo,categoria,desde,obsoleta,retirada,descripcion\n${filas.map((f) => [f.nombre, f.tipo, f.categoria, f.desde, f.obsoleta, f.retirada, f.descripcion].map(csv).join(',')).join('\n')}\n`);

  const filasDeValores: string[] = [];
  for (const nombre of ENUMERADAS) {
    const valores = new Set<string>();
    for (const d of porVersion.values()) for (const v of Object.keys(d.valores[nombre] ?? {})) valores.add(v);
    const calculadas = [...valores].map((valor) => ({ valor, ...ciclo(orden.map((v) => porVersion.get(v)?.valores[nombre]?.[valor])) }));
    for (const f of calculadas.sort((a, b) => cmp(a.desde, b.desde) || a.valor.localeCompare(b.valor))) {
      filasDeValores.push([nombre, f.valor, f.desde, f.obsoleta, f.retirada].map(csv).join(','));
    }
  }
  writeFileSync(join(RAIZ, 'data', 'valores-de-opciones.csv'), `opcion,valor,desde,obsoleta,retirada\n${filasDeValores.join('\n')}\n`);
  console.log(`${filas.length} opciones y ${filasDeValores.length} valores de ${orden.length} compiladores (${orden[0]} a ${orden.at(-1)}; estable: ${estable.at(-1)})`);
}

if (process.argv[2] === '--obrero') obrero(process.argv[3]);
else principal();

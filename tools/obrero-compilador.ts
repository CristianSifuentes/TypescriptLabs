/**
 * Obrero del verificador: carga UNA versión del compilador (TypeScript 1.5 a 6.x, es decir,
 * las que se pueden cargar en proceso con require()) y compila los trabajos que recibe.
 *
 * Protocolo: lee por stdin un arreglo JSON de trabajos y escribe por stdout un arreglo JSON
 * de resultados, delimitado por marcas para tolerar cualquier ruido del compilador.
 *
 *     node tools/obrero-compilador.ts <directorio del paquete typescript>
 */
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { aArgumentos } from './comun.ts';
import type { Opciones } from './comun.ts';

export interface Trabajo {
  id: string;
  archivos: { nombre: string; texto: string }[];
  /** Opciones de comprobación, con los nombres de `tsconfig.json`. */
  opciones: Opciones;
  /** Si está presente, se emite JavaScript con estas opciones. */
  opcionesEmision?: Opciones;
  /** Posiciones donde se consulta el tipo que mostraría el editor (`// ^?`). */
  consultas?: { archivo: string; posicion: number }[];
}

export interface Diagnostico {
  codigo: string;
  mensaje: string;
  archivo: string;
  linea: number;
}

export interface Resultado {
  id: string;
  errores: Diagnostico[];
  js?: Record<string, string>;
  tipos?: (string | null)[];
  fallo?: string;
}

const RAIZ_VIRTUAL = '/atlas';

function principal(): void {
  const requerir = createRequire(import.meta.url);
  const dirPaquete = process.argv[2];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ts: any = requerir(dirPaquete);
  const dirLib = dirname(ts.getDefaultLibFilePath({}));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const cacheLib = new Map<string, any>();

  const leerReal = (f: string): string | undefined => (f.startsWith(dirLib) && existsSync(f) ? readFileSync(f, 'utf8') : undefined);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function analizarOpciones(opciones: Opciones, errores: Diagnostico[]): any {
    // Desde la 1.8 las opciones se leen como en tsconfig.json (algunas, como `incremental` en la 3.4,
    // solo se admitían ahí); antes, como argumentos de línea de comandos.
    const r = typeof ts.convertCompilerOptionsFromJson === 'function'
      ? ts.convertCompilerOptionsFromJson(opciones, RAIZ_VIRTUAL)
      : ts.parseCommandLine(aArgumentos(opciones));
    for (const d of r.errors ?? []) errores.push(aDiagnostico(d));
    const o = r.options;
    if (parseFloat(ts.version) >= 2 && o.types === undefined) o.types = []; // sin @types implícitos
    return o;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function aDiagnostico(d: any): Diagnostico {
    let linea = 0;
    if (d.file && typeof d.start === 'number') {
      const lc = d.file.getLineAndCharacterOfPosition ? d.file.getLineAndCharacterOfPosition(d.start) : ts.getLineAndCharacterOfPosition(d.file, d.start);
      linea = lc.line + 1;
    }
    return {
      codigo: `TS${d.code}`,
      mensaje: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      archivo: d.file ? String(d.file.fileName).replace(`${RAIZ_VIRTUAL}/`, '') : '',
      linea,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function crearHost(archivos: Map<string, string>, opciones: any, salida: Map<string, string>): any {
    const huella = JSON.stringify(opciones);
    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getSourceFile(nombre: string, versionLenguaje: any) {
        const virtual = archivos.get(nombre);
        if (virtual !== undefined) return ts.createSourceFile(nombre, virtual, versionLenguaje, true);
        const k = `${nombre}|${huella}`;
        let sf = cacheLib.get(k);
        if (!sf) {
          const texto = leerReal(nombre);
          if (texto === undefined) return undefined;
          sf = ts.createSourceFile(nombre, texto, versionLenguaje, true);
          cacheLib.set(k, sf);
        }
        return sf;
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getDefaultLibFileName: (o: any) => ts.getDefaultLibFilePath(o),
      getDefaultLibLocation: () => dirLib,
      writeFile: (n: string, t: string) => { salida.set(n, t); },
      getCurrentDirectory: () => RAIZ_VIRTUAL,
      getDirectories: () => [],
      getCanonicalFileName: (f: string) => f,
      useCaseSensitiveFileNames: () => true,
      getNewLine: () => '\n',
      fileExists: (f: string) => archivos.has(f) || leerReal(f) !== undefined,
      readFile: (f: string) => archivos.get(f) ?? leerReal(f),
      directoryExists: (d: string) => d === RAIZ_VIRTUAL || d.startsWith(dirLib) || [...archivos.keys()].some((k) => k.startsWith(`${d}/`)),
      realpath: (f: string) => f,
      getEnvironmentVariable: () => undefined,
    };
  }

  function compilar(t: Trabajo): Resultado {
    const errores: Diagnostico[] = [];
    const archivos = new Map(t.archivos.map((a) => [`${RAIZ_VIRTUAL}/${a.nombre}`, a.texto]));
    const raices = [...archivos.keys()].filter((f) => !f.endsWith('.json'));
    const opciones = analizarOpciones(t.opciones, errores);
    // Sin directorio de salida, un .json de entrada chocaría con su propia emisión.
    if (!opciones.noEmit && !opciones.outDir && !opciones.outFile && !opciones.out) opciones.outDir = `${RAIZ_VIRTUAL}/salida`;
    const programa = ts.createProgram(raices, opciones, crearHost(archivos, opciones, new Map()));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const anotar = (ds: any[] | undefined): void => {
      for (const d of ds ?? []) if (d.category === ts.DiagnosticCategory.Error) errores.push(aDiagnostico(d));
    };
    anotar(programa.getOptionsDiagnostics?.());
    anotar(programa.getGlobalDiagnostics?.());
    for (const f of raices) {
      const sf = programa.getSourceFile(f);
      if (!sf) { errores.push({ codigo: 'TS6053', mensaje: `No se encontró ${f}`, archivo: f, linea: 0 }); continue; }
      anotar(programa.getSyntacticDiagnostics(sf));
      anotar(programa.getSemanticDiagnostics(sf));
    }

    const resultado: Resultado = { id: t.id, errores };

    if (t.opcionesEmision) {
      const salida = new Map<string, string>();
      const opcionesEmision = analizarOpciones(t.opcionesEmision, []);
      opcionesEmision.outDir = `${RAIZ_VIRTUAL}/salida`;
      opcionesEmision.rootDir = RAIZ_VIRTUAL;
      ts.createProgram(raices, opcionesEmision, crearHost(archivos, opcionesEmision, salida)).emit();
      resultado.js = Object.fromEntries([...salida].map(([k, v]) => [k.replace(`${RAIZ_VIRTUAL}/salida/`, ''), v]));
    }

    if (t.consultas?.length) {
      // El texto es el que muestra el editor al pasar el cursor: se obtiene del servicio de lenguaje.
      const opcionesServicio = { ...opciones };
      if (parseFloat(ts.version) >= 6) opcionesServicio.stableTypeOrdering = true;
      const servicio = ts.createLanguageService({
        getCompilationSettings: () => opcionesServicio,
        getScriptFileNames: () => raices,
        getScriptVersion: () => '1',
        getScriptSnapshot: (f: string) => {
          const texto = archivos.get(f) ?? leerReal(f);
          return texto === undefined ? undefined : ts.ScriptSnapshot.fromString(texto);
        },
        getCurrentDirectory: () => RAIZ_VIRTUAL,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getDefaultLibFileName: (o: any) => ts.getDefaultLibFilePath(o),
        fileExists: (f: string) => archivos.has(f) || leerReal(f) !== undefined,
        readFile: (f: string) => archivos.get(f) ?? leerReal(f),
        directoryExists: (d: string) => d === RAIZ_VIRTUAL || d.startsWith(dirLib),
        getDirectories: () => [],
        useCaseSensitiveFileNames: () => true,
      }, ts.createDocumentRegistry());
      resultado.tipos = t.consultas.map((c) => {
        const info = servicio.getQuickInfoAtPosition(`${RAIZ_VIRTUAL}/${c.archivo}`, c.posicion);
        return info ? ts.displayPartsToString(info.displayParts) : null;
      });
    }
    return resultado;
  }

  let entrada = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', (trozo) => { entrada += trozo; });
  process.stdin.on('end', () => {
    const trabajos: Trabajo[] = JSON.parse(entrada);
    const resultados: Resultado[] = trabajos.map((t) => {
      try {
        return compilar(t);
      } catch (e) {
        return { id: t.id, errores: [], fallo: e instanceof Error ? `${e.message}\n${e.stack ?? ''}`.slice(0, 600) : String(e) };
      }
    });
    process.stdout.write(`\n@@ATLAS-INICIO@@${JSON.stringify(resultados)}@@ATLAS-FIN@@\n`);
  });
}

principal();

<div align="center">

# 10 · TypeScript 5.5–5.9: inferencia y sintaxis borrable

**Predicados de tipo inferidos, `isolatedDeclarations`, condiciones imposibles, auxiliares de iteradores, `rewriteRelativeImportExtensions`, `erasableSyntaxOnly`, `require(esm)` e `import defer` (2024–2025)**

[⬅ 09 · TypeScript 5.0–5.4](09-typescript-5.0-5.4-decoradores-y-using.md) · [🏠 Índice](../README.md) · [11 · TypeScript 6.0 ➡](11-typescript-6.0-el-puente.md)

</div>

<!-- ts=5.5 -->

| Ficha | 5.5 | 5.6 | 5.7 | 5.8 | 5.9 |
|---|---|---|---|---|---|
| **Publicación** | 20-jun-2024 | 9-sep-2024 | 22-nov-2024 | 28-feb-2025 | 31-jul-2025 |
| **Protagonista** | Predicados inferidos | Condiciones imposibles | Reescritura de extensiones | `erasableSyntaxOnly` | `import defer` |
| **Compilador** | `5.5.4` | `5.6.3` | `5.7.3` | `5.8.3` | `5.9.3` |

> [!IMPORTANT]
> Las últimas cinco versiones del compilador escrito en TypeScript tienen dos hilos. El primero es la **inferencia**: el compilador deduce
> predicados de tipo, conserva estrechamientos y detecta condiciones que nunca pueden cambiar. El segundo es que **TypeScript deja de ser el único
> que lee TypeScript**: Node 22.18 y 23.6 ejecutan archivos `.ts` borrando los tipos, y el lenguaje se adapta con `isolatedDeclarations`,
> `rewriteRelativeImportExtensions` y `erasableSyntaxOnly`. Mientras tanto, en otro repositorio, el equipo escribía el compilador en Go.

---

## Contenido

1. [TypeScript 5.5: predicados de tipo inferidos](#1-typescript-55-predicados-de-tipo-inferidos)
2. [TypeScript 5.5: accesos indexados y expresiones regulares](#2-typescript-55-accesos-indexados-y-expresiones-regulares)
3. [TypeScript 5.5: `isolatedDeclarations` y `${configDir}`](#3-typescript-55-isolateddeclarations-y-configdir)
4. [TypeScript 5.6: condiciones imposibles y auxiliares de iteradores](#4-typescript-56-condiciones-imposibles-y-auxiliares-de-iteradores)
5. [TypeScript 5.6: importaciones de efecto y `--noCheck`](#5-typescript-56-importaciones-de-efecto-y---nocheck)
6. [TypeScript 5.7: variables nunca inicializadas y reescritura de extensiones](#6-typescript-57-variables-nunca-inicializadas-y-reescritura-de-extensiones)
7. [TypeScript 5.8: ramas de retorno y `require(esm)`](#7-typescript-58-ramas-de-retorno-y-requireesm)
8. [TypeScript 5.8: `erasableSyntaxOnly` y la sintaxis borrable](#8-typescript-58-erasablesyntaxonly-y-la-sintaxis-borrable)
9. [TypeScript 5.9: `import defer` y `tsc --init` mínimo](#9-typescript-59-import-defer-y-tsc---init-mínimo)
10. [Notas de migración](#10-notas-de-migración)
11. [Referencias](#11-referencias)

---

## 1. TypeScript 5.5: predicados de tipo inferidos

### El problema

`filter` tiene una sobrecarga que estrecha el tipo del arreglo, pero solo si el *callback* está declarado como guarda de tipo (`x is T`). Una
flecha corriente devuelve `boolean`, así que el resultado seguía conteniendo `undefined`. Durante años, la frase más repetida en los foros de
TypeScript fue «`filter` no estrecha».

```ts solo=5.4
const mezcla = [1, undefined, 2, undefined, 3];
const limpios = mezcla.filter((x) => x !== undefined);
//    ^? const limpios: (number | undefined)[]
```

### La solución

Desde la 5.5, el compilador **infiere** un predicado de tipo para una función sin anotación de retorno cuando se cumplen cuatro condiciones:
no tiene `return` explícito con varios caminos ambiguos, no modifica el parámetro, devuelve una expresión booleana ligada al parámetro, y la
condición se cumple **si y solo si** el parámetro es del tipo estrechado.

```ts run debut
const mezcla = [1, undefined, 2, undefined, 3];

const limpios = mezcla.filter((x) => x !== undefined);
//    ^? const limpios: number[]

function esTexto(x: unknown) {
    return typeof x === "string";
}
//       el compilador deduce: (x: unknown) => x is string

const valores: unknown[] = ["a", 1, "b"];
const textos = valores.filter(esTexto);
//    ^? const textos: string[]

console.log(limpios.reduce((a, b) => a + b, 0), textos.join(""));   // → 6 ab
```

La condición «si y solo si» es la que evita falsos estrechamientos. Con un número, `x => !!x` **no** infiere un predicado, porque `0` es un
número y la condición lo descarta:

```ts
const conCeros = [0, 1, undefined, 2];
const verdaderos = conCeros.filter((x) => !!x);
//    ^? const verdaderos: (number | undefined)[]
```

> [!TIP]
> Si quieres el estrechamiento con `!!x` porque sabes que no hay ceros, escribe la condición exacta: `x => x !== undefined`. El compilador
> recompensa la precisión.

---

## 2. TypeScript 5.5: accesos indexados y expresiones regulares

### Estrechamiento de accesos indexados constantes

```ts run debut
function enMayusculas(objeto: Record<string, unknown>, clave: string): string {
    if (typeof objeto[clave] === "string") {
        return objeto[clave].toUpperCase();     // 5.4: error; 5.5: string
    }
    return "";
}

console.log(enMayusculas({ nombre: "ana" }, "nombre"));   // → ANA
```

Funciona si ni el objeto ni la clave se reasignan entre la comprobación y el uso.

### Comprobación de la sintaxis de las expresiones regulares

Hasta la 5.4, un literal `/…/` era opaco para el compilador. La 5.5 analiza su sintaxis y detecta errores, referencias a grupos inexistentes y
*flags* que el `target` no admite.

```ts debut err=TS1532
const fecha = /(?<anio>\d{4})-(?<mes>\d{2})-\k<dia>/;   // error TS1532: no hay grupo llamado "dia"
```

```ts err=TS1501 opts=target:es2017
const unicode = /\p{Letter}+/u;         // correcto
const conjuntos = /[\p{L}--\p{Lu}]/v;   // error TS1501: el flag `v` exige es2024
```

### Métodos nuevos de `Set` (ES2025)

```ts run debut
const pares = new Set([2, 4, 6]);
const primos = new Set([2, 3, 5]);

console.log([...pares.union(primos)].join());          // → 2,4,6,3,5
console.log([...pares.intersection(primos)].join());   // → 2
console.log([...pares.difference(primos)].join());     // → 4,6
console.log(new Set([2]).isSubsetOf(pares));           // → true
```

### Lo demás de la 5.5

| Característica | Detalle |
|---|---|
| `@import` en JSDoc | `/** @import { Usuario } from "./tipos" */` en archivos JavaScript, sin cargar el módulo en ejecución |
| `target: es2023` | Valor válido por primera vez (las notas de la 5.0 lo daban por existente) |
| Objetos monomórficos | Compilaciones entre un 5 % y un 8 % más rápidas con la API pública |
| `transpileDeclaration` | API para generar el `.d.ts` de un solo archivo |
| Paquete | `typescriptServices.js` y `protocol.d.ts` se retiran del paquete |

---

## 3. TypeScript 5.5: `isolatedDeclarations` y `${configDir}`

### `isolatedDeclarations`

Generar los `.d.ts` de una biblioteca exigía el comprobador de tipos completo: para escribir `export const x = f()` en un `.d.ts`, alguien tiene
que saber qué devuelve `f`. Eso convierte los `.d.ts` en el cuello de botella de un monorrepo: un paquete no puede empezar hasta que sus
dependencias tengan los suyos.

Con `isolatedDeclarations`, el compilador **exige** que todo lo exportado tenga un tipo que se pueda escribir **sin inferencia entre archivos**.
A cambio, cualquier herramienta (oxc, swc, esbuild…) puede generar los `.d.ts` de cada archivo en paralelo, sin comprobar tipos.

```ts debut opts=declaration,isolatedDeclarations
export const puerto: number = 8080;
export function duplicar(n: number): number { return n * 2; }
export const nombres = ["a", "b"] as string[];   // `as` también cuenta como anotación
export const literal = "fijo";                    // un literal no necesita anotación
```

```ts opts=declaration,isolatedDeclarations err=TS9010,TS9007/TS9013
export const sinTipo = Math.random() > 0.5 ? 1 : "uno";   // error TS9010: anota el tipo
export function sinRetorno(n: number) { return n * 2; }    // error TS9007: anota el retorno
```

La opción no cambia lo que se emite: es una restricción de estilo. El editor ofrece correcciones rápidas para añadir las anotaciones que faltan.

### `${configDir}`

Una configuración compartida que hereda varios proyectos (`"extends": "@empresa/tsconfig"`) resolvía sus rutas relativas **respecto a sí
misma**, no al proyecto que la hereda. `${configDir}` es una variable que vale la carpeta del `tsconfig.json` que **usa** la configuración:

```jsonc
// @empresa/tsconfig/tsconfig.json
{
  "compilerOptions": {
    "outDir": "${configDir}/dist",
    "declarationDir": "${configDir}/tipos",
    "typeRoots": ["${configDir}/node_modules/@types"]
  },
  "include": ["${configDir}/src"]
}
```

---

<!-- ts=5.6 -->

## 4. TypeScript 5.6: condiciones imposibles y auxiliares de iteradores

### Comprobaciones de verdad y nulidad imposibles

Una condición que **siempre** es verdadera o siempre falsa por su forma sintáctica es casi siempre un error: un paréntesis mal puesto, una función
sin llamar, un objeto donde se quería una propiedad.

```ts debut err=TS2872
function esPar(n: number): boolean { return n % 2 === 0; }

if (/^\d+$/) {               // error TS2872: un literal de expresión regular siempre es verdadero
    console.log("número");
}
```

```ts err=TS2869
declare function obtener(): string;
const valor = obtener() < 0 ?? 100;   // error TS2869: el lado derecho de `??` es inalcanzable
```

| Patrón | Por qué siempre es igual |
|---|---|
| `if (/regex/)` · `if ({})` · `if ([])` · `if (() => {})` | Un objeto, arreglo, función o expresión regular siempre es verdadero |
| `x < 0 ?? 100` | Una comparación nunca es nula: el `??` sobra |
| `if (a = b)` con un literal | Una asignación de literal tiene siempre el mismo valor |

`if (true)`, `while (1)` y `if (0)` se excluyen a propósito: son idiomas legítimos.

### Auxiliares de iteradores (ES2025)

Los iteradores ganaron los métodos de los arreglos, con evaluación **perezosa**: no se calcula nada hasta que se pide.

```ts run debut
function* naturales(): Generator<number> {
    let n = 1;
    while (true) {
        yield n++;
    }
}

const cuadradosPares = naturales()
    .filter((n) => n % 2 === 0)
    .map((n) => n * n)
    .take(3)
    .toArray();

console.log(cuadradosPares.join());   // → 4,16,36
```

Para tiparlo, la 5.6 introdujo `IteratorObject` y `BuiltinIteratorReturn`, y la opción `strictBuiltinIteratorReturn` (en `--strict`): el valor
de retorno de `next()` en los iteradores nativos pasa de `any` a `undefined`.

---

## 5. TypeScript 5.6: importaciones de efecto y `--noCheck`

### `noUncheckedSideEffectImports`

`import "./estilos.css"` no importa nombres: solo ejecuta el módulo. Durante años, TypeScript **no comprobaba** que esas rutas existieran, y una
errata pasaba desapercibida hasta ejecutar.

```ts debut opts=noUncheckedSideEffectImports err=TS2882/TS2307
import "./polyfill-que-no-existe";   // error: la ruta no se resuelve
```

Para archivos que no son código (CSS, imágenes), se declara un módulo comodín:

```ts opts=noUncheckedSideEffectImports
// @filename: recursos.d.ts
declare module "*.css" {}

// @filename: principal.ts
import "./estilos.css";
```

La opción es **verdadera por defecto desde la 6.0** ([11 § Valores por defecto](11-typescript-6.0-el-puente.md#3-los-nuevos-valores-por-defecto)).

### `--noCheck` y `--build` con errores

| Característica | Para qué |
|---|---|
| `--noCheck` | Emitir JavaScript **sin** comprobar tipos: separa la transpilación (rápida) de la comprobación (lenta) en dos pasos de CI |
| `--build` con errores intermedios | Un proyecto con errores ya no detiene la construcción de los que dependen de él |
| `--stopOnBuildErrors` | Recupera el comportamiento anterior |
| Diagnósticos por región | El editor comprueba primero lo visible en pantalla: en archivos enormes, los errores aparecen antes |
| Identificadores de módulo arbitrarios | `export { x as "nombre con espacios" }` (ES2022) |

---

<!-- ts=5.7 -->

## 6. TypeScript 5.7: variables nunca inicializadas y reescritura de extensiones

### Variables nunca inicializadas

El compilador detectaba el uso de una variable antes de asignarla, pero solo en el mismo ámbito. Si el uso estaba dentro de una función anidada,
se rendía. Desde la 5.7, si una variable **no se asigna en ninguna ruta**, se avisa también allí:

```ts debut err=TS2454
function calcular(): void {
    let resultado: number;
    function mostrar(): void {
        console.log(resultado);     // error TS2454: nunca se asigna en ninguna ruta
    }
    mostrar();
}
```

### `rewriteRelativeImportExtensions`

Con la eliminación de tipos de Node, un archivo `.ts` se ejecuta tal cual y sus importaciones deben apuntar a archivos `.ts`. Pero si después se
compila con `tsc`, esas importaciones deben convertirse en `.js`. Esta opción hace la conversión:

```ts debut opts=rewriteRelativeImportExtensions
// @filename: util.ts
export const version = 1;

// @filename: principal.ts
import { version } from "./util.ts";   // al emitir: "./util.js"
const v: number = version;
```

| Escrito en el código | Emitido |
|---|---|
| `"./util.ts"` | `"./util.js"` |
| `"./util.mts"` / `"./util.cts"` | `"./util.mjs"` / `"./util.cjs"` |
| `"./util.tsx"` | `"./util.js"` (o `.jsx` con `jsx: preserve`) |
| `"./util.js"`, `"paquete"`, rutas no relativas | Sin cambios |

> [!WARNING]
> Solo se reescriben las rutas **relativas y estáticas**. Un `import(variable)` no se puede reescribir, y las rutas de `paths` tampoco: el
> compilador da un error si la reescritura no es segura.

### `target: es2024` y arreglos tipados genéricos

```ts debut opts=target:es2024
const { promise, resolve } = Promise.withResolvers<number>();
resolve(42);

const bytes: Uint8Array<ArrayBuffer> = new Uint8Array(4);       // ArrayBuffer normal
declare const compartidos: Uint8Array<SharedArrayBuffer>;        // memoria compartida entre hilos
```

`Uint8Array` y sus hermanos se hicieron **genéricos** sobre el tipo de búfer. Es un cambio con consecuencias en bibliotecas que reciben o
devuelven `Buffer` de Node, y la causa de muchos errores al actualizar `@types/node` a partir de esta versión.

### Lo demás de la 5.7

| Característica | Detalle |
|---|---|
| Búsqueda de `tsconfig.json` en ancestros | El editor sigue subiendo hasta encontrar el proyecto que **contiene** el archivo |
| Caché de compilación de V8 | `module.enableCompileCache()`: `tsc --version` arranca unas 2,5 veces más rápido |
| JSON en `nodenext` | Exige `with { type: "json" }` y solo ofrece la exportación por defecto, como Node |
| Firmas de índice en clases | Las clases con métodos de nombre calculado reciben firmas de índice en los `.d.ts` |

---

<!-- ts=5.8 -->

## 7. TypeScript 5.8: ramas de retorno y `require(esm)`

### Comprobación granular de ramas de retorno

Un `return` con un operador ternario se comprobaba como un todo: si una rama era `any`, contaminaba la otra y el error desaparecía. La 5.8
comprueba **cada rama** contra el tipo declarado.

```ts debut err=TS2322
declare const cache: Map<any, any>;

function obtenerUrl(texto: string): URL {
    return cache.has(texto) ? cache.get(texto) : texto;   // error TS2322: `texto` es string, no URL
}
```

### `require()` de módulos ES

Node 22 permite `require()` de un módulo ES sin `await` de nivel superior. Con `module: nodenext`, la 5.8 lo admite también:

```ts debut opts=module:nodenext,moduleResolution:nodenext
// @filename: moderno.mts
export const valor = 1;

// @filename: clasico.cts
import moderno = require("./moderno.mjs");     // 5.7: error TS1471
const v: number = moderno.valor;
```

Para fijar el comportamiento de Node 18, que no lo permite, llegó `module: node18`; la 5.9 añadió `node20`
([16 · Módulos y resolución](16-modulos-y-resolucion.md)).

---

## 8. TypeScript 5.8: `erasableSyntaxOnly` y la sintaxis borrable

### Lo que Node puede borrar

Desde la 22.18 (y la 23.6 en la rama actual), Node ejecuta archivos `.ts` **sin compilarlos**: sustituye las anotaciones de tipo por espacios en
blanco y ejecuta lo que queda. Es rápido y conserva las posiciones de los errores, pero tiene un límite: solo funciona con sintaxis que **se puede
borrar**. Si una construcción de TypeScript genera código, borrarla rompe el programa.

| Sintaxis | ¿Se puede borrar? | Por qué |
|---|---|---|
| Anotaciones, `interface`, `type`, genéricos, `as`, `satisfies`, `!` | ✅ | Desaparecen sin dejar rastro |
| `import type`, `export type`, `declare` | ✅ | Desaparecen |
| `enum` (y `const enum`) | ❌ | Genera un objeto |
| `namespace` con código | ❌ | Genera una función autoejecutada |
| Propiedades de parámetro (`constructor(private x: number)`) | ❌ | Genera asignaciones en el constructor |
| `import x = require("…")` | ❌ | Genera un `require` |
| Decoradores experimentales | ❌ | Generan llamadas a funciones auxiliares |

### `erasableSyntaxOnly`

La opción convierte en error cada construcción de la segunda mitad de la tabla:

```ts debut opts=erasableSyntaxOnly err=TS1294
enum Estado { Activo, Inactivo }                   // error TS1294
```

```ts opts=erasableSyntaxOnly err=TS1294
class Punto {
    constructor(public x: number, public y: number) {}   // error TS1294 (dos veces)
}
```

```ts run opts=erasableSyntaxOnly
// La versión borrable de lo mismo
const Estado = { Activo: 0, Inactivo: 1 } as const;
type Estado = (typeof Estado)[keyof typeof Estado];

class Punto {
    x: number;
    y: number;
    constructor(x: number, y: number) {
        this.x = x;
        this.y = y;
    }
}

const e: Estado = Estado.Activo;
console.log(e, new Punto(1, 2).y);   // → 0 2
```

### La configuración para ejecutar `.ts` con Node

```jsonc
{
  "compilerOptions": {
    "noEmit": true,                         // Node ejecuta; tsc solo comprueba
    "module": "nodenext",
    "target": "esnext",
    "erasableSyntaxOnly": true,             // nada que Node no pueda borrar
    "verbatimModuleSyntax": true,           // los tipos se importan con `type`
    "allowImportingTsExtensions": true,     // import "./util.ts"
    "rewriteRelativeImportExtensions": true // por si algún día se compila
  }
}
```

```bash
node principal.ts            # Node 22.18+ / 23.6+: sin flags
```

> [!NOTE]
> Node **no comprueba tipos**: ejecuta código con errores de tipo sin pestañear. La comprobación sigue siendo trabajo de `tsc --noEmit` (o del
> editor). La división del trabajo es la misma que con un empaquetador, pero sin empaquetador. Los detalles de cada runtime están en
> [20 · Ecosistema y runtimes](20-ecosistema-y-runtimes.md#2-node-ejecutar-ts-borrando-los-tipos).

### Lo demás de la 5.8

| Característica | Detalle |
|---|---|
| `libReplacement` | Controla la búsqueda de `@typescript/lib-*` en `node_modules`; la 6.0 lo desactiva por defecto |
| Optimizaciones de carga | Menos normalización de rutas y menos validación repetida de opciones al arrancar |
| `module: node18` | Punto fijo: sin `require(esm)`, con aserciones de importación |
| Comprobación de tipos de retorno condicionales | Se pospuso a la 5.9 y finalmente a una versión posterior |

---

<!-- ts=5.9 -->

## 9. TypeScript 5.9: `import defer` y `tsc --init` mínimo

### `import defer`

Una importación ES **evalúa** el módulo importado antes que el que importa, lo use o no. Con módulos pesados que solo hacen falta en un camino
poco frecuente, es tiempo de arranque perdido. `import defer` (stage 3) carga el módulo pero **retrasa su evaluación** hasta el primer acceso a
una de sus exportaciones.

```ts debut
// @filename: pesado.ts
console.log("evaluando el módulo pesado");
export function calcular(): number { return 42; }

// @filename: principal.ts
import defer * as pesado from "./pesado";

export function alPulsar(): number {
    return pesado.calcular();   // el módulo se evalúa aquí, en el primer uso
}
```

Solo se admite la forma de espacio de nombres (`* as`), y TypeScript **no la transforma**: exige `module: esnext` o `preserve` y un runtime o
empaquetador que la entienda.

### `tsc --init` mínimo

El `tsconfig.json` que generaba `tsc --init` tenía **113 líneas**, casi todas comentarios que nadie leía. El de la 5.9 tiene **44** y activa una
configuración moderna. Esto es lo que generan, idéntico, la 5.9 y la 7.0:

```jsonc
{
  // Visit https://aka.ms/tsconfig to read more about this file
  "compilerOptions": {
    // File Layout
    // "rootDir": "./src",
    // "outDir": "./dist",

    // Environment Settings
    // See also https://aka.ms/tsconfig/module
    "module": "nodenext",
    "target": "esnext",
    "types": [],
    // For nodejs:
    // "lib": ["esnext"],
    // "types": ["node"],
    // and npm install -D @types/node

    // Other Outputs
    "sourceMap": true,
    "declaration": true,
    "declarationMap": true,

    // Stricter Typechecking Options
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Style Options
    // "noImplicitReturns": true,
    // "noImplicitOverride": true,
    // "noUnusedLocals": true,
    // "noUnusedParameters": true,
    // "noFallthroughCasesInSwitch": true,
    // "noPropertyAccessFromIndexSignature": true,

    // Recommended Options
    "strict": true,
    "jsx": "react-jsx",
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "noUncheckedSideEffectImports": true,
    "moduleDetection": "force",
    "skipLibCheck": true,
  }
}
```

Es un buen resumen de lo que esta etapa considera «correcto por defecto»: módulos de Node, sintaxis verbatim, `types` vacío (anticipo de la 6.0)
y las dos opciones estrictas que **no** están en `--strict`.

### Lo demás de la 5.9

| Característica | Detalle |
|---|---|
| `module: node20` | Punto fijo para Node 20: `require(esm)` y `target: es2023` implícito |
| Información expandible al pasar el cursor | Botones `+` y `-` para desplegar los tipos (vista previa) |
| Descripciones del DOM | Resúmenes de MDN en la información de las API del navegador |
| Caché de instanciaciones | Menos trabajo repetido con bibliotecas muy genéricas (Zod, tRPC) |
| Longitud máxima configurable de la información al pasar el cursor | Ajuste del editor `js/ts.hover.maximumLength` |

---

## 10. Notas de migración

| Versión | Cambio | Síntoma | Qué hacer |
|---|---|---|---|
| 5.5 | Predicados inferidos: el tipo de `filter` y de otras funciones cambia | Código que «limpiaba» con `as` deja de necesitarlo; algún tipo más estrecho rompe una asignación | Normalmente mejora; ajustar la anotación |
| 5.5 | Comprobación de expresiones regulares | TS1501 / TS1532… | Corregir la expresión o subir el `target` |
| 5.5 | `lib.d.ts`: tipos del DOM actualizados | Errores en código que usaba API retiradas | Actualizar el código |
| 5.6 | Se retira lo obsoleto en la 5.0 | TS5102 / TS5108 | Ya no hay `ignoreDeprecations` que valga |
| 5.6 | Condiciones imposibles | TS2872 / TS2869 | Corregir la condición |
| 5.6 | `strictBuiltinIteratorReturn` entra en `--strict` | `next().value` es `T \| undefined` | Comprobar `done` |
| 5.7 | Arreglos tipados genéricos | TS2322 entre `Buffer`, `Uint8Array` y `ArrayBuffer` | Actualizar `@types/node`; anotar `Uint8Array<ArrayBuffer>` |
| 5.7 | Variables nunca inicializadas | TS2454 | Inicializar |
| 5.8 | Ramas de retorno comprobadas por separado | TS2322 en un `return a ? b : c` | Corregir el tipo de la rama |
| 5.9 | `lib.d.ts`: `ArrayBuffer` deja de ser supertipo de los arreglos tipados | TS2345 al pasar un `Uint8Array` donde se espera `ArrayBuffer` | Pasar `.buffer` o ajustar el tipo |
| 5.9 | Restricciones en la inferencia de argumentos de tipo | Errores nuevos en llamadas genéricas | Anotar el argumento de tipo |

> [!TIP]
> La 5.9 es la última versión «tranquila» antes de los dos saltos de 2026. Un proyecto que compila sin avisos con la 5.9 y las opciones de su
> `tsc --init` está a un paso de la 6.0. Los pasos concretos están en [23 · Migración](23-migracion-y-ciclo-de-vida.md#5-de-59-a-60).

---

## 11. Referencias

- Notas oficiales: [5.5](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-5.html) · [5.6](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-6.html) · [5.7](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-7.html) · [5.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html) · [5.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-9.html)
- Node.js: [Módulos: TypeScript](https://nodejs.org/api/typescript.html) (eliminación de tipos)
- TC39: [Auxiliares de iteradores](https://github.com/tc39/proposal-iterator-helpers) · [Métodos de `Set`](https://github.com/tc39/proposal-set-methods) · [`import defer`](https://github.com/tc39/proposal-defer-import-eval)
- Opciones: [`isolatedDeclarations`](https://www.typescriptlang.org/tsconfig/#isolatedDeclarations) · [`erasableSyntaxOnly`](https://www.typescriptlang.org/tsconfig/#erasableSyntaxOnly) · [`rewriteRelativeImportExtensions`](https://www.typescriptlang.org/tsconfig/#rewriteRelativeImportExtensions) · [`noUncheckedSideEffectImports`](https://www.typescriptlang.org/tsconfig/#noUncheckedSideEffectImports)
- Pruebas de debut: [25 · TypeScript 5.5](25-pruebas-de-debut.md#typescript-55) a [5.9](25-pruebas-de-debut.md#typescript-59)

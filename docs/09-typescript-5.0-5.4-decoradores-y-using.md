<div align="center">

# 09 · TypeScript 5.0–5.4: decoradores estándar y `using`

**Decoradores de TC39, parámetros `const`, `bundler`, `verbatimModuleSyntax`, gestión de recursos con `using`, atributos de importación y `NoInfer` (2023–2024)**

[⬅ 08 · TypeScript 4.5–4.9](08-typescript-4.5-4.9-esm-y-satisfies.md) · [🏠 Índice](../README.md) · [10 · TypeScript 5.5–5.9 ➡](10-typescript-5.5-5.9-inferencia-y-sintaxis-borrable.md)

</div>

<!-- ts=5.0 -->

| Ficha | 5.0 | 5.1 | 5.2 | 5.3 | 5.4 |
|---|---|---|---|---|---|
| **Publicación** | 16-mar-2023 | 1-jun-2023 | 24-ago-2023 | 20-nov-2023 | 6-mar-2024 |
| **Protagonista** | Decoradores estándar | Retornos `undefined` | `using` | Atributos de importación | `NoInfer` |
| **Compilador** | `5.0.4` | `5.1.6` | `5.2.2` | `5.3.3` | `5.4.5` |

> [!IMPORTANT]
> La serie 5 es la de los **estándares**. Los decoradores que TypeScript adoptó en 2015 se rediseñaron por completo en TC39, y la 5.0 implementa
> la versión nueva. Llegan `using`, los atributos de importación y la resolución `bundler`, que por fin describe cómo trabajan Vite, esbuild o
> webpack. Y el propio compilador se reconstruye: pasa de *namespaces* a módulos, abandona `target: es3` y se vuelve más pequeño y más rápido.

---

## Contenido

1. [TypeScript 5.0: un compilador reconstruido](#1-typescript-50-un-compilador-reconstruido)
2. [Decoradores estándar](#2-decoradores-estándar)
3. [TypeScript 5.0: parámetros `const` y enums de unión](#3-typescript-50-parámetros-const-y-enums-de-unión)
4. [TypeScript 5.0: `bundler` y `verbatimModuleSyntax`](#4-typescript-50-bundler-y-verbatimmodulesyntax)
5. [TypeScript 5.1: retornos implícitos y accesores independientes](#5-typescript-51-retornos-implícitos-y-accesores-independientes)
6. [TypeScript 5.2: `using` y la gestión explícita de recursos](#6-typescript-52-using-y-la-gestión-explícita-de-recursos)
7. [TypeScript 5.2: metadatos de decoradores y métodos de copia](#7-typescript-52-metadatos-de-decoradores-y-métodos-de-copia)
8. [TypeScript 5.3: atributos de importación y `switch (true)`](#8-typescript-53-atributos-de-importación-y-switch-true)
9. [TypeScript 5.4: estrechamiento en clausuras y `NoInfer`](#9-typescript-54-estrechamiento-en-clausuras-y-noinfer)
10. [Notas de migración](#10-notas-de-migración)
11. [Referencias](#11-referencias)

---

## 1. TypeScript 5.0: un compilador reconstruido

Antes de las características, el cambio que no se ve. El código del compilador estaba organizado en *namespaces* —la forma de modular que
TypeScript tenía en 2012— y se concatenaba en un único archivo. La 5.0 lo migró a **módulos ES** y lo empaqueta con esbuild. Las notas de la
versión resumen el efecto:

| Medida | 4.9 | 5.0 |
|---|---|---|
| Tamaño del paquete npm | 63,8 MB | 37,4 MB |
| Tiempo de compilación (proyectos de referencia) | — | Entre un 10 % y un 20 % menos |
| Memoria | — | Menos uso, por estructuras más compactas |

### La primera ronda de obsolescencias

La 5.0 estrenó un mecanismo nuevo: en lugar de eliminar opciones de golpe, las declara **obsoletas** —error salvo que se acepte explícitamente
con `ignoreDeprecations: "5.0"`— y las elimina dos versiones después. Es el mismo mecanismo que la 6.0 usaría a lo grande.

| Opción o valor | Obsoleta | Retirada | Alternativa |
|---|---|---|---|
| `target: es3` | 5.0 | 5.6 | `es5` (y desde la 6.0, `es2015` como mínimo) |
| `out` | 5.0 | 5.6 | `outFile` |
| `charset` | 5.0 | 5.6 | Ninguna: los archivos se leen en UTF-8 |
| `importsNotUsedAsValues` · `preserveValueImports` | 5.0 | 5.6 | `verbatimModuleSyntax` |
| `keyofStringsOnly` | 5.0 | 5.6 | `string & keyof T` donde haga falta |
| `noImplicitUseStrict` · `noStrictGenericChecks` | 5.0 | 5.6 | Ninguna |
| `suppressExcessPropertyErrors` · `suppressImplicitAnyIndexErrors` | 5.0 | 5.6 | Corregir el código |

```ts hasta=5.5 luego=TS5108/TS5102/TS6046 opts=target:es3,ignoreDeprecations:5.0
const antiguo = "solo con ignoreDeprecations";
```

> [!NOTE]
> Las notas de la 5.0 anunciaron la retirada «para la 5.5», pero el compilador `5.5.4` todavía las acepta con `ignoreDeprecations`. La prueba de
> arriba lo demuestra: compila hasta la 5.5 y falla desde la 5.6. Este atlas confía en los compiladores, no en los anuncios.

### Lo demás del compilador

| Característica | Detalle |
|---|---|
| `extends` con varios archivos | `"extends": ["@tsconfig/strictest", "./base.json"]`: las posteriores pisan a las anteriores |
| `--build` con opciones de emisión | `tsc -b --declaration` sin tocar los `tsconfig.json` |
| `@satisfies` y `@overload` en JSDoc | `satisfies` y las sobrecargas llegan a los archivos JavaScript |
| Completado exhaustivo de `switch` | El editor escribe un `case` por cada miembro de la unión |
| `--allowImportingTsExtensions` | Importar `./util.ts`, con `noEmit` o `emitDeclarationOnly` |

---

## 2. Decoradores estándar

### Dos sistemas de decoradores

TypeScript 1.5 implementó en 2015 la propuesta de decoradores que existía entonces. Angular, NestJS, TypeORM, MobX y medio ecosistema se
construyeron sobre ella, activada con `experimentalDecorators`. TC39 rediseñó después la propuesta **desde cero**, con otra firma, otra semántica y
sin decoradores de parámetro. La 5.0 implementa la nueva versión y la activa **cuando `experimentalDecorators` no está presente**.

| | Experimentales (1.5) | Estándar (5.0) |
|---|---|---|
| **Se activan con** | `experimentalDecorators: true` | Nada: es el comportamiento por defecto |
| **Firma de un decorador de método** | `(objetivo, clave, descriptor)` | `(metodo, contexto)` |
| **Decoradores de parámetro** | Sí | **No** |
| **Metadatos** | `emitDecoratorMetadata` + `reflect-metadata` | `context.metadata` (5.2) |
| **Campos** | Reciben el prototipo, no el valor | Devuelven una función que transforma el valor inicial |
| **Accesores automáticos** | No | `accessor` (4.9) |
| **Sintaxis de la propuesta** | Stage 1 en 2015 | Stage 3 de 2022 a mayo de 2026; **stage 2.7** desde entonces |

### Un decorador de método

Un decorador estándar es una función que recibe el valor decorado y un objeto **contexto**, y devuelve un sustituto (o nada).

```ts run debut
function registrar<This, Args extends unknown[], R>(
    metodo: (this: This, ...args: Args) => R,
    contexto: ClassMethodDecoratorContext<This, (this: This, ...args: Args) => R>,
) {
    const nombre = String(contexto.name);
    return function (this: This, ...args: Args): R {
        console.log(`→ ${nombre}(${args.join(", ")})`);
        return metodo.call(this, ...args);
    };
}

class Calculadora {
    @registrar
    sumar(a: number, b: number): number { return a + b; }
}

console.log(new Calculadora().sumar(2, 3));
// → → sumar(2, 3)
// → 5
```

### El objeto contexto

| Propiedad | Para qué |
|---|---|
| `kind` | `"class"`, `"method"`, `"getter"`, `"setter"`, `"field"` o `"accessor"` |
| `name` | El nombre del miembro (texto, símbolo o nombre `#privado`) |
| `static` · `private` | Si el miembro es estático o `#privado` |
| `access` | `get` y `set` para leer y escribir el miembro desde fuera |
| `addInitializer(f)` | Ejecuta `f` al construir la instancia (o al definir la clase, si es estático) |
| `metadata` | Objeto compartido por todos los decoradores de la clase (5.2) |

Un uso típico de `addInitializer` es enlazar métodos para que no pierdan `this` al pasarlos como *callback*:

```ts run
function enlazado<This extends object, T extends (this: This, ...args: any[]) => any>(
    metodo: T,
    contexto: ClassMethodDecoratorContext<This, T>,
): void {
    contexto.addInitializer(function () {
        const nombre = contexto.name as keyof This;
        (this as any)[nombre] = metodo.bind(this);
    });
}

class Contador {
    cuenta = 0;
    @enlazado
    incrementar(): number { return ++this.cuenta; }
}

const { incrementar } = new Contador();    // extraído: sin el decorador, `this` sería undefined
console.log(incrementar(), incrementar());  // → 1 2
```

### Decoradores de campo y de accesor

Un decorador de campo no ve el valor; devuelve una función que **transforma el valor inicial**. Combinado con `accessor`, puede interceptar
también las lecturas y escrituras:

```ts run
function enMayusculas<This>(
    _objetivo: ClassAccessorDecoratorTarget<This, string>,
    _contexto: ClassAccessorDecoratorContext<This, string>,
): ClassAccessorDecoratorResult<This, string> {
    return {
        init: (inicial) => inicial.toUpperCase(),
        set(valor) { _objetivo.set.call(this, valor.toUpperCase()); },
    };
}

class Etiqueta {
    @enMayusculas accessor texto = "nueva";
}

const e = new Etiqueta();
console.log(e.texto);       // → NUEVA
e.texto = "vista";
console.log(e.texto);       // → VISTA
```

> [!WARNING]
> **No mezcles los dos sistemas**: con `experimentalDecorators` activado, el compilador interpreta todos los decoradores del proyecto con las
> reglas de 2015. Los marcos que dependen de decoradores de parámetro (Angular para la inyección en constructores, NestJS, TypeORM) siguen
> necesitando los experimentales. Y en mayo de 2026 TC39 devolvió la propuesta a stage 2.7, así que la sintaxis estándar tampoco es definitiva:
> la historia completa está en [19 § La saga de los decoradores](19-typescript-y-ecmascript.md#5-la-saga-de-los-decoradores).

---

## 3. TypeScript 5.0: parámetros `const` y enums de unión

### Parámetros de tipo `const`

Para que una función genérica infiriera literales exactos, quien la **llamaba** tenía que escribir `as const`. Con `<const T>` lo decide la
función:

```ts debut
function rutas<const T extends readonly string[]>(lista: T): T {
    return lista;
}

const sinConst = ((lista: string[]) => lista)(["/", "/admin"]);
//    ^? const sinConst: string[]
const conConst = rutas(["/", "/admin"]);
//    ^? const conConst: readonly ["/", "/admin"]
```

El modificador solo actúa sobre **expresiones literales** escritas en la llamada; si se pasa una variable ya ensanchada, no puede recuperar lo
perdido. Y si la restricción es un arreglo mutable (`extends string[]`), los literales de arreglo no encajan con `readonly` y la inferencia vuelve
a `string[]`: por eso el ejemplo usa `readonly string[]`.

### Todos los enums son enums de unión

Hasta la 4.9 había dos clases de enum: los de miembros literales, cuyos miembros eran tipos, y los «calculados», que no. La 5.0 unifica: **cada
miembro tiene su propio tipo**, aunque su valor se calcule.

```ts debut
enum Prioridad {
    Baja = 1,
    Alta = Baja * 10,
    Aleatoria = Math.round(Math.random() * 100),
}

function urgente(p: Prioridad.Alta): string { return `prioridad ${p}`; }
urgente(Prioridad.Alta);
```

```ts err=TS2322
enum Color { Rojo, Verde }
const c: Color = 7;           // 5.0: error TS2322; antes, cualquier número era un Color válido
```

> [!TIP]
> La segunda prueba ilustra una mejora de solidez de la 5.0: asignar un número que **no** es miembro del enum ya es un error. Aun así, los enums
> tienen otros problemas —emiten código, no se pueden borrar sin compilar— y en código nuevo se suelen preferir uniones de literales u objetos
> `as const` ([21 § `enum` o unión](21-guias-de-decision.md#2-enum-unión-de-literales-u-objeto-as-const)).

---

## 4. TypeScript 5.0: `bundler` y `verbatimModuleSyntax`

### `moduleResolution: bundler`

`node16` describe Node con fidelidad, pero exige extensiones en las importaciones relativas. Los empaquetadores no las exigen, y sí entienden
`exports` de `package.json`. Ninguno de los modos existentes describía eso. `bundler` sí:

| | `node10` | `node16` / `nodenext` | `bundler` |
|---|---|---|---|
| **Extensión en importaciones relativas** | Opcional | Obligatoria en ESM | Opcional |
| **`exports` de `package.json`** | No | Sí | Sí |
| **`imports` (`#interno`)** | No | Sí | Sí |
| **Condiciones** | — | `import` / `require` / `node` / `types` | `import` / `types` y las de `customConditions` |
| **Pensado para** | Node antiguo | Ejecutar en Node | Vite, esbuild, webpack, Bun, Parcel |

```ts debut opts=moduleResolution:bundler
// @filename: util.ts
export const version = 1;

// @filename: principal.ts
import { version } from "./util";   // sin extensión: correcto con bundler
const v: number = version;
```

Llegaron con él varias opciones para ajustar la resolución: `allowImportingTsExtensions`, `resolvePackageJsonExports`,
`resolvePackageJsonImports`, `customConditions` y `allowArbitraryExtensions` (para declarar `archivo.d.css.ts` junto a un `archivo.css`).

### `verbatimModuleSyntax`

Tres opciones intentaban decidir qué importaciones se borraban: `isolatedModules`, `importsNotUsedAsValues` y `preserveValueImports`. Se
solapaban y nadie recordaba qué combinación hacía qué. La 5.0 las sustituye por **una regla**:

> Lo que lleva `type` se borra. Lo que no lo lleva, se emite tal cual.

```ts debut opts=verbatimModuleSyntax err=TS1484
// @filename: tipos.ts
export interface Usuario { nombre: string; }

// @filename: principal.ts
import { Usuario } from "./tipos";   // error TS1484: es un tipo y no se marcó con `type`
const u: Usuario = { nombre: "Ana" };
```

Con esta opción, cualquier herramienta que procese archivos de uno en uno —esbuild, swc, Babel, la eliminación de tipos de Node— produce
exactamente el mismo JavaScript que `tsc`. Por eso forma parte del `tsc --init` de la 5.9 y de las configuraciones recomendadas de
[17 · `tsconfig` de referencia](17-tsconfig-de-referencia.md).

### `export type *`

```ts debut
// @filename: modelos.ts
export interface Usuario { nombre: string; }
export const VERSION = 1;

// @filename: tipos.ts
export type * from "./modelos";              // reexporta solo los tipos
export type * as modelos from "./modelos";
```

---

<!-- ts=5.1 -->

## 5. TypeScript 5.1: retornos implícitos y accesores independientes

### Funciones que devuelven `undefined` sin `return`

Una función anotada con `: undefined` exigía un `return` explícito, aunque JavaScript devuelve `undefined` de todas formas. La 5.1 lo acepta:

```ts debut
function sinResultado(): undefined {
    // sin `return`: correcto desde la 5.1
}

type Callback = () => undefined;
const vacio: Callback = () => {};
```

Parece menor, pero desbloquea a las bibliotecas que tipan *callbacks* con `() => undefined` para distinguirlos de `() => void`.

### `get` y `set` con tipos sin relación

La 4.3 permitía que el `set` aceptara más tipos que el `get` devolvía, siempre que el del `get` fuera asignable al del `set`
([07 § Tipos de escritura](07-typescript-4.0-4.4-tuplas-variadicas-y-plantillas.md#7-typescript-43-override-y-tipos-de-escritura-separados)).
La 5.1 elimina la restricción cuando ambos están **anotados**. El caso motivador es el DOM: `elemento.style` se lee como `CSSStyleDeclaration` y
se escribe como texto.

```ts run debut
class Elemento {
    #estilo = { color: "negro" };
    get estilo(): { color: string } { return this.#estilo; }
    set estilo(css: string) { this.#estilo = { color: css.replace("color:", "").trim() }; }
}

const el = new Elemento();
el.estilo = "color: rojo";
console.log(el.estilo.color);   // → rojo
```

### JSX desacoplado

`JSX.ElementType` permite a una biblioteca declarar qué puede ser un componente. Con ella, los componentes de servidor de React, que devuelven
una `Promise`, se tipan sin trucos. La 5.1 también admite atributos JSX con espacio de nombres (`<svg xlink:href="…">`), cursores enlazados que
renombran a la vez la etiqueta de apertura y la de cierre, y exige **Node 14.17** como mínimo para ejecutar el compilador.

---

<!-- ts=5.2 -->

## 6. TypeScript 5.2: `using` y la gestión explícita de recursos

### El problema

Liberar un recurso —cerrar un archivo, devolver una conexión, quitar un *listener*— exige un `try`/`finally`. Con varios recursos, los bloques se
anidan; con errores en la liberación, se pierden excepciones.

### La solución

`using` declara una constante cuyo valor se **libera automáticamente** al salir del bloque, llamando a su método `[Symbol.dispose]()`. Los
recursos se liberan en orden inverso al de su declaración, como una pila.

```ts run debut
function abrir(nombre: string) {
    console.log(`abre ${nombre}`);
    return {
        leer: () => `contenido de ${nombre}`,
        [Symbol.dispose]() { console.log(`cierra ${nombre}`); },
    };
}

function procesar(): string {
    using a = abrir("a.txt");
    using b = abrir("b.txt");
    return a.leer().length + b.leer().length > 0 ? "hecho" : "vacío";
}

console.log(procesar());
// → abre a.txt
// → abre b.txt
// → cierra b.txt
// → cierra a.txt
// → hecho
```

| Forma | Libera con | Para |
|---|---|---|
| `using x = …` | `x[Symbol.dispose]()` | Recursos síncronos |
| `await using x = …` | `await x[Symbol.asyncDispose]()` (o `dispose` si no existe) | Conexiones, archivos asíncronos |
| `DisposableStack` | `.use()`, `.adopt()`, `.defer()` | Agrupar recursos que no implementan el protocolo |
| `AsyncDisposableStack` | Ídem, asíncrono | Ídem |

`DisposableStack` adapta lo que no fue diseñado para `using`:

```ts run
function conTemporizador(): number {
    using pila = new DisposableStack();
    const id = setInterval(() => {}, 1000);
    pila.defer(() => {
        clearInterval(id);
        console.log("temporizador detenido");
    });
    return 42;
}

console.log(conTemporizador());
// → temporizador detenido
// → 42
```

Si la liberación lanza una excepción mientras ya había otra en curso, ambas se conservan en un `SuppressedError`, en lugar de perder la primera
como pasa con `finally`.

> [!NOTE]
> `using` llegó a TypeScript en stage 3 (agosto de 2023) y es **stage 4 desde mayo de 2026**: formará parte de ES2027. TypeScript lo transforma
> para cualquier `target` anterior a `esnext`; lo que el runtime debe aportar es `Symbol.dispose` y `DisposableStack`, presentes en Node 24 y
> posteriores.

---

## 7. TypeScript 5.2: metadatos de decoradores y métodos de copia

### Metadatos de decoradores

Los decoradores estándar de la 5.0 no tenían dónde guardar información para que otros la leyeran (el papel de `reflect-metadata` en los
experimentales). La 5.2 implementa la propuesta de **metadatos**: un objeto `context.metadata` compartido por todos los decoradores de una clase y
accesible después en `Clase[Symbol.metadata]`.

```ts debut
function serializable(_valor: undefined, contexto: ClassFieldDecoratorContext): void {
    const campos = (contexto.metadata.campos ??= []) as (string | symbol)[];
    campos.push(contexto.name);
}

class Usuario {
    @serializable nombre = "Ana";
    @serializable correo = "ana@ejemplo.com";
    clave = "secreta";
}
```

Para leerlos en ejecución hace falta que el runtime defina `Symbol.metadata`, o un *polyfill* que lo haga. La propuesta de metadatos bajó a
stage 2.7 junto con la de decoradores en mayo de 2026.

### Métodos de copia de arreglos (ES2023)

`sort`, `reverse` y `splice` **modifican** el arreglo. ES2023 añadió versiones que devuelven una copia, y la 5.2 sus declaraciones:

```ts run debut
const original = [3, 1, 2];

const ordenado = original.toSorted();
const invertido = original.toReversed();
const sinPrimero = original.toSpliced(0, 1);
const cambiado = original.with(0, 9);

console.log(original.join(), ordenado.join(), invertido.join(), sinPrimero.join(), cambiado.join());   // → 3,1,2 1,2,3 2,1,3 1,2 9,1,2
```

### Uniones de arreglos y tuplas mixtas

```ts debut
declare const valores: string[] | number[];

// Antes de la 5.2: error, cada miembro tenía su propia firma de `filter`
const presentes = valores.filter((v) => Boolean(v));

type Par = [clave: string, number];   // elementos con y sin nombre, mezclados
```

### Lo demás de la 5.2

| Característica | Detalle |
|---|---|
| Rutas `.ts` en `import type` | `import type { T } from "./tipos.ts"` sin `allowImportingTsExtensions` |
| «Insertar variable» | Refactorización que sustituye una variable por su valor |
| Comprobación de conversiones | `as` entre tipos genéricos se comprueba mejor |
| `Object.groupBy` | No: llegó en la 5.4 |

---

<!-- ts=5.3 -->

## 8. TypeScript 5.3: atributos de importación y `switch (true)`

### Atributos de importación

La propuesta de **aserciones** de importación (`assert { type: "json" }`, implementada en la 4.5) cambió de nombre y de semántica: ahora son
**atributos** (`with`) que el runtime **puede usar** para decidir cómo cargar el módulo, no solo comprobar.

```ts debut opts=resolveJsonModule
// @filename: datos.json
{ "version": 3, "nombre": "atlas" }

// @filename: principal.ts
import datos from "./datos.json" with { type: "json" };

const version: number = datos.version;
const nombre: string = datos.nombre;
```

| Sintaxis | Versión | Estado |
|---|---|---|
| `import x from "./d.json" assert { type: "json" }` | 4.5 | ⛔ Error desde la 6.0 |
| `import x from "./d.json" with { type: "json" }` | 5.3 | 🟢 ES2025 |
| `import("./d.json", { with: { type: "json" } })` | 5.3 | 🟢 ES2025 |
| `declare module "*" with { type: "css" }` | 7.1 🟡 | Beta ([12 § TypeScript 7.1](12-typescript-7-el-compilador-nativo.md#8-typescript-71-beta-la-api-y-los-content-mappers)) |

### Estrechamiento con `switch (true)`

```ts run debut
function describir(x: unknown): string {
    switch (true) {
        case typeof x === "string":
            return `texto de ${x.length}`;        // x: string
        case Array.isArray(x):
            return `lista de ${x.length}`;        // x: any[]
        case x instanceof Date:
            return `fecha ${x.getFullYear()}`;    // x: Date
        default:
            return "otra cosa";
    }
}

console.log(describir("hola"), describir([1, 2]), describir(new Date(2026, 0, 1)));   // → texto de 4 lista de 2 fecha 2026
```

### Otros estrechamientos de la 5.3

```ts debut
interface Punto { x: number; }

class ConX {
    static [Symbol.hasInstance](valor: unknown): valor is Punto {
        return typeof valor === "object" && valor !== null && "x" in valor;
    }
}

function esTexto(v: unknown): v is string { return typeof v === "string"; }

function leer(valor: unknown): number {
    if (valor instanceof ConX) { return valor.x; }               // instanceof usa el predicado de hasInstance
    if (esTexto(valor) === true) { return valor.length; }        // comparar con true también estrecha
    return 0;
}
```

### Lo demás de la 5.3

| Característica | Detalle |
|---|---|
| `resolution-mode` en todos los modos | `import type { T } from "pkg" with { "resolution-mode": "import" }` |
| `super` sobre campos | Error TS2855 al leer con `super.campo` un campo que no está en el prototipo |
| Sugerencias interactivas | Un clic en el tipo sugerido lleva a su definición |
| Sin analizar JSDoc | `tsc` deja de analizar JSDoc en archivos `.ts`: menos tiempo y memoria |
| Paquete más pequeño | Se eliminan copias duplicadas de código: el paquete baja otro 20 % |

---

<!-- ts=5.4 -->

## 9. TypeScript 5.4: estrechamiento en clausuras y `NoInfer`

### Estrechamiento preservado en clausuras

El análisis de flujo **olvidaba** el estrechamiento dentro de las funciones creadas después, porque una función se puede llamar más tarde,
cuando la variable ya cambió ([03 § El límite](03-typescript-2.0-2.2-nulos-y-flujo.md#el-límite-las-funciones-capturadas)). La 5.4 lo conserva cuando
la función se crea **después de la última asignación** a la variable.

```ts run debut
function construirUrls(url: string | URL, nombres: string[]): string[] {
    if (typeof url === "string") {
        url = new URL(url);
    }
    // última asignación de `url`: desde aquí es URL, también dentro de la flecha
    return nombres.map((nombre) => {
        url.searchParams.set("q", nombre);
        return url.toString();
    });
}

console.log(construirUrls("https://ejemplo.com/buscar", ["ts"]).join());   // → https://ejemplo.com/buscar?q=ts
```

Si hubiera otra asignación a `url` **después** de crear la flecha, el compilador volvería a la cautela anterior, con razón.

### `NoInfer`

Cuando un parámetro de tipo aparece en varios argumentos, todos aportan **candidatos** a la inferencia. A veces uno de ellos no debería:

```ts ts=5.3
function elegir<C extends string>(colores: C[], porDefecto?: C): C {
    return porDefecto ?? colores[0]!;
}

elegir(["rojo", "verde"], "azul");   // compila: C se infiere como "rojo" | "verde" | "azul"
```

```ts debut err=TS2345
function elegir<C extends string>(colores: C[], porDefecto?: NoInfer<C>): C {
    return porDefecto ?? colores[0]!;
}

elegir(["rojo", "verde"], "rojo");
elegir(["rojo", "verde"], "azul");   // error TS2345: "azul" no es "rojo" | "verde"
```

`NoInfer<T>` es otro tipo intrínseco: en la inferencia, la posición se ignora; después, se comprueba como `T`.

### `Object.groupBy` y `Map.groupBy` (ES2024)

```ts run debut
const personas = [
    { nombre: "Ana", edad: 34 },
    { nombre: "Luis", edad: 17 },
    { nombre: "Eva", edad: 15 },
];

const porEdad = Object.groupBy(personas, (p) => (p.edad >= 18 ? "adultos" : "menores"));
//    ^? const porEdad: Partial<Record<"adultos" | "menores", { nombre: string; edad: number; }[]>>

console.log(porEdad.menores?.length, porEdad.adultos?.[0].nombre);   // → 2 Ana
```

El resultado es `Partial` porque un grupo puede quedar vacío y, entonces, la clave no existe.

### `module: preserve`

Para quien no ejecuta la salida de `tsc` —la empaqueta Vite, la ejecuta Bun—, ninguna transformación de módulos es correcta. `preserve` conserva
`import` y `require` exactamente como se escribieron, permite mezclarlos y activa `moduleResolution: bundler`, `esModuleInterop` y
`resolveJsonModule`.

```ts debut opts=module:preserve
// @filename: util.ts
export const version = 1;

// @filename: principal.ts
import { version } from "./util";
import util = require("./util");    // también vale: se emite tal cual
const v: number = version + util.version;
```

---

## 10. Notas de migración

| Versión | Cambio | Síntoma | Qué hacer |
|---|---|---|---|
| 5.0 | Obsolescencias (`target: es3`, `out`, `importsNotUsedAsValues`…) | TS5101 | Migrar, o `ignoreDeprecations: "5.0"` hasta la 5.5 |
| 5.0 | Los decoradores sin `experimentalDecorators` son los estándar | Errores de firma en decoradores existentes | Añadir `experimentalDecorators: true` o migrar |
| 5.0 | Enums: asignar un número fuera de rango | TS2322 | Usar un miembro |
| 5.0 | `--module` con `--target` ES5 y `--moduleResolution bundler` incompatibles | TS5095 | `bundler` exige `module: esnext` (hasta la 6.0) |
| 5.0 | Relaciones de igualdad entre números y enums más estrictas | TS2367 | Comparar con miembros del enum |
| 5.0 | El compilador exige Node 12.20 | Fallo al arrancar | Actualizar Node |
| 5.1 | El compilador exige Node 14.17 | Fallo al arrancar | Actualizar Node |
| 5.2 | `lib.d.ts`: `SharedArrayBuffer` y `ArrayBuffer` divergen | TS2322 | Ajustar las firmas |
| 5.3 | Comprobación de `super` en campos | TS2855 | Usar `this` |
| 5.4 | Comprobación más estricta de condicionales sobre parámetros de tipo | Errores en código genérico | Añadir restricciones |
| 5.4 | Los `import` dentro de `declare module` en `.d.ts` exigen `verbatimModuleSyntax` coherente | TS1286 | Usar `import type` |

> [!CAUTION]
> Activar los decoradores estándar por omisión es el cambio más silencioso de la 5.0: un proyecto que **olvidó** declarar `experimentalDecorators`
> porque la herramienta que lo empaquetaba lo hacía por él, verá errores extraños en todos los decoradores al pasar `tsc`. La solución es declarar
> explícitamente el sistema que se usa.

---

## 11. Referencias

- Notas oficiales: [5.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html) · [5.1](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-1.html) · [5.2](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-2.html) · [5.3](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-3.html) · [5.4](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-4.html)
- TC39: [Decoradores](https://github.com/tc39/proposal-decorators) · [Metadatos de decoradores](https://github.com/tc39/proposal-decorator-metadata) · [Gestión explícita de recursos](https://github.com/tc39/proposal-explicit-resource-management) · [Atributos de importación](https://github.com/tc39/proposal-import-attributes)
- Opciones: [`verbatimModuleSyntax`](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax) · [`moduleResolution`](https://www.typescriptlang.org/tsconfig/#moduleResolution) · [`ignoreDeprecations`](https://www.typescriptlang.org/tsconfig/#ignoreDeprecations)
- Pruebas de debut: [25 · TypeScript 5.0](25-pruebas-de-debut.md#typescript-50) a [5.4](25-pruebas-de-debut.md#typescript-54)

<div align="center">

# 24 · Referencia rápida y glosario

**La sintaxis de tipos en una página, los operadores, los utilitarios, las directivas, los errores más frecuentes con su causa, la línea de órdenes y un glosario de la A a la Z**

[⬅ 23 · Migración](23-migracion-y-ciclo-de-vida.md) · [🏠 Índice](../README.md) · [25 · Pruebas de debut ➡](25-pruebas-de-debut.md)

</div>

<!-- ts=5.9 -->

> [!TIP]
> Este capítulo está pensado para **consultar**, no para leer de corrido. Cada fila indica la versión en que apareció la construcción y enlaza,
> cuando hace falta, al capítulo que la explica.

---

## Contenido

1. [Sintaxis de tipos](#1-sintaxis-de-tipos)
2. [Operadores de tipos](#2-operadores-de-tipos)
3. [Operadores de expresiones](#3-operadores-de-expresiones)
4. [Utilitarios](#4-utilitarios)
5. [Directivas en comentarios](#5-directivas-en-comentarios)
6. [Errores frecuentes](#6-errores-frecuentes)
7. [La línea de órdenes](#7-la-línea-de-órdenes)
8. [Glosario](#8-glosario)

---

## 1. Sintaxis de tipos

| Construcción | Ejemplo | Desde |
|---|---|---|
| Anotación | `let x: number` | 0.8 |
| Arreglo | `string[]` · `Array<string>` · `readonly string[]` | 0.8 · 0.9 · 3.4 |
| Tupla | `[string, number]` · `[a: string, b?: number, ...c: boolean[]]` | 1.3 · 4.0 |
| Objeto | `{ a: string; b?: number; readonly c: boolean }` | 0.8 · 2.0 (`readonly`) |
| Firma de índice | `{ [clave: string]: number }` · `` { [k: `data-${string}`]: string } `` | 0.8 · 4.4 |
| Función | `(a: string, b?: number) => void` | 0.8 |
| Constructor | `new (x: number) => Punto` · `abstract new () => T` | 0.8 · 4.2 |
| Unión e intersección | `A \| B` · `A & B` | 1.4 · 1.6 |
| Literal | `"hola"` · `42` · `true` · `10n` | 1.8 · 2.0 · 3.2 |
| Plantilla literal | `` `on${string}` `` | 4.1 |
| Genérico | `function f<T extends U = V>(x: T)` | 0.9 · 2.3 (por defecto) |
| Parámetro `const` | `function f<const T>(x: T)` | 5.0 |
| Varianza | `interface P<out T>` · `<in T>` · `<in out T>` | 4.7 |
| Alias | `type Id = string` | 1.4 |
| Interfaz | `interface Punto { x: number }` | 0.8 |
| `this` como tipo | `metodo(): this` | 1.7 |
| Predicado de tipo | `(x): x is string` | 1.6 |
| Aserción | `(x): asserts x is string` · `asserts cond` | 3.7 |
| `unique symbol` | `declare const clave: unique symbol` | 2.7 |

---

## 2. Operadores de tipos

| Operador | Ejemplo | Resultado | Desde |
|---|---|---|---|
| `typeof` | `typeof config` | El tipo de un valor | 0.9 |
| `keyof` | `keyof { a: 1; b: 2 }` | `"a" \| "b"` | 2.1 |
| Acceso indexado | `Persona["nombre"]` · `T[number]` | El tipo de la propiedad | 2.1 |
| Mapeado | `{ [K in keyof T]?: T[K] }` | Transforma cada propiedad | 2.1 |
| Modificadores | `-readonly` · `-?` · `+?` | Quitar o poner modificadores | 2.8 |
| Remapeo | `{ [K in keyof T as Nueva<K>]: … }` | Renombra o filtra claves | 4.1 |
| Condicional | `T extends U ? X : Y` | Elige según asignabilidad | 2.8 |
| `infer` | `T extends Promise<infer V> ? V : T` | Captura una parte | 2.8 |
| `infer … extends` | `[infer S extends string, ...unknown[]]` | Captura con restricción | 4.7 |
| `import()` | `import("./modelo").Usuario` | Un tipo de otro módulo sin `import` | 2.9 |
| `satisfies` | `valor satisfies T` | Comprueba sin ensanchar (expresión) | 4.9 |

---

## 3. Operadores de expresiones

| Operador | Ejemplo | Para qué | Desde |
|---|---|---|---|
| `as` | `valor as Usuario` | Aserción de tipo | 1.6 (`<T>x` desde 0.8) |
| `as const` | `["a", "b"] as const` | Literales y `readonly` | 3.4 |
| `!` no nulo | `mapa.get(k)!` | Afirmar que no es `null`/`undefined` | 2.0 |
| `?.` | `a?.b?.[0]?.()` | Encadenamiento opcional | 3.7 |
| `??` | `a ?? b` | Fusión nula | 3.7 |
| `??=` · `\|\|=` · `&&=` | `a ??= []` | Asignación lógica | 4.0 |
| `satisfies` | `{…} satisfies Config` | Comprobar sin ensanchar | 4.9 |
| `#x in obj` | `#nombre in valor` | ¿Tiene el campo privado? | 4.5 |
| `using` · `await using` | `using r = abrir()` | Liberación automática | 5.2 |
| Instanciación | `Map<string, Error>` sin llamar | Fijar argumentos de tipo | 4.7 |

---

## 4. Utilitarios

| Utilitario | Ejemplo | Desde |
|---|---|---|
| `Partial<T>` · `Required<T>` | Todo opcional · todo obligatorio | 2.1 · 2.8 |
| `Readonly<T>` | Todo de solo lectura | 2.1 |
| `Record<K, V>` | Objeto con claves `K` y valores `V` | 2.1 |
| `Pick<T, K>` · `Omit<T, K>` | Quedarse con / quitar propiedades | 2.1 · 3.5 |
| `Exclude<U, E>` · `Extract<U, E>` | Filtrar una unión | 2.8 |
| `NonNullable<T>` | Quitar `null` y `undefined` | 2.8 |
| `ReturnType<F>` · `Parameters<F>` | Retorno · argumentos de una función | 2.8 · 3.1 |
| `InstanceType<C>` · `ConstructorParameters<C>` | De una clase | 2.8 · 3.1 |
| `ThisType<T>` · `ThisParameterType<F>` · `OmitThisParameter<F>` | El `this` | 2.3 · 3.3 · 3.3 |
| `Uppercase` · `Lowercase` · `Capitalize` · `Uncapitalize` | Transformar literales de cadena | 4.1 |
| `Awaited<T>` | Desenvolver promesas | 4.5 |
| `NoInfer<T>` | Excluir de la inferencia | 5.4 |

Más en [15 § Utilitarios](15-programacion-a-nivel-de-tipos.md#8-los-utilitarios-de-la-biblioteca-estándar).

---

## 5. Directivas en comentarios

| Directiva | Efecto | Desde |
|---|---|---|
| `/// <reference path="…" />` | Incluye otro archivo (antiguo) | 0.8 |
| `/// <reference types="node" />` | Incluye un paquete de tipos | 2.0 |
| `/// <reference lib="es2022" />` | Incluye una biblioteca `lib` | 3.0 |
| `// @ts-ignore` | Silencia el error de la línea siguiente | 2.6 |
| `// @ts-expect-error` | Ídem, y es un error si no hay error | 3.9 |
| `// @ts-nocheck` | No comprueba el archivo | 3.7 (en `.ts`) |
| `// @ts-check` | Comprueba un archivo `.js` | 2.3 |
| `/** @jsxImportSource preact */` | Fábrica JSX por archivo | 4.1 |
| `/// <reference no-default-lib="true"/>` | ⛔ Error desde la 6.0 | — |

```ts err=TS2578
// @ts-expect-error: aquí no hay error, así que la directiva sobra
const correcto: number = 1;
```

---

## 6. Errores frecuentes

Los mensajes son los del compilador en inglés, tal como aparecen en la salida de `tsc`. Todos han aparecido en algún ejemplo verificado del atlas.

| Código | Mensaje (abreviado) | Causa habitual | Solución |
|---|---|---|---|
| TS2304 | *Cannot find name 'x'* | Falta una importación o un paquete de tipos | Importar; añadir a `types` |
| TS2307 | *Cannot find module 'x'* | Ruta o paquete inexistente, o sin tipos | Revisar la ruta; `@types/x` |
| TS2322 | *Type 'A' is not assignable to type 'B'* | El caso general de incompatibilidad | Leer la explicación que sigue al mensaje |
| TS2339 | *Property 'x' does not exist on type 'T'* | Falta estrechar, o una errata | Estrechar o corregir |
| TS2345 | *Argument of type 'A' is not assignable to parameter of type 'B'* | Ídem, en una llamada | Ídem |
| TS2353 · TS2561 | *Object literal may only specify known properties* | Propiedad sobrante (o errata: TS2561 sugiere la correcta) | [14 § 6](14-sistema-de-tipos-a-fondo.md#6-asignabilidad-y-frescura) |
| TS2532 · TS18048 | *Object is possibly 'undefined'* / *'x' is possibly 'undefined'* | `strictNullChecks` o `noUncheckedIndexedAccess` | `?.`, `??` o comprobar |
| TS18046 | *'e' is of type 'unknown'* | `catch (e)` o datos externos | Estrechar con `instanceof` o una guarda |
| TS18047 | *'x' is possibly 'null'* | `querySelector` y similares | Comprobar o usar `!` si es seguro |
| TS2454 | *Variable 'x' is used before being assigned* | Ramas sin asignación | Inicializar |
| TS2589 | *Type instantiation is excessively deep* | Recursión de tipos | Recursión de cola ([15 § 6](15-programacion-a-nivel-de-tipos.md#6-recursión-límites-y-acumuladores)) |
| TS2741 | *Property 'x' is missing in type* | Falta una propiedad obligatoria | Añadirla o marcarla con `?` |
| TS2774 | *This condition will always return true since this function is always defined* | `if (obj.metodo)` sin llamar | Llamar a la función |
| TS2801 | *This condition will always return true since this 'Promise' is always defined* | Falta `await` | Añadir `await` |
| TS2872 | *This kind of expression is always truthy* | Condición imposible (5.6) | Corregir la condición |
| TS2835 | *Relative import paths need explicit file extensions* | ESM en `node16`/`nodenext` | `./archivo.js` |
| TS2882 | *Cannot find module or type declarations for side-effect import* | `import "./x.css"` (6.0) | `declare module "*.css"` |
| TS1205 | *Re-exporting a type when 'isolatedModules' is enabled requires using 'export type'* | Reexportar un tipo | `export type { T }` |
| TS1484 | *'T' is a type and must be imported using a type-only import* | `verbatimModuleSyntax` | `import { type T }` |
| TS1294 | *This syntax is not allowed when 'erasableSyntaxOnly' is enabled* | `enum`, `namespace`, propiedades de parámetro | Alternativas borrables |
| TS1540 | *A 'namespace' declaration should not be declared using the 'module' keyword* | `module X {}` (6.0) | `namespace X {}` |
| TS4114 | *This member must have an 'override' modifier* | `noImplicitOverride` | Añadir `override` |
| TS7006 | *Parameter 'x' implicitly has an 'any' type* | `noImplicitAny` (y `strict` por defecto desde la 6.0) | Anotar |
| TS7016 | *Could not find a declaration file for module 'x'* | Paquete JavaScript sin tipos | `@types/x` o `declare module "x"` |
| TS2578 | *Unused '@ts-expect-error' directive* | Ya no hay error | Quitar la directiva |
| TS5101 · TS5107 | *Option 'x' is deprecated* / *Option 'x=y' is deprecated* | Opción obsoleta en la 6.0 | [11 § 5](11-typescript-6.0-el-puente.md#5-lo-que-queda-obsoleto) |
| TS5102 · TS5108 | *Option 'x' has been removed* | Opción retirada en la 7.0 (o en la 5.6) | Ídem |
| TS5112 | *tsconfig.json is present but will not be loaded if files are specified on commandline* | `tsc archivo.ts` (6.0) | `tsc -p .` o `--ignoreConfig` |
| TS6133 | *'x' is declared but its value is never read* | `noUnusedLocals` / `noUnusedParameters` | Usar, quitar o prefijar con `_` |

---

## 7. La línea de órdenes

| Orden | Para qué |
|---|---|
| `tsc` | Compilar el proyecto del `tsconfig.json` de la carpeta actual |
| `tsc -p ruta` | Compilar otro proyecto |
| `tsc --noEmit` | Solo comprobar tipos |
| `tsc -w` | Vigilar y recompilar |
| `tsc -b` | Construir referencias de proyecto en orden |
| `tsc --init` | Crear un `tsconfig.json` (mínimo y moderno desde la 5.9) |
| `tsc --showConfig` | Ver la configuración efectiva |
| `tsc --listFilesOnly` · `--explainFiles` | Qué archivos entran y por qué |
| `tsc --traceResolution` | Cómo se resuelve cada importación |
| `tsc --extendedDiagnostics` | Tiempos y memoria |
| `tsc --generateTrace carpeta` | Traza para `@typescript/analyze-trace` |
| `tsc --noCheck` | Emitir sin comprobar (5.6) |
| `tsc --ignoreConfig archivo.ts` | Compilar un archivo suelto ignorando el `tsconfig.json` (6.0) |
| `tsc --checkers N` · `--builders N` · `--singleThreaded` | Paralelismo (7.0) |
| `tsc --runExternalCode` | Permitir *content mappers* (7.1 🟡) |

---

## 8. Glosario

| Término | Definición |
|---|---|
| **Aserción de tipo** | `x as T`: decirle al compilador el tipo de una expresión, sin comprobación en ejecución |
| **Asignabilidad** | Relación por la que un valor de un tipo se acepta donde se espera otro |
| **Biblioteca (`lib`)** | Archivo de declaraciones con las API de una edición de ECMAScript o del DOM |
| **Comprobador** (*checker*) | La parte del compilador que calcula tipos y detecta errores |
| **Contextual (tipado)** | Inferir el tipo de una expresión a partir del lugar donde aparece |
| **Corsa** | Nombre interno del compilador nativo en Go (TypeScript 7) |
| **Declaración** (`.d.ts`) | Archivo con solo tipos, sin implementación |
| **DefinitelyTyped** | Repositorio comunitario de declaraciones publicado como `@types/*` |
| **Discriminante** | Propiedad literal común que distingue los miembros de una unión |
| **Distributivo** | Tipo condicional que se aplica por separado a cada miembro de una unión |
| **Emisión** | La salida del compilador: JavaScript, declaraciones y mapas de fuente |
| **Emisión propia** | Sintaxis de TypeScript que genera código (`enum`, `namespace`) |
| **Ensanchamiento** (*widening*) | Pasar de un tipo literal a su primitivo (`"a"` → `string`) |
| **Estrechamiento** (*narrowing*) | Reducir el tipo de una variable según las comprobaciones del código |
| **Estructural (tipado)** | Compatibilidad por la forma, no por el nombre |
| **Frescura** | Condición de un literal de objeto recién escrito, que activa la comprobación de propiedades sobrantes |
| **Fusión de declaraciones** | Combinación de varias declaraciones con el mismo nombre (interfaces, *namespaces*) |
| **Guarda de tipo** | Expresión o función que estrecha un tipo (`typeof`, `x is T`) |
| **Homomórfico** | Tipo mapeado sobre `keyof T` que conserva modificadores y la forma de tuplas |
| **Inferencia** | Deducción automática de tipos |
| **Instanciación** | Sustituir los parámetros de un tipo genérico por tipos concretos |
| **LSP** | *Language Server Protocol*: protocolo estándar entre editor y servidor de lenguaje, el de la 7.0 |
| **Marca** (*brand*) | Propiedad ficticia que simula tipado nominal |
| **Módulo** | Archivo con `import` o `export` (o forzado con `moduleDetection`) |
| **`never`** | El tipo sin valores; resultado de lo imposible |
| **Obsoleto** (*deprecated*) | Opción que avisa y desaparecerá; se silencia con `ignoreDeprecations` |
| **Parámetro de tipo** | Variable de tipo de un genérico (`T`) |
| **Predicado de tipo** | Tipo de retorno `x is T` |
| **Prueba de debut** | En este atlas: código que compila en una versión y falla en la anterior ([25](25-pruebas-de-debut.md)) |
| **Referencia de proyecto** | Proyecto que depende de otro, construido con `tsc -b` |
| **Servicio de lenguaje** | La parte que alimenta al editor: completado, errores, renombrar |
| **Sintaxis borrable** | La que se puede eliminar dejando JavaScript válido |
| **Solidez** (*soundness*) | Propiedad de un sistema de tipos que nunca acepta un programa con errores de tipos en ejecución; TypeScript renuncia a ella a propósito |
| **Stage** | Etapa de una propuesta en TC39 (0, 1, 2, 2.7, 3, 4) |
| **Strada** | Nombre interno del compilador escrito en TypeScript (1.1 a 6.0) |
| **`target`** | La edición de ECMAScript a la que se transforma la sintaxis |
| **TC39** | Comité de Ecma que define JavaScript |
| **`tsserver`** | El servidor de lenguaje propio de TypeScript hasta la 6.0 |
| **Tupla variádica** | Tupla con elementos propagados genéricos `[...T]` |
| **Unión** | Tipo «uno de estos»: `A \| B` |
| **`unknown`** | El tipo superior seguro: acepta todo y no permite nada sin comprobar |
| **Varianza** | Cómo se relacionan `F<A>` y `F<B>` cuando `A` y `B` se relacionan |

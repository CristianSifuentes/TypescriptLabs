<div align="center">

# 07 · TypeScript 4.0–4.4: tuplas variádicas y plantillas literales

**Tuplas que se concatenan, cadenas que se calculan, `noUncheckedIndexedAccess`, `override`, condiciones con alias y `exactOptionalPropertyTypes` (2020–2021)**

[⬅ 06 · TypeScript 3.5–3.9](06-typescript-3.5-3.9-encadenamiento-y-aserciones.md) · [🏠 Índice](../README.md) · [08 · TypeScript 4.5–4.9 ➡](08-typescript-4.5-4.9-esm-y-satisfies.md)

</div>

<!-- ts=4.0 -->

| Ficha | 4.0 | 4.1 | 4.2 | 4.3 | 4.4 |
|---|---|---|---|---|---|
| **Publicación** | 20-ago-2020 | 19-nov-2020 | 23-feb-2021 | 26-may-2021 | 26-ago-2021 |
| **Protagonista** | Tuplas variádicas | Plantillas literales | Rest en medio | `override` | Condiciones con alias |
| **Compilador** | `4.0.8` | `4.1.6` | `4.2.4` | `4.3.5` | `4.4.4` |

> [!IMPORTANT]
> La serie 4 es la era de la **expresividad**: el sistema de tipos deja de describir datos y empieza a **calcular** con ellos. Con las tuplas
> variádicas, los tipos de plantilla literal y el remapeo de claves, una firma puede concatenar listas, construir nombres de propiedades o
> analizar una cadena. El precio es la complejidad, y por eso esta misma etapa trae opciones para **endurecer** el comprobador:
> `noUncheckedIndexedAccess`, `noImplicitOverride`, `useUnknownInCatchVariables` y `exactOptionalPropertyTypes`.

---

## Contenido

1. [Tuplas variádicas](#1-tuplas-variádicas)
2. [TypeScript 4.0: asignación lógica, `unknown` en `catch` y propiedades inferidas](#2-typescript-40-asignación-lógica-unknown-en-catch-y-propiedades-inferidas)
3. [TypeScript 4.1: tipos de plantilla literal](#3-typescript-41-tipos-de-plantilla-literal)
4. [TypeScript 4.1: remapeo de claves y condicionales recursivos](#4-typescript-41-remapeo-de-claves-y-condicionales-recursivos)
5. [`noUncheckedIndexedAccess`](#5-nouncheckedindexedaccess)
6. [TypeScript 4.2: tuplas más flexibles y clases abstractas como valores](#6-typescript-42-tuplas-más-flexibles-y-clases-abstractas-como-valores)
7. [TypeScript 4.3: `override` y tipos de escritura separados](#7-typescript-43-override-y-tipos-de-escritura-separados)
8. [TypeScript 4.4: condiciones con alias y propiedades opcionales exactas](#8-typescript-44-condiciones-con-alias-y-propiedades-opcionales-exactas)
9. [Notas de migración](#9-notas-de-migración)
10. [Referencias](#10-referencias)

---

## 1. Tuplas variádicas

### El problema

Las tuplas en parámetros rest de la 3.0 ([05 § Tuplas en rest](05-typescript-3.0-3.4-proyectos-y-tuplas.md#3-tuplas-en-parámetros-rest)) permitían
capturar una lista de argumentos, pero no **combinarla** con otra. Una función como `concat` o `bind` parcial necesitaba una sobrecarga por cada
longitud posible. Las declaraciones de la época llegaban a tener siete u ocho firmas casi idénticas, y fallaban con la novena.

```ts ts=3.9 omitir
// Antes de la 4.0: una sobrecarga por longitud, y la esperanza de que nadie pase cinco elementos
declare function concat<A, B>(a: [A], b: [B]): [A, B];
declare function concat<A, B, C>(a: [A, B], b: [C]): [A, B, C];
declare function concat<A, B, C>(a: [A], b: [B, C]): [A, B, C];
// …y así hasta el infinito
```

### La solución

La 4.0 permite que un **parámetro de tipo** aparezca propagado dentro de una tupla: `[...T]`. Y permite poner varios en la misma tupla, en
cualquier orden.

```ts run debut
function concatenar<T extends unknown[], U extends unknown[]>(a: [...T], b: [...U]): [...T, ...U] {
    return [...a, ...b];
}

const fila = concatenar([1, "dos"], [true, null]);
//    ^? const fila: [number, string, boolean, null]

console.log(fila.length, typeof fila[2]);   // → 4 boolean
```

El ejemplo clásico es la **aplicación parcial**: fijar los primeros argumentos de una función y devolver otra que recibe el resto, conservando los
tipos de cada uno.

```ts run debut
function parcial<Fijos extends unknown[], Resto extends unknown[], R>(
    f: (...args: [...Fijos, ...Resto]) => R,
    ...fijos: Fijos
): (...resto: Resto) => R {
    return (...resto) => f(...fijos, ...resto);
}

function formatear(moneda: string, decimales: number, cantidad: number): string {
    return `${cantidad.toFixed(decimales)} ${moneda}`;
}

const enEuros = parcial(formatear, "EUR", 2);
//    ^? const enEuros: (cantidad: number) => string

console.log(enEuros(19.5));   // → 19.50 EUR
```

Dos reglas de la 4.0 hacen que esto funcione:

| Regla | Ejemplo | Resultado |
|---|---|---|
| Un `...T` genérico se expande al instanciarse | `[...T, boolean]` con `T = [string, number]` | `[string, number, boolean]` |
| Un rest de arreglo se **aplana** con lo que lo rodea | `[string, ...number[], ...boolean[]]` | `[string, ...(number \| boolean)[]]` |

### Elementos etiquetados

La misma versión permite **nombrar** los elementos de una tupla. Los nombres no cambian el tipo; son documentación que el editor muestra en las
firmas y en el autocompletado.

```ts debut
type Rango = [inicio: number, fin: number];
type Opciones = [url: string, reintentos?: number, ...cabeceras: string[]];

function pedir(...args: Opciones): string {
    const [url, reintentos = 3] = args;
    return `${url} (${reintentos})`;
}

pedir("/api");
pedir("/api", 5, "Accept: application/json");
const rango: Rango = [1, 7];
```

> [!NOTE]
> Hasta la 5.2, una tupla tenía que etiquetar **todos** sus elementos o ninguno. `[primero: string, number]` es válido desde la 5.2
> ([09 § TypeScript 5.2](09-typescript-5.0-5.4-decoradores-y-using.md#7-typescript-52-metadatos-de-decoradores-y-métodos-de-copia)).

---

## 2. TypeScript 4.0: asignación lógica, `unknown` en `catch` y propiedades inferidas

### Operadores de asignación lógica

Tres operadores de ES2021 que TypeScript adoptó al llegar a stage 3. Cada uno asigna **solo si** la condición se cumple, y no evalúa el lado
derecho en caso contrario.

```ts run debut
const opciones: { nombre?: string; reintentos?: number; activo?: boolean } = { reintentos: 0, activo: true };

opciones.nombre ??= "anónimo";   // asigna: era undefined
opciones.reintentos ??= 3;       // no asigna: 0 no es nulo
opciones.activo &&= false;       // asigna: era verdadero

let cache: string[] | undefined;
(cache ??= []).push("primero");

console.log(opciones.nombre, opciones.reintentos, opciones.activo, cache.length);   // → anónimo 0 false 1
```

| Operador | Equivale a | Asigna cuando `a` es… |
|---|---|---|
| `a \|\|= b` | `a \|\| (a = b)` | Falso: `0`, `""`, `false`, `null`, `undefined`, `NaN` |
| `a &&= b` | `a && (a = b)` | Verdadero |
| `a ??= b` | `a ?? (a = b)` | `null` o `undefined` |

> [!TIP]
> La equivalencia no es `a = a ?? b`: con `??=` **no hay asignación** si `a` ya tiene valor. La diferencia se nota con *setters*, propiedades de
> solo lectura en ejecución y objetos congelados.

### `unknown` en la variable de `catch`

En JavaScript se puede lanzar cualquier cosa, no solo errores. Hasta la 4.0, la variable de `catch` era siempre `any`; la 4.0 permite anotarla
como `unknown` y obliga así a comprobar qué se capturó.

```ts run debut
function mensajeDe(operacion: () => void): string {
    try {
        operacion();
        return "ok";
    } catch (e: unknown) {
        return e instanceof Error ? e.message : `lanzado: ${String(e)}`;
    }
}

console.log(mensajeDe(() => { throw new Error("falló"); }));   // → falló
console.log(mensajeDe(() => { throw 42; }));                   // → lanzado: 42
```

La 4.4 dio el paso siguiente con `useUnknownInCatchVariables`, que convierte ese `unknown` en el comportamiento por defecto dentro de `--strict`
([§ 8](#8-typescript-44-condiciones-con-alias-y-propiedades-opcionales-exactas)).

### Propiedades inferidas desde el constructor

Con `noImplicitAny`, un campo sin anotación ni inicializador era un error. Desde la 4.0, el compilador mira las asignaciones del constructor:

```ts run debut
class Cuadrado {
    area;          // 4.0: se infiere `number` por la asignación de abajo
    lado;
    constructor(lado: number) {
        this.lado = lado;
        this.area = lado ** 2;
    }
}

console.log(new Cuadrado(3).area);   // → 9
```

Solo cuentan las asignaciones del **constructor**; si una rama no asigna, el tipo incluye `undefined`.

### Lo demás de la 4.0

| Característica | Para qué |
|---|---|
| `--incremental` con `--noEmit` | La caché incremental sirve también a quien solo comprueba tipos (el caso de casi todos los proyectos con empaquetador) |
| `jsxFragmentFactory` | Elegir la función de los fragmentos `<>…</>` junto a `jsxFactory`, para Preact y otras bibliotecas |
| `/** @deprecated */` | El editor tacha las declaraciones marcadas |
| Modo semántico parcial | El editor responde mientras carga un proyecto grande, en lugar de esperar a tenerlo entero |

---

<!-- ts=4.1 -->

## 3. TypeScript 4.1: tipos de plantilla literal

### El problema

Los tipos literales de cadena existían desde la 1.8, pero eran **atómicos**: se podía escribir `"click" | "focus"`, no construir `"onClick"` a
partir de `"click"`. Las bibliotecas de eventos, de rutas o de CSS-in-JS tenían que enumerar todas las combinaciones a mano, o rendirse a `string`.

### La solución

La misma sintaxis de las plantillas de JavaScript, en el nivel de los tipos:

```ts debut
type Evento = "click" | "foco";
type Manejador = `on${Capitalize<Evento>}`;
//   ^? type Manejador = "onClick" | "onFoco"

type Talla = "s" | "m" | "l";
type Color = "rojo" | "azul";
type Variante = `${Talla}-${Color}`;   // las 6 combinaciones: el producto cartesiano

const v: Variante = "m-azul";
```

Cuando las piezas son uniones, el resultado es **el producto cartesiano**: `Variante` tiene seis miembros. Con uniones grandes, eso crece deprisa;
el compilador se niega por encima de 100 000 miembros (error TS2590).

### Patrones con `string`, `number` y `bigint`

Un hueco con `${string}` describe un **patrón**, no una lista:

```ts debut err=TS2322
type Ruta = `/${string}`;
type Pixeles = `${number}px`;

const inicio: Ruta = "/inicio";
const ancho: Pixeles = "120px";
const mal: Pixeles = "ancho";      // error TS2322
```

### Los cuatro tipos intrínsecos

La 4.1 añadió cuatro tipos que el compilador implementa internamente, porque no se pueden escribir con el propio sistema de tipos:

| Tipo | Ejemplo | Resultado |
|---|---|---|
| `Uppercase<S>` | `Uppercase<"hola">` | `"HOLA"` |
| `Lowercase<S>` | `Lowercase<"HOLA">` | `"hola"` |
| `Capitalize<S>` | `Capitalize<"atlas">` | `"Atlas"` |
| `Uncapitalize<S>` | `Uncapitalize<"Atlas">` | `"atlas"` |

### Inferir dentro de una plantilla

Combinadas con `infer` (2.8), las plantillas **analizan** cadenas. Este es el ejemplo que popularizó la 4.1: extraer los parámetros de una ruta
de Express.

```ts debut
type Parametros<R extends string> =
    R extends `${string}:${infer P}/${infer Resto}` ? P | Parametros<`/${Resto}`>
    : R extends `${string}:${infer P}` ? P
    : never;

type DeUsuario = Parametros<"/usuarios/:id/pedidos/:pedido">;
//   ^? type DeUsuario = "id" | "pedido"

function enlazar<R extends string>(ruta: R, valores: Record<Parametros<R>, string>): string {
    return ruta.replace(/:(\w+)/g, (_, k: string) => (valores as Record<string, string>)[k]);
}

enlazar("/usuarios/:id/pedidos/:pedido", { id: "7", pedido: "42" });
```

> [!WARNING]
> Analizar cadenas con tipos es potente y **caro**. Cada nivel de recursión es una instanciación, y el límite de profundidad (50 hasta la 4.5,
> 1000 en posición de cola desde entonces) llega antes de lo que parece. El capítulo [15 · Programación a nivel de tipos](15-programacion-a-nivel-de-tipos.md)
> explica cuándo compensa.

---

## 4. TypeScript 4.1: remapeo de claves y condicionales recursivos

### Remapeo de claves con `as`

Un tipo mapeado (2.1) conservaba los nombres de las propiedades. Desde la 4.1, una cláusula `as` los **transforma**, y si el resultado es `never`,
la propiedad desaparece.

```ts debut
interface Persona {
    nombre: string;
    edad: number;
    activo: boolean;
}

type Getters<T> = { [K in keyof T as `get${Capitalize<string & K>}`]: () => T[K] };
type SoloTexto<T> = { [K in keyof T as T[K] extends string ? K : never]: T[K] };

type GettersDePersona = Getters<Persona>;   // { getNombre: () => string; getEdad: () => number; getActivo: () => boolean }
type TextoDePersona = SoloTexto<Persona>;
//   ^? type TextoDePersona = { nombre: string; }
```

El `string & K` es necesario porque `keyof T` puede incluir `number` y `symbol`, que no caben en una plantilla de forma útil.

### Tipos condicionales recursivos

Hasta la 4.0, un tipo condicional no podía referirse a sí mismo de forma directa: había que recurrir a trucos con tipos indexados. La 4.1 lo
permite, y con ello llegaron los utilitarios «profundos».

```ts debut
type Aplanar<T> = T extends readonly (infer U)[] ? Aplanar<U> : T;
type SoloLectura<T> = T extends object ? { readonly [K in keyof T]: SoloLectura<T[K]> } : T;

type Hoja = Aplanar<number[][][]>;
//   ^? type Hoja = number

declare const config: SoloLectura<{ servidor: { puerto: number } }>;
// config.servidor.puerto = 1;   // error: es de solo lectura en todos los niveles
```

### `paths` sin `baseUrl` y las fábricas de React 17

| Característica | Detalle |
|---|---|
| `paths` sin `baseUrl` | Las rutas de `paths` se resuelven respecto al `tsconfig.json`. Es lo que permitió, cinco años después, declarar `baseUrl` obsoleto ([11 § Lo obsoleto](11-typescript-6.0-el-puente.md#5-lo-que-queda-obsoleto)) |
| `jsx: react-jsx` y `react-jsxdev` | El transformador automático de React 17: no hace falta `import React` en cada archivo |
| `checkJs` sin `allowJs` | Activar `checkJs` implica ya `allowJs` |

---

## 5. `noUncheckedIndexedAccess`

### El problema

Una firma de índice promete «para cualquier clave hay un valor». Es mentira casi siempre: un arreglo vacío no tiene elemento `0`, un diccionario no
tiene todas las claves. Pero el compilador lo creía, y por eso esto compilaba con `--strict`:

```ts ts=4.0 run
const nombres: string[] = [];
const diccionario: Record<string, number> = {};

function primeraLetra(): string {
    return nombres[0].charAt(0);           // compila… y lanza TypeError
}

const total: number = diccionario["inexistente"];
console.log(total);                        // → undefined
```

### La solución

Con `noUncheckedIndexedAccess` (4.1), **todo acceso por índice** añade `undefined` al tipo resultante. No forma parte de `--strict`: es una opción
aparte porque rompe mucho código existente.

```ts debut opts=noUncheckedIndexedAccess err=TS2532/TS18048
const nombres: string[] = ["Ana"];
const largo: number = nombres[0].length;   // error: `nombres[0]` puede ser undefined
```

```ts opts=noUncheckedIndexedAccess
const nombres: string[] = ["Ana", "Luis"];

// 1. Comprobar
const primero = nombres[0];
if (primero !== undefined) {
    primero.toUpperCase();
}

// 2. Valor por defecto
const segundo = nombres[1] ?? "nadie";

// 3. for…of no indexa: no hay undefined
for (const nombre of nombres) {
    nombre.toUpperCase();
}

// 4. Las tuplas de longitud conocida tampoco lo necesitan
const par: [string, number] = ["a", 1];
par[0].toUpperCase();
```

| Acceso | Sin la opción | Con `noUncheckedIndexedAccess` |
|---|---|---|
| `arreglo[i]` | `T` | `T \| undefined` |
| `registro[clave]` (firma de índice) | `T` | `T \| undefined` |
| `tupla[0]` (índice dentro de la longitud) | `T` | `T` |
| `objeto.propiedad` declarada | `T` | `T` |
| `for (const x of arreglo)` | `T` | `T` |

> [!TIP]
> Es la opción con mejor relación entre errores evitados y molestias que **no** está en `--strict`. La recomiendan las configuraciones base de
> referencia y el `tsc --init` de la 5.9 la incluye. Configuración completa en [17 · `tsconfig` de referencia](17-tsconfig-de-referencia.md).

---

<!-- ts=4.2 -->

## 6. TypeScript 4.2: tuplas más flexibles y clases abstractas como valores

### Elementos rest al principio o en medio

En la 4.0 el rest de una tupla tenía que ir al final. La 4.2 lo admite en cualquier posición, siempre que solo haya uno y no lo sigan elementos
opcionales.

```ts debut
type TerminaEnNumero = [...string[], number];
type Emparedado = [boolean, ...string[], boolean];

const fila: TerminaEnNumero = ["a", "b", 1];
const capas: Emparedado = [true, "x", "y", false];

function ultimo<T extends unknown[], U>(args: [...T, U]): U {
    return args[args.length - 1] as U;
}
const n: number = ultimo(["a", "b", 3]);
```

### Firmas de construcción `abstract`

Una clase abstracta no se puede instanciar, así que no encajaba en `new () => T`. Eso impedía escribir *mixins* sobre clases abstractas. La 4.2
añade `abstract new`:

```ts debut
abstract class Figura {
    abstract area(): number;
    describir(): string { return `área ${this.area().toFixed(1)}`; }
}

type ClaseAbstracta<T> = abstract new (...args: any[]) => T;

function conNombre<B extends ClaseAbstracta<object>>(Base: B) {
    abstract class ConNombre extends Base {
        nombre = "figura";
    }
    return ConNombre;
}

class Circulo extends conNombre(Figura) {
    constructor(private radio: number) { super(); }
    area(): number { return Math.PI * this.radio ** 2; }
}
```

### `noPropertyAccessFromIndexSignature`

Una opción que obliga a usar corchetes cuando la propiedad viene de una firma de índice, para que el código **muestre** que la clave puede no existir:

```ts debut opts=noPropertyAccessFromIndexSignature err=TS4111
interface Entorno {
    NODE_ENV: string;
    [clave: string]: string;
}
declare const entorno: Entorno;

entorno.NODE_ENV;     // correcto: declarada
entorno["RUTA"];      // correcto: corchetes
entorno.RUTA;         // error TS4111: viene de una firma de índice
```

### Lo demás de la 4.2

| Característica | Detalle |
|---|---|
| Alias conservados | Los mensajes de error y los `.d.ts` muestran el alias escrito (`Talla`) y no su expansión (`"s" \| "m" \| "l"`) |
| `--explainFiles` | Explica por qué cada archivo forma parte del programa: imprescindible para entender un `tsc` lento ([18 · Rendimiento](18-bajo-el-capo-y-rendimiento.md)) |
| `in` estricto | `"x" in 42` es un error: el lado derecho no puede ser primitivo |
| Destructurados sin usar | Los elementos con `_` delante no cuentan para `noUnusedLocals` |

---

<!-- ts=4.3 -->

## 7. TypeScript 4.3: `override` y tipos de escritura separados

### `override` y `noImplicitOverride`

Si una clase base renombra un método, las subclases que lo sobrescribían se quedan con un método huérfano que ya nadie llama, sin ningún aviso.
`override` declara la intención; `noImplicitOverride` la exige.

```ts debut opts=noImplicitOverride
class Base {
    saludar(): string { return "hola"; }
    despedir(): string { return "adiós"; }
}

class Cortes extends Base {
    override saludar(): string { return "buenos días"; }
    override despedir(): string { return "hasta luego"; }
}
```

```ts opts=noImplicitOverride err=TS4114,TS4113
class Base {
    saludar(): string { return "hola"; }
}

class Derivada extends Base {
    saludar(): string { return "¡hola!"; }            // error TS4114: falta `override`
    override saludo(): string { return "errata"; }    // error TS4113: no hay nada que sobrescribir
}
```

| Situación | Sin la opción | Con `noImplicitOverride` |
|---|---|---|
| Sobrescribir sin `override` | Correcto | **Error TS4114** |
| `override` sobre un miembro inexistente en la base | **Error TS4113** | **Error TS4113** |
| `override` en una clase sin `extends` | **Error TS4112** | **Error TS4112** |

### Tipos de escritura separados

El `set` de una propiedad puede aceptar un tipo **más amplio** que el que devuelve el `get`. El caso típico es un *setter* que normaliza:

```ts run debut
class Caja {
    #tamano = 0;
    get tamano(): number { return this.#tamano; }
    set tamano(valor: string | number) { this.#tamano = Number(valor); }
}

const caja = new Caja();
caja.tamano = "42";              // se escribe con texto…
const leido: number = caja.tamano;   // …y se lee como número
console.log(leido + 1);          // → 43
```

En la 4.3, el tipo del `get` tenía que ser asignable al del `set`. La 5.1 eliminó esa restricción cuando ambos están anotados ([09 § 5.1](09-typescript-5.0-5.4-decoradores-y-using.md#5-typescript-51-retornos-implícitos-y-accesores-independientes)).

### Métodos, accesores y estáticos `#privados`

La 3.8 trajo los campos `#privados`; la 4.3 completa el conjunto con métodos, accesores y miembros estáticos.

```ts run debut opts=useDefineForClassFields
class Motor {
    static #instancias = 0;
    #encendido = false;

    #comprobar(): boolean { return !this.#encendido; }
    get #estado(): string { return this.#encendido ? "en marcha" : "parado"; }

    arrancar(): string {
        if (this.#comprobar()) {
            this.#encendido = true;
            Motor.#instancias++;
        }
        return `${this.#estado} (${Motor.#instancias})`;
    }
}

console.log(new Motor().arrancar());   // → en marcha (1)
```

### Lo demás de la 4.3

```ts debut err=TS2801
async function disponible(): Promise<boolean> { return true; }

async function comprobar(): Promise<string> {
    const promesa = disponible();
    if (promesa) {                 // error TS2801: la promesa siempre es verdadera; ¿falta `await`?
        return "siempre entra";
    }
    return "nunca";
}
```

| Característica | Ejemplo |
|---|---|
| Firmas de índice `static` | `class Registro { static [clave: string]: number }` |
| Estrechamiento contextual de genéricos | Un `C extends Set<T> \| T[]` se estrecha con `instanceof` |
| Plantillas contextuales | `` `hola ${nombre}` `` es asignable a `` `hola ${string}` `` |
| Completado de `import` | El editor propone la sentencia entera al escribir `import` |

---

<!-- ts=4.4 -->

## 8. TypeScript 4.4: condiciones con alias y propiedades opcionales exactas

### Análisis de flujo con condiciones en alias

Hasta la 4.3, guardar una condición en una constante **rompía** el estrechamiento: el compilador solo lo aplicaba cuando la comprobación estaba
escrita dentro del `if`. La 4.4 sigue la pista de la constante.

```ts solo=4.3 err=TS2339
function medir(x: string | number): number {
    const esTexto = typeof x === "string";
    if (esTexto) {
        return x.length;      // 4.3: error, `x` sigue siendo string | number
    }
    return x as number;
}
```

```ts run debut
function medir(x: string | number): number {
    const esTexto = typeof x === "string";
    if (esTexto) {
        return x.length;      // 4.4: `x` es string
    }
    return x;                 // y aquí, number
}

type Forma = { tipo: "circulo"; radio: number } | { tipo: "cuadrado"; lado: number };

function area(forma: Forma): number {
    const { tipo } = forma;                    // también desde una propiedad discriminante
    const esCirculo = tipo === "circulo";
    return esCirculo ? Math.PI * forma.radio ** 2 : forma.lado ** 2;
}

console.log(medir("atlas"), medir(7), area({ tipo: "cuadrado", lado: 3 }));   // → 5 7 9
```

Funciona si la constante es `const`, si lo comprobado es un parámetro `readonly`, una `const` o un parámetro que no se reasigna, y si no hay más
de cinco niveles de indirección.

### Firmas de índice de símbolo y de plantilla

```ts debut
interface Atributos {
    id: string;
    [dato: `data-${string}`]: string;     // patrón de plantilla
    [simbolo: symbol]: unknown;           // símbolos
}

const atributos: Atributos = { id: "a1", "data-rol": "boton" };
```

### `useUnknownInCatchVariables`

La anotación `catch (e: unknown)` de la 4.0 se convierte en el comportamiento por defecto con `--strict`:

```ts debut opts=useUnknownInCatchVariables err=TS18046/TS2571
try {
    JSON.parse("{");
} catch (e) {
    console.log(e.message);   // error: `e` es unknown
}
```

### `exactOptionalPropertyTypes`

`x?: T` significa dos cosas distintas: «la propiedad puede faltar» y «puede valer `undefined`». Casi siempre da igual; con `Object.keys`, `in`,
el operador de propagación o un `PATCH` a una API, no. Con `exactOptionalPropertyTypes`, `?` solo significa la primera.

```ts run debut opts=exactOptionalPropertyTypes
interface Ajustes {
    tema?: "claro" | "oscuro";
    zoom?: number | undefined;     // quien quiera admitir undefined lo dice
}

const sinTema: Ajustes = {};
const conZoomIndefinido: Ajustes = { zoom: undefined };

console.log("tema" in sinTema, "zoom" in conZoomIndefinido);   // → false true
```

```ts opts=exactOptionalPropertyTypes err=TS2375/TS2322
interface Ajustes { tema?: "claro" | "oscuro"; }
const ajustes: Ajustes = { tema: undefined };   // error: `tema` puede faltar, pero no valer undefined
```

> [!WARNING]
> `exactOptionalPropertyTypes` **no** forma parte de `--strict` y obliga a cambiar muchas declaraciones, incluidas las de bibliotecas. Úsala en
> código nuevo que modele datos de una API, donde la diferencia entre «ausente» y «nulo» importa.

### Bloques `static`

```ts run debut opts=useDefineForClassFields
class Configuracion {
    static #valores = new Map<string, string>();
    static entorno: string;

    static {
        Configuracion.#valores.set("modo", "produccion");
        Configuracion.entorno = Configuracion.#valores.get("modo") ?? "desarrollo";
    }
}

console.log(Configuracion.entorno);   // → produccion
```

Un bloque `static` (ES2022) se ejecuta una vez, al definir la clase, y tiene acceso a los miembros `#privados`. Sustituye a las funciones
autoejecutadas que se escribían después de la clase.

### Sugerencias incrustadas

La 4.4 estrenó en el editor las **inlay hints**: nombres de parámetros y tipos inferidos que aparecen junto al código sin formar parte de él.
VS Code las desactiva por defecto; se activan con los ajustes `typescript.inlayHints.*`.

---

## 9. Notas de migración

| Versión | Cambio | Síntoma | Qué hacer |
|---|---|---|---|
| 4.0 | Las propiedades no pueden sobrescribir accesores (ni al revés) | TS2610 / TS2611 | Usar el mismo tipo de miembro que la clase base |
| 4.0 | `delete` exige que la propiedad sea opcional | TS2790 | Marcarla con `?` o usar desestructuración con resto |
| 4.1 | `resolve()` de una `Promise` exige argumento si el tipo no admite `undefined` | TS2794 | `new Promise<void>(…)` o pasar el valor |
| 4.1 | Los propagadores condicionales crean propiedades opcionales | Tipos más precisos que rompen comparaciones | Normalmente inocuo |
| 4.2 | `noImplicitAny` en desestructuraciones sin tipo | TS7031 | Anotar el patrón |
| 4.2 | `in` con un primitivo a la derecha | TS2361 | Comprobar que el valor es objeto |
| 4.3 | Promesas usadas como condición | TS2801 | Añadir `await` |
| 4.4 | `useUnknownInCatchVariables` entra en `--strict` | TS18046 / TS2571 en `catch (e)` | Comprobar con `instanceof Error`, o anotar `catch (e: any)` mientras se migra |
| 4.4 | Comprobación de funciones siempre verdaderas en condiciones también con `&&` | TS2774 | Llamar a la función |
| 4.4 | Abstract members ya no pueden tener inicializador | TS1267 | Quitar el valor |

> [!CAUTION]
> El cambio de `useUnknownInCatchVariables` en la 4.4 es el que más proyectos rompió de esta etapa, porque **activar `--strict`** era un hábito y
> la opción entró en el paquete sin que nadie la pidiera explícitamente. Es el patrón de toda la familia `strict`: cada opción nueva que se añade
> a ella es un cambio incompatible para quien la tiene activada ([04 § `--strict`](04-typescript-2.3-2.9-estricto-y-condicionales.md#1-typescript-23---strict)).

---

## 10. Referencias

- Notas oficiales: [4.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html) · [4.1](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-1.html) · [4.2](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-2.html) · [4.3](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-3.html) · [4.4](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-4.html)
- Manual: [Tipos de plantilla literal](https://www.typescriptlang.org/docs/handbook/2/template-literal-types.html) · [Tipos mapeados](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) · [Tuplas](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types)
- Opciones: [`noUncheckedIndexedAccess`](https://www.typescriptlang.org/tsconfig/#noUncheckedIndexedAccess) · [`noImplicitOverride`](https://www.typescriptlang.org/tsconfig/#noImplicitOverride) · [`exactOptionalPropertyTypes`](https://www.typescriptlang.org/tsconfig/#exactOptionalPropertyTypes) · [`useUnknownInCatchVariables`](https://www.typescriptlang.org/tsconfig/#useUnknownInCatchVariables)
- Pruebas de debut: [25 · TypeScript 4.0](25-pruebas-de-debut.md#typescript-40) a [4.4](25-pruebas-de-debut.md#typescript-44)

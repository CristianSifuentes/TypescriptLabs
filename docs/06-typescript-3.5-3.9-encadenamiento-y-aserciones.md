<div align="center">

# 06 · TypeScript 3.5–3.9: encadenamiento opcional y aserciones

**`Omit`, generadores estrictos, `?.`, `??`, funciones de aserción, `import type`, campos `#privados`, `await` de nivel superior y `@ts-expect-error` (2019–2020)**

[⬅ 05 · TypeScript 3.0–3.4](05-typescript-3.0-3.4-proyectos-y-tuplas.md) · [🏠 Índice](../README.md) · [07 · TypeScript 4.0–4.4 ➡](07-typescript-4.0-4.4-tuplas-variadicas-y-plantillas.md)

</div>

<!-- ts=3.5 -->

| Ficha | 3.5 | 3.6 | 3.7 | 3.8 | 3.9 |
|---|---|---|---|---|---|
| **Publicación** | 29-may-2019 | 28-ago-2019 | 5-nov-2019 | 20-feb-2020 | 12-may-2020 |
| **Protagonista** | `Omit`, velocidad | Generadores | `?.` y `??` | `import type`, `#privado` | `@ts-expect-error` |
| **Compilador** | `3.5.3` | `3.6.5` | `3.7.7` | `3.8.3` | `3.9.10` |

> [!IMPORTANT]
> La segunda mitad de la serie 3 es la de **TC39**. El encadenamiento opcional, la fusión nula, los campos privados y el `await` de nivel superior son
> propuestas de ECMAScript que TypeScript implementó al llegar a stage 3, meses antes de que entraran en el estándar. La 3.7 es, para muchos equipos,
> la versión que justificó por sí sola actualizar.

---

## Contenido

1. [TypeScript 3.5: `Omit` y uniones más inteligentes](#1-typescript-35-omit-y-uniones-más-inteligentes)
2. [TypeScript 3.6: generadores estrictos](#2-typescript-36-generadores-estrictos)
3. [TypeScript 3.7: encadenamiento opcional y fusión nula](#3-typescript-37-encadenamiento-opcional-y-fusión-nula)
4. [TypeScript 3.7: funciones de aserción](#4-typescript-37-funciones-de-aserción)
5. [TypeScript 3.7: alias recursivos y campos de clase](#5-typescript-37-alias-recursivos-y-campos-de-clase)
6. [TypeScript 3.8: `import type`](#6-typescript-38-import-type)
7. [TypeScript 3.8: campos `#privados` y `await` de nivel superior](#7-typescript-38-campos-privados-y-await-de-nivel-superior)
8. [TypeScript 3.9: `@ts-expect-error` y rendimiento](#8-typescript-39-ts-expect-error-y-rendimiento)
9. [Notas de migración](#9-notas-de-migración)
10. [Referencias](#10-referencias)

---

## 1. TypeScript 3.5: `Omit` y uniones más inteligentes

### `Omit`

`Pick<T, Exclude<keyof T, K>>` se había escrito en miles de proyectos con nombres distintos. La 3.5 lo incorporó a la biblioteca estándar.

```ts run debut
interface Usuario {
    id: number;
    nombre: string;
    clave: string;
}

type UsuarioPublico = Omit<Usuario, "clave">;
type NuevoUsuario = Omit<Usuario, "id">;

function publicar(usuario: Usuario): UsuarioPublico {
    const { clave, ...publico } = usuario;
    return publico;
}

const visible = publicar({ id: 1, nombre: "Ana", clave: "s3creta" });
console.log(Object.keys(visible).join());   // → id,nombre
```

> [!NOTE]
> `Omit<T, K>` no exige que `K` sea una clave de `T`: `Omit<Usuario, "inexistente">` compila sin avisar. Fue una decisión deliberada, y es el motivo
> por el que muchos proyectos definen su propio `OmitEstricto<T, K extends keyof T>`.

### Comprobación de uniones más inteligente

```ts debut
type Estado = { cargando: boolean; intentos: number };
type EstadoDiscriminado = { cargando: true; intentos: number } | { cargando: false; intentos: number };

declare const actual: Estado;
const destino: EstadoDiscriminado = actual;   // 3.4: error; 3.5: correcto
```

El compilador descompone `boolean` en `true | false` y comprueba cada combinación. Antes exigía que el origen encajara entero en **un** miembro de la unión.

La misma versión arregló el hueco contrario: un literal con propiedades de varios miembros, y con el tipo equivocado, pasaba la comprobación de
propiedades sobrantes.

```ts debut err=TS2322/TS2353/TS2326
type Punto = { x: number; y: number };
type Etiqueta = { nombre: string };

const cosa: Punto | Etiqueta = { x: 0, y: 0, nombre: true };   // error: `nombre` debe ser string
```

### Rendimiento

La 3.5 es también una versión de velocidad: sus notas hablan de comprobaciones más rápidas que en la 3.4 y de hasta un **68 % menos** de tiempo al
reconstruir con `--build` en repositorios con cientos de proyectos. Es un patrón que se repite: cada pocas versiones, una dedicada a recuperar el
terreno que las características nuevas habían costado ([18 § Historia del rendimiento](18-bajo-el-capo-y-rendimiento.md#6-doce-años-persiguiendo-la-velocidad)).

---

<!-- ts=3.6 -->

## 2. TypeScript 3.6: generadores estrictos

Un generador maneja tres tipos distintos: lo que **produce** (`yield`), lo que **devuelve** al terminar (`return`) y lo que **recibe** (`next(valor)`).
Hasta la 3.5, el compilador los mezclaba. `Generator<T, TReturn, TNext>` los separa.

```ts run debut
function* dialogo(): Generator<string, number, boolean> {
    let turnos = 0;
    while (true) {
        const continuar: boolean = yield "turno " + (++turnos);    // recibe un boolean
        if (!continuar) {
            return turnos;                                        // devuelve un number
        }
    }
}

const d = dialogo();
console.log(d.next().value);            // → turno 1
console.log(d.next(true).value);        // → turno 2
const fin = d.next(false);
console.log(fin.done, fin.value);       // → true 2
```

El resultado de `next()` es una unión discriminada por `done`, así que el análisis de flujo distingue el valor producido del valor final:

```ts
function* contar(): Generator<string, number, undefined> {
    yield "uno";
    return 1;
}

const paso = contar().next();
if (paso.done) {
    paso.value.toFixed();       // number
} else {
    paso.value.toUpperCase();   // string
}
```

| Parámetro | Qué describe | Dónde aparece |
|---|---|---|
| `T` | Cada valor producido | `yield valor` |
| `TReturn` | El valor final | `return valor`, y `value` cuando `done` es `true` |
| `TNext` | Lo que se le pasa al generador | El resultado de la expresión `yield` |

---

<!-- ts=3.7 -->

## 3. TypeScript 3.7: encadenamiento opcional y fusión nula

### El problema

Leer una propiedad profunda de un objeto que puede estar incompleto exigía una cadena de comprobaciones, y la manera corta de escribirlas —con `&&` y
`||`— era sutilmente incorrecta.

```ts ts=3.6
interface Pedido { cliente?: { direccion?: { ciudad: string } }; descuento?: number; }

function ciudadAntes(pedido: Pedido): string {
    return (pedido.cliente && pedido.cliente.direccion && pedido.cliente.direccion.ciudad) || "desconocida";
}
function descuentoAntes(pedido: Pedido): number {
    return pedido.descuento || 10;      // error lógico: un descuento de 0 se convierte en 10
}
```

### La solución

```ts run debut
interface Pedido {
    cliente?: { direccion?: { ciudad: string } };
    lineas?: { precio: number }[];
    descuento?: number;
    notificar?: () => string;
}

const vacio: Pedido = {};
const completo: Pedido = {
    cliente: { direccion: { ciudad: "Lima" } },
    lineas: [{ precio: 0 }],
    descuento: 0,
    notificar: () => "avisado",
};

console.log(vacio.cliente?.direccion?.ciudad);          // → undefined
console.log(completo.cliente?.direccion?.ciudad);       // → Lima
console.log(vacio.lineas?.[0]?.precio ?? -1);           // → -1
console.log(completo.descuento ?? 10);                  // → 0
console.log(completo.descuento || 10);                  // → 10
console.log(vacio.notificar?.() ?? "sin aviso");        // → sin aviso
```

| Operador | Se detiene o sustituye cuando el valor es… | Trampa que evita |
|---|---|---|
| `a?.b` | `null` o `undefined` | `a && a.b` también se detiene con `0`, `""` y `false` |
| `a?.[i]` | `null` o `undefined` | Igual, para accesos por índice |
| `f?.()` | `null` o `undefined` | Llamar a un *callback* opcional |
| `a ?? b` | `null` o `undefined` | `a \|\| b` también sustituye `0`, `""` y `false` |
| `a ??= b` (4.0) | `null` o `undefined` | Inicialización diferida |

### Semántica: el cortocircuito

`?.` no devuelve `undefined` y sigue: **abandona el resto de la cadena**. En `a?.b.c(d())`, si `a` es nulo, ni se accede a `.c` ni se evalúa `d()`.

```ts run
let evaluaciones = 0;
function costoso(): number { evaluaciones++; return 1; }

const nada: { metodo(n: number): number } | undefined = undefined as { metodo(n: number): number } | undefined;
const resultado = nada?.metodo(costoso());

console.log(resultado, evaluaciones);   // → undefined 0
```

> [!WARNING]
> `?.` solo protege el eslabón que lo lleva. `a?.b.c` falla si `a` existe pero `b` no. Y abusar de él esconde errores: si un valor **no debería**
> faltar, es mejor que el programa falle pronto. El laboratorio de este repositorio usa `passanger.children?.length || 0`: funciona, pero el `||`
> convertiría en `0` cualquier valor falso; con `??` la intención queda exacta ([26 § Encadenamiento opcional](26-laboratorio-del-repositorio.md#11-encadenamiento-opcional)).

---

## 4. TypeScript 3.7: funciones de aserción

Una guarda de tipo (`x is T`) devuelve un booleano y obliga a escribir un `if`. Una **función de aserción** lanza una excepción si la condición no se
cumple; si retorna, el compilador da la condición por cierta en todo lo que sigue.

```ts run debut
function afirmar(condicion: unknown, mensaje: string): asserts condicion {
    if (!condicion) {
        throw new Error(mensaje);
    }
}

function exigirTexto(valor: unknown): asserts valor is string {
    if (typeof valor !== "string") {
        throw new TypeError("se esperaba texto");
    }
}

function longitud(entrada: unknown): number {
    exigirTexto(entrada);
    return entrada.length;              // aquí `entrada` es string, sin `if`
}

function mitad(valor: number | undefined): number {
    afirmar(valor !== undefined, "falta el valor");
    return valor / 2;                   // aquí `valor` es number
}

console.log(longitud("atlas"), mitad(10));          // → 5 5
try {
    longitud(42);
} catch (e) {
    console.log((e as Error).message);              // → se esperaba texto
}
```

| | Guarda de tipo | Función de aserción |
|---|---|---|
| **Firma** | `(x): x is T` | `(x): asserts x is T` o `asserts condicion` |
| **Devuelve** | `boolean` | `void` (o lanza) |
| **Se usa con** | `if`, `filter`, operador ternario | Una sentencia suelta |
| **Ideal para** | Ramificar | Validar precondiciones y pruebas |

La misma versión enseñó al análisis de flujo que, tras llamar a una función que devuelve `never`, el código siguiente es inalcanzable:

```ts run debut
function fallar(mensaje: string): never {
    throw new Error(mensaje);
}

function exigir(texto: string | undefined): string {
    if (texto === undefined) {
        fallar("vacío");
    }
    return texto;           // 3.6: error, `texto` podía ser undefined
}

console.log(exigir("ok"));  // → ok
```

> [!NOTE]
> Ambas formas exigen que la función tenga un **tipo declarado de forma explícita** en el punto de la llamada. Una función flecha guardada en una
> constante sin anotar no sirve como función de aserción (error TS2775).

---

## 5. TypeScript 3.7: alias recursivos y campos de clase

### Alias de tipo recursivos

```ts run debut
type Json = string | number | boolean | null | Json[] | { [clave: string]: Json };

function profundidad(valor: Json): number {
    if (valor === null || typeof valor !== "object") {
        return 0;
    }
    const hijos: Json[] = Array.isArray(valor) ? valor : Object.keys(valor).map((k) => valor[k]);
    return 1 + Math.max(0, ...hijos.map(profundidad));
}

console.log(profundidad({ a: [1, { b: [true] }] }));   // → 4
```

Antes de la 3.7 hacía falta un rodeo con una interfaz intermedia (`interface JsonArray extends Array<Json> {}`), porque un alias no podía nombrarse a
sí mismo dentro de un arreglo.

### `useDefineForClassFields`

Los campos de clase de ECMAScript (ES2022) se **definen** en el objeto con `Object.defineProperty`. TypeScript llevaba años **asignándolos** con
`this.campo = valor`. Casi siempre da igual; en la herencia, no. El mismo programa imprime dos cosas distintas según la opción:

```ts run opts=useDefineForClassFields:false
class Base {
    constructor() { this.inicializar(); }
    inicializar(): void { }
}

class Derivada extends Base {
    valor: string | undefined;                               // campo sin inicializador
    inicializar(): void { this.valor = "puesto por Base"; }
}

console.log(new Derivada().valor);   // → puesto por Base
```

```ts run opts=useDefineForClassFields:true
class Base {
    constructor() { this.inicializar(); }
    inicializar(): void { }
}

class Derivada extends Base {
    valor: string | undefined;                               // con semántica estándar, esto redefine el campo
    inicializar(): void { this.valor = "puesto por Base"; }
}

console.log(new Derivada().valor);   // → undefined
```

| `useDefineForClassFields` | Emisión | Un campo sin inicializador… |
|---|---|---|
| `false` | `this.valor = …` en el constructor | No emite nada: conserva lo que hubiera |
| `true` | Campo de clase nativo o `Object.defineProperty` | Se define como `undefined` **después** de `super()` |

El valor por defecto es `true` cuando el destino es ES2022 o posterior, es decir, también con los valores por defecto de la 6.0 y la 7.0. Para declarar
el tipo de un campo heredado **sin** redefinirlo existe el modificador `declare`:

```ts run opts=useDefineForClassFields:true
class Base {
    constructor() { this.inicializar(); }
    inicializar(): void { }
}

class Derivada extends Base {
    declare valor: string | undefined;                       // solo tipo: no emite nada
    inicializar(): void { this.valor = "puesto por Base"; }
}

console.log(new Derivada().valor);   // → puesto por Base
```

### Comprobaciones nuevas de la 3.7

```ts debut err=TS2774
interface Usuario { esAdmin(): boolean; }

function nivel(usuario: Usuario): number {
    if (usuario.esAdmin) {      // error TS2774: la condición siempre es cierta; ¿querías llamarla?
        return 1;
    }
    return 0;
}
```

---

<!-- ts=3.8 -->

## 6. TypeScript 3.8: `import type`

### El problema

Cuando un archivo importa algo que solo usa como tipo, el compilador **elide** la importación: no aparece en el JavaScript. Para decidirlo necesita
conocer el programa entero. Las herramientas que compilan archivo a archivo —Babel entonces; esbuild, swc y la eliminación de tipos de Node después—
no pueden saberlo: ven `import { Usuario } from "./modelos"` y no tienen forma de averiguar si `Usuario` es una clase o una interfaz.

### La solución

```ts debut
// @filename: modelos.ts
export interface Usuario { nombre: string; }
export class Repositorio {
    buscar(): Usuario { return { nombre: "Ana" }; }
}

// @filename: principal.ts
import type { Usuario } from "./modelos";          // se borra siempre: es una promesa sintáctica
import { Repositorio } from "./modelos";           // se conserva: es un valor

const usuario: Usuario = new Repositorio().buscar();
export type { Usuario };
```

Lo importado con `import type` no se puede usar como valor:

```ts err=TS1361
// @filename: modelos.ts
export class Repositorio { }

// @filename: principal.ts
import type { Repositorio } from "./modelos";
const r = new Repositorio();   // error TS1361: se importó con 'import type' y no se puede usar como valor
```

### La línea que sigue

| Versión | Paso |
|---|---|
| **3.8** | `import type { T }` y `export type { T }`; opción `importsNotUsedAsValues` |
| 4.5 | Modificador por nombre: `import { type T, valor }` |
| **5.0** | `verbatimModuleSyntax`: una sola regla —lo que no lleva `type` se emite tal cual— sustituye a las opciones anteriores |
| 5.0 | `export type * from "./m"` |
| 5.6 | `importsNotUsedAsValues` y `preserveValueImports` desaparecen |
| 5.8 | `erasableSyntaxOnly`: el archivo entero debe poder ejecutarse borrando tipos |

> [!TIP]
> En un proyecto nuevo, activa `verbatimModuleSyntax` y deja que el editor añada `type` en las importaciones automáticas. El resultado funciona con
> cualquier herramienta que procese los archivos de uno en uno.

---

## 7. TypeScript 3.8: campos `#privados` y `await` de nivel superior

### `private` frente a `#`

El `private` de TypeScript existe desde la 0.8 y es una restricción **del compilador**: en ejecución, la propiedad es tan pública como cualquier otra.
Los campos `#privados` son de ECMAScript (ES2022) y el motor los protege de verdad.

```ts run debut
class Cuenta {
    private pinDeCompilador = 1234;
    #pinReal = 5678;

    comprobar(pin: number): boolean {
        return pin === this.#pinReal;
    }
}

const cuenta = new Cuenta();
console.log((cuenta as any).pinDeCompilador);       // → 1234
console.log(Object.keys(cuenta).join());            // → pinDeCompilador
console.log(JSON.stringify(cuenta));                // → {"pinDeCompilador":1234}
console.log(cuenta.comprobar(5678));                // → true
```

| | `private nombre` | `#nombre` |
|---|---|---|
| **Desde** | 0.8 | 3.8 |
| **Quién lo impone** | El compilador | El motor de JavaScript |
| **Visible con `as any`, `Object.keys` o `JSON.stringify`** | Sí | No |
| **Una subclase puede declarar otro con el mismo nombre** | No: choca | Sí: son distintos |
| **Coste** | Ninguno | Ninguno con destino ES2022; un `WeakMap` por campo con destinos anteriores |
| **Propiedades de parámetro** | `constructor(private x: number)` | No existe una forma abreviada |

La guía para elegir está en [21 § `private` o `#`](21-guias-de-decision.md#5-private-o-privado).

### `await` de nivel superior

```ts run esm debut
const respuesta = await Promise.resolve({ estado: 200, cuerpo: "ok" });
console.log(respuesta.estado, respuesta.cuerpo);   // → 200 ok
```

Solo funciona en **módulos ES**: exige `module` igual a `es2022`, `esnext`, `node16` o posterior, y un destino `es2017` como mínimo. Un módulo con
`await` de nivel superior retrasa a todos los que lo importan hasta que termina.

### Lo demás de la 3.8

| Característica | Ejemplo |
|---|---|
| `export * as ns` | `export * as utilidades from "./utilidades";` (ES2020) |
| `module: es2020` | Conserva `import()` e `import.meta`; el valor de `target` existía ya desde la 3.5 |
| Modificadores en JSDoc | `/** @private */`, `/** @readonly */` en archivos JavaScript |
| `watchOptions` | Estrategias de vigilancia de archivos, sobre todo para Linux |

---

<!-- ts=3.9 -->

## 8. TypeScript 3.9: `@ts-expect-error` y rendimiento

### `@ts-expect-error`

`@ts-ignore` (2.6) calla la línea siguiente pase lo que pase. `@ts-expect-error` afirma que **debe** haber un error, y se queja si no lo hay:

```ts debut
// @ts-expect-error: el servicio todavía devuelve el puerto como texto
const puerto: number = "8080";
```

```ts err=TS2578
// @ts-expect-error
const puerto: number = 8080;   // error TS2578: directiva '@ts-expect-error' sin usar
```

| | `// @ts-ignore` | `// @ts-expect-error` |
|---|---|---|
| **Si hay un error debajo** | Lo silencia | Lo silencia |
| **Si no hay ninguno** | No pasa nada: se queda ahí para siempre | **Error TS2578** |
| **Uso recomendado** | Casi nunca | Pruebas de tipos y parches temporales |

Es también la base de las pruebas de tipos: un archivo de pruebas afirma con `@ts-expect-error` que cierto código **no** debe compilar. Este atlas
hace lo mismo con la marca `err=TS…` de su verificador.

### Rendimiento

La 3.9 no trajo grandes características, a propósito. El equipo trabajó con los autores de material-ui y styled-components, cuyas bibliotecas hacían
sufrir al compilador, y las notas resumen el resultado: alrededor de un **40 % menos** de tiempo de compilación en material-ui. También arregló la
inferencia de `Promise.all`, que desde la 3.7 mezclaba mal `null` y `undefined`:

```ts debut
interface Leon { rugir(): void; }
interface Foca { cantar(): void; }

async function visitar(leones: Promise<Leon>, focas: Promise<Foca | undefined>): Promise<void> {
    const [leon, foca] = await Promise.all([leones, focas]);
    leon.rugir();          // 3.8: error, `leon` era Leon | undefined
}
```

---

## 9. Notas de migración

| Versión | Cambio | Síntoma | Qué hacer |
|---|---|---|---|
| 3.5 | Un parámetro de tipo sin restricción equivale a `unknown`, no a `{}` | TS2339 al usar propiedades de un `T` genérico | Añadir una restricción: `T extends object` |
| 3.5 | `Omit` entra en la biblioteca estándar | Choque con un `Omit` propio y global | Borrar el propio o convertirlo en módulo |
| 3.6 | Los generadores distinguen `TReturn` y `TNext` | Errores al mezclar `yield` y `return` de tipos distintos | Anotar `Generator<T, TReturn, TNext>` |
| 3.7 | Los `.d.ts` emiten accesores `get` y `set` | Un compilador 3.5 o anterior no puede leer esas declaraciones | Publicar con `typesVersions` o exigir 3.6+ |
| 3.7 | Funciones no llamadas en condiciones | TS2774 | Llamar a la función, o comparar con `undefined` de forma explícita |
| 3.7 | Los tipos locales chocan con los importados del mismo nombre | TS2440 | Renombrar |
| 3.8 | Asignación más estricta a uniones con firmas de índice | TS2322 | Ajustar el tipo |
| 3.9 | Las intersecciones con discriminantes incompatibles son `never` | TS2339 sobre `never` | El tipo era imposible: corregir el modelo |
| 3.9 | `}` y `>` no son texto JSX válido | Error de sintaxis en `.tsx` | Escribir `{"}"}` y `{">"}` |
| 3.9 | Los *getters* y *setters* emitidos dejan de ser enumerables | Código que los recorría con `for…in` | Coincide ya con ES2015 |
| 3.9 | `export *` se conserva siempre y las exportaciones usan *getters* | Cambios en el orden de carga con CommonJS | Normalmente inocuo |

> [!CAUTION]
> El cambio de la 3.7 en los archivos de declaración es el más delicado de esta etapa: una biblioteca compilada con la 3.7 que tenga accesores publica
> `.d.ts` que la 3.5 no entiende. Es el primer caso claro de por qué [DefinitelyTyped](20-ecosistema-y-runtimes.md#4-definitelytyped-y-los-paquetes-types)
> solo garantiza las versiones de los dos últimos años.

---

## 10. Referencias

- Notas oficiales: [3.5](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-5.html) · [3.6](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-6.html) · [3.7](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html) · [3.8](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html) · [3.9](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-9.html)
- Manual: [Estrechamiento](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) · [Clases](https://www.typescriptlang.org/docs/handbook/2/classes.html) · [Módulos](https://www.typescriptlang.org/docs/handbook/2/modules.html)
- Opciones: [`useDefineForClassFields`](https://www.typescriptlang.org/tsconfig/#useDefineForClassFields) · [`verbatimModuleSyntax`](https://www.typescriptlang.org/tsconfig/#verbatimModuleSyntax)
- Pruebas de debut: [25 · TypeScript 3.5](25-pruebas-de-debut.md#typescript-35) a [3.9](25-pruebas-de-debut.md#typescript-39)

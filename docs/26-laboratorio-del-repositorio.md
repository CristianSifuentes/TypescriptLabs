<div align="center">

# 26 · El laboratorio del repositorio

**Las once lecciones de `src/topics/`, leídas con el atlas en la mano: qué enseña cada una, cómo se escribiría en 2026 y qué dicen hoy los compiladores 5.7 y 7.0 del código original**

[⬅ 25 · Pruebas de debut](25-pruebas-de-debut.md) · [🏠 Índice](../README.md)

</div>

<!-- ts=5.9 -->

> [!IMPORTANT]
> Antes de ser un atlas, este repositorio fue un **laboratorio**: un proyecto Vite con once archivos de práctica en [`src/topics/`](../src/topics),
> escritos mientras se aprendía TypeScript, con los mensajes del compilador copiados en comentarios. Este capítulo los recorre uno a uno, los
> conecta con los capítulos del atlas que explican cada característica y propone una versión revisada de cada lección. Las versiones revisadas
> se comprueban como el resto del atlas. El código original conserva su forma; solo se le corrigieron los errores de compilación que impedían
> `npm run build` ([§ 12](#12-errores-encontrados-y-corregidos)).

El laboratorio se ejecuta así:

```bash
npm install          # Vite 6 y TypeScript ~5.7
npm run dev          # servidor de desarrollo de Vite
npm run build        # tsc && vite build
```

`src/main.ts` importa **una sola lección** a la vez: para cambiar de lección se comenta una línea `import './topics/…'` y se descomenta otra.
La salida aparece en la consola del navegador.

---

## Contenido

1. [Tipos básicos](#1-tipos-básicos)
2. [Arreglos e interfaces](#2-arreglos-e-interfaces)
3. [Funciones](#3-funciones)
4. [Ejercicio: tipos anidados](#4-ejercicio-tipos-anidados)
5. [Desestructuración](#5-desestructuración)
6. [Desestructuración en funciones](#6-desestructuración-en-funciones)
7. [Importar y exportar](#7-importar-y-exportar)
8. [Clases](#8-clases)
9. [Genéricos](#9-genéricos)
10. [Decoradores](#10-decoradores)
11. [Encadenamiento opcional](#11-encadenamiento-opcional)
12. [Errores encontrados y corregidos](#12-errores-encontrados-y-corregidos)
13. [Referencias](#13-referencias)

---

## 1. Tipos básicos

**Archivo:** [`01-basic-types.ts`](../src/topics/01-basic-types.ts) · **En el atlas:** [02 § 0.8](02-origenes-y-typescript-1.md#2-typescript-08-el-punto-de-partida) · [14 § Literales](14-sistema-de-tipos-a-fondo.md#4-literales-y-ensanchamiento)

La lección muestra la inferencia (`let name = 'Strider'` es `string`), el error al reasignar con otro tipo (TS2322) y una unión `number | string`.
Un comentario apunta una idea importante: `const name_x` se infiere como el **literal** `"Strider"`, no como `string`.

```ts run
let nombre = "Strider";                     // let: se ensancha a string
const fijo = "Strider";                     // const: conserva el literal
let vida: number | "LLENA" = 95;            // unión con un literal: más precisa que number | string

vida = "LLENA";
nombre = "Aragorn";

console.log({ nombre, fijo, vida });        // → { nombre: 'Aragorn', fijo: 'Strider', vida: 'LLENA' }
```

> [!TIP]
> La línea comentada `let hpPoints: number | 'FULL'` del original es mejor diseño que la que quedó activa (`number | string`): una unión con un
> literal documenta exactamente qué texto se admite.

---

## 2. Arreglos e interfaces

**Archivo:** [`02-object-interface.ts`](../src/topics/02-object-interface.ts) · **En el atlas:** [02](02-origenes-y-typescript-1.md) · [14 § Tipado estructural](14-sistema-de-tipos-a-fondo.md#2-tipado-estructural)

Muestra cómo se infiere el tipo de un arreglo mixto (`(string | number | boolean)[]`), una interfaz con una propiedad opcional y la observación
correcta de que **una interfaz no deja rastro en el JavaScript**.

```ts run
interface Personaje {
    nombre: string;
    vida: number;
    habilidades: readonly string[];     // readonly: nadie hace push sin querer
    origen?: string;
}

const strider: Personaje = { nombre: "Strider", vida: 100, habilidades: ["Golpe", "Contra"] };
const conOrigen: Personaje = { ...strider, origen: "Rivendel" };   // en lugar de mutar strider

console.log(Object.keys(strider).length, conOrigen.origen);        // → 3 Rivendel
```

---

## 3. Funciones

**Archivo:** [`03-functions.ts`](../src/topics/03-functions.ts) · **En el atlas:** [02](02-origenes-y-typescript-1.md) · [14 § Inferencia](14-sistema-de-tipos-a-fondo.md#9-inferencia)

Parámetros tipados, retorno inferido, funciones flecha con retorno anotado, parámetros opcionales y por defecto, y una interfaz con un método.
Un detalle del original: en `multiply(firstNumber, secondNumber?, base = 2)`, el segundo parámetro nunca se usaba (con `noUnusedParameters`, el
laboratorio lo marcaba como error TS6133). Ahora la función devuelve `firstNumber * (secondNumber ?? base)`: el resultado de `multiply(5)` sigue
siendo 10.

```ts run
function multiplicar(primero: number, segundo?: number, base = 2): number {
    return primero * (segundo ?? base);
}

interface Personaje {
    nombre: string;
    vida: number;
    mostrarVida(): string;
}

const curar = (personaje: Personaje, cantidad: number): void => {
    personaje.vida += cantidad;
};

const strider: Personaje = {
    nombre: "Strider",
    vida: 50,
    mostrarVida() { return `vida: ${this.vida}`; },
};

curar(strider, 10);
console.log(multiplicar(5), multiplicar(5, 3), strider.mostrarVida());   // → 10 15 vida: 60
```

---

## 4. Ejercicio: tipos anidados

**Archivo:** [`04-homework-types.ts`](../src/topics/04-homework-types.ts)

Un ejercicio de tipar un objeto con otro objeto dentro (`SuperHero` con `Address`) y un método que usa `this`. Está resuelto correctamente. Una
variante más moderna separa los datos del comportamiento y usa `satisfies` para comprobar sin perder los literales:

```ts run
interface Direccion { calle: string; pais: string; ciudad: string; }
interface Heroe { nombre: string; edad: number; direccion: Direccion; }

const spiderman = {
    nombre: "Spiderman",
    edad: 30,
    direccion: { calle: "Main St", pais: "USA", ciudad: "NY" },
} satisfies Heroe;

const mostrarDireccion = ({ nombre, direccion: { ciudad, pais } }: Heroe): string => `${nombre}, ${ciudad}, ${pais}`;

console.log(mostrarDireccion(spiderman));   // → Spiderman, NY, USA
```

---

## 5. Desestructuración

**Archivo:** [`05-basic-destructuring.ts`](../src/topics/05-basic-destructuring.ts) · **En el atlas:** [02 § 1.5](02-origenes-y-typescript-1.md#6-typescript-15-es6-decoradores-y-tsconfigjson)

Desestructuración de objetos (con renombrado `song: anotherSong` para evitar el choque con otra variable `song`), de objetos anidados y de
arreglos, con huecos (`[, , trunks2]`) y valores por defecto (`pikolo = 'Pikolo Not Found'`).

```ts run opts=noUncheckedIndexedAccess
const reproductor = {
    volumen: 50,
    cancion: "Hey Jude",
    detalles: { autor: "The Beatles", anio: 1968 },
};

const { volumen, cancion: titulo, detalles: { autor } } = reproductor;

const dbz = ["Goku", "Vegeta", "Trunks"];
const [goku, , trunks] = dbz;
const [, , , piccolo = "Piccolo no encontrado"] = dbz;
const cuarto = dbz[3] ?? "no encontrado";      // con noUncheckedIndexedAccess, dbz[3] es string | undefined

console.log(volumen, titulo, autor, goku, trunks, piccolo, cuarto);
// → 50 Hey Jude The Beatles Goku Trunks Piccolo no encontrado no encontrado
```

> [!NOTE]
> El original usa `dbz[3] || 'not found'`. Funciona, pero `||` también sustituye la cadena vacía. Con `??` la intención es exacta
> ([06 § `?.` y `??`](06-typescript-3.5-3.9-encadenamiento-y-aserciones.md#3-typescript-37-encadenamiento-opcional-y-fusión-nula)).

---

## 6. Desestructuración en funciones

**Archivo:** [`06-functions-destructuring.ts`](../src/topics/06-functions-destructuring.ts) · **En el atlas:** [21 § Anotación, `as` o `satisfies`](21-guias-de-decision.md#4-anotación-as-o-satisfies)

La lección compara tres versiones de `taxCalculation` y concluye, con razón, que **devolver un objeto con nombres** es más legible que devolver un
arreglo `[total, tax]`. Al final, un comentario recoge un error real de la época: reexportar un tipo con `isolatedModules` exige `export type`
(TS1205), la regla que [20 § Transpiladores](20-ecosistema-y-runtimes.md#5-transpiladores-esbuild-swc-babel-y-oxc) explica.

```ts run
interface Producto { descripcion: string; precio: number; }
interface OpcionesDeImpuesto { impuesto: number; productos: readonly Producto[]; }

function calcularImpuesto({ impuesto, productos }: OpcionesDeImpuesto): { total: number; impuestoTotal: number } {
    const total = productos.reduce((suma, { precio }) => suma + precio, 0);
    return { total, impuestoTotal: total * impuesto };
}

const { total, impuestoTotal } = calcularImpuesto({
    impuesto: 0.15,
    productos: [{ descripcion: "Nokia A1", precio: 100 }, { descripcion: "Samsung A1", precio: 200 }],
});

console.log(total, impuestoTotal.toFixed(2));   // → 300 45.00
```

---

## 7. Importar y exportar

**Archivo:** [`07-import-export.ts`](../src/topics/07-import-export.ts) · **En el atlas:** [16 · Módulos](16-modulos-y-resolucion.md) · [09 § `verbatimModuleSyntax`](09-typescript-5.0-5.4-decoradores-y-using.md#4-typescript-50-bundler-y-verbatimmodulesyntax)

Importa la función y las interfaces de la lección 06. Un detalle importante: **importar la lección 06 la ejecuta**, así que sus `console.log`
aparecen también al cargar la 07. Es el comportamiento estándar de los módulos ES, y el motivo por el que un módulo que se importa no debería
tener efectos al cargarse.

```ts
// @filename: impuestos.ts
export interface Producto { descripcion: string; precio: number; }
export function calcularTotal(productos: readonly Producto[]): number {
    return productos.reduce((suma, p) => suma + p.precio, 0);
}

// @filename: carrito.ts
import { type Producto, calcularTotal } from "./impuestos";   // `type` para lo que solo es tipo

const carrito: Producto[] = [{ descripcion: "Teléfono", precio: 1000 }];
const total: number = calcularTotal(carrito);
```

Con el `tsconfig.json` del laboratorio (`isolatedModules: true`), el original compila porque Vite elimina la importación de tipos por su cuenta; con
`verbatimModuleSyntax`, que hoy recomienda el atlas ([17](17-tsconfig-de-referencia.md)), habría que marcar `Product` y `TaxCalculationOptions`
con `type`.

---

## 8. Clases

**Archivo:** [`08-classes.ts`](../src/topics/08-classes.ts) · **En el atlas:** [13 § Clases](13-hilos-evolutivos.md#6-clases-y-privacidad) · [21 § `private` o `#`](21-guias-de-decision.md#5-private-o-privado)

Clases con propiedades de parámetro (`constructor(public name: string, private address = 'Unknown')`), herencia comentada y, finalmente,
**composición** en lugar de herencia (`Hero` recibe una `Person`). La conclusión del original —«priorizar la composición sobre la herencia»— es la
correcta.

> [!NOTE]
> La primera línea del archivo era `import { Person } from './08-classes'`: **el archivo se importaba a sí mismo**, y TypeScript 5.7 y 7.0 daban
> tres errores (TS2395 y TS2440: la importación chocaba con la clase `Person` declarada abajo). Se borró esa línea, y la propiedad privada
> `address`, que nunca se leía (TS6138), se expone ahora con un método `getAddress()`.

```ts run opts=noImplicitOverride
class Persona {
    readonly #direccion: string;
    constructor(readonly nombre: string, direccion = "Desconocida") {
        this.#direccion = direccion;
    }
    get ciudad(): string { return this.#direccion; }
}

class Heroe {
    constructor(readonly alias: string, readonly edad: number, readonly persona: Persona) {}
    describir(): string { return `${this.alias} (${this.persona.nombre}, ${this.persona.ciudad})`; }
}

const ironman = new Heroe("Ironman", 45, new Persona("Tony", "Nueva York"));
console.log(ironman.describir());              // → Ironman (Tony, Nueva York)
console.log(JSON.stringify(ironman.persona));  // → {"nombre":"Tony"}
```

La versión revisada usa `#direccion`: a diferencia del `private address` original, no aparece en `JSON.stringify` ni con `as any`
([06 § `#privados`](06-typescript-3.5-3.9-encadenamiento-y-aserciones.md#7-typescript-38-campos-privados-y-await-de-nivel-superior)). Las
propiedades de parámetro (`readonly nombre` en el constructor) son cómodas, pero no son borrables: con `erasableSyntaxOnly` habría que declararlas
como campos.

---

## 9. Genéricos

**Archivo:** [`09-generics.ts`](../src/topics/09-generics.ts) · **En el atlas:** [14 § Genéricos](14-sistema-de-tipos-a-fondo.md#8-genéricos-y-restricciones) · [15](15-programacion-a-nivel-de-tipos.md)

La función identidad `whatsMyType<T>(arg: T): T` con argumentos de tipo explícitos. El original deja al final una lista de preguntas («¿qué es un
`let`?, ¿qué es un `never`?…») que este atlas responde: [14](14-sistema-de-tipos-a-fondo.md) para `unknown`, `never`, uniones e intersecciones, y
[24 · Glosario](24-referencia-rapida-y-glosario.md#8-glosario) para el resto.

```ts run
function queTipo<T>(argumento: T): T { return argumento; }

const texto = queTipo("Hola mundo");                 // sin <string>: se infiere
//    ^? const texto: "Hola mundo"
const lista = queTipo([1, 2, 3]);
//    ^? const lista: number[]

function primero<T>(elementos: readonly T[]): T | undefined { return elementos[0]; }

console.log(texto.split(" ").length, lista.join("-"), primero(["a", "b"]));   // → 2 1-2-3 a
```

Escribir el argumento de tipo (`whatsMyType<string>('Hello')`) casi nunca hace falta: la inferencia lo deduce, y además conserva el literal.

---

## 10. Decoradores

**Archivo:** [`10-decorators.ts`](../src/topics/10-decorators.ts) · **En el atlas:** [09 § Decoradores estándar](09-typescript-5.0-5.4-decoradores-y-using.md#2-decoradores-estándar) · [19 § La saga](19-typescript-y-ecmascript.md#5-la-saga-de-los-decoradores)

Un decorador de clase que devuelve una subclase con dos propiedades nuevas. El laboratorio activa `experimentalDecorators` en su
`tsconfig.json`, así que usa el sistema de 2015, el de Angular. Ese mismo decorador funciona **también** como decorador estándar, porque los
decoradores de clase de ambos sistemas reciben la clase como primer argumento:

```ts run opts=experimentalDecorators
function decoradorDeClase<T extends { new (...args: any[]): {} }>(constructor: T) {
    return class extends constructor {
        nuevaPropiedad = "Nueva propiedad";
    };
}

@decoradorDeClase
class SuperClase {
    miPropiedad = "Valor por defecto";
}

console.log(Object.keys(new SuperClase()).join());   // → miPropiedad,nuevaPropiedad
```

```ts run
// Sin experimentalDecorators: el mismo decorador, con la firma estándar (5.0)
function decoradorDeClase<T extends new (...args: any[]) => object>(constructor: T, _contexto: ClassDecoratorContext<T>) {
    return class extends constructor {
        nuevaPropiedad = "Nueva propiedad";
    };
}

@decoradorDeClase
class SuperClase {
    miPropiedad = "Valor por defecto";
}

console.log(Object.keys(new SuperClase()).join());   // → miPropiedad,nuevaPropiedad
```

> [!NOTE]
> Una limitación de ambos sistemas: TypeScript **no cambia el tipo** de la clase decorada. `new SuperClase().nuevaPropiedad` es un error de tipos
> aunque exista en ejecución. Por eso los decoradores se usan para añadir comportamiento (registro, validación, inyección), no para añadir miembros.

---

## 11. Encadenamiento opcional

**Archivo:** [`11-optional-chaining.ts`](../src/topics/11-optional-chaining.ts) · **En el atlas:** [06 § `?.` y `??`](06-typescript-3.5-3.9-encadenamiento-y-aserciones.md#3-typescript-37-encadenamiento-opcional-y-fusión-nula)

La lección activa en `main.ts`. Cuenta los hijos de un pasajero con `passanger.children?.length ?? 0`.

Tres cosas se corrigieron en el original:

1. **Dos errores de tipos.** La interfaz `Passanger` exige `age`, y ninguno de los dos pasajeros la tenía: TypeScript 5.7 y 7.0 daban TS2741
   en ambos objetos. Vite ejecutaba el código igualmente (no comprueba tipos), así que en el navegador «funcionaba», pero `npm run build`, que
   ejecuta `tsc` antes, fallaba. Ahora los dos pasajeros tienen edad.
2. **`|| 0` pasó a `?? 0`.** Aquí daba igual, porque `length` nunca es una cadena vacía, pero `??` expresa exactamente «si falta». Con `||`, un
   valor legítimo `0` también se sustituiría.
3. **El nombre del archivo** terminaba en `.ts.ts`. `main.ts` lo importaba como `'./topics/11-optional-chaining.ts'` y Vite añadía la extensión
   que faltaba. Se renombró a `11-optional-chaining.ts`, y la importación de `main.ts` ya apunta al archivo real.

```ts run
interface Pasajero {
    nombre: string;
    edad?: number;              // opcional: los datos de ejemplo no la tienen
    hijos?: readonly string[];
}

const pasajero1: Pasajero = { nombre: "Juan" };
const pasajero2: Pasajero = { nombre: "Arturo", hijos: ["María", "Elizabeth"] };

const contarHijos = (pasajero: Pasajero): number => {
    const cuantos = pasajero.hijos?.length ?? 0;
    console.log(pasajero.nombre, cuantos);
    return cuantos;
};

contarHijos(pasajero1);   // → Juan 0
contarHijos(pasajero2);   // → Arturo 2
```

---

## 12. Errores encontrados y corregidos

El laboratorio se comprobó con `tsc --noEmit -p tsconfig.json` usando el compilador de su `package.json` (5.7.3) y el actual (7.0.2). Estos eran
los errores del código original; todos están corregidos, y hoy `npm run build` termina sin errores y `tsc` 7.0.2 tampoco da ninguno:

| Archivo | 5.7.3 | 7.0.2 | Causa | Corrección aplicada |
|---|---|---|---|---|
| `main.ts` | TS2307 | TS2882 | `import './style.css'` sin los tipos de Vite | Ninguna en el código: desaparece con `npm install` (`vite/client` declara los `.css`) |
| `main.ts` | TS18047 | TS18047 | `app` puede ser `null` (`querySelector`) | Comprobar `if (app)` antes de escribir |
| `01`, `02`, `03`, `05` | TS6133 ×9 | TS6133 ×9 | Variables sin usar con `noUnusedLocals` | Mostrarlas en la consola; `secondNumber` se usa en el cálculo |
| `08-classes.ts` | TS2395 ×2, TS2440, TS6138 | Igual | El archivo se importaba a sí mismo; `address` nunca se leía | Borrar la importación; añadir `getAddress()` |
| `11-optional-chaining.ts.ts` | TS2741 ×2 | TS2741 ×2 | Faltaba `age` | Añadir la edad; renombrar a `.ts`; `\|\|` → `??` |

> [!NOTE]
> Las mismas comprobaciones dan los mismos códigos en 5.7 y en 7.0, con una sola excepción: el `import './style.css'` sin resolver pasa de TS2307 a
> TS2882, el error específico de las importaciones de efecto que la 5.6 introdujo y la 6.0 activó por defecto. Es una buena muestra de la promesa
> de la 7.0: **el mismo comprobador, con otro motor**.

Además de compilar, las once lecciones se ejecutaron una a una en Node para comprobar que su salida no cambió. Para llevar el laboratorio a
TypeScript 7 bastaría ahora con cambiar `"typescript": "~5.7.2"` por `"~7.0.2"` en
`package.json` y revisar el `tsconfig.json` con la [receta A del capítulo 17](17-tsconfig-de-referencia.md#a--aplicación-con-empaquetador-vite-next-astro).

---

## 13. Referencias

- Código: [`src/topics/`](../src/topics) · [`src/main.ts`](../src/main.ts) · [`tsconfig.json`](../tsconfig.json) · [`package.json`](../package.json)
- [Vite: TypeScript](https://vite.dev/guide/features.html#typescript)
- Repositorio hermano: [TypeSpaghetti](https://github.com/CristianSifuentes/TypeSpaghetti), con ejemplos por niveles de dificultad

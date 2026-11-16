<div align="center">

# 15 · Programación a nivel de tipos

**`keyof`, accesos indexados, tipos mapeados, condicionales, `infer`, recursión, plantillas literales, los utilitarios de la biblioteca estándar y cuándo parar**

[⬅ 14 · El sistema de tipos a fondo](14-sistema-de-tipos-a-fondo.md) · [🏠 Índice](../README.md) · [16 · Módulos y resolución ➡](16-modulos-y-resolucion.md)

</div>

<!-- ts=5.9 -->

> [!IMPORTANT]
> El sistema de tipos de TypeScript es, en la práctica, un **lenguaje de programación funcional** que se ejecuta en el compilador: tiene
> condicionales, variables, bucles (mediante recursión) y manipulación de cadenas. Este capítulo enseña ese lenguaje de forma ordenada. Úsalo para
> que las **firmas** de tus funciones sean precisas, no para escribir programas: la mejor programación a nivel de tipos es la que el usuario de la
> función nunca ve.

---

## Contenido

1. [El lenguaje de los tipos](#1-el-lenguaje-de-los-tipos)
2. [`keyof`, `typeof` y accesos indexados](#2-keyof-typeof-y-accesos-indexados)
3. [Tipos mapeados](#3-tipos-mapeados)
4. [Tipos condicionales](#4-tipos-condicionales)
5. [`infer`](#5-infer)
6. [Recursión: límites y acumuladores](#6-recursión-límites-y-acumuladores)
7. [Plantillas literales como analizadores](#7-plantillas-literales-como-analizadores)
8. [Los utilitarios de la biblioteca estándar](#8-los-utilitarios-de-la-biblioteca-estándar)
9. [Patrones útiles](#9-patrones-útiles)
10. [Rendimiento y cuándo parar](#10-rendimiento-y-cuándo-parar)
11. [Referencias](#11-referencias)

---

## 1. El lenguaje de los tipos

| En JavaScript (valores) | En TypeScript (tipos) | Desde |
|---|---|---|
| Variable: `const x = …` | Alias: `type X = …` | 1.4 |
| Función: `(a) => …` | Genérico: `type F<A> = …` | 1.6 (alias genéricos) |
| Objeto literal | Tipo objeto: `{ a: string }` | 0.8 |
| Arreglo / tupla | Tupla: `[A, B, ...C]` | 1.3 / 4.0 |
| `Object.keys(o)` | `keyof O` | 2.1 |
| `o[k]` | `O[K]` | 2.1 |
| `for (const k in o)` | `{ [K in keyof O]: … }` | 2.1 |
| `cond ? a : b` | `A extends B ? X : Y` | 2.8 |
| Desestructuración | `infer` | 2.8 |
| Recursión | Alias y condicionales recursivos | 3.7 / 4.1 |
| Plantillas `` `${a}` `` | `` `${A}` `` | 4.1 |
| `.toUpperCase()` | `Uppercase<S>` | 4.1 |

No hay bucles, ni mutación, ni efectos: todo se resuelve con recursión y con la distributividad de las uniones.

---

## 2. `keyof`, `typeof` y accesos indexados

```ts
const configuracion = {
    servidor: { puerto: 8080, host: "localhost" },
    registro: { nivel: "info" as "debug" | "info" | "error" },
};

type Configuracion = typeof configuracion;          // de un valor a su tipo
type Seccion = keyof Configuracion;
//   ^? type Seccion = "registro" | "servidor"
type Nivel = Configuracion["registro"]["nivel"];
//   ^? type Nivel = "debug" | "error" | "info"
type Valores = Configuracion[Seccion];              // indexar con una unión da una unión

const colores = ["rojo", "verde", "azul"] as const;
type Color = (typeof colores)[number];
//   ^? type Color = "azul" | "rojo" | "verde"
```

| Operador | Entrada | Salida |
|---|---|---|
| `typeof valor` | Una expresión | Su tipo |
| `keyof T` | Un tipo objeto | La unión de sus claves |
| `T[K]` | Un tipo y una clave (o unión de claves) | El tipo de esas propiedades |
| `T[number]` | Un arreglo o tupla | El tipo de sus elementos |
| `T["length"]` | Una tupla | Su longitud como literal |

---

## 3. Tipos mapeados

Un tipo mapeado recorre un conjunto de claves y produce una propiedad por cada una:

```ts
type Opcional<T> = { [K in keyof T]?: T[K] };                         // Partial
type SoloLectura<T> = { readonly [K in keyof T]: T[K] };              // Readonly
type Mutable<T> = { -readonly [K in keyof T]: T[K] };                 // quita readonly (2.8)
type Obligatorio<T> = { [K in keyof T]-?: T[K] };                     // Required (2.8)
type Nulable<T> = { [K in keyof T]: T[K] | null };
```

### Mapeados homomórficos

Cuando un tipo mapeado recorre `keyof T` de un parámetro de tipo, es **homomórfico**: conserva los modificadores (`?`, `readonly`) de cada
propiedad y, desde la 3.1, respeta tuplas y arreglos:

```ts
type Promesas<T> = { [K in keyof T]: Promise<T[K]> };

type P = Promesas<[string, number]>;
//   ^? type P = [Promise<string>, Promise<number>]
```

### Remapeo de claves (4.1)

La cláusula `as` transforma o filtra las claves:

```ts
interface Usuario { id: number; nombre: string; correo: string; activo: boolean; }

type Setters<T> = { [K in keyof T as `set${Capitalize<K & string>}`]: (v: T[K]) => void };
type DeTipo<T, V> = { [K in keyof T as T[K] extends V ? K : never]: T[K] };

type Textos = DeTipo<Usuario, string>;
//   ^? type Textos = { nombre: string; correo: string; }
```

---

## 4. Tipos condicionales

`A extends B ? X : Y` pregunta si `A` es asignable a `B` (si `A ⊆ B`).

```ts
type EsTexto<T> = T extends string ? true : false;

type A = EsTexto<"hola">;
//   ^? type A = true
type B = EsTexto<string | number>;
//   ^? type B = boolean
```

`B` es `boolean` porque el condicional es **distributivo**: se aplica a `string` (da `true`) y a `number` (da `false`), y une los resultados. La
distribución ocurre cuando el tipo comprobado es un parámetro de tipo **desnudo**. Para evitarla, se envuelve en una tupla:

| Forma | Con `string \| number` | Uso |
|---|---|---|
| `T extends U ? X : Y` | Distribuye: `X \| Y` | Filtrar o transformar uniones |
| `[T] extends [U] ? X : Y` | No distribuye: compara la unión entera | Preguntar por el tipo completo |
| `T extends never ? X : Y` con `T = never` | Da `never` (unión vacía) | Una trampa clásica |
| `[T] extends [never] ? X : Y` | Detecta `never` correctamente | `EsNever<T>` |

```ts
type EsNever<T> = [T] extends [never] ? true : false;
type MalEsNever<T> = T extends never ? true : false;

type N1 = EsNever<never>;
//   ^? type N1 = true
type N2 = MalEsNever<never>;
//   ^? type N2 = never
```

---

## 5. `infer`

`infer X` declara una variable de tipo **dentro** del patrón de un condicional, que el compilador rellena si el patrón encaja:

```ts
type Elemento<T> = T extends readonly (infer E)[] ? E : never;
type Retorno<F> = F extends (...args: any[]) => infer R ? R : never;
type Primero<T> = T extends [infer P, ...unknown[]] ? P : never;
type Promesa<T> = T extends Promise<infer V> ? V : T;

type E = Elemento<string[]>;
//   ^? type E = string
type R = Retorno<() => Date>;
//   ^? type R = Date
```

| Variante | Desde | Ejemplo |
|---|---|---|
| `infer X` | 2.8 | `T extends Array<infer X>` |
| `infer` en plantillas | 4.1 | `` T extends `${infer A}.${infer B}` `` |
| `infer X extends C` | 4.7 | `T extends [infer S extends string, ...unknown[]]` |
| `infer N extends number` en plantillas da el literal | 4.8 | `"42"` → `42` |

Si `infer X` aparece varias veces, en posiciones covariantes da la **unión** de los candidatos y en contravariantes la **intersección**. Es la base
de un truco conocido:

```ts
type UnionAInterseccion<U> = (U extends unknown ? (x: U) => void : never) extends (x: infer I) => void ? I : never;

type I = UnionAInterseccion<{ a: 1 } | { b: 2 }>;
//   ^? type I = { a: 1; } & { b: 2; }
```

---

## 6. Recursión: límites y acumuladores

Los tipos pueden referirse a sí mismos. El compilador impone límites para no colgarse. Los de esta tabla se **midieron** invirtiendo tuplas de
longitud creciente con los compiladores 4.4, 5.9 y 7.0:

| Recursión | 4.4 | 5.9 y 7.0 | Error al superarlo |
|---|---|---|---|
| Fuera de cola (`[...R<Q>, P]`) | Falla ya con 40 elementos | Funciona con 48, falla con 50 | TS2589: *Type instantiation is excessively deep and possibly infinite* |
| **En cola** (`R<Q, [P, ...Acc]>`, desde la 4.5) | No existe | Funciona con **999**, falla con 1000 | TS2589 |
| Miembros de una unión | 100 000 | 100 000 | TS2590: *Expression produces a union type that is too complex to represent* |

### Acumuladores

Una llamada recursiva está **en cola** si es el resultado completo de la rama. Para conseguirlo, el trabajo pendiente se pasa como un parámetro
**acumulador**:

```ts
// No está en cola: el resultado envuelve la llamada en una tupla
type InvertirLento<T extends unknown[]> = T extends [infer P, ...infer R] ? [...InvertirLento<R>, P] : [];

// En cola: el acumulador lleva el resultado parcial
type Invertir<T extends unknown[], Acc extends unknown[] = []> =
    T extends [infer P, ...infer R] ? Invertir<R, [P, ...Acc]> : Acc;

type X = Invertir<[1, 2, 3]>;
//   ^? type X = [3, 2, 1]
```

### Aritmética con tuplas

No hay números a nivel de tipos, pero la longitud de una tupla es un literal. Contar es construir tuplas:

```ts
type Tupla<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N ? Acc : Tupla<N, [...Acc, unknown]>;
type Sumar<A extends number, B extends number> = [...Tupla<A>, ...Tupla<B>]["length"];

type Siete = Sumar<3, 4>;
//   ^? type Siete = 7
```

Es un juguete —con números grandes se alcanza el límite enseguida—, pero muestra que el sistema es lo bastante expresivo para calcular.

---

## 7. Plantillas literales como analizadores

Con `infer` dentro de una plantilla, un tipo puede **leer** una cadena carácter a carácter o por separadores:

```ts
type Dividir<S extends string, Sep extends string> =
    S extends `${infer Antes}${Sep}${infer Despues}` ? [Antes, ...Dividir<Despues, Sep>] : [S];

type Partes = Dividir<"a.b.c", ".">;
//   ^? type Partes = ["a", "b", "c"]

type CamelCase<S extends string> =
    S extends `${infer P}_${infer R}` ? `${P}${Capitalize<CamelCase<R>>}` : S;

type C = CamelCase<"fecha_de_alta">;
//   ^? type C = "fechaDeAlta"
```

### Un caso real: acceso tipado por rutas

```ts run
type Ruta<T> = T extends object
    ? { [K in keyof T & string]: T[K] extends object ? K | `${K}.${Ruta<T[K]>}` : K }[keyof T & string]
    : never;

type ValorEn<T, R extends string> =
    R extends `${infer K}.${infer Resto}` ? K extends keyof T ? ValorEn<T[K], Resto> : never
    : R extends keyof T ? T[R] : never;

function leer<T, R extends Ruta<T>>(objeto: T, ruta: R): ValorEn<T, R> {
    return ruta.split(".").reduce<any>((o, k) => o[k], objeto);
}

const ajustes = { tema: { color: "oscuro", fuente: { tamano: 14 } }, idioma: "es" };

const tamano = leer(ajustes, "tema.fuente.tamano");
//    ^? const tamano: number
console.log(tamano + 2, leer(ajustes, "idioma"));    // → 16 es
```

`leer(ajustes, "tema.fuente.tamaño")` sería un error de compilación, con autocompletado de las rutas válidas en el editor. Es el patrón que usan
bibliotecas de formularios y de internacionalización.

---

## 8. Los utilitarios de la biblioteca estándar

Las versiones se comprobaron buscando la declaración de cada tipo en el `lib.es5.d.ts` de cada compilador:

| Utilitario | Desde | Qué hace |
|---|---|---|
| `Partial<T>` · `Readonly<T>` · `Record<K, T>` · `Pick<T, K>` | **2.1** | Los cuatro primeros, escritos con tipos mapeados |
| `ThisType<T>` | **2.3** | Marca el tipo de `this` en un literal de objeto |
| `Required<T>` | **2.8** | Quita los `?` (con `-?`) |
| `Exclude<T, U>` · `Extract<T, U>` · `NonNullable<T>` | **2.8** | Filtran uniones con condicionales |
| `ReturnType<F>` · `InstanceType<C>` | **2.8** | Extraen con `infer` |
| `Parameters<F>` · `ConstructorParameters<C>` | **3.1** | Los argumentos como tupla |
| `ThisParameterType<F>` · `OmitThisParameter<F>` | **3.3** | El parámetro `this` de una función |
| `Omit<T, K>` | **3.5** | `Pick` con las demás claves; no comprueba que `K` exista en `T` |
| `Uppercase` · `Lowercase` · `Capitalize` · `Uncapitalize` | **4.1** | Intrínsecos: implementados en el compilador |
| `Awaited<T>` | **4.5** | Desenvuelve promesas de forma recursiva |
| `NoInfer<T>` | **5.4** | Intrínseco: excluye una posición de la inferencia |

```ts
interface Tarea { id: number; titulo: string; hecha: boolean; notas?: string; }

type NuevaTarea = Omit<Tarea, "id">;
type Cambios = Partial<Pick<Tarea, "titulo" | "hecha">>;
type Indice = Record<Tarea["id"], Tarea>;

declare function guardar(t: NuevaTarea): Promise<Tarea>;
type Guardada = Awaited<ReturnType<typeof guardar>>;
//   ^? type Guardada = Tarea
type ArgsDeGuardar = Parameters<typeof guardar>;
//   ^? type ArgsDeGuardar = [t: NuevaTarea]
```

---

## 9. Patrones útiles

```ts
// Profundos: recorren objetos anidados
type ParcialProfundo<T> = T extends object ? { [K in keyof T]?: ParcialProfundo<T[K]> } : T;
type SoloLecturaProfunda<T> = T extends (...args: any[]) => any ? T : T extends object ? { readonly [K in keyof T]: SoloLecturaProfunda<T[K]> } : T;

// Aplanar la presentación de una intersección en el editor
type Simplificar<T> = { [K in keyof T]: T[K] } & {};

// Exigir exactamente una de varias propiedades
type ExactamenteUna<T> = { [K in keyof T]: Pick<T, K> & Partial<Record<Exclude<keyof T, K>, never>> }[keyof T];

type Contacto = ExactamenteUna<{ correo: string; telefono: string }>;
const ok: Contacto = { correo: "ana@ejemplo.com" };
// const mal: Contacto = { correo: "a", telefono: "1" };   // error: no las dos

// Claves opcionales y obligatorias de un tipo
type ClavesOpcionales<T> = { [K in keyof T]-?: {} extends Pick<T, K> ? K : never }[keyof T];

type O = ClavesOpcionales<{ a: string; b?: number; c?: boolean }>;
//   ^? type O = "b" | "c"
```

| Patrón | Para qué |
|---|---|
| `Simplificar<T>` | Que el editor muestre `{ a: 1; b: 2 }` en lugar de `A & B` |
| `ExactamenteUna<T>` | Opciones mutuamente excluyentes |
| `ParcialProfundo<T>` | Parches y configuraciones por capas |
| Comprobación exhaustiva con `never` | Que añadir un caso a una unión obligue a tratarlo ([14 § `never`](14-sistema-de-tipos-a-fondo.md#3-any-unknown-y-never)) |
| Marcas | Tipos nominales ([14 § Marcas](14-sistema-de-tipos-a-fondo.md#11-tipado-nominal-simulado-las-marcas)) |

---

## 10. Rendimiento y cuándo parar

Cada instanciación de un tipo genérico cuesta tiempo y memoria al compilador, y al **editor**, que la recalcula mientras escribes. Las bibliotecas
que más abusan de la programación a nivel de tipos son también las que más se citan en las notas de rendimiento.

| Señal | Qué hacer |
|---|---|
| El autocompletado tarda segundos | `tsc --generateTrace traza` y `npx @typescript/analyze-trace traza` ([18 § Diagnosticar](18-bajo-el-capo-y-rendimiento.md#3-diagnosticar-una-compilación-lenta)) |
| TS2589 (*excessively deep*) | Reescribir con recursión de cola o limitar la profundidad con un contador |
| TS2590 (*union too complex*) | Evitar productos cartesianos de plantillas con uniones grandes |
| Los mensajes de error ocupan una pantalla | Anotar los tipos intermedios con alias con nombre |
| `.d.ts` enormes | Exportar alias con nombre: el compilador los reutiliza en lugar de expandirlos |

> [!TIP]
> Una regla útil para decidir: **la complejidad de un tipo debe pagarse en el sitio donde se define, no donde se usa.** Si la firma resultante es
> sencilla de leer en el editor —`leer(objeto, "a.b.c"): number`—, el esfuerzo merece la pena. Si quien llama tiene que entender el tipo para usar
> la función, simplifícalo.

---

## 11. Referencias

- Manual: [Crear tipos a partir de tipos](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html) · [Tipos condicionales](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) · [Tipos mapeados](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html) · [Tipos utilitarios](https://www.typescriptlang.org/docs/handbook/utility-types.html)
- [type-challenges](https://github.com/type-challenges/type-challenges): ejercicios de programación a nivel de tipos, de fácil a extremo
- [Wiki de rendimiento de TypeScript](https://github.com/microsoft/TypeScript/wiki/Performance)
- Capítulos: [04 · Tipos condicionales](04-typescript-2.3-2.9-estricto-y-condicionales.md#7-typescript-28-tipos-condicionales) · [07 · Plantillas literales](07-typescript-4.0-4.4-tuplas-variadicas-y-plantillas.md#3-typescript-41-tipos-de-plantilla-literal)

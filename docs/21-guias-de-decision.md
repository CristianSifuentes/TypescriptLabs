<div align="center">

# 21 · Guías de decisión

**Nueve elecciones que se repiten en todo proyecto TypeScript, con criterios, tablas y una recomendación para 2026**

[⬅ 20 · Ecosistema y runtimes](20-ecosistema-y-runtimes.md) · [🏠 Índice](../README.md) · [22 · Catálogo A–Z ➡](22-catalogo-a-z.md)

</div>

<!-- ts=5.9 -->

> [!IMPORTANT]
> TypeScript ofrece casi siempre dos o tres formas de expresar lo mismo, porque cada una nació en una época distinta. Este capítulo no dice cuál es
> «la correcta» en abstracto, sino **qué cambia** con cada una y cuál conviene en un proyecto de 2026 que use un empaquetador o la eliminación de
> tipos de Node. Cada recomendación tiene su porqué.

---

## Contenido

1. [`interface` o `type`](#1-interface-o-type)
2. [`enum`, unión de literales u objeto `as const`](#2-enum-unión-de-literales-u-objeto-as-const)
3. [`any`, `unknown` o un genérico](#3-any-unknown-o-un-genérico)
4. [Anotación, `as` o `satisfies`](#4-anotación-as-o-satisfies)
5. [`private` o `#privado`](#5-private-o-privado)
6. [Decoradores experimentales o estándar](#6-decoradores-experimentales-o-estándar)
7. [Un proyecto o varios](#7-un-proyecto-o-varios)
8. [Sobrecargas, uniones o genéricos](#8-sobrecargas-uniones-o-genéricos)
9. [Qué versión de TypeScript usar](#9-qué-versión-de-typescript-usar)
10. [Referencias](#10-referencias)

---

## 1. `interface` o `type`

| | `interface` | `type` |
|---|---|---|
| **Objetos** | ✅ | ✅ |
| **Uniones, tuplas, primitivos, plantillas, mapeados, condicionales** | ❌ | ✅ |
| **Herencia** | `extends` (comprueba compatibilidad) | `&` (intersección: los conflictos dan `never`) |
| **Fusión de declaraciones** | ✅ Dos `interface X` se combinan | ❌ Error de duplicado |
| **Rendimiento** | Mejor: se cachea por nombre | Las intersecciones se recalculan |
| **Mensajes de error y editor** | Muestra el nombre | Puede mostrar la expansión |
| **`implements` en clases** | ✅ | ✅ si es un tipo objeto |

```ts err=TS2430
interface Animal { nombre: string; }
interface Perro extends Animal { nombre: number; }   // error TS2430: incompatible con Animal

type AnimalT = { nombre: string };
type PerroT = AnimalT & { nombre: number };          // sin error: `nombre` pasa a ser never
```

> [!TIP]
> **Recomendación:** `interface` para formas de objetos —sobre todo si se exportan o se extienden— y `type` para todo lo demás. La fusión de
> declaraciones es una ventaja cuando se quiere ampliar un tipo ajeno (`Window`, el `Request` de Express) y un riesgo cuando ocurre por accidente;
> en código de aplicación es raro que importe.

---

## 2. `enum`, unión de literales u objeto `as const`

```ts run
// 1. enum: emite un objeto
enum ColorEnum { Rojo = "ROJO", Verde = "VERDE" }

// 2. Unión de literales: no emite nada
type ColorUnion = "ROJO" | "VERDE";

// 3. Objeto `as const` + tipo derivado: emite un objeto normal
const Color = { Rojo: "ROJO", Verde: "VERDE" } as const;
type Color = (typeof Color)[keyof typeof Color];

function pintar(c: Color): string { return `pintado de ${c}`; }

console.log(pintar(Color.Rojo), pintar("VERDE"), Object.values(Color).length);   // → pintado de ROJO pintado de VERDE 2
console.log(ColorEnum.Verde satisfies ColorEnum);                                  // → VERDE
```

| | `enum` | Unión de literales | Objeto `as const` |
|---|---|---|---|
| **¿Genera JavaScript?** | Sí (`erasableSyntaxOnly` lo prohíbe) | No | Sí, un objeto normal |
| **¿Funciona con Node borrando tipos?** | ❌ | ✅ | ✅ |
| **¿Se puede iterar en ejecución?** | Sí, con matices (los numéricos tienen mapeo inverso) | No | Sí: `Object.values(Color)` |
| **¿Acepta el valor literal `"ROJO"`?** | No (los de cadena son nominales) | Sí | Sí |
| **Nombres para cada valor** | Sí | No | Sí |
| **Documentación con JSDoc por miembro** | Sí | Limitada | Sí |
| **`const enum`** | Se inserta en línea, pero rompe con `isolatedModules` | — | — |

> [!TIP]
> **Recomendación:** en código nuevo, **objeto `as const`** si necesitas los valores en ejecución, y **unión de literales** si no. El `enum` sigue
> siendo válido —y es la opción natural en proyectos que ya lo usan o en APIs que se generan desde otros lenguajes—, pero cierra la puerta a la
> eliminación de tipos ([10 § 8](10-typescript-5.5-5.9-inferencia-y-sintaxis-borrable.md#8-typescript-58-erasablesyntaxonly-y-la-sintaxis-borrable)).

---

## 3. `any`, `unknown` o un genérico

| Situación | Usa | Por qué |
|---|---|---|
| Un valor de origen desconocido (`JSON.parse`, `catch`, mensajes) | `unknown` | Obliga a validar antes de usar |
| Una función que no mira el valor, solo lo pasa | Un genérico `<T>` | Conserva el tipo para quien llama |
| Una función que acepta cualquier cosa y no devuelve nada relacionado | `unknown` | `(x: unknown) => void` |
| Migrar JavaScript poco a poco | `any`, temporalmente | Con `noImplicitAny` activo, el `any` queda explícito y localizable |
| Un tipo que el compilador no puede expresar | `any` dentro de una función, con un tipo de retorno correcto | Aísla el agujero |

```ts
function registrarMal(valor: any): any { return valor; }            // el tipo se pierde y contagia
function registrar<T>(valor: T): T { return valor; }                // el tipo se conserva
function describir(valor: unknown): string { return typeof valor; } // acepta todo y no promete nada

const n = registrar(42);
//    ^? const n: 42
```

---

## 4. Anotación, `as` o `satisfies`

| Quieres… | Escribe | Resultado |
|---|---|---|
| Fijar el contrato de una variable | `const x: T = valor` | `x` es `T`; se comprueba `valor` |
| Comprobar el valor **sin** perder el tipo inferido | `const x = valor satisfies T` | `x` conserva los literales y las claves concretas |
| Literales exactos, inmutables y comprobados | `const x = valor as const satisfies T` | Lo mejor de los dos |
| Decir al compilador algo que no puede saber | `valor as T` | Sin comprobación real: úsalo solo en el borde, tras validar |
| Saltarte el sistema de tipos | `valor as unknown as T` | Una señal de alarma en revisión de código |

```ts
type Ruta = { ruta: `/${string}`; publica: boolean };

const rutas = {
    inicio: { ruta: "/", publica: true },
    panel: { ruta: "/panel", publica: false },
} satisfies Record<string, Ruta>;

type NombreDeRuta = keyof typeof rutas;
//   ^? type NombreDeRuta = "inicio" | "panel"
```

Con una anotación `Record<string, Ruta>`, `NombreDeRuta` sería `string` y se perdería el autocompletado. El detalle está en
[08 § `satisfies`](08-typescript-4.5-4.9-esm-y-satisfies.md#7-typescript-49-satisfies).

---

## 5. `private` o `#privado`

| | `private x` | `#x` |
|---|---|---|
| **Privacidad** | Solo para el compilador | Real, en ejecución |
| **Visible con `as any`, `Object.keys`, `JSON.stringify`, el depurador** | Sí | Solo el depurador |
| **Acceso desde otra instancia de la misma clase** | Sí | Sí |
| **Subclase con un miembro del mismo nombre** | Choca | Son independientes |
| **Propiedades de parámetro** (`constructor(private x)`) | ✅ (no borrable) | ❌ |
| **Pruebas que acceden a internos** | Posible con `as any` o `obj["x"]` | Imposible desde fuera |
| **Coste con destinos anteriores a ES2022** | Ninguno | Un `WeakMap` por campo |
| **Proxies** | Funcionan | Un `Proxy` no puede acceder a `#x` del objeto original: lanza `TypeError` |

> [!TIP]
> **Recomendación:** `#privado` cuando la privacidad sea un requisito real —bibliotecas, código que reciben terceros, secretos en memoria— y en
> código nuevo en general, porque es JavaScript estándar y borrable. `private` sigue siendo práctico con propiedades de parámetro (si no usas
> `erasableSyntaxOnly`), con pruebas que inspeccionan internos y con marcos que envuelven objetos en *proxies* (Vue, MobX).

---

## 6. Decoradores experimentales o estándar

| Si usas… | Sistema | Configuración |
|---|---|---|
| Angular | Experimentales (decoradores de parámetro en constructores) | `experimentalDecorators: true` (lo genera Angular CLI) |
| NestJS, TypeORM, class-validator, InversifyJS | Experimentales + `emitDecoratorMetadata` | Ambas opciones |
| Lit 3, MobX 6 (estándar), código propio nuevo | Estándar | Ninguna opción |
| Nada que necesite decoradores | — | Mejor no usarlos: ninguno de los dos sistemas es estándar todavía |

Los dos sistemas no se mezclan en un mismo proyecto. Y ambos generan código, así que ninguno funciona con la eliminación de tipos de Node. Historia
completa en [19 § La saga de los decoradores](19-typescript-y-ecmascript.md#5-la-saga-de-los-decoradores).

---

## 7. Un proyecto o varios

| Señal | Un `tsconfig.json` | Referencias de proyecto (`tsc -b`) |
|---|---|---|
| Tamaño | Hasta decenas de miles de líneas | Cientos de miles o más |
| Estructura | Una aplicación | Monorrepo con paquetes que dependen entre sí |
| Configuraciones distintas | No | Cada paquete necesita opciones propias (navegador y Node, pruebas y código) |
| Tiempo de comprobación | Aceptable | El editor o CI tardan demasiado |
| Límites entre módulos | No importan | Quieres impedir importaciones cruzadas no declaradas |

| Coste de dividir | Detalle |
|---|---|
| `composite: true` | Obliga a `declaration` y a que todos los archivos estén en `include` |
| Construcción ordenada | Hay que construir antes las dependencias (`tsc -b` lo hace) |
| Editor | Por defecto usa el código fuente de las referencias; `disableSourceOfProjectReferenceRedirect` le hace usar los `.d.ts` construidos, más rápido en monorrepos enormes |

> [!TIP]
> **Recomendación:** empieza con **un proyecto**. Divide cuando la comprobación sea lenta o cuando necesites configuraciones distintas. Un caso
> intermedio muy común: un `tsconfig.json` para el código y otro para las pruebas (con `types` de Vitest o Jest), enlazados con referencias. Con
> la 7.0, `--builders` construye referencias en paralelo ([17 § Receta E](17-tsconfig-de-referencia.md#e--monorrepo-con-referencias-de-proyecto)).

---

## 8. Sobrecargas, uniones o genéricos

```ts
// Sobrecargas: el tipo de retorno depende del argumento, y hay pocos casos
function crear(tipo: "texto"): HTMLInputElement;
function crear(tipo: "boton"): HTMLButtonElement;
function crear(tipo: "texto" | "boton"): HTMLElement {
    return document.createElement(tipo === "texto" ? "input" : "button");
}

// Genérico con un mapa de tipos: muchos casos, una sola firma
interface Etiquetas { input: HTMLInputElement; button: HTMLButtonElement; a: HTMLAnchorElement; }
function crearElemento<K extends keyof Etiquetas>(etiqueta: K): Etiquetas[K] {
    return document.createElement(etiqueta) as Etiquetas[K];
}

// Unión: el retorno no depende del argumento
function longitud(x: string | readonly unknown[]): number { return x.length; }

const boton = crear("boton");
//    ^? const boton: HTMLButtonElement
const enlace = crearElemento("a");
//    ^? const enlace: HTMLAnchorElement
```

| Usa | Cuando |
|---|---|
| Unión en el parámetro | El retorno no depende de qué miembro se pasó |
| Sobrecargas | Dos o tres combinaciones con retornos distintos |
| Genérico + mapa de tipos | Muchos casos con la misma forma (como `document.createElement`) |
| Tipo condicional en el retorno | Casi nunca: dentro de la función hacen falta aserciones |

---

## 9. Qué versión de TypeScript usar

Estado al 10 de noviembre de 2026 ([01 § 6](01-modelo-de-versiones.md#6-cómo-se-elige-la-versión)):

| Proyecto | Versión | Por qué |
|---|---|---|
| Nuevo, sin complementos de editor especiales | **7.0** (`~7.0.2`) | El compilador nativo: rápido y estable |
| Nuevo con Vue, Svelte, Astro o Angular | `tsc` 7.0 en CI + editor con la 6.0 | Sus complementos necesitan la API de la 6.0 hasta la 7.1 |
| Con typescript-eslint con tipos | 7.0 + `@typescript/typescript6` | El *linter* usa la API de la 6.0 |
| Existente en la 5.x | **6.0** primero, luego 7.0 | La 6.0 señala todo lo que la 7.0 rechazará ([23](23-migracion-y-ciclo-de-vida.md)) |
| Que depende de algo retirado en la 7.0 (`outFile`, AMD, `target: es5`) | 6.0, con un plan | La 6.0 es la última que lo admite |
| Biblioteca publicada | Compilar con la 7.0; probar los `.d.ts` con la versión más antigua que soportes | DefinitelyTyped soporta dos años de versiones |
| Probar lo próximo | 7.1 beta (`typescript@beta`) | No en producción |

```json
{
  "devDependencies": {
    "typescript": "~7.0.2"
  }
}
```

Fija la versión **menor** con `~`: cualquier versión menor de TypeScript puede romper código ([01 § 3](01-modelo-de-versiones.md#3-typescript-no-sigue-semver)).

---

## 10. Referencias

- Manual: [Tipos cotidianos: interfaces y alias](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces) · [Enums](https://www.typescriptlang.org/docs/handbook/enums.html) · [Clases](https://www.typescriptlang.org/docs/handbook/2/classes.html)
- [Referencias de proyecto](https://www.typescriptlang.org/docs/handbook/project-references.html)
- [Wiki de rendimiento: interfaces frente a intersecciones](https://github.com/microsoft/TypeScript/wiki/Performance#preferring-interfaces-over-intersections)
- Capítulos: [14 · El sistema de tipos](14-sistema-de-tipos-a-fondo.md) · [17 · `tsconfig`](17-tsconfig-de-referencia.md) · [23 · Migración](23-migracion-y-ciclo-de-vida.md)

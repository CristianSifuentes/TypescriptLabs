<div align="center">

# 17 · `tsconfig` de referencia

**Anatomía, recetas comprobadas para 2026, la familia `strict`, `target` y `lib` según el runtime, herencia de configuraciones y la tabla completa de opciones con su ciclo de vida**

[⬅ 16 · Módulos y resolución](16-modulos-y-resolucion.md) · [🏠 Índice](../README.md) · [18 · Bajo el capó ➡](18-bajo-el-capo-y-rendimiento.md)

</div>

> [!IMPORTANT]
> Desde la 6.0, **lo que no escribes en el `tsconfig.json` cambia con la versión del compilador**: `target` es flotante, `strict` está activado y
> `types` está vacío. Un `tsconfig.json` de 2026 debería ser **explícito** en lo que importa a tu proyecto. Las recetas de este capítulo se
> comprobaron con los compiladores 6.0.3 y 7.0.2 sobre proyectos de prueba reales.

---

## Contenido

1. [Anatomía de un `tsconfig.json`](#1-anatomía-de-un-tsconfigjson)
2. [Recetas para 2026](#2-recetas-para-2026)
3. [La familia `strict` y las comprobaciones extra](#3-la-familia-strict-y-las-comprobaciones-extra)
4. [`target` y `lib` según el runtime](#4-target-y-lib-según-el-runtime)
5. [`jsx`](#5-jsx)
6. [Herencia: `extends`, `${configDir}` y las bases compartidas](#6-herencia-extends-configdir-y-las-bases-compartidas)
7. [Todas las opciones](#7-todas-las-opciones)
8. [Referencias](#8-referencias)

---

## 1. Anatomía de un `tsconfig.json`

```jsonc
{
  "extends": "./tsconfig.base.json",        // hereda; las claves de aquí pisan a las de allí
  "compilerOptions": { /* … */ },             // cómo se comprueba y qué se emite
  "include": ["src"],                         // patrones de archivos de entrada
  "exclude": ["src/**/*.test.ts"],            // se restan de include (no impide que se importen)
  "files": [],                                // lista exacta; vacía en los proyectos «solución»
  "references": [{ "path": "./paquetes/api" }],   // referencias de proyecto (3.0)
  "watchOptions": { "watchFile": "useFsEvents" }  // vigilancia de archivos (3.8)
}
```

| Clave | Notas |
|---|---|
| `include` | Si no se escribe ni `include` ni `files`, se incluye todo lo que hay bajo la carpeta del `tsconfig.json` |
| `exclude` | Solo filtra `include`; un archivo excluido entra igualmente si otro lo importa |
| `files` | Útil para el `tsconfig.json` raíz de un monorrepo, que solo tiene `references` |
| `compilerOptions.rootDir` | Desde la 6.0, por defecto, la carpeta del `tsconfig.json` ([11 § 4](11-typescript-6.0-el-puente.md#4-types-y-rootdir-los-dos-cambios-que-más-rompen)) |

`tsc --showConfig` imprime la configuración **efectiva**, con la herencia resuelta y los archivos que entran: es la forma de comprobar qué ve el
compilador.

---

## 2. Recetas para 2026

Cada receta es un `tsconfig.json` completo. Se probaron creando un proyecto mínimo con cada una y compilándolo con `tsc` 6.0.3 y 7.0.2: las seis
compilan sin errores ni avisos de obsolescencia en ambos.

### A · Aplicación con empaquetador (Vite, Next, Astro…)

```jsonc
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2024", "dom"],
    "module": "preserve",                    // implica moduleResolution: bundler
    "noEmit": true,                          // el empaquetador emite; tsc solo comprueba
    "jsx": "react-jsx",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "verbatimModuleSyntax": true,
    "isolatedModules": true,
    "allowImportingTsExtensions": true,
    "skipLibCheck": true,
    "types": ["vite/client"]
  },
  "include": ["src"]
}
```

### B · Servicio en Node con la salida de `tsc`

```jsonc
{
  "compilerOptions": {
    "target": "es2023",
    "lib": ["es2024"],
    "module": "nodenext",                    // con "type": "module" en package.json
    "rootDir": "./src",
    "outDir": "./dist",
    "sourceMap": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

### C · Node ejecutando `.ts` directamente (22.18+ / 23.6+)

```jsonc
{
  "compilerOptions": {
    "target": "esnext",
    "module": "nodenext",
    "noEmit": true,                          // Node ejecuta los .ts; tsc solo comprueba
    "erasableSyntaxOnly": true,              // nada que Node no pueda borrar
    "allowImportingTsExtensions": true,      // import "./util.ts"
    "rewriteRelativeImportExtensions": true, // por si un día se compila
    "verbatimModuleSyntax": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src"]
}
```

### D · Biblioteca publicada en npm

```jsonc
{
  "compilerOptions": {
    "target": "es2022",
    "lib": ["es2022"],                       // la API mínima que exiges a tus usuarios
    "module": "nodenext",                    // lo más estricto: funciona en Node y en empaquetadores
    "rootDir": "./src",
    "outDir": "./dist",
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "isolatedDeclarations": true,            // .d.ts generables archivo a archivo (5.5)
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "verbatimModuleSyntax": true,
    "skipLibCheck": true,
    "types": []
  },
  "include": ["src"]
}
```

### E · Monorrepo con referencias de proyecto

```jsonc
// tsconfig.json (raíz: no compila nada por sí mismo)
{
  "files": [],
  "references": [{ "path": "./paquetes/nucleo" }, { "path": "./paquetes/api" }]
}

// paquetes/nucleo/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "composite": true, "rootDir": "./src", "outDir": "./dist" },
  "include": ["src"]
}

// paquetes/api/tsconfig.json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": { "composite": true, "rootDir": "./src", "outDir": "./dist" },
  "include": ["src"],
  "references": [{ "path": "../nucleo" }]
}
```

```bash
tsc -b                      # construye en orden, reutilizando lo que no cambió
tsc -b --builders 4         # 7.0: varias referencias en paralelo
```

### F · JavaScript con comprobación de tipos (JSDoc)

```jsonc
{
  "compilerOptions": {
    "allowJs": true,
    "checkJs": true,
    "noEmit": true,
    "target": "es2022",
    "module": "nodenext",
    "strict": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.js"]
}
```

> [!TIP]
> `skipLibCheck: true` aparece en todas las recetas: omite la comprobación de los `.d.ts` de `node_modules`, que no puedes corregir y que a menudo
> chocan entre sí. Los `.d.ts` propios se siguen comprobando a través del código que los usa.

---

## 3. La familia `strict` y las comprobaciones extra

| Opción | ¿En `strict`? | Desde | Qué detecta |
|---|---|---|---|
| `noImplicitAny` | ✅ | 0.9 | Parámetros y variables que serían `any` |
| `strictNullChecks` | ✅ | 2.0 | Usos de `null` y `undefined` |
| `noImplicitThis` | ✅ | 2.0 | `this` de tipo `any` |
| `alwaysStrict` | ✅ (obligatoria desde la 6.0) | 2.1 | Emite `"use strict"` |
| `strictFunctionTypes` | ✅ | 2.6 | Parámetros de funciones contravariantes |
| `strictPropertyInitialization` | ✅ | 2.7 | Campos de clase sin inicializar |
| `strictBindCallApply` | ✅ | 3.2 | Argumentos de `bind`, `call` y `apply` |
| `useUnknownInCatchVariables` | ✅ | 4.4 | `catch (e)` es `unknown` |
| `strictBuiltinIteratorReturn` | ✅ | 5.6 | El retorno de `next()` de iteradores nativos |
| `noUncheckedIndexedAccess` | ❌ | 4.1 | `arr[i]` puede ser `undefined` |
| `exactOptionalPropertyTypes` | ❌ | 4.4 | `x?: T` no acepta `undefined` explícito |
| `noImplicitOverride` | ❌ | 4.3 | Falta `override` |
| `noPropertyAccessFromIndexSignature` | ❌ | 4.2 | `obj.clave` sobre firmas de índice |
| `noImplicitReturns` | ❌ | 1.8 | Ramas sin `return` |
| `noFallthroughCasesInSwitch` | ❌ | 1.8 | `case` que caen al siguiente |
| `noUnusedLocals` · `noUnusedParameters` | ❌ | 2.0 | Declaraciones sin usar (mejor en el *linter*) |
| `noUncheckedSideEffectImports` | ❌ (por defecto desde la 6.0) | 5.6 | `import "./x.css"` sin resolver |

> [!NOTE]
> Activar `strict` es activar el conjunto **presente y futuro**: cada versión que añada una opción a la familia la activará en tu proyecto sin
> avisar. Es lo que se quiere casi siempre, pero conviene saberlo al actualizar ([07 § Migración](07-typescript-4.0-4.4-tuplas-variadicas-y-plantillas.md#9-notas-de-migración)).

---

## 4. `target` y `lib` según el runtime

`target` decide qué **sintaxis** se transforma; `lib`, qué **API** se dan por existentes ([01 § 7](01-modelo-de-versiones.md#7-target-y-lib-el-javascript-que-sale-y-el-que-se-supone)).
Desde la 6.0, no escribir `target` significa «la última edición»: `es2025` en la 6.0 y la 7.0, `es2026` en la 7.1.

| Runtime | `target` razonable | `lib` razonable | Por qué |
|---|---|---|---|
| Node 20 | `es2023` | `["es2023"]` | Lo que fija `module: node20` |
| Node 22 | `es2023` | `["es2024"]` | `Object.groupBy`, `Promise.withResolvers`; métodos de `Set` desde la 22 |
| Node 24 y 26 | `es2024` | `["es2025"]` | Auxiliares de iteradores, `RegExp.escape`, `Promise.try` |
| Navegadores actuales (sin IE, sin Safari < 16) | `es2022` | `["es2023", "dom"]` | Campos de clase, `#privado`, `at()` |
| Bun · Deno | `esnext` | `["esnext"]` (+ `dom` en Deno) | Siguen el estándar de cerca |
| Biblioteca | El más bajo que soportes | El más bajo que soportes | No impongas a tus usuarios un runtime más nuevo del necesario |

> [!WARNING]
> Ninguna de estas columnas añade *polyfills*. Si `lib` declara una API que el runtime no tiene, el código compila y falla al ejecutarse. Ante la
> duda, comprueba la API en [node.green](https://node.green) o en [Baseline](https://web.dev/baseline) antes de subir `lib`.

---

## 5. `jsx`

<!-- atlas:inicio tabla-jsx -->
| `jsx` | Disponible desde | Estado | Para qué |
|---|---|---|---|
| `preserve` | **1.6** | 🟢 | Deja el JSX intacto (`.jsx`) para otra herramienta |
| `react` | **1.6** | 🟢 | `React.createElement` |
| `react-native` | **2.2** | 🟢 | Deja el JSX intacto en `.js` |
| `react-jsx` | **4.1** | 🟢 | El transformador automático de React 17 |
| `react-jsxdev` | **4.1** | 🟢 | Como `react-jsx`, con información de depuración |
<!-- atlas:fin tabla-jsx -->

| Biblioteca | Configuración |
|---|---|
| React 17+ | `"jsx": "react-jsx"` |
| Preact | `"jsx": "react-jsx"`, `"jsxImportSource": "preact"` |
| Solid | `"jsx": "preserve"`, `"jsxImportSource": "solid-js"` |
| Vue (TSX) | `"jsx": "preserve"`, `"jsxImportSource": "vue"` |
| React clásico (`React.createElement`) | `"jsx": "react"` |

---

## 6. Herencia: `extends`, `${configDir}` y las bases compartidas

| Mecanismo | Desde | Detalle |
|---|---|---|
| `extends` con una ruta | 2.1 | `"extends": "./tsconfig.base.json"` |
| `extends` con un paquete | 3.2 | `"extends": "@tsconfig/node22/tsconfig.json"` |
| `extends` con varias | 5.0 | `"extends": ["@tsconfig/strictest", "./base.json"]`: las posteriores pisan a las anteriores |
| `${configDir}` | 5.5 | Rutas relativas al proyecto que **hereda**, no al archivo heredado ([10 § 3](10-typescript-5.5-5.9-inferencia-y-sintaxis-borrable.md#3-typescript-55-isolateddeclarations-y-configdir)) |

Reglas de la herencia que conviene recordar:

- `compilerOptions` se **fusiona** opción por opción; `include`, `exclude`, `files` y `references` se **sustituyen** enteros.
- Las rutas relativas de un archivo heredado se resuelven respecto a **ese** archivo, salvo que usen `${configDir}`.
- `references` no se hereda nunca.

El repositorio [`tsconfig/bases`](https://github.com/tsconfig/bases) publica configuraciones base mantenidas por la comunidad (`@tsconfig/node22`,
`@tsconfig/strictest`, `@tsconfig/vite-react`…). Son un buen punto de partida, con la advertencia de siempre: revisa qué `target` y qué `lib`
fijan.

---

## 7. Todas las opciones

La tabla siguiente se genera con `tools/extraer-opciones.ts`, que **pregunta a cada compilador** —de la 1.5 a la 7.1 beta— qué opciones declara y
qué responde al usarlas: nada (vigente), «obsoleta» o «retirada». Las descripciones son los textos oficiales del compilador, en su traducción al
español cuando existe.

<!-- atlas:inicio tabla-opciones -->
| Opción | Tipo | Desde | Obsoleta | Retirada | Qué hace (texto oficial del compilador) |
|---|---|---|---|---|---|
| `allowArbitraryExtensions` | boolean | 5.0 | — | — | Habilite la importación de archivos con cualquier extensión, siempre que haya un archivo de declaración presente. |
| `allowImportingTsExtensions` | boolean | 5.0 | — | — | Permitir que las importaciones incluyan extensiones de archivo TypeScript. Requiere que se establezca "--moduleResolution bundler" y "--noEmit" o "--emitDeclarationOnly". |
| `allowJs` | boolean | 1.8 | — | — | Permitir que los archivos JavaScript formen parte del programa. Use la opción "checkJS" para obtener errores de estos archivos. |
| `allowSyntheticDefaultImports` | boolean | 1.8 | — | — | Permita "importar x desde y" cuando un módulo no tiene una exportación predeterminada. |
| `allowUmdGlobalAccess` | boolean | 3.5 | — | — | Permite el acceso a las bibliotecas globales de UMD desde los módulos. |
| `allowUnreachableCode` | boolean | 1.8 | — | — | Deshabilite los informes de errores para los códigos inaccesibles. |
| `allowUnusedLabels` | boolean | 1.8 | — | — | Deshabilite los informes de errores para etiquetas sin usar. |
| `alwaysStrict` | boolean | 2.1 | — | — | Asegúrese de que siempre se emite "use strict". |
| `assumeChangesOnlyAffectDirectDependencies` | boolean | 3.8 | — | — | Hacer que las recompilaciones en los proyectos que utilizan el modo 'incremental' y 'inspección' supongan que los cambios dentro de un archivo sólo afectarán a los archivos que dependen directamente de él. |
| `baseUrl` | string | 2.0 | 6.0 | **7.0** | Especifique el directorio base para resolver nombres de módulos no relativos. |
| `charset` | string | ≤ 1.5 | 5.0 | **5.6** | Ya no se admite. En versiones anteriores, establezca manualmente la codificación de texto para leer archivos. |
| `checkers` | number | 7.0 | — | — | Set the number of checkers per project. |
| `checkJs` | boolean | 2.3 | — | — | Habilite el informe de errores en los archivos JavaScript de comprobación de tipos. |
| `compileOnSave` | boolean | 2.0 | — | **2.3** | — |
| `composite` | boolean | 2.9 | — | — | Habilite restricciones que permitan usar un proyecto TypeScript con referencias del proyecto. |
| `customConditions` | string | 5.0 | — | — | Condiciones que se establecerán además de los valores predeterminados específicos de la resolución al resolver las importaciones. |
| `declaration` | boolean | ≤ 1.5 | — | — | Genere archivos .d.ts desde los archivos TypeScript y JavaScript del proyecto. |
| `declarationDir` | string | 2.0 | — | — | Especifique el directorio de salida para los archivos de declaración generados. |
| `declarationMap` | boolean | 2.9 | — | — | Cree mapas de origen para archivos d.ts. |
| `deduplicatePackages` | boolean | 7.0 | — | — | Deduplicate packages with the same name and version. |
| `diagnostics` | boolean | ≤ 1.5 | — | — | Información de rendimiento resultante del compilador después de la compilación. |
| `disableReferencedProjectLoad` | boolean | 4.0 | — | — | Reduzca el número de proyectos cargados automáticamente por TypeScript. |
| `disableSizeLimit` | boolean | 1.8 | — | — | Elimine el límite de 20 MB del tamaño total del código fuente para los archivos JavaScript en el servidor de lenguaje TypeScript. |
| `disableSolutionSearching` | boolean | 3.8 | — | — | Opte por excluir un proyecto de la comprobación de referencias de varios proyectos al editar. |
| `disableSourceOfProjectReferenceRedirect` | boolean | 3.7 | — | — | Deshabilite la preferencia de archivos de código fuente en lugar de archivos de declaración cuando haga referencia a proyectos compuestos. |
| `downlevelIteration` | boolean | 2.3 | 6.0 | **7.0** | Emita un JavaScript más compatible, pero más detallado y de menor rendimiento para la iteración. |
| `emitBOM` | boolean | ≤ 1.5 | — | — | Emitir una marca BOM UTF-8 al principio de los archivos de salida. |
| `emitDeclarationOnly` | boolean | 2.7 | — | — | Genere solo archivos d.ts y no archivos JavaScript. |
| `emitDecoratorMetadata` | boolean | ≤ 1.5 | — | — | Emita metadatos de tipo de diseño para las declaraciones decoradas en los archivos de origen. |
| `erasableSyntaxOnly` | boolean | 5.8 | — | — | No permitir construcciones en tiempo de ejecución que no formen parte de ECMAScript. |
| `esModuleInterop` | boolean | 2.7 | — | — | Emita un JavaScript adicional para facilitar la importación de módulos CommonJS. Esto habilita "allowSyntheticDefaultImports" para la compatibilidad de tipos. |
| `exactOptionalPropertyTypes` | boolean | 4.4 | — | — | Interprete los tipos de propiedad opcionales como escritos en lugar de agregar "undefined". |
| `experimentalAsyncFunctions` | boolean | 1.6 | — | **1.7** | — |
| `experimentalDecorators` | boolean | ≤ 1.5 | — | — | Habilite la compatibilidad experimental con decoradores experimentales heredados. |
| `explainFiles` | boolean | 4.2 | — | — | Imprima los archivos leídos durante la compilación, incluyendo la razón por la que se incluyó. |
| `extendedDiagnostics` | boolean | 2.0 | — | — | Produzca información más detallada del rendimiento resultante del compilador después de la compilación. |
| `forceConsistentCasingInFileNames` | boolean | 1.8 | — | — | Verifique el uso correcto de mayúsculas y minúsculas en las importaciones. |
| `generateCpuProfile` | string | 3.7 | — | — | Emita un perfil de CPU v8 de la ejecución del compilador para la depuración. |
| `generateTrace` | string | 5.6 | — | — | Genera un seguimiento de eventos y una lista de tipos. |
| `ignoreDeprecations` | string | 4.9 | — | — | — |
| `importHelpers` | boolean | 2.1 | — | — | Permita la importación de funciones de ayuda desde tslib una vez por proyecto, en lugar de incluirlas por archivo. |
| `importsNotUsedAsValues` | enumerada | 3.8 | 5.0 | **5.6** | Especificar el comportamiento de emisión o comprobación para las importaciones que solo se usan para los tipos. |
| `incremental` | boolean | 3.4 | — | — | Guarde archivos .tsbuildinfo para permitir la compilación incremental de proyectos. |
| `inlineSourceMap` | boolean | ≤ 1.5 | — | — | Incluir archivos de mapas de origen dentro del JavaScript emitido. |
| `inlineSources` | boolean | ≤ 1.5 | — | — | Incluya el código fuente en los mapas de origen dentro del JavaScript emitido. |
| `isolatedDeclarations` | boolean | 5.5 | — | — | Requiere una anotación suficiente en las exportaciones para que otras herramientas puedan generar archivos de declaración de forma trivial. |
| `isolatedModules` | boolean | ≤ 1.5 | — | — | Asegúrese de que cada archivo pueda transpilarse con seguridad sin depender de otras importaciones. |
| `jsx` | enumerada | 1.6 | — | — | Especifique qué código de JSX se generará. |
| `jsxFactory` | string | 2.1 | — | — | Especifique la función de generador JSX que se usa al establecer como destino la emisión JSX de React; por ejemplo, "React.createElement" o "h". |
| `jsxFragmentFactory` | string | 4.0 | — | — | Especifique la referencia de fragmento de JSX utilizada para los fragmentos cuando se dirige a la emisión de JSX de React, por ejemplo, "React.Fragment" o "Fragment". |
| `jsxImportSource` | string | 4.1 | — | — | Especifique el especificador de módulo que se usa para importar las funciones de fábrica de JSX cuando se usa "jsx: react-jsx*". |
| `keyofStringsOnly` | boolean | 2.9 | 5.0 | **5.6** | Haga que keyof solo devuelva cadenas en lugar de cadenas, números o símbolos. Opción heredada. |
| `lib` | lista | 2.0 | — | — | Especifique un conjunto de archivos de declaración de biblioteca agrupados que describan el entorno de tiempo de ejecución de destino. |
| `libReplacement` | boolean | 5.8 | — | — | Habilite el reemplazo de bibliotecas. |
| `listEmittedFiles` | boolean | 2.0 | — | — | Imprima los nombres de los archivos emitidos después de una compilación. |
| `listFiles` | boolean | ≤ 1.5 | — | — | Imprima todos los archivos leídos durante la compilación. |
| `mapRoot` | string | ≤ 1.5 | — | — | Especifique la ubicación donde el depurador debe colocar los archivos de asignaciones en lugar de las ubicaciones generadas. |
| `maxNodeModuleJsDepth` | number | 2.0 | — | — | Especifique la profundidad máxima de carpeta usada para comprobar archivos JavaScript de "node_modules". Solo es compatible con "allowJs". |
| `module` | enumerada | ≤ 1.5 | — | — | Especifique qué código de módulo se generará. |
| `moduleDetection` | enumerada | 4.7 | — | — | Controlar qué método se usa para detectar archivos JS con formato de módulo. |
| `moduleResolution` | enumerada | 1.6 | — | — | Especifique cómo busca TypeScript un archivo a partir del especificador de módulo que se le indique. |
| `moduleSuffixes` | string | 4.7 | — | — | Lista de sufijos de nombre de archivo para buscar al resolver un módulo. |
| `newLine` | enumerada | ≤ 1.5 | — | — | Establezca el carácter de nueva línea para emitir archivos. |
| `noCheck` | boolean | 5.5 | — | — | Deshabilitar la comprobación completa de tipos (solo se notificarán los errores críticos de análisis y emisión). |
| `noCustomAsyncPromise` | boolean | 1.8 | — | **2.0** | — |
| `noEmit` | boolean | ≤ 1.5 | — | — | Deshabilita la emisión de archivos de una compilación. |
| `noEmitHelpers` | boolean | ≤ 1.5 | — | — | Deshabilite la generación de funciones auxiliares personalizadas como "__extends" en la salida compilada. |
| `noEmitOnError` | boolean | ≤ 1.5 | — | — | Deshabilite la emisión de archivos si se informa algún error de comprobación de tipos. |
| `noErrorTruncation` | boolean | 2.0 | — | — | Deshabilite los tipos truncados en los mensajes de error. |
| `noFallthroughCasesInSwitch` | boolean | 1.8 | — | — | Habilite los informes de errores para los casos de fallthrough en instrucciones switch. |
| `noImplicitAny` | boolean | ≤ 1.5 | — | — | Habilite el informe de errores para expresiones y declaraciones con un tipo "any" implícito. |
| `noImplicitOverride` | boolean | 4.3 | — | — | Asegúrese de que al invalidar miembros en clases derivadas, estos están marcados con un modificador de invalidación. |
| `noImplicitReturns` | boolean | 1.8 | — | — | Habilite el informe de errores para rutas de código que no devuelvan explícitamente una función. |
| `noImplicitThis` | boolean | 2.0 | — | — | Habilite el informe de errores cuando a 'this' se le asigna el tipo 'any'. |
| `noImplicitUseStrict` | boolean | 1.8 | 5.0 | **5.6** | Deshabilite la adición de directivas "use strict" en archivos JavaScript emitidos. |
| `noLib` | boolean | ≤ 1.5 | — | — | Deshabilite la inclusión de cualquier archivo de biblioteca, incluido el archivo predeterminado lib.d.ts. |
| `noPropertyAccessFromIndexSignature` | boolean | 4.2 | — | — | Exige el uso de descriptores de acceso indexados para las claves declaradas mediante un tipo indexado. |
| `noResolve` | boolean | ≤ 1.5 | — | — | No permita que ningún "import", "require" o "<reference>" amplíe el número de archivos que TypeScript debe agregar a un proyecto. |
| `noStrictGenericChecks` | boolean | 2.4 | 5.0 | **5.6** | Deshabilite la comprobación estricta de firmas genéricas en tipos de función. |
| `noUncheckedIndexedAccess` | boolean | 4.1 | — | — | Agregue "indefinido" a un tipo cuando se acceda mediante un índice. |
| `noUncheckedSideEffectImports` | boolean | 5.6 | — | — | Compruebe las importaciones de efectos secundarios. |
| `noUnusedLocals` | boolean | 2.0 | — | — | Habilite el informe de errores cuando una variable local no se lea. |
| `noUnusedParameters` | boolean | 2.0 | — | — | Genera un error cuando no se lee un parámetro de función. |
| `out` | string | ≤ 1.5 | 5.0 | **5.6** | Valor en desuso. Use "outFile" en su lugar. |
| `outDir` | string | ≤ 1.5 | — | — | Especifique una carpeta de salida para todos los archivos emitidos. |
| `outFile` | string | 1.6 | 6.0 | **7.0** | Especifique un archivo que agrupe todas las salidas en un archivo JavaScript. Si 'declaración' es verdadera, también designa un archivo que agrupa toda la salida .d.ts. |
| `paths` | string | 2.0 | — | — | Especifique un conjunto de entradas que reasignan las importaciones a ubicaciones de búsqueda adicionales. |
| `plugins` | lista | 2.2 | — | — | Especifique una lista de complementos de servicio de lenguaje para incluirlos. |
| `pprofDir` | string | 7.0 | — | — | Generate pprof CPU/memory profiles to the given directory. |
| `preserveConstEnums` | boolean | ≤ 1.5 | — | — | Deshabilite el borrado de declaraciones "enumeración const" en el código generado. |
| `preserveSymlinks` | boolean | 2.5 | — | — | Deshabilite la resolución de symlink a su realpath. Se corresponde con la misma marca en el nodo. |
| `preserveValueImports` | boolean | 4.5 | 5.0 | **5.6** | Conserva los valores importados no usados en la salida de JavaScript que, de lo contrario, se quitarían. |
| `preserveWatchOutput` | boolean | 2.8 | — | — | Deshabilita la eliminación de la consola en modo inspección. |
| `pretty` | boolean | 1.8 | — | — | Habilite el color y el formato en la salida de TypeScript para facilitar la lectura de los errores del compilador. |
| `quiet` | boolean | 7.0 | — | — | Do not print diagnostics. |
| `reactNamespace` | string | 1.8 | — | — | Especifique el objeto invocado para 'createElement'. Esto solo se aplica cuando el destino es la emisión JSX "react". |
| `removeComments` | boolean | ≤ 1.5 | — | — | Deshabilite el poder escribir comentarios. |
| `resolveJsonModule` | boolean | 2.9 | — | — | Habilite la importación de archivos .json. |
| `resolvePackageJsonExports` | boolean | 5.0 | — | — | Use el campo “exports” de package.json al resolver las importaciones de paquetes. |
| `resolvePackageJsonImports` | boolean | 5.0 | — | — | Use el campo “imports” de package.json al resolver importaciones. |
| `rewriteRelativeImportExtensions` | boolean | 5.7 | — | — | Vuelva a escribir las extensiones de archivo ".ts", ".tsx", ".mts" y ".cts" en rutas de acceso de importación relativas a su equivalente de JavaScript en los archivos de salida. |
| `rootDir` | string | ≤ 1.5 | — | — | Especifique la carpeta raíz en los archivos de código fuente. |
| `rootDirs` | lista | 2.0 | — | — | Permita que varias carpetas se consideren como una al resolver módulos. |
| `singleThreaded` | boolean | 7.0 | — | — | Run in single threaded mode. |
| `skipDefaultLibCheck` | boolean | 1.6 | — | — | Omita la comprobación de tipos de archivo .d.ts que se incluyen con TypeScript. |
| `skipLibCheck` | boolean | 2.0 | — | — | Omita la comprobación de tipos de todos los archivos .d.ts. |
| `sourceMap` | boolean | ≤ 1.5 | — | — | Cree archivos de mapa de origen para los archivos JavaScript emitidos. |
| `sourceRoot` | string | ≤ 1.5 | — | — | Especifique la ruta raíz para que los depuradores encuentren el código de origen de referencia. |
| `stableTypeOrdering` | boolean | 6.0 | — | — | Ensure types are ordered stably and deterministically across compilations. |
| `strict` | boolean | 2.3 | — | — | Habilitar todas las opciones de comprobación de tipos estricta. |
| `strictBindCallApply` | boolean | 3.2 | — | — | Compruebe que los argumentos de los métodos 'bind', 'call' y 'apply' coinciden con la función original. |
| `strictBuiltinIteratorReturn` | boolean | 5.6 | — | — | Se crea una instancia de los iteradores integrados con un tipo 'TReturn' de 'undefined' en lugar de 'any'. |
| `strictFunctionTypes` | boolean | 2.6 | — | — | Al asignar funciones, compruebe que efectivamente los parámetros y los valores devueltos son compatibles con el subtipo. |
| `strictNullChecks` | boolean | 2.0 | — | — | Al comprobar tipos, tenga en cuenta "null" y "undefined". |
| `strictPropertyInitialization` | boolean | 2.7 | — | — | Compruebe las propiedades de clase declaradas pero no establecidas en el constructor. |
| `stripInternal` | boolean | ≤ 1.5 | — | — | Deshabilite la emisión de declaraciones que tienen "@internal" en los comentarios de JSDoc. |
| `suppressExcessPropertyErrors` | boolean | 1.6 | 5.0 | **5.6** | Deshabilite la creación de informes de errores de exceso de propiedad durante la creación de literales de objetos. |
| `suppressImplicitAnyIndexErrors` | boolean | ≤ 1.5 | 5.0 | **5.6** | Suprima los errores "noImplicitAny" al indexar objetos que carecen de firmas de índice. |
| `target` | enumerada | ≤ 1.5 | — | — | Establezca la versión del lenguaje de JavaScript para las JavaScript emitidas e incluya las declaraciones de bibliotecas compatibles. |
| `traceResolution` | boolean | 2.0 | — | — | Rutas de acceso de registro usadas durante el proceso "moduleResolution". |
| `tsBuildInfoFile` | string | 3.4 | — | — | Especifique la ruta de acceso para el archivo de compilación incremental .tsbuildinfo. |
| `typeRoots` | string | 2.0 | — | — | Especifique varias carpetas que actúen como "./node_modules/@types". |
| `types` | string | 2.0 | — | — | Especifique los nombres de los paquetes de tipo que se incluyen sin ser referenciados en un archivo fuente. |
| `useDefineForClassFields` | boolean | 3.7 | — | — | Emita campos de clases compatibles con el estándar de ECMAScript. |
| `useUnknownInCatchVariables` | boolean | 4.4 | — | — | Variables de cláusula catch predeterminadas como "unknown" en lugar de "any". |
| `verbatimModuleSyntax` | boolean | 5.0 | — | — | No transforme ni evite ninguna importación o exportación no marcada como solo de tipo, asegurándose de que se escriben en el formato del archivo de salida en función de la configuración "module". |
<!-- atlas:fin tabla-opciones -->

---

## 8. Referencias

- [Referencia de `tsconfig`](https://www.typescriptlang.org/tsconfig/) · [`tsconfig.json` en el manual](https://www.typescriptlang.org/docs/handbook/tsconfig-json.html)
- [`tsconfig/bases`](https://github.com/tsconfig/bases): configuraciones base por runtime y marco
- [node.green](https://node.green) y [Baseline](https://web.dev/baseline): qué implementa cada runtime
- Datos de este capítulo: [`data/opciones.csv`](../data/opciones.csv) y [`data/valores-de-opciones.csv`](../data/valores-de-opciones.csv)

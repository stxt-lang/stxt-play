# ROADMAP — el camino del playground

> Plan inicial acordado el **2026-08-15**. Lo común del ecosistema está en el `CLAUDE.md` de
> gobierno (repositorio `../stxt`) y lo estable de este proyecto, en su ficha
> (`../stxt/repos/stxt-play.md`). Este fichero es el camino: se marca lo hecho, se ajusta lo
> pendiente y se retira lo que deje de tener sentido, sesión a sesión.

## Decisiones que sostienen el plan (2026-08-15)

- **El editor se construye sobre CodeMirror 6.** Un editor de verdad —undo, selección, IME,
  móvil— sin reimplementarlo; modular y empaquetable con esbuild sin configuración. Se descartó
  Monaco (varios MB, workers, empaquetado incómodo para una web estática) y el editor propio
  (meses de trabajo previos al playground en sí). Importante: el coloreado **no** usa una
  gramática Lezer escrita a mano —sería una segunda definición del lenguaje, prohibida por la
  ficha—, sino decoraciones alimentadas por los tokens que salen del parseo del núcleo.
- **Los errores van al pie**, como el panel *Problems* de VS Code, que es la referencia declarada.
  El lateral derecho competía en ancho con el editor, que es lo principal.
- **Gramática y documento se asocian por namespace dentro del workspace.** Toda gramática presente
  en la lista de documentos alimenta un provider único; un documento se valida contra la gramática
  cuyo namespace le corresponde. Dos gramáticas con el mismo namespace en el workspace son un
  error, coherente con STXT-DISCOVERY-SPEC.

## Fases

Cada fase termina con el repositorio **publicable**: `npm run build` ejecutado y `web/` coherente
con las fuentes, para poder cortar la sesión donde haga falta.

### Fase 1 — Núcleo de análisis, independiente del editor

El corazón, siguiendo el modelo de `../stxt-vscode` (un solo parseo por cambio, cacheado, del que
leen todos los consumidores). Nace ya separable —sin DOM ni CodeMirror— porque es el germen de la
futura librería de coloreado.

- [x] Módulo `analysis`: texto de entrada → tokens semánticos, errores de parseo y nodos por
      línea, con `Parser` + `Observer` (modelo `TokenGeneratorObserver` de `stxt-vscode`).
- [x] Validación: `transformNodeToSchema` / `transformTemplateNodeToSchema` +
      `SchemaValidator` / `ConditionalValidator`, contra las gramáticas del workspace.
- [x] Tests mínimos en Node del módulo de análisis (`npm test`, mocha como en `stxt-js`).

**Hecha el 2026-08-15.** Quedó en `src/analysis/`: `Analyzer` (el orquestador del workspace, un
parseo cacheado por documento), `GrammarRegistry` (el provider por namespace, con la regla de
duplicados de DISCOVERY), `TokenGeneratorObserver` (portado de `stxt-vscode`) y los modelos
`Tokens` / `Diagnostic`. La validación replica al `Parser` (cada nodo al cerrarse, en post-orden)
y `SCHEMA_NOT_FOUND` se silencia si el workspace no tiene ninguna gramática, como en la extensión.

### Fase 2 — Editor de un solo documento

- [x] Integrar CodeMirror 6 con tema a partir de la paleta `$stxt-*` de `css/_settings.scss`.
- [x] Coloreado por decoraciones alimentadas por los tokens de la fase 1.
- [x] Tabuladores como indentación de primera (tecla Tab, sangrado de selección).
- [x] Errores de sintaxis subrayados en el texto y listados en el panel del pie, con clic que
      lleva a la línea.
- [x] Layout base HTML/SCSS: cabecera, editor, panel de errores. Sustituye entero al smoke test.

**Hito: playground usable con un documento. Hecha el 2026-08-15.** Quedó así: `src/editor/`
(`highlight.ts`, el campo de decoraciones alimentado por tokens; `stxtEditor.ts`, el montaje de la
vista con Tab = tabulador real e `indentUnit` de tabulador), `src/ui/problemsPanel.ts` (el panel
del pie) y `src/index.ts` como aplicación: cada cambio de documento dispara un análisis y de ese
único resultado leen el coloreado, los subrayados (`@codemirror/lint`) y el panel. Dependencias
nuevas: `@codemirror/{state,view,commands,language,lint}`, sin `basic-setup`. Verificado en
Chrome headless: coloreado, gutter de errores, panel y contador.

### Fase 3 — Workspace multi-documento

- [x] Lista lateral: crear, renombrar, borrar, seleccionar. Todo es un documento.
- [x] Esquemas y plantillas detectados por su namespace `@stxt.*` al parsear; se pintan distintos
      y los identifica su namespace, no un título.
- [x] Modelo de workspace en memoria + persistencia en `localStorage`.

**Hecha el 2026-08-15.** Quedó así: `src/workspace/` (`Workspace`, el modelo en memoria —lista
ordenada de documentos, activo, eventos— y `storage.ts`, la persistencia versionada en un
`localStorage` inyectable; ambos sin DOM y con su suite en mocha), `src/ui/documentList.ts` (la
lista lateral: clic selecciona, `+` crea, doble clic o F2 renombra en línea, `×` o Supr borra con
confirmación; contadores de errores y avisos por documento) y `src/seed.ts` (el workspace inicial:
una receta y la plantilla que la valida). El editor mantiene **un `EditorState` por documento**
(`createStxtEditor` devuelve la vista y la fábrica de estados), así que cambiar de documento
conserva el historial de undo y la selección de cada uno. Decisiones tomadas por el camino:
las gramáticas **no se renombran** (su namespace es su nombre; el título queda como reserva si el
namespace aún está en blanco); borrar el último documento crea un `Untitled` nuevo, para que el
editor nunca se quede vacío; la validación cruzada ya funciona (el analizador la traía de la fase
1) aunque su tratamiento en la interfaz sigue siendo de la fase 4.

### Fase 4 — Validación cruzada y cabecera

- [x] Las gramáticas del workspace validan en vivo los demás documentos (asociación por
      namespace).
- [x] Cabecera completa: título del documento activo, interruptor espacios/tabs e interruptor
      validación on/off.
- [x] Errores de validación en el mismo panel que los de sintaxis, distinguidos entre sí.
- [x] Reordenar los documentos de la lista lateral: arrastrar y soltar, y Alt+↑/↓ con el teclado
      (pedido el 2026-08-15; entró aquí por tocar las mismas piezas que el resto de la fase).

**Hecha el 2026-08-15.** La validación cruzada ya la traía el `Analyzer` de la fase 1; lo que
faltaba era la interfaz. La cabecera lleva un segmentado **Tabs | Spaces** y un interruptor
**Validation**; ambos son *ajustes* del playground, guardados aparte del workspace
(`stxt-play.settings`, `loadSettings`/`saveSettings` en `src/workspace/storage.ts`, campo a campo
con sus defaults). El modo de indentación cambia lo que inserta Tab (un tabulador o cuatro
espacios, vía un `Compartment` de CodeMirror sobre `indentUnit`, aplicado también a los estados
aparcados al mostrarlos) **y reindenta todos los documentos del workspace** (decidido el
2026-08-15, después de la fase 5; al principio no convertía nada). La conversión es de
`src/analysis/reindent.ts` y toca **solo la indentación estructural**: en cada línea, tantas
unidades como nivel tenga —en las líneas de texto de un bloque, el nivel del bloque más uno—, y
en comentarios, líneas en blanco y líneas rechazadas por el parser, las unidades completas que
haya. La indentación relativa del contenido de los bloques, los comentarios y los valores no se
tocan; el árbol canónico es idéntico antes y después (hay test). Se aplica como cambios de
CodeMirror —transacción en el documento visible, `state.update` en los aparcados—, así que es
**deshacible con Ctrl+Z** en cada documento; por eso no es un default destructivo. El interruptor
de validación llama a `Analyzer.setValidation` y repinta editor, panel y contadores. En el panel,
cada fila lleva una etiqueta de origen —`syntax`, `grammar`, `validation`— con su color, además
del punto de severidad. La reordenación vive en `Workspace.move(id, índiceFinal)` (evento
`moved`) y en la lista (`draggable`, marca de destino antes/después según la mitad de la fila).

### Fase 5 — Autocompletado

- [x] Autocompletado guiado por el esquema o plantilla activos, portando la lógica de
      `CompletionProvider` de `stxt-vscode` a CodeMirror.
- [x] Opcional hecho: hover con la definición del nodo.
- [ ] Opcional descartado por ahora: formateo. `NodeWriter` del núcleo reescribe el documento
      **perdiendo los comentarios**, y reformatear es por tanto una acción destructiva que exige
      un gesto explícito y una advertencia; no encaja como acción rutinaria del playground.
      Si vuelve, será un botón con confirmación, no un atajo.

**Hecha el 2026-08-15.** La lógica vive en la capa de análisis, sin editor:
`src/analysis/completion.ts` (`computeCompletions`, portado de `CompletionProvider` +
`CompletionProviderSearch` de la extensión: sugerencias raíz de todas las gramáticas del workspace
**más los raíces de las meta-gramáticas** `Schema (@stxt.schema)` y `Template (@stxt.template)`,
para arrancar una gramática con dos teclas; hijos del nodo padre descontando los que ya están en
su cardinalidad máxima; valores `ENUM` tras los dos puntos; nada en comentarios, texto de bloque
ni tras `>>`) y `src/analysis/nodeInfo.ts` (`describeNodeAtLine`, lo que enseña el hover). El
`Analyzer` los expone como `getCompletions(id, línea, prefijo)` y `describeNode(id, línea)`; el
`GrammarRegistry` ganó `getWorkspaceSchemas()` y `getMetaSchemas()`. La capa CodeMirror
(`src/editor/completion.ts` con `@codemirror/autocomplete`, `src/editor/hover.ts` con
`hoverTooltip`) solo traduce: el filtrado lo hace el análisis con la comparación canónica de STXT
(`filter: false`), las sugerencias de bloque añaden salto de línea más la indentación del cuerpo
con la unidad vigente (tabs o espacios), y el desplegable se abre al teclear o con Ctrl+Espacio.
Un detalle que salió al probar: la línea en blanco justo después del texto de un bloque sigue
siendo del bloque para el parser, pero si su indentación no es más profunda que el bloque, el
usuario está desindentando para escribir un hermano, y ahí sí se completa.

### Fase 6 — Contenido inicial y acabado

- [x] Documentos y gramáticas de ejemplo precargados (del corpus de `../stxt-web`) y botón de
      reset.
- [x] Favicon, título, enlaces al portal, mínimos de responsive y accesibilidad.
- [x] Extra hecho: compartir por URL (workspace comprimido en el hash). Sin servidor, encaja
      con el stack.

**Hecha el 2026-08-15.** La semilla son **seis ficheros `.stxt` reales en `seed/`** (tres
escritos para el playground —receta, su plantilla con un `ENUM`, un libro— y tres copias del
corpus de `../stxt-web`: `email.stxt`, la plantilla `com.example.docs` y el esquema tutorial
`com.acme.book`, así hay un `S` y varias `T` en la lista; el `README.md` de `seed/` dice de dónde
sale cada uno). esbuild los empaqueta como texto (`--loader:.stxt=text`, declaración en
`src/stxt-text.d.ts`) y `src/seed.ts` solo los lista con sus títulos; `test/seed.test.ts` los lee
del disco y comprueba que el conjunto parsea y valida limpio y que van con tabuladores. El botón
**↺ Reset** de la barra lateral los restaura, con confirmación. Favicons copiados de
`../stxt-cms/static` (misma identidad que el portal); la marca enlaza a `stxt.dev` y la cabecera
lleva *Reference* (`stxt.dev/stxt-core-ref`) y *GitHub*. **Share** copia al portapapeles una URL
con el workspace en el fragmento (`#w=` + base64url del deflate-raw del mismo JSON versionado que
guarda `localStorage`; `src/workspace/share.ts`, con test de ida y vuelta en Node): al abrirla, se
carga directamente si el navegador no tenía workspace y, si lo tenía, se pregunta antes de
sustituirlo; el fragmento se retira de la URL en cuanto se consume, para que recargar no vuelva a
preguntar. Un mensaje de estado (`role="status"`, `aria-live`) confirma la copia, el reset o un
enlace inválido. Responsive: por debajo de 720 px la barra lateral pasa a franja superior y la
cabecera se pliega en dos filas.

### Fase 7 — Publicación e integración

- [x] URL fijada: **`https://play.stxt.dev`** (2026-08-15). Canonical y `og:url` en `index.html`,
      `homepage` de `package.json`.
- [x] Versionado de assets: `scripts/stamp-assets.mjs`, último paso de `npm run build`, estampa
      `?v=<hash de contenido>` en cada referencia de `web/index.html` (CSS, JS, favicons). Los
      ficheros conservan su nombre; su URL cambia con su contenido; idempotente.
- [x] `web/_headers` (HTML sin caché; `css/` y `js/` cacheables largo, ya que van versionados;
      `nosniff` y `Referrer-Policy`) y `web/_redirects` (`/index.html` e `/index` → `/`). Se
      sirven tal cual con el resto de `web/`.
- [x] Build final commiteado en `web/` y **publicado en `https://play.stxt.dev`** (2026-08-15;
      comprobado: HTML sin caché, `js/` inmutable, `nosniff`, `/index.html` → `/`).
- [x] Enlace desde `stxt.dev`, vía `../stxt-cms` (2026-08-15): entrada *Playground* en la barra
      superior (`templates/top_bar.vm` + `menu.playground` en `lang/pages_{en,es}.properties`) y en
      la navegación lateral (`Link: Playground` / `Url: https://play.stxt.dev` en `_index.stxt` de
      `../stxt-web`, en y es; `node.vm` aprendió el `Url` externo y `navigation.vm` lo salta en
      anterior/siguiente; la plantilla `dev.stxt.website` declara ahora `Url: (?) URL`).
      Verificado generando a un directorio de pruebas; **`stxt-dev` lo regenera el usuario**.

### Después de «terminado»

- [x] **Enlaces de apertura** (2026-08-16, punto 1 del `ROADMAP.md` de `../stxt`): `#d=` +
      base64url del deflate-raw del texto UTF-8 de **un** documento, con `&t=` opcional para el
      título (`encodeOpen`/`decodeOpen`/`isOpenLink` en `src/workspace/share.ts`, con tests). Al
      abrirlo se **añade** el documento al workspace que tenga el navegador y se selecciona, sin
      preguntar ni sustituir nada; si ya hay uno con el mismo texto se selecciona ese; si el
      título ya existe se sufija ` (2)`, ` (3)`…; el fragmento se retira al consumirlo. Es lo que
      usan los botones *Abrir en el playground* de los bloques de código de `stxt.dev`
      (generados por `../stxt-cms`) y queda documentado en el README como forma pública de pasar
      un snippet al playground. Un `#w=` sigue mandando sobre un `#d=` si vinieran los dos. El
      fragmento se atiende al arrancar y en cada `hashchange`, porque esos enlaces del portal
      llevan `target="stxt-play"` y reutilizan una pestaña que ya había retirado su fragmento
      (solo cambia el hash, no recarga). Sale en la **0.2.1**.
- [x] **Diálogos propios en vez de `window.confirm`/`prompt`** (2026-08-16, idea del `TODO.md`
      de `../stxt`): `src/ui/dialog.ts` sobre el `<dialog>` nativo (`showModal`) con estilo en
      `css/_dialog.scss`; `confirmDialog` para borrar, resetear y cargar un workspace
      compartido (botones con nombre, variante `danger`, foco inicial en *Cancel*, Escape y clic
      fuera cancelan) y `linkDialog` como fallback de *Share* sin portapapeles (URL seleccionada
      + *Copy*). Comprobado en Chrome headless. También en la **0.2.1**.

**El playground está terminado** según este plan. Lo que venga —ideas nuevas— entra por el
`TODO.md` de `../stxt` y, si cuaja, como fase nueva aquí.

## Fuera del alcance de «terminado»

Anotado en la ficha como ideas que condicionan el diseño, pero no son de este plan:

- Extraer la librería de coloreado/edición como paquete propio y usarla para colorear `stxt.dev`.
- El editor WYSIWYG para CMS.

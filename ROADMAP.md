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
aparcados al mostrarlos) y **no convierte el texto existente**: convertir sería un default
destructivo, y si un día se quiere reindentar será una acción explícita. El interruptor de
validación llama a `Analyzer.setValidation` y repinta editor, panel y contadores. En el panel,
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

- [ ] Documentos y gramáticas de ejemplo precargados (del corpus de `../stxt-web`) y botón de
      reset.
- [ ] Favicon, título, enlaces al portal, mínimos de responsive y accesibilidad.
- [ ] Posible extra: compartir por URL (workspace comprimido en el hash). Sin servidor, encaja
      con el stack.

### Fase 7 — Publicación e integración

- [ ] Build final commiteado en `web/` (publica el usuario, como siempre).
- [ ] Enlace desde `stxt.dev`, vía `../stxt-cms`.

## Fuera del alcance de «terminado»

Anotado en la ficha como ideas que condicionan el diseño, pero no son de este plan:

- Extraer la librería de coloreado/edición como paquete propio y usarla para colorear `stxt.dev`.
- El editor WYSIWYG para CMS.

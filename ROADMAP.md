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

- [ ] Módulo `analysis`: texto de entrada → tokens semánticos, errores de parseo y nodos por
      línea, con `Parser` + `Observer` (modelo `TokenGeneratorObserver` de `stxt-vscode`).
- [ ] Validación: `transformNodeToSchema` / `transformTemplateNodeToSchema` +
      `SchemaValidator` / `ConditionalValidator`, contra las gramáticas del workspace.
- [ ] Tests mínimos en Node del módulo de análisis (el repositorio hoy no tiene ninguno).

### Fase 2 — Editor de un solo documento

- [ ] Integrar CodeMirror 6 con tema a partir de la paleta `$stxt-*` de `css/_settings.scss`.
- [ ] Coloreado por decoraciones alimentadas por los tokens de la fase 1.
- [ ] Tabuladores como indentación de primera (tecla Tab, sangrado de selección).
- [ ] Errores de sintaxis subrayados en el texto y listados en el panel del pie, con clic que
      lleva a la línea.
- [ ] Layout base HTML/SCSS: cabecera, editor, panel de errores. Sustituye entero al smoke test.

**Hito: playground usable con un documento.**

### Fase 3 — Workspace multi-documento

- [ ] Lista lateral: crear, renombrar, borrar, seleccionar. Todo es un documento.
- [ ] Esquemas y plantillas detectados por su namespace `@stxt.*` al parsear; se pintan distintos
      y los identifica su namespace, no un título.
- [ ] Modelo de workspace en memoria + persistencia en `localStorage`.

### Fase 4 — Validación cruzada y cabecera

- [ ] Las gramáticas del workspace validan en vivo los demás documentos (asociación por
      namespace).
- [ ] Cabecera completa: título del documento activo, interruptor espacios/tabs e interruptor
      validación on/off.
- [ ] Errores de validación en el mismo panel que los de sintaxis, distinguidos entre sí.

### Fase 5 — Autocompletado

- [ ] Autocompletado guiado por el esquema o plantilla activos, portando la lógica de
      `CompletionProvider` de `stxt-vscode` a CodeMirror.
- [ ] Opcionales: hover con la definición del nodo; formateo.

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

# Plainsurvey Backlog

Backlog vivo alineado con el estado real de implementación.

Fecha de corte: 2026-05-08.

## Reglas de Priorización

Prioridad alta desbloquea APIs públicas, reduce riesgo de release o protege comportamiento con tests.

Cada item cerrado debe incluir:

- Implementación funcional.
- Tests de comportamiento.
- Actualización de documentación si cambia contrato público.

## Estado General

- Completado: Core, Renderer, Builder, Analytics, AI y sistema de estilos.
- Completado: modulo Studio funcional como harness interno.
- Completado: demos de integracion UX ubicadas en `../examples`.
- En curso: hardening de release candidate en modo libreria pura.

## P0 (ALTA): Release Hardening

### P0-01 Alinear toolchain de desarrollo

Objetivo: evitar warnings y variaciones por runtime al ejecutar Vite/build.

Criterios de aceptación:

- Se define runtime oficial para dev/build (Node/Bun) por comando.
- No hay warnings de engines en flujo recomendado.
- README y checklist reflejan los comandos reales.

### P0-02 Verificación final de exports públicos

Objetivo: asegurar que los subpath exports publicados coinciden con archivos reales y tests.

Criterios de aceptación:

- Los exports de `core`, `renderer`, `builder`, `styles`, `analytics` y `ai` están cubiertos.
- Los exports CSS (`plainsurvey.css`, `themes.css`, `skins.css`, `layouts.css`, `themes/*.css`) se validan en integración.
- `tests/core/public-imports.test.js` se mantiene verde.

### P0-03 Limpiar dependencias no esenciales para package de librería

Objetivo: minimizar footprint de publicación cuando una dependencia solo aplica a demo/app.

Criterios de aceptación:

- Dependencias necesarias para runtime de librería quedan claramente separadas de dependencias de app/demo.
- Se documenta la decisión (mantener o mover) en docs de release.

## P1 (MEDIA): Consolidación de integraciones externas

### P1-01 Unificar navegación visual en ejemplos externos

Objetivo: mantener una UX clara en los proyectos de visualizacion fuera del package.

Criterios de aceptación:

- Existe una sola jerarquía clara de navegación para Builder/Preview/JSON/Analytics/AI.
- El flujo no rompe contratos de librería (`core`, `renderer`, `builder`, `analytics`, `styles`, `ai`).

### P1-02 Cobertura e2e básica del flujo integrado externo

Objetivo: reducir regresiones visuales/funcionales en ejemplos de integracion real.

Criterios de aceptación:

- Test integrado cubre: editar, preview, responder, analytics, JSON apply.
- Se verifica carga de estilos base desde una app consumidora en `../examples`.

## P2 (MEDIA): Documentación pública

### P2-01 Actualizar README a estado no-milestone

Objetivo: reemplazar lenguaje de roadmap inicial por estado actual del producto.

Criterios de aceptación:

- README describe capacidades actuales sin ambigüedad temporal.
- Incluye ejemplos de estilos por capas (base/theme/skin/layout).

### P2-02 Guía de integración CSS

Objetivo: documentar combinación recomendada entre presets UI y CSS de Plainsurvey.

Criterios de aceptación:

- Incluye import mínimo (`plainsurvey.css`) y opciones avanzadas por temas.
- Incluye notas de compatibilidad con Bootstrap/Daisy/Bulma presets.

### P5-02 Preparar release candidate

Como maintainer, quiero publicar manualmente con confianza.

Criterios de aceptación:

- Build de librería funciona sin dependencias de app visual.
- Docs cubren quick start, renderer, builder, analytics, styles, ai y schema.
- Ejemplos externos (`../examples`) funcionan con imports públicos.

Tests:

- Tests completos pasan.
- Smoke tests importan cada subpath exportado desde el build.

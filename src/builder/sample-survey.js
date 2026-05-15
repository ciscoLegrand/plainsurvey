export const sampleSurvey = {
  version: 2,
  title: "Auditoria integral de experiencia",
  description: "Demo de configuracion completa: incluye todos los tipos de pregunta para validar UX, usabilidad y accesibilidad del constructor.",
  pages: [
    {
      id: "page_intro",
      title: "Contexto",
      description: "Datos base para personalizar el resto del flujo.",
      elements: [
        {
          id: "q_intro_note",
          type: "svgNote",
          name: "intro_note",
          title: "Como usar este cuestionario",
          description: "Responde como cliente final y evalua claridad de labels, espaciado, tiempos y facilidad de configuracion.",
          variant: "orbit"
        },
        {
          id: "q_name",
          type: "text",
          name: "name",
          title: "Nombre y apellido",
          required: true,
          placeholder: "Ejemplo: Ana Martinez"
        },
        {
          id: "q_email",
          type: "text",
          name: "email",
          title: "Correo de contacto",
          required: true,
          placeholder: "nombre@empresa.com"
        },
        {
          id: "q_role",
          type: "dropdown",
          name: "role",
          title: "Rol principal",
          required: true,
          choices: [
            { value: "product", text: "Producto" },
            { value: "engineering", text: "Ingenieria" },
            { value: "design", text: "Diseno" },
            { value: "operations", text: "Operaciones" },
            { value: "support", text: "Soporte" }
          ]
        },
        {
          id: "q_area_focus",
          type: "checkbox",
          name: "area_focus",
          title: "Areas en las que trabajas",
          description: "Selecciona todas las que apliquen.",
          choices: [
            { value: "research", text: "Investigacion" },
            { value: "delivery", text: "Entrega" },
            { value: "quality", text: "Calidad" },
            { value: "analytics", text: "Analitica" }
          ]
        },
        {
          id: "q_weekly_usage",
          type: "boolean",
          name: "weekly_usage",
          title: "Usas el constructor al menos una vez por semana?",
          required: true,
          scoring: {
            enabled: true,
            score: 3,
            weight: 1,
            correctAnswer: true,
            rationale: "La frecuencia semanal indica una adopcion minima saludable para equipos de producto."
          }
        },
      ]
    },
    {
      id: "page_evaluation",
      title: "Evaluacion de experiencia",
      description: "Evalua flujo, claridad y valor percibido.",
      elements: [
        {
          id: "q_mood",
          type: "emojiScale",
          name: "mood",
          title: "Con que sensacion sales del configurador?",
          required: true,
          choices: [
            { value: "angry", text: "Frustrado", emoji: "😠" },
            { value: "sad", text: "Cansado", emoji: "🙁" },
            { value: "neutral", text: "Normal", emoji: "😐" },
            { value: "happy", text: "Contento", emoji: "🙂" },
            { value: "love", text: "Encantado", emoji: "😍" }
          ]
        },
        {
          id: "q_rating",
          type: "rating",
          name: "satisfaction",
          title: "Que puntuacion general das a la experiencia?",
          required: true,
          rateMin: 1,
          rateMax: 10
        },
        {
          id: "q_recommend",
          type: "radio",
          name: "recommend",
          title: "Recomendarias esta herramienta a otro equipo?",
          required: true,
          choices: [
            { value: "yes", text: "Si" },
            { value: "no", text: "No" }
          ],
          scoring: {
            enabled: true,
            score: 5,
            weight: 1.5,
            correctAnswer: "yes",
            rationale: "Para este ejemplo, una recomendacion positiva representa el resultado esperado del flujo ideal."
          }
        },
        {
          id: "q_editor_level",
          type: "dropdown",
          name: "editor_level",
          title: "Que vista te da mejor control para editar la encuesta?",
          required: true,
          choices: [
            { value: "builder", text: "Builder visual" },
            { value: "preview", text: "Preview" },
            { value: "json", text: "JSON Editor" }
          ],
          scoring: {
            enabled: true,
            score: 10,
            weight: 2,
            correctAnswer: "json",
            rationale: "La vista JSON es la que permite editar la definicion completa de la encuesta de forma directa."
          }
        },
        {
          id: "q_priorities",
          type: "ranking",
          name: "priorities",
          title: "Ordena lo que mas valoras del builder",
          description: "Define tu prioridad del 1 (mas importante) al ultimo lugar.",
          required: true,
          choices: [
            { value: "speed", text: "Rapidez" },
            { value: "clarity", text: "Claridad de interfaz" },
            { value: "automation", text: "Automatizacion" },
            { value: "design", text: "Diseno visual" }
          ]
        },
        {
          id: "q_matrix",
          type: "matrix",
          name: "feature_scores",
          title: "Evalua cada modulo del flujo",
          required: true,
          rows: [
            { value: "toolbox", text: "Panel de tipos" },
            { value: "canvas", text: "Canvas central" },
            { value: "config", text: "Configurador derecho" },
            { value: "json", text: "Editor JSON" }
          ],
          columns: [
            { value: "poor", text: "Deficiente" },
            { value: "ok", text: "Aceptable" },
            { value: "good", text: "Bueno" },
            { value: "excellent", text: "Excelente" }
          ]
        },
        {
          id: "q_image_choice",
          type: "imageChoice",
          name: "screen_preference",
          title: "Que estilo visual prefieres para el panel de configuracion?",
          choices: [
            {
              value: "dense",
              text: "Denso",
              imageUrl: "https://placehold.co/600x360?text=Dense+Layout",
              caption: "Mas datos visibles"
            },
            {
              value: "balanced",
              text: "Balanceado",
              imageUrl: "https://placehold.co/600x360?text=Balanced+Layout",
              caption: "Compromiso ideal"
            },
            {
              value: "spacious",
              text: "Espaciado",
              imageUrl: "https://placehold.co/600x360?text=Spacious+Layout",
              caption: "Mayor legibilidad"
            }
          ]
        },
        {
          id: "q_image_compare",
          type: "imageCompare",
          name: "header_compare",
          title: "Cual encabezado facilita mejor la lectura?",
          choices: [
            {
              value: "minimal",
              text: "Version A",
              imageUrl: "https://placehold.co/600x360?text=Header+A",
              caption: "Minimal"
            },
            {
              value: "contextual",
              text: "Version B",
              imageUrl: "https://placehold.co/600x360?text=Header+B",
              caption: "Contextual"
            }
          ]
        },
        {
          id: "q_why",
          type: "textarea",
          name: "improvements",
          title: "Que deberiamos mejorar primero?",
          placeholder: "Describe 1-3 mejoras concretas",
          visibleIf: {
            question: "recommend",
            operator: "equals",
            value: "no"
          }
        },
        {
          id: "q_nested_panel",
          type: "panel",
          name: "implementation_context",
          title: "Detalle de implementacion",
          description: "Panel anidado para recopilar detalles tecnicos en bloque.",
          elements: [
            {
              id: "q_nested_frequency",
              type: "dropdown",
              name: "change_frequency",
              title: "Frecuencia de cambios en la encuesta",
              choices: [
                { value: "daily", text: "Diaria" },
                { value: "weekly", text: "Semanal" },
                { value: "monthly", text: "Mensual" }
              ]
            },
            {
              id: "q_nested_stakeholders",
              type: "text",
              name: "stakeholders",
              title: "Quien aprueba los cambios?",
              placeholder: "Equipo o rol responsable"
            }
          ]
        },
        {
          id: "q_guidelines",
          type: "contentBlock",
          name: "guidelines",
          title: "Buenas practicas recomendadas",
          body: "1. Usa nombres tecnicos claros y estables.\n2. Evita bloques largos abiertos por defecto en el canvas.\n3. Prioriza formularios en grid con lectura izquierda-derecha.",
          imageUrl: "https://placehold.co/900x280?text=UX+Playbook",
          imageCaption: "Checklist rapido de diseno de formularios"
        },
        {
          id: "q_logic_example",
          type: "codeBlock",
          name: "logic_example",
          title: "Regla de visibilidad usada en esta demo",
          description: "Ejemplo editable para documentar condiciones y contratos de datos.",
          language: "json",
          code: "{\n  \"visibleIf\": {\n    \"question\": \"recommend\",\n    \"operator\": \"equals\",\n    \"value\": \"no\"\n  },\n  \"owner\": \"ux-team\",\n  \"version\": \"2026.1\"\n}"
        }
      ]
    }
  ]
};

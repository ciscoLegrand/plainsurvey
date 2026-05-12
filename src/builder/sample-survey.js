export const sampleSurvey = {
  version: 2,
  title: "Encuesta de experiencia",
  description: "Un ejemplo sencillo con logica condicional, validacion y varios tipos de pregunta.",
  pages: [
    {
      id: "page_intro",
      title: "Perfil",
      description: "Conoce rapidamente a quien responde.",
      elements: [
        {
          id: "q_intro_note",
          type: "svgNote",
          name: "intro_note",
          title: "Antes de empezar",
          description: "Esta encuesta mezcla preguntas clasicas con controles visuales: caras, ranking y matriz.",
          variant: "orbit"
        },
        {
          id: "q_name",
          type: "text",
          name: "name",
          title: "Nombre",
          required: true,
          placeholder: "Tu nombre"
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
            { value: "operations", text: "Operaciones" }
          ]
        }
      ]
    },
    {
      id: "page_feedback",
      title: "Feedback",
      description: "Preguntas visibles segun las respuestas anteriores.",
      elements: [
        {
          id: "q_logic_example",
          type: "codeBlock",
          name: "logic_example",
          title: "Ejemplo de regla",
          description: "Los bloques de codigo sirven para documentar logica, APIs o instrucciones dentro del formulario.",
          language: "json",
          code: "{\n  \"visibleIf\": {\n    \"question\": \"recommend\",\n    \"operator\": \"equals\",\n    \"value\": \"no\"\n  }\n}"
        },
        {
          id: "q_mood",
          type: "emojiScale",
          name: "mood",
          title: "Con que sensacion sales de la experiencia?",
          required: true,
          choices: [
            { value: "angry", text: "Frustrado", emoji: "😠" },
            { value: "sad", text: "Flojo", emoji: "🙁" },
            { value: "neutral", text: "Normal", emoji: "😐" },
            { value: "happy", text: "Contento", emoji: "🙂" },
            { value: "love", text: "Encantado", emoji: "😍" }
          ]
        },
        {
          id: "q_rating",
          type: "rating",
          name: "satisfaction",
          title: "Que puntuacion das a la experiencia?",
          required: true,
          rateMin: 1,
          rateMax: 5
        },
        {
          id: "q_recommend",
          type: "radio",
          name: "recommend",
          title: "La recomendarias?",
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
          title: "Que vista sirve para editar directamente el JSON?",
          required: true,
          choices: [
            { value: "builder", text: "Builder" },
            { value: "runner", text: "Responder" },
            { value: "json", text: "JSON" }
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
          title: "Ordena lo que mas valoras",
          description: "Sube o baja cada opcion hasta dejar tu prioridad ideal.",
          required: true,
          choices: [
            { value: "speed", text: "Rapidez" },
            { value: "clarity", text: "Claridad" },
            { value: "automation", text: "Automatizacion" },
            { value: "design", text: "Diseno visual" }
          ]
        },
        {
          id: "q_matrix",
          type: "matrix",
          name: "feature_scores",
          title: "Evalua estas dimensiones",
          required: true,
          rows: [
            { value: "editor", text: "Constructor" },
            { value: "preview", text: "Vista previa" },
            { value: "json", text: "Editor JSON" }
          ],
          columns: [
            { value: "low", text: "Bajo" },
            { value: "medium", text: "Medio" },
            { value: "high", text: "Alto" }
          ]
        },
        {
          id: "q_why",
          type: "textarea",
          name: "why",
          title: "Que deberiamos mejorar?",
          placeholder: "Respuesta abierta",
          visibleIf: {
            question: "recommend",
            operator: "equals",
            value: "no"
          }
        }
      ]
    }
  ]
};

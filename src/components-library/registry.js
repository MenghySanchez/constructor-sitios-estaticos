import { createId } from "../cms/siteDefaults";

// El registro central define los bloques disponibles para arrastrar al canvas.
// Cada bloque tiene defaults para crear una instancia nueva y fields para el inspector.
export const componentRegistry = [
  {
    type: "section",
    label: "Seccion",
    group: "Estructura",
    description: "Contenedor principal con layout flex o grid.",
    defaults: {
      title: "Nueva seccion",
      helper: "Usa esta seccion como base visual para agrupar contenido.",
      layout: "grid",
      direction: "row",
      columns: "1",
      gap: "24",
      paddingBlock: "64",
      paddingInline: "32",
      backgroundType: "color",
      background: "#fffaf0",
      backgroundImage: "",
      backgroundGradient: "linear-gradient(135deg, #fffaf0 0%, #f6c453 100%)",
    },
    fields: [
      { name: "title", label: "Titulo guia", type: "text" },
      { name: "helper", label: "Texto guia", type: "textarea" },
      { name: "layout", label: "Layout", type: "select", options: ["grid", "flex"] },
      { name: "direction", label: "Direccion flex", type: "select", options: ["row", "column"] },
      { name: "columns", label: "Columnas grid", type: "select", options: ["1", "2", "3", "4"] },
      { name: "gap", label: "Gap px", type: "number" },
      { name: "paddingBlock", label: "Padding vertical px", type: "number" },
      { name: "paddingInline", label: "Padding horizontal px", type: "number" },
      { name: "backgroundType", label: "Tipo de fondo", type: "select", options: ["color", "image", "gradient"] },
      { name: "background", label: "Fondo", type: "color" },
      { name: "backgroundImage", label: "Imagen de fondo", type: "asset" },
      { name: "backgroundGradient", label: "Degradado CSS", type: "textarea" },
    ],
  },
  {
    type: "container",
    label: "Contenedor",
    group: "Estructura",
    description: "Caja flexible para organizar contenido.",
    defaults: {
      label: "Contenedor",
      layout: "flex",
      direction: "column",
      columns: "1",
      gap: "16",
      paddingBlock: "32",
      paddingInline: "24",
      backgroundType: "color",
      background: "#ffffff",
      backgroundImage: "",
      backgroundGradient: "linear-gradient(135deg, #ffffff 0%, #f3ead7 100%)",
    },
    fields: [
      { name: "label", label: "Etiqueta guia", type: "text" },
      { name: "layout", label: "Layout", type: "select", options: ["flex", "grid"] },
      { name: "direction", label: "Direccion flex", type: "select", options: ["column", "row"] },
      { name: "columns", label: "Columnas grid", type: "select", options: ["1", "2", "3", "4"] },
      { name: "gap", label: "Gap px", type: "number" },
      { name: "paddingBlock", label: "Padding vertical px", type: "number" },
      { name: "paddingInline", label: "Padding horizontal px", type: "number" },
      { name: "backgroundType", label: "Tipo de fondo", type: "select", options: ["color", "image", "gradient"] },
      { name: "background", label: "Fondo", type: "color" },
      { name: "backgroundImage", label: "Imagen de fondo", type: "asset" },
      { name: "backgroundGradient", label: "Degradado CSS", type: "textarea" },
    ],
  },
  {
    type: "innerSection",
    label: "Seccion interna",
    group: "Estructura",
    description: "Fila interna con columnas para composiciones rapidas.",
    defaults: {
      title: "Seccion interna",
      columns: "2",
      gap: "18",
      paddingBlock: "28",
      paddingInline: "20",
      backgroundType: "color",
      background: "#ffffff",
      backgroundImage: "",
      backgroundGradient: "linear-gradient(135deg, #ffffff 0%, #f6f0e4 100%)",
    },
    fields: [
      { name: "title", label: "Titulo guia", type: "text" },
      { name: "columns", label: "Columnas", type: "select", options: ["2", "3", "4"] },
      { name: "gap", label: "Gap px", type: "number" },
      { name: "paddingBlock", label: "Padding vertical px", type: "number" },
      { name: "paddingInline", label: "Padding horizontal px", type: "number" },
      { name: "backgroundType", label: "Tipo de fondo", type: "select", options: ["color", "image", "gradient"] },
      { name: "background", label: "Fondo", type: "color" },
      { name: "backgroundImage", label: "Imagen de fondo", type: "asset" },
      { name: "backgroundGradient", label: "Degradado CSS", type: "textarea" },
    ],
  },
  {
    type: "hero",
    label: "Hero",
    group: "Landing",
    description: "Cabecera comercial con CTA e imagen.",
    defaults: {
      eyebrow: "Nueva oferta",
      title: "Titulo potente para tu landing",
      subtitle: "Explica el beneficio principal de forma clara y directa.",
      buttonLabel: "Empezar ahora",
      buttonUrl: "#contacto",
      imageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80",
      accent: "#f6c453",
    },
    fields: [
      { name: "eyebrow", label: "Texto superior", type: "text" },
      { name: "title", label: "Titulo", type: "textarea" },
      { name: "subtitle", label: "Subtitulo", type: "textarea" },
      { name: "buttonLabel", label: "Texto boton", type: "text" },
      { name: "buttonUrl", label: "URL boton", type: "text" },
      { name: "imageUrl", label: "URL imagen", type: "asset" },
      { name: "accent", label: "Color acento", type: "color" },
    ],
  },
  {
    type: "text",
    label: "Texto",
    group: "Contenido",
    description: "Bloque editorial simple.",
    defaults: {
      kicker: "Seccion",
      title: "Cuenta una idea importante",
      body: "Usa este bloque para explicar beneficios, procesos o cualquier contenido de soporte.",
      align: "left",
    },
    fields: [
      { name: "kicker", label: "Kicker", type: "text" },
      { name: "title", label: "Titulo", type: "textarea" },
      { name: "body", label: "Contenido", type: "textarea" },
      { name: "align", label: "Alineacion", type: "select", options: ["left", "center"] },
    ],
  },
  {
    type: "heading",
    label: "Encabezado",
    group: "Contenido",
    description: "Titulos H1-H4 para jerarquia SEO.",
    defaults: {
      text: "Encabezado de seccion",
      level: "h2",
      align: "left",
    },
    fields: [
      { name: "text", label: "Texto", type: "textarea" },
      { name: "level", label: "Nivel", type: "select", options: ["h1", "h2", "h3", "h4"] },
      { name: "align", label: "Alineacion", type: "select", options: ["left", "center", "right"] },
    ],
  },
  {
    type: "richText",
    label: "Editor de texto",
    group: "Contenido",
    description: "Texto largo editable para contenido libre.",
    defaults: {
      body: "Escribe aqui el contenido. Puedes usar varias lineas para separar parrafos.",
      align: "left",
    },
    fields: [
      { name: "body", label: "Contenido", type: "textarea" },
      { name: "align", label: "Alineacion", type: "select", options: ["left", "center", "right"] },
    ],
  },
  {
    type: "link",
    label: "Enlace",
    group: "Contenido",
    description: "Link de texto independiente.",
    defaults: {
      label: "Leer mas",
      url: "#",
      align: "left",
    },
    fields: [
      { name: "label", label: "Texto", type: "text" },
      { name: "url", label: "URL", type: "text" },
      { name: "align", label: "Alineacion", type: "select", options: ["left", "center", "right"] },
    ],
  },
  {
    type: "image",
    label: "Imagen",
    group: "Contenido",
    description: "Imagen destacada con caption.",
    defaults: {
      imageUrl: "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80",
      alt: "Imagen de la landing",
      caption: "Caption opcional para dar contexto.",
    },
    fields: [
      { name: "imageUrl", label: "URL imagen", type: "asset" },
      { name: "alt", label: "Texto alternativo", type: "text" },
      { name: "caption", label: "Caption", type: "text" },
    ],
  },
  {
    type: "button",
    label: "Boton",
    group: "Contenido",
    description: "CTA independiente.",
    defaults: {
      label: "Quiero saber mas",
      url: "#contacto",
      style: "primary",
    },
    fields: [
      { name: "label", label: "Texto", type: "text" },
      { name: "url", label: "URL", type: "text" },
      { name: "style", label: "Estilo", type: "select", options: ["primary", "secondary"] },
    ],
  },
  {
    type: "icon",
    label: "Icono",
    group: "Contenido",
    description: "Icono vectorial simple con texto opcional.",
    defaults: {
      icon: "check",
      label: "Beneficio destacado",
      shape: "circle",
    },
    fields: [
      { name: "icon", label: "Icono", type: "select", options: ["check", "arrow", "bolt", "dot"] },
      { name: "label", label: "Texto", type: "text" },
      { name: "shape", label: "Forma", type: "select", options: ["circle", "square"] },
    ],
  },
  {
    type: "iconList",
    label: "Lista de iconos",
    group: "Contenido",
    description: "Lista de beneficios con iconos consistentes.",
    defaults: {
      icon: "check",
      items: "Primer beneficio|Segundo beneficio|Tercer beneficio",
    },
    fields: [
      { name: "icon", label: "Icono", type: "select", options: ["check", "arrow", "bolt", "dot"] },
      { name: "items", label: "Items separados por |", type: "textarea" },
    ],
  },
  {
    type: "features",
    label: "Features",
    group: "Secciones",
    description: "Tarjetas de beneficios separadas por barras.",
    defaults: {
      title: "Beneficios principales",
      items: "Rapido de editar|Exporta HTML estatico|Listo para tracking|Formularios con HTMX",
    },
    fields: [
      { name: "title", label: "Titulo", type: "text" },
      { name: "items", label: "Items separados por |", type: "textarea" },
    ],
  },
  {
    type: "navbar",
    label: "Navbar",
    group: "Global",
    description: "Navegacion superior reutilizable.",
    defaults: {
      brand: "Mi marca",
      links: "Inicio, Servicios, Contacto",
      ctaLabel: "Contactar",
      ctaUrl: "#contacto",
    },
    fields: [
      { name: "brand", label: "Marca", type: "text" },
      { name: "links", label: "Links separados por coma", type: "textarea" },
      { name: "ctaLabel", label: "Texto CTA", type: "text" },
      { name: "ctaUrl", label: "URL CTA", type: "text" },
    ],
  },
  {
    type: "footer",
    label: "Footer",
    group: "Global",
    description: "Pie de pagina reutilizable.",
    defaults: {
      title: "Mi marca",
      text: "Mensaje final de la marca.",
      links: "Privacidad, Terminos, Contacto",
    },
    fields: [
      { name: "title", label: "Titulo", type: "text" },
      { name: "text", label: "Texto", type: "textarea" },
      { name: "links", label: "Links separados por coma", type: "textarea" },
    ],
  },
  {
    type: "form",
    label: "Formulario",
    group: "Conversion",
    description: "Formulario conectado con atributos HTMX.",
    defaults: {
      title: "Hablemos de tu proyecto",
      text: "Completa tus datos y te responderemos pronto.",
      formId: "",
    },
    fields: [
      { name: "title", label: "Titulo", type: "text" },
      { name: "text", label: "Texto", type: "textarea" },
      { name: "formId", label: "Formulario", type: "form" },
    ],
  },
];

// Este mapa permite encontrar rapido la definicion de un bloque por type.
export const componentMap = Object.fromEntries(componentRegistry.map((component) => [component.type, component]));

// Esta funcion crea una instancia de bloque lista para insertarse en el canvas.
export function createBlock(type) {
  const definition = componentMap[type];

  return {
    id: createId("block"),
    type,
    props: { ...(definition?.defaults || {}) },
  };
}

// Esta funcion agrupa componentes para pintar la biblioteca lateral.
export function groupComponents() {
  return componentRegistry.reduce((groups, component) => {
    const group = component.group || "Otros";
    return {
      ...groups,
      [group]: [...(groups[group] || []), component],
    };
  }, {});
}

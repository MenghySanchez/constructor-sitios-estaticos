import { createId } from "../cms/siteDefaults";

// El registro central define los bloques disponibles para arrastrar al canvas.
// Cada bloque tiene defaults para crear una instancia nueva y fields para el inspector.
export const componentRegistry = [
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

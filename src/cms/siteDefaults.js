// Este archivo define la forma base del CMS.
// Se usa tanto en el admin de React como en la API local de Vite.

// Esta funcion genera ids simples para paginas, bloques, assets y campos.
export function createId(prefix = "item") {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

export function createDefaultDesignTokens() {
  return {
    colors: {
      ink: "#16140f",
      paper: "#fbf6eb",
      muted: "#70695d",
      line: "rgba(22, 20, 15, 0.16)",
      brand: "#f6c453",
    },
    typography: {
      headingFont: "Georgia, 'Times New Roman', serif",
      bodyFont: "Georgia, 'Times New Roman', serif",
      baseSize: "18",
      smallSize: "14",
      h1Size: "104",
      h2Size: "70",
      h3Size: "44",
      lineHeight: "1.7",
    },
    radius: {
      sm: "14",
      md: "22",
      lg: "32",
      pill: "999",
    },
    screens: {
      desktop: "1200",
      laptop: "1024",
      mobile: "390",
      custom: "768",
    },
  };
}

// Este bloque crea una landing inicial para que el piloto no arranque vacio.
export function createDefaultSite() {
  const contactFormId = createId("form");
  const homePageId = createId("page");

  return {
    // Version del esquema para poder migrar datos en el futuro si hace falta.
    schemaVersion: 1,

    // Configuracion global del sitio y scripts que deben ir en el <head>.
    settings: {
      siteName: "Static Landing CMS",
      trackingHead: "<!-- Pega aqui Meta Pixel, Google Analytics u otros scripts -->",
      globalCss: "",
      globalJs: "",
      designTokens: createDefaultDesignTokens(),
    },

    // Biblioteca inicial de archivos. En este piloto son URLs externas.
    assets: [
      {
        id: createId("asset"),
        name: "Dashboard editorial",
        type: "image",
        url: "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80",
      },
      {
        id: createId("asset"),
        name: "Equipo creativo",
        type: "image",
        url: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=80",
      },
    ],

    // Formularios reutilizables que luego puede consumir un bloque de formulario.
    forms: [
      {
        id: contactFormId,
        name: "Formulario de contacto",
        submitLabel: "Enviar solicitud",
        hxPost: "/api/leads",
        successMessage: "Gracias. Te contactaremos pronto.",
        fields: [
          {
            id: createId("field"),
            label: "Nombre",
            name: "name",
            type: "text",
            placeholder: "Tu nombre",
            required: true,
          },
          {
            id: createId("field"),
            label: "Email",
            name: "email",
            type: "email",
            placeholder: "tu@email.com",
            required: true,
          },
        ],
      },
    ],

    // Secciones globales. Pueden editarse una vez y reutilizarse en paginas.
    shared: {
      headerBlocks: [],
      navbarBlocks: [
        {
          id: createId("block"),
          type: "navbar",
          props: {
            brand: "LaunchForge",
            links: "Servicios, Casos, Contacto",
            ctaLabel: "Agendar demo",
            ctaUrl: "#contacto",
          },
        },
      ],
      footerBlocks: [
        {
          id: createId("block"),
          type: "footer",
          props: {
            title: "LaunchForge",
            text: "Landing pages rapidas, editables y listas para publicar.",
            links: "Privacidad, Terminos, Contacto",
          },
        },
      ],
    },

    // Paginas editables. Cada pagina tiene slug y lista de bloques.
    pages: [
      {
        id: homePageId,
        title: "Landing principal",
        slug: "landing-principal",
        description: "Pagina piloto generada por el CMS.",
        status: "draft",
        blocks: [
          {
            id: createId("block"),
            type: "hero",
            props: {
              eyebrow: "CMS estatico",
              title: "Construye landings como Elementor y publicalas como archivos estaticos",
              subtitle:
                "Admin visual, bloques arrastrables, formularios con HTMX y exportacion lista para subir al servidor.",
              buttonLabel: "Crear mi pagina",
              buttonUrl: "#contacto",
              imageUrl:
                "https://images.unsplash.com/photo-1551434678-e076c223a692?auto=format&fit=crop&w=1200&q=80",
              accent: "#f6c453",
            },
          },
          {
            id: createId("block"),
            type: "features",
            props: {
              title: "Todo lo necesario para el piloto",
              items:
                "Drag and drop visual|Head para tracking pixels|Biblioteca de medios|Formularios HTMX",
            },
          },
          {
            id: createId("block"),
            type: "form",
            props: {
              title: "Captura leads desde el dia uno",
              text: "Conecta este formulario a tu endpoint cuando tengas backend.",
              formId: contactFormId,
            },
          },
        ],
      },
    ],

    // Pagina activa en el admin.
    currentPageId: homePageId,
  };
}

// Esta funcion evita que datos viejos o incompletos rompan la interfaz.
export function normalizeSite(site) {
  const fallback = createDefaultSite();
  const safeSite = site && typeof site === "object" ? site : fallback;

  return {
    ...fallback,
    ...safeSite,
    settings: {
      ...fallback.settings,
      ...(safeSite.settings || {}),
      designTokens: {
        ...fallback.settings.designTokens,
        ...(safeSite.settings?.designTokens || {}),
        colors: {
          ...fallback.settings.designTokens.colors,
          ...(safeSite.settings?.designTokens?.colors || {}),
        },
        typography: {
          ...fallback.settings.designTokens.typography,
          ...(safeSite.settings?.designTokens?.typography || {}),
        },
        radius: {
          ...fallback.settings.designTokens.radius,
          ...(safeSite.settings?.designTokens?.radius || {}),
        },
        screens: {
          ...fallback.settings.designTokens.screens,
          ...(safeSite.settings?.designTokens?.screens || {}),
        },
      },
    },
    shared: {
      ...fallback.shared,
      ...(safeSite.shared || {}),
    },
    assets: Array.isArray(safeSite.assets) ? safeSite.assets : fallback.assets,
    forms: Array.isArray(safeSite.forms) ? safeSite.forms : fallback.forms,
    pages: Array.isArray(safeSite.pages) && safeSite.pages.length > 0 ? safeSite.pages : fallback.pages,
    currentPageId: safeSite.currentPageId || fallback.currentPageId,
  };
}

// Esta funcion limpia titulos para convertirlos en slugs de URL/carpeta.
export function slugify(value) {
  return String(value || "landing")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "landing";
}

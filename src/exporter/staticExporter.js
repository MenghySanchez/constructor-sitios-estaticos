import { normalizeSite, slugify } from "../cms/siteDefaults.js";

// Esta funcion evita que textos editables rompan el HTML exportado.
function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Esta funcion protege valores usados dentro de atributos HTML.
function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

// Esta funcion transforma strings separados por coma o barra en listas limpias.
function splitList(value, separator = ",") {
  return String(value || "")
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

// Esta funcion encuentra un formulario reutilizable por id.
function findForm(site, formId) {
  return site.forms.find((form) => form.id === formId) || site.forms[0];
}

// Esta funcion renderiza un bloque individual a HTML estatico.
function renderBlock(block, site) {
  const props = block.props || {};

  if (block.type === "hero") {
    return `
      <section class="sb-hero" style="--accent:${escapeAttr(props.accent || "#f6c453")}">
        <div class="sb-hero__copy">
          <p class="sb-kicker">${escapeHtml(props.eyebrow)}</p>
          <h1>${escapeHtml(props.title)}</h1>
          <p>${escapeHtml(props.subtitle)}</p>
          <a class="sb-button sb-button--primary" href="${escapeAttr(props.buttonUrl)}">${escapeHtml(props.buttonLabel)}</a>
        </div>
        <figure class="sb-hero__media">
          <img src="${escapeAttr(props.imageUrl)}" alt="${escapeAttr(props.title)}" loading="lazy">
        </figure>
      </section>`;
  }

  if (block.type === "text") {
    return `
      <section class="sb-text sb-text--${escapeAttr(props.align || "left")}">
        <p class="sb-kicker">${escapeHtml(props.kicker)}</p>
        <h2>${escapeHtml(props.title)}</h2>
        <p>${escapeHtml(props.body)}</p>
      </section>`;
  }

  if (block.type === "image") {
    return `
      <figure class="sb-image">
        <img src="${escapeAttr(props.imageUrl)}" alt="${escapeAttr(props.alt)}" loading="lazy">
        <figcaption>${escapeHtml(props.caption)}</figcaption>
      </figure>`;
  }

  if (block.type === "button") {
    return `
      <section class="sb-button-row">
        <a class="sb-button sb-button--${escapeAttr(props.style || "primary")}" href="${escapeAttr(props.url)}">${escapeHtml(props.label)}</a>
      </section>`;
  }

  if (block.type === "features") {
    const cards = splitList(props.items, "|")
      .map((item) => `<article><span></span><h3>${escapeHtml(item)}</h3></article>`)
      .join("");

    return `
      <section class="sb-features">
        <h2>${escapeHtml(props.title)}</h2>
        <div class="sb-features__grid">${cards}</div>
      </section>`;
  }

  if (block.type === "navbar") {
    const links = splitList(props.links).map((item) => `<a href="#${slugify(item)}">${escapeHtml(item)}</a>`).join("");

    return `
      <nav class="sb-navbar">
        <a class="sb-navbar__brand" href="#top">${escapeHtml(props.brand)}</a>
        <div class="sb-navbar__links">${links}</div>
        <a class="sb-button sb-button--small" href="${escapeAttr(props.ctaUrl)}">${escapeHtml(props.ctaLabel)}</a>
      </nav>`;
  }

  if (block.type === "footer") {
    const links = splitList(props.links).map((item) => `<a href="#${slugify(item)}">${escapeHtml(item)}</a>`).join("");

    return `
      <footer class="sb-footer">
        <div>
          <h2>${escapeHtml(props.title)}</h2>
          <p>${escapeHtml(props.text)}</p>
        </div>
        <div class="sb-footer__links">${links}</div>
      </footer>`;
  }

  if (block.type === "form") {
    const form = findForm(site, props.formId);
    const fields = (form?.fields || [])
      .map(
        (field) => `
          <label>
            <span>${escapeHtml(field.label)}</span>
            <input type="${escapeAttr(field.type)}" name="${escapeAttr(field.name)}" placeholder="${escapeAttr(field.placeholder)}" ${field.required ? "required" : ""}>
          </label>`,
      )
      .join("");

    return `
      <section class="sb-form-section" id="contacto">
        <div>
          <p class="sb-kicker">Formulario HTMX</p>
          <h2>${escapeHtml(props.title)}</h2>
          <p>${escapeHtml(props.text)}</p>
        </div>
        <form class="sb-form" hx-post="${escapeAttr(form?.hxPost || "/api/leads")}" hx-target=".sb-form__message" hx-swap="innerHTML">
          ${fields}
          <button class="sb-button sb-button--primary" type="submit">${escapeHtml(form?.submitLabel || "Enviar")}</button>
          <p class="sb-form__message" aria-live="polite">${escapeHtml(form?.successMessage || "")}</p>
        </form>
      </section>`;
  }

  return "";
}

// Esta funcion renderiza una lista de bloques en el mismo orden del builder.
function renderBlocks(blocks, site) {
  return (blocks || []).map((block) => renderBlock(block, site)).join("\n");
}

// Esta funcion contiene el CSS base que acompana a cada landing exportada.
function buildBaseCss(site) {
  return `
:root {
  color-scheme: light;
  --ink: #16140f;
  --paper: #fbf6eb;
  --muted: #70695d;
  --line: rgba(22, 20, 15, 0.16);
  --brand: #f6c453;
}

* { box-sizing: border-box; }

html { scroll-behavior: smooth; }

body {
  margin: 0;
  background: radial-gradient(circle at top left, rgba(246, 196, 83, 0.28), transparent 34rem), var(--paper);
  color: var(--ink);
  font-family: Georgia, 'Times New Roman', serif;
}

a { color: inherit; text-decoration: none; }

img { display: block; max-width: 100%; }

.sb-page {
  width: min(1180px, calc(100% - 32px));
  margin: 0 auto;
}

.sb-navbar {
  position: sticky;
  top: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  margin: 16px auto 0;
  padding: 14px 16px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: rgba(251, 246, 235, 0.84);
  backdrop-filter: blur(18px);
}

.sb-navbar__brand { font-weight: 800; letter-spacing: -0.04em; }

.sb-navbar__links { display: flex; gap: 18px; color: var(--muted); font-size: 14px; }

.sb-hero {
  display: grid;
  grid-template-columns: 1.02fr 0.98fr;
  gap: 48px;
  align-items: center;
  min-height: 680px;
  padding: 76px 0;
}

.sb-hero h1, .sb-text h2, .sb-features h2, .sb-form-section h2 {
  margin: 0;
  letter-spacing: -0.065em;
  line-height: 0.94;
}

.sb-hero h1 { font-size: clamp(48px, 8vw, 104px); }

.sb-hero p, .sb-text p, .sb-form-section p { color: var(--muted); font-size: 19px; line-height: 1.7; }

.sb-kicker {
  color: var(--ink) !important;
  font-size: 13px !important;
  font-weight: 800;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.sb-hero__media {
  margin: 0;
  border: 1px solid var(--line);
  border-radius: 36px;
  padding: 10px;
  background: var(--accent, var(--brand));
  transform: rotate(1.5deg);
}

.sb-hero__media img { aspect-ratio: 4 / 5; object-fit: cover; border-radius: 27px; }

.sb-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 48px;
  padding: 0 20px;
  border: 1px solid var(--ink);
  border-radius: 999px;
  font-weight: 800;
  box-shadow: 4px 4px 0 var(--ink);
}

.sb-button--primary, .sb-button--small { background: var(--brand); }

.sb-button--secondary { background: white; }

.sb-button--small { min-height: 38px; box-shadow: 2px 2px 0 var(--ink); font-size: 14px; }

.sb-text { max-width: 760px; padding: 72px 0; }

.sb-text--center { margin: 0 auto; text-align: center; }

.sb-text h2, .sb-features h2, .sb-form-section h2 { font-size: clamp(38px, 5vw, 70px); }

.sb-image { margin: 56px 0; }

.sb-image img { width: 100%; max-height: 620px; object-fit: cover; border-radius: 34px; border: 1px solid var(--line); }

.sb-image figcaption { margin-top: 12px; color: var(--muted); }

.sb-button-row { padding: 34px 0; text-align: center; }

.sb-features { padding: 72px 0; }

.sb-features__grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-top: 28px;
}

.sb-features article {
  min-height: 180px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.48);
}

.sb-features span { display: block; width: 24px; height: 24px; border-radius: 50%; background: var(--brand); }

.sb-form-section {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 28px;
  align-items: start;
  padding: 72px 0 96px;
}

.sb-form {
  display: grid;
  gap: 16px;
  padding: 24px;
  border: 1px solid var(--line);
  border-radius: 30px;
  background: #fffaf0;
}

.sb-form label { display: grid; gap: 8px; font-weight: 800; }

.sb-form input {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: white;
  font: inherit;
}

.sb-footer {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  padding: 34px 0 44px;
  border-top: 1px solid var(--line);
}

.sb-footer h2 { margin: 0; letter-spacing: -0.04em; }

.sb-footer p, .sb-footer__links { color: var(--muted); }

.sb-footer__links { display: flex; gap: 16px; flex-wrap: wrap; }

@media (max-width: 820px) {
  .sb-navbar { border-radius: 24px; align-items: flex-start; flex-direction: column; }
  .sb-navbar__links { flex-wrap: wrap; }
  .sb-hero, .sb-form-section { grid-template-columns: 1fr; min-height: auto; }
  .sb-features__grid { grid-template-columns: 1fr; }
  .sb-footer { flex-direction: column; }
}

${site.settings.globalCss || ""}
`;
}

// Esta funcion genera el JS base de la landing exportada.
function buildBaseJs(site) {
  return `
// Este archivo queda disponible para interacciones simples de la landing.
document.documentElement.classList.add('sb-js-ready');

${site.settings.globalJs || ""}
`;
}

// Esta funcion arma los tres archivos finales de una pagina estatica.
export function buildStaticPage(siteInput, pageId) {
  const site = normalizeSite(siteInput);
  const page = site.pages.find((item) => item.id === pageId) || site.pages[0];
  const title = page?.title || site.settings.siteName;
  const description = page?.description || "Landing generada por Static Builder";
  const navbar = renderBlocks(site.shared.navbarBlocks, site);
  const header = renderBlocks(site.shared.headerBlocks, site);
  const content = renderBlocks(page?.blocks || [], site);
  const footer = renderBlocks(site.shared.footerBlocks, site);
  const styles = buildBaseCss(site);
  const script = buildBaseJs(site);

  return {
    slug: slugify(page?.slug || title),
    files: {
      "index.html": `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="description" content="${escapeAttr(description)}">
    <title>${escapeHtml(title)}</title>
    <link rel="stylesheet" href="./styles.css">
    ${site.settings.trackingHead || ""}
  </head>
  <body id="top">
    <main class="sb-page">
      ${navbar}
      ${header}
      ${content}
      ${footer}
    </main>
    <script src="https://unpkg.com/htmx.org@2.0.4"></script>
    <script src="./script.js"></script>
  </body>
</html>`,
      "styles.css": styles,
      "script.js": script,
    },
  };
}

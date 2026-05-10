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

function toCssNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return `${Number.isFinite(parsed) ? parsed : fallback}px`;
}

function buildAttrs(props, baseClass, style = "") {
  const classes = [baseClass, props.cssClass].filter(Boolean).join(" ");
  const styleValue = [style, props.customCss].filter(Boolean).join("; ");

  return [
    props.cssId ? `id="${escapeAttr(props.cssId)}"` : "",
    props.__blockId ? `data-sb-block="${escapeAttr(props.__blockId)}"` : "",
    props.__columnId ? `data-sb-column="${escapeAttr(props.__columnId)}"` : "",
    `class="${escapeAttr(classes)}"`,
    styleValue ? `style="${escapeAttr(styleValue)}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function buildLayoutStyle(props, fallback = {}) {
  const layout = props.layout || fallback.layout || "grid";
  const columns = Number.parseInt(props.columns || fallback.columns || "1", 10);
  const safeColumns = Number.isFinite(columns) ? columns : 1;
  const columnSettings = props.columnSettings || {};
  const columnTemplate = Array.from({ length: safeColumns }, (_, index) => columnSettings[index]?.width || "minmax(0, 1fr)").join(" ");
  let background = props.background || fallback.background;

  if (props.backgroundType === "image" && props.backgroundImage) {
    background = `linear-gradient(rgba(22, 20, 15, 0.16), rgba(22, 20, 15, 0.16)), url('${props.backgroundImage}') center / cover`;
  }

  if (props.backgroundType === "gradient" && props.backgroundGradient) {
    background = props.backgroundGradient;
  }

  const styles = [
    `display:${layout}`,
    `gap:${toCssNumber(props.gap, fallback.gap || 16)}`,
    `padding-block:${toCssNumber(props.paddingBlock, fallback.paddingBlock || 32)}`,
    `padding-inline:${toCssNumber(props.paddingInline, fallback.paddingInline || 24)}`,
  ];

  if (layout === "grid") styles.push(`grid-template-columns:${columnTemplate}`);
  if (layout === "flex") styles.push(`flex-direction:${props.direction || fallback.direction || "column"}`);
  if (background) styles.push(`background:${background}`);

  return styles.join("; ");
}

function getResponsiveColumnSettings(columnSettings = {}, mode = "desktop") {
  if (mode === "desktop") return columnSettings;

  return Object.fromEntries(
    Object.entries(columnSettings).map(([index, settings]) => [index, { ...settings, ...(settings.responsive?.[mode] || {}) }]),
  );
}

function importantDeclarations(style) {
  return String(style || "")
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .map((declaration) => `${declaration} !important;`)
    .join(" ");
}

function buildColumnStyle(props = {}) {
  let background = props.background || "";

  if (props.backgroundType === "image" && props.backgroundImage) {
    background = `linear-gradient(rgba(22, 20, 15, 0.12), rgba(22, 20, 15, 0.12)), url('${props.backgroundImage}') center / cover`;
  }

  if (props.backgroundType === "gradient" && props.backgroundGradient) {
    background = props.backgroundGradient;
  }

  return [
    props.minHeight ? `min-height:${toCssNumber(props.minHeight, 0)}` : "",
    props.padding ? `padding:${toCssNumber(props.padding, 0)}` : "",
    props.gap ? `gap:${toCssNumber(props.gap, 0)}` : "",
    props.alignItems ? `align-content:${props.alignItems}` : "",
    props.justifyContent ? `justify-content:${props.justifyContent}` : "",
    background ? `background:${background}` : "",
  ].filter(Boolean).join("; ");
}

function splitParagraphs(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderIcon(icon = "check", shape = "circle") {
  return `<span class="sb-vector-icon sb-vector-icon--${escapeAttr(icon)} sb-vector-icon--${escapeAttr(shape)}" aria-hidden="true"></span>`;
}

// Esta funcion encuentra un formulario reutilizable por id.
function findForm(site, formId) {
  return site.forms.find((form) => form.id === formId) || site.forms[0];
}

function resolvePageHref(site, pageId, fallback = "#") {
  const page = site.pages.find((item) => item.id === pageId);
  return page ? `../../${slugify(page.slug || page.title)}/public/index.html` : fallback;
}

function buildLinkAttrs(site, props, { linkType = "linkType", url = "url", pageId = "pageId", target = "target" } = {}) {
  const href = props[linkType] === "page" ? resolvePageHref(site, props[pageId], props[url] || "#") : props[url] || "#";
  const linkTarget = props[target] || "_self";
  const rel = linkTarget === "_blank" ? ' rel="noopener noreferrer"' : "";

  return `href="${escapeAttr(href)}" target="${escapeAttr(linkTarget)}"${rel}`;
}

function getColumnCount(block) {
  if (!["section", "container", "innerSection"].includes(block?.type)) return 0;
  const columns = Number.parseInt(block.props?.columns || "1", 10);
  return Math.max(1, Number.isFinite(columns) ? columns : 1);
}

function clampColumn(column, columnCount) {
  const parsed = Number.parseInt(column, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), Math.max(columnCount - 1, 0));
}

function renderColumnChildren(block, site) {
  const columnCount = getColumnCount(block);
  return Array.from({ length: columnCount }, (_, index) => {
    const columnProps = { ...(block.props?.columnSettings?.[index] || {}), __columnId: `${block.id}-${index}` };
    const children = (block.children || []).filter((childBlock) => clampColumn(childBlock.column || 0, columnCount) === index);
    const content = renderBlocks(children, site);
    return `<div ${buildAttrs(columnProps, "sb-layout__column", buildColumnStyle(columnProps))}>${content || `Columna ${index + 1}`}</div>`;
  }).join("");
}

// Esta funcion renderiza un bloque individual a HTML estatico.
function renderBlock(block, site) {
  const props = { ...(block.props || {}), __blockId: block.id };
  const children = renderColumnChildren(block, site);

  if (block.type === "section") {
    return `
      <section ${buildAttrs(props, "sb-layout sb-layout--section", buildLayoutStyle(props, { gap: 24, paddingBlock: 64, paddingInline: 32, background: "#fffaf0" }))}>
        ${children || `<div class="sb-layout__placeholder"><p class="sb-kicker">Seccion</p><h2>${escapeHtml(props.title)}</h2><p>${escapeHtml(props.helper)}</p></div>`}
      </section>`;
  }

  if (block.type === "container") {
    return `
      <section ${buildAttrs(props, "sb-layout sb-layout--container", buildLayoutStyle(props, { layout: "flex", gap: 16, paddingBlock: 32, paddingInline: 24, background: "#ffffff" }))}>
        ${children || `<div class="sb-layout__placeholder"><p class="sb-kicker">Contenedor</p><h2>${escapeHtml(props.label)}</h2></div>`}
      </section>`;
  }

  if (block.type === "innerSection") {
    const columnCount = Number.parseInt(props.columns || "2", 10) || 2;
    const columns = Array.from({ length: columnCount })
      .map((_, index) => `<div class="sb-layout__column">${escapeHtml(props.title)} ${index + 1}</div>`)
      .join("");

    return `
      <section ${buildAttrs(props, "sb-layout sb-layout--inner", buildLayoutStyle({ ...props, layout: "grid" }, { columns: 2, gap: 18, paddingBlock: 28, paddingInline: 20 }))}>
        ${children || columns}
      </section>`;
  }

  if (block.type === "hero") {
    return `
      <section ${buildAttrs(props, "sb-hero", `--accent:${props.accent || "#f6c453"}`)}>
        <div class="sb-hero__copy">
          <p class="sb-kicker">${escapeHtml(props.eyebrow)}</p>
          <h1>${escapeHtml(props.title)}</h1>
          <p>${escapeHtml(props.subtitle)}</p>
          <a class="sb-button sb-button--primary" ${buildLinkAttrs(site, props, { linkType: "buttonLinkType", url: "buttonUrl", pageId: "buttonPageId", target: "buttonTarget" })}>${escapeHtml(props.buttonLabel)}</a>
        </div>
        <figure class="sb-hero__media">
          <img src="${escapeAttr(props.imageUrl)}" alt="${escapeAttr(props.title)}" loading="lazy">
        </figure>
      </section>`;
  }

  if (block.type === "text") {
    return `
      <section ${buildAttrs(props, `sb-text sb-text--${props.align || "left"}`)}>
        <p class="sb-kicker">${escapeHtml(props.kicker)}</p>
        <h2>${escapeHtml(props.title)}</h2>
        <p>${escapeHtml(props.body)}</p>
      </section>`;
  }

  if (block.type === "heading") {
    const level = ["h1", "h2", "h3", "h4"].includes(props.level) ? props.level : "h2";

    return `
      <section ${buildAttrs(props, `sb-heading sb-heading--${props.align || "left"}`)}>
        <${level}>${escapeHtml(props.text)}</${level}>
      </section>`;
  }

  if (block.type === "richText") {
    const paragraphs = splitParagraphs(props.body).map((paragraph) => `<p>${escapeHtml(paragraph)}</p>`).join("");

    return `
      <section ${buildAttrs(props, `sb-rich-text sb-rich-text--${props.align || "left"}`)}>
        ${paragraphs}
      </section>`;
  }

  if (block.type === "link") {
    return `
      <section ${buildAttrs(props, `sb-link-row sb-link-row--${props.align || "left"}`)}>
        <a class="sb-text-link" ${buildLinkAttrs(site, props)}>${escapeHtml(props.label)}</a>
      </section>`;
  }

  if (block.type === "image") {
    return `
      <figure ${buildAttrs(props, "sb-image")}>
        <img src="${escapeAttr(props.imageUrl)}" alt="${escapeAttr(props.alt)}" loading="lazy">
        <figcaption>${escapeHtml(props.caption)}</figcaption>
      </figure>`;
  }

  if (block.type === "button") {
    return `
      <section ${buildAttrs(props, "sb-button-row")}>
        <a class="sb-button sb-button--${escapeAttr(props.style || "primary")}" ${buildLinkAttrs(site, props)}>${escapeHtml(props.label)}</a>
      </section>`;
  }

  if (block.type === "icon") {
    return `
      <section ${buildAttrs(props, "sb-icon-card")}>
        ${renderIcon(props.icon, props.shape)}
        <strong>${escapeHtml(props.label)}</strong>
      </section>`;
  }

  if (block.type === "iconList") {
    const items = splitList(props.items, "|")
      .map((item) => `<div>${renderIcon(props.icon)}<span>${escapeHtml(item)}</span></div>`)
      .join("");

    return `
      <section ${buildAttrs(props, "sb-icon-list")}>
        ${items}
      </section>`;
  }

  if (block.type === "features") {
    const cards = splitList(props.items, "|")
      .map((item) => `<article><span></span><h3>${escapeHtml(item)}</h3></article>`)
      .join("");

    return `
      <section ${buildAttrs(props, "sb-features")}>
        <h2>${escapeHtml(props.title)}</h2>
        <div class="sb-features__grid">${cards}</div>
      </section>`;
  }

  if (block.type === "navbar") {
    const links = splitList(props.links).map((item) => `<a href="#${slugify(item)}">${escapeHtml(item)}</a>`).join("");

    return `
      <nav ${buildAttrs(props, "sb-navbar")}>
        <a class="sb-navbar__brand" href="#top">${escapeHtml(props.brand)}</a>
        <div class="sb-navbar__links">${links}</div>
        <a class="sb-button sb-button--small" ${buildLinkAttrs(site, props, { linkType: "ctaLinkType", url: "ctaUrl", pageId: "ctaPageId", target: "ctaTarget" })}>${escapeHtml(props.ctaLabel)}</a>
      </nav>`;
  }

  if (block.type === "footer") {
    const links = splitList(props.links).map((item) => `<a href="#${slugify(item)}">${escapeHtml(item)}</a>`).join("");

    return `
      <footer ${buildAttrs(props, "sb-footer")}>
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
      <section ${buildAttrs({ cssId: "contacto", ...props }, "sb-form-section")}>
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

  if (block.type === "customCode") {
    if (props.codeType === "js") {
      return `
        <section ${buildAttrs(props, "sb-code-block sb-code-block--js")}>
          <script>${String(props.js || "").replaceAll("</script", "<\\/script")}</script>
        </section>`;
    }

    return `
      <section ${buildAttrs(props, `sb-code-block sb-code-block--${props.codeType || "html"}`)}>
        ${props.html || ""}
      </section>`;
  }

  return "";
}

// Esta funcion renderiza una lista de bloques en el mismo orden del builder.
function renderBlocks(blocks, site) {
  return (blocks || []).map((block) => renderBlock(block, site)).join("\n");
}

function collectBlocks(blocks = []) {
  return blocks.flatMap((block) => [block, ...collectBlocks(block.children || [])]);
}

function buildResponsiveBlockStyle(block, mode) {
  const responsiveProps = block.props?.responsive?.[mode];
  if (!responsiveProps) return "";

  const props = {
    ...block.props,
    ...responsiveProps,
    columnSettings: getResponsiveColumnSettings(block.props?.columnSettings || {}, mode),
  };
  const styles = [];

  if (["section", "container", "innerSection"].includes(block.type)) {
    styles.push(buildLayoutStyle(block.type === "innerSection" ? { ...props, layout: "grid" } : props, { gap: 16, paddingBlock: 32, paddingInline: 24 }));
  }

  if (responsiveProps.align) styles.push(`text-align:${responsiveProps.align}`);
  if (responsiveProps.accent) styles.push(`--accent:${responsiveProps.accent}`);
  if (responsiveProps.customCss) styles.push(responsiveProps.customCss);

  return importantDeclarations(styles.filter(Boolean).join("; "));
}

function buildResponsiveColumnRules(block, mode) {
  const columnSettings = block.props?.columnSettings || {};

  return Object.entries(columnSettings)
    .map(([index, settings]) => {
      const responsiveSettings = settings.responsive?.[mode];
      if (!responsiveSettings) return "";
      const style = importantDeclarations(buildColumnStyle({ ...settings, ...responsiveSettings }));
      return style ? `[data-sb-column="${escapeAttr(`${block.id}-${index}`)}"] { ${style} }` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function buildResponsiveCss(site) {
  const blocks = [
    ...collectBlocks(site.shared.headerBlocks),
    ...collectBlocks(site.shared.navbarBlocks),
    ...collectBlocks(site.shared.footerBlocks),
    ...site.pages.flatMap((page) => collectBlocks(page.blocks)),
  ];
  const breakpoints = [
    ["laptop", 1199],
    ["mobile", 767],
    ["custom", 768],
  ];

  return breakpoints
    .map(([mode, maxWidth]) => {
      const rules = blocks
        .map((block) => {
          const blockStyle = buildResponsiveBlockStyle(block, mode);
          const blockRule = blockStyle ? `[data-sb-block="${escapeAttr(block.id)}"] { ${blockStyle} }` : "";
          const columnRules = buildResponsiveColumnRules(block, mode);
          return [blockRule, columnRules].filter(Boolean).join("\n");
        })
        .filter(Boolean)
        .join("\n");

      return rules ? `@media (max-width: ${maxWidth}px) {\n${rules}\n}` : "";
    })
    .filter(Boolean)
    .join("\n\n");
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

.sb-layout {
  margin: 44px 0;
  border: 1px dashed rgba(22, 20, 15, 0.22);
  border-radius: 32px;
}

.sb-layout__placeholder h2,
.sb-heading h1,
.sb-heading h2,
.sb-heading h3,
.sb-heading h4 {
  margin: 0;
  letter-spacing: -0.055em;
  line-height: 1.02;
}

.sb-layout__placeholder p,
.sb-rich-text p {
  color: var(--muted);
  font-size: 18px;
  line-height: 1.7;
}

.sb-layout__drop-hint,
.sb-layout__column {
  min-height: 96px;
  padding: 18px;
  border: 1px dashed var(--line);
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.5);
  color: var(--muted);
}

.sb-heading,
.sb-rich-text,
.sb-link-row,
.sb-icon-card,
.sb-icon-list { padding: 28px 0; }

.sb-heading--center,
.sb-rich-text--center,
.sb-link-row--center { text-align: center; }

.sb-heading--right,
.sb-rich-text--right,
.sb-link-row--right { text-align: right; }

.sb-heading h1 { font-size: clamp(48px, 8vw, 104px); }
.sb-heading h2 { font-size: clamp(38px, 5vw, 70px); }
.sb-heading h3 { font-size: clamp(28px, 4vw, 44px); }
.sb-heading h4 { font-size: clamp(22px, 3vw, 30px); }

.sb-text-link {
  color: var(--ink);
  font-weight: 800;
  text-decoration: underline;
  text-underline-offset: 0.22em;
}

.sb-icon-card,
.sb-icon-list div {
  display: flex;
  gap: 12px;
  align-items: center;
}

.sb-icon-card {
  min-height: 88px;
  padding-inline: 18px;
  border: 1px solid var(--line);
  border-radius: 22px;
  background: rgba(255, 255, 255, 0.48);
}

.sb-icon-list { display: grid; gap: 12px; }

.sb-vector-icon {
  position: relative;
  display: inline-grid;
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  place-items: center;
  border: 1px solid var(--line);
  border-radius: 50%;
  background: var(--brand);
  color: var(--ink);
}

.sb-vector-icon--square { border-radius: 10px; }

.sb-vector-icon::before { content: ""; display: block; }

.sb-vector-icon--check::before {
  width: 12px;
  height: 7px;
  border-bottom: 2px solid currentColor;
  border-left: 2px solid currentColor;
  transform: rotate(-45deg) translate(1px, -1px);
}

.sb-vector-icon--arrow::before {
  width: 11px;
  height: 11px;
  border-top: 2px solid currentColor;
  border-right: 2px solid currentColor;
  transform: rotate(45deg) translate(-2px, 2px);
}

.sb-vector-icon--bolt::before {
  width: 8px;
  height: 16px;
  background: currentColor;
  clip-path: polygon(54% 0, 100% 0, 62% 42%, 100% 42%, 38% 100%, 48% 54%, 0 54%);
}

.sb-vector-icon--dot::before {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

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
  .sb-hero, .sb-form-section, .sb-layout { grid-template-columns: 1fr !important; min-height: auto; }
  .sb-features__grid { grid-template-columns: 1fr; }
  .sb-footer { flex-direction: column; }
}

${buildResponsiveCss(site)}

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

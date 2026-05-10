import { slugify } from "../cms/siteDefaults";

// Esta funcion convierte strings separados por coma o barra en arrays para pintar links/cards.
function splitList(value, separator = ",") {
  return String(value || "")
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getResponsiveProps(props = {}, viewportMode = "desktop") {
  if (viewportMode === "desktop") return props;
  return { ...props, ...(props.responsive?.[viewportMode] || {}) };
}

function getResponsiveColumnSettings(columnSettings = {}, viewportMode = "desktop") {
  if (viewportMode === "desktop") return columnSettings;

  return Object.fromEntries(
    Object.entries(columnSettings).map(([index, settings]) => [index, { ...settings, ...(settings.responsive?.[viewportMode] || {}) }]),
  );
}

function toCssNumber(value, fallback) {
  const parsed = Number.parseFloat(value);
  return `${Number.isFinite(parsed) ? parsed : fallback}px`;
}

function toStyleName(property) {
  if (property.startsWith("--")) return property;
  return property.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
}

function parseCssDeclarations(value) {
  return String(value || "")
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .reduce((style, declaration) => {
      const separatorIndex = declaration.indexOf(":");
      if (separatorIndex < 1) return style;

      const property = declaration.slice(0, separatorIndex).trim();
      const propertyValue = declaration.slice(separatorIndex + 1).trim();
      if (!property || !propertyValue) return style;

      return { ...style, [toStyleName(property)]: propertyValue };
    }, {});
}

function getBlockProps(props, baseClass, style = {}) {
  return {
    id: props.cssId || undefined,
    className: [baseClass, props.cssClass].filter(Boolean).join(" "),
    style: { ...style, ...parseCssDeclarations(props.customCss) },
  };
}

function getBackgroundStyle(props, fallback = {}) {
  if (props.backgroundType === "image" && props.backgroundImage) {
    return `linear-gradient(oklch(0.18 0.018 74 / 0.16), oklch(0.18 0.018 74 / 0.16)), url("${props.backgroundImage}") center / cover`;
  }

  if (props.backgroundType === "gradient" && props.backgroundGradient) return props.backgroundGradient;

  return props.background || fallback.background;
}

function getLayoutStyle(props, fallback = {}, viewportMode = "desktop") {
  const layout = props.layout || fallback.layout || "grid";
  const columns = Number.parseInt(props.columns || fallback.columns || "1", 10);
  const safeColumns = Number.isFinite(columns) ? columns : 1;
  const columnSettings = getResponsiveColumnSettings(props.columnSettings || {}, viewportMode);
  const columnTemplate = Array.from({ length: safeColumns }, (_, index) => columnSettings[index]?.width || "minmax(0, 1fr)").join(" ");

  return {
    display: layout,
    flexDirection: props.direction || fallback.direction || "column",
    gridTemplateColumns: layout === "grid" ? columnTemplate : undefined,
    gap: toCssNumber(props.gap, fallback.gap || 16),
    paddingBlock: toCssNumber(props.paddingBlock, fallback.paddingBlock || 32),
    paddingInline: toCssNumber(props.paddingInline, fallback.paddingInline || 24),
    background: getBackgroundStyle(props, fallback),
  };
}

function splitParagraphs(value) {
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

// Esta funcion busca el formulario asociado a un bloque de formulario.
function findForm(site, formId) {
  return site.forms.find((form) => form.id === formId) || site.forms[0];
}

// Este componente renderiza un bloque dentro del canvas del admin.
// Es la version React del render estatico que luego se exporta como HTML.
export function ComponentRenderer({ block, children, site, viewportMode = "desktop" }) {
  const props = getResponsiveProps(block.props || {}, viewportMode);

  if (block.type === "section") {
    return (
      <section {...getBlockProps(props, "preview-layout preview-layout--section", getLayoutStyle(props, { gap: 24, paddingBlock: 64, paddingInline: 32, background: "#fffaf0" }, viewportMode))}>
        {children?.length ? children : (
          <>
            <div className="preview-layout__placeholder">
              <p className="preview-kicker">Seccion</p>
              <h2>{props.title}</h2>
              <p>{props.helper}</p>
            </div>
            <div className="preview-layout__drop-hint">Arrastra elementos aqui o selecciona la seccion y haz click en la biblioteca.</div>
          </>
        )}
      </section>
    );
  }

  if (block.type === "container") {
    return (
      <section {...getBlockProps(props, "preview-layout preview-layout--container", getLayoutStyle(props, { layout: "flex", gap: 16, paddingBlock: 32, paddingInline: 24, background: "#ffffff" }, viewportMode))}>
        {children?.length ? children : (
          <div className="preview-layout__placeholder">
            <p className="preview-kicker">Contenedor</p>
            <h2>{props.label}</h2>
          </div>
        )}
      </section>
    );
  }

  if (block.type === "innerSection") {
    return (
      <section {...getBlockProps(props, "preview-layout preview-layout--inner", getLayoutStyle({ ...props, layout: "grid" }, { columns: 2, gap: 18, paddingBlock: 28, paddingInline: 20 }, viewportMode))}>
        {children?.length ? children : Array.from({ length: Number.parseInt(props.columns || "2", 10) || 2 }).map((_, index) => (
          <div className="preview-layout__column" key={index}>{props.title} {index + 1}</div>
        ))}
      </section>
    );
  }

  if (block.type === "hero") {
    return (
      <section {...getBlockProps(props, "preview-hero", { "--accent": props.accent || "oklch(0.72 0.145 68)" })}>
        <div className="preview-hero__copy">
          <p className="preview-kicker">{props.eyebrow}</p>
          <h1>{props.title}</h1>
          <p>{props.subtitle}</p>
          <a className="preview-button preview-button--primary" href={props.buttonUrl}>
            {props.buttonLabel}
          </a>
        </div>
        <figure className="preview-hero__media">
          <img src={props.imageUrl} alt={props.title} />
        </figure>
      </section>
    );
  }

  if (block.type === "text") {
    return (
      <section {...getBlockProps(props, `preview-text preview-text--${props.align || "left"}`)}>
        <p className="preview-kicker">{props.kicker}</p>
        <h2>{props.title}</h2>
        <p>{props.body}</p>
      </section>
    );
  }

  if (block.type === "heading") {
    const HeadingTag = ["h1", "h2", "h3", "h4"].includes(props.level) ? props.level : "h2";

    return (
      <section {...getBlockProps(props, `preview-heading preview-heading--${props.align || "left"}`)}>
        <HeadingTag>{props.text}</HeadingTag>
      </section>
    );
  }

  if (block.type === "richText") {
    return (
      <section {...getBlockProps(props, `preview-rich-text preview-rich-text--${props.align || "left"}`)}>
        {splitParagraphs(props.body).map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>
    );
  }

  if (block.type === "link") {
    return (
      <section {...getBlockProps(props, `preview-link-row preview-link-row--${props.align || "left"}`)}>
        <a className="preview-text-link" href={props.url}>{props.label}</a>
      </section>
    );
  }

  if (block.type === "image") {
    return (
      <figure {...getBlockProps(props, "preview-image")}>
        <img src={props.imageUrl} alt={props.alt} />
        <figcaption>{props.caption}</figcaption>
      </figure>
    );
  }

  if (block.type === "button") {
    return (
      <section {...getBlockProps(props, "preview-button-row")}>
        <a className={`preview-button preview-button--${props.style || "primary"}`} href={props.url}>
          {props.label}
        </a>
      </section>
    );
  }

  if (block.type === "icon") {
    return (
      <section {...getBlockProps(props, "preview-icon-card")}>
        <span className={`preview-vector-icon preview-vector-icon--${props.icon || "check"} preview-vector-icon--${props.shape || "circle"}`} aria-hidden="true" />
        <strong>{props.label}</strong>
      </section>
    );
  }

  if (block.type === "iconList") {
    return (
      <section {...getBlockProps(props, "preview-icon-list")}>
        {splitList(props.items, "|").map((item) => (
          <div key={item}>
            <span className={`preview-vector-icon preview-vector-icon--${props.icon || "check"}`} aria-hidden="true" />
            <span>{item}</span>
          </div>
        ))}
      </section>
    );
  }

  if (block.type === "features") {
    return (
      <section {...getBlockProps(props, "preview-features")}>
        <h2>{props.title}</h2>
        <div className="preview-features__grid">
          {splitList(props.items, "|").map((item) => (
            <article key={item}>
              <span />
              <h3>{item}</h3>
            </article>
          ))}
        </div>
      </section>
    );
  }

  if (block.type === "navbar") {
    return (
      <nav {...getBlockProps(props, "preview-navbar")}>
        <a className="preview-navbar__brand" href="#top">
          {props.brand}
        </a>
        <div className="preview-navbar__links">
          {splitList(props.links).map((item) => (
            <a href={`#${slugify(item)}`} key={item}>
              {item}
            </a>
          ))}
        </div>
        <a className="preview-button preview-button--small" href={props.ctaUrl}>
          {props.ctaLabel}
        </a>
      </nav>
    );
  }

  if (block.type === "footer") {
    return (
      <footer {...getBlockProps(props, "preview-footer")}>
        <div>
          <h2>{props.title}</h2>
          <p>{props.text}</p>
        </div>
        <div className="preview-footer__links">
          {splitList(props.links).map((item) => (
            <a href={`#${slugify(item)}`} key={item}>
              {item}
            </a>
          ))}
        </div>
      </footer>
    );
  }

  if (block.type === "form") {
    const form = findForm(site, props.formId);

    return (
      <section {...getBlockProps({ cssId: "contacto", ...props }, "preview-form-section")}>
        <div>
          <p className="preview-kicker">Formulario HTMX</p>
          <h2>{props.title}</h2>
          <p>{props.text}</p>
        </div>
        <form className="preview-form">
          {(form?.fields || []).map((field) => (
            <label key={field.id}>
              <span>{field.label}</span>
              <input type={field.type} name={field.name} placeholder={field.placeholder} required={field.required} readOnly />
            </label>
          ))}
          <button className="preview-button preview-button--primary" type="button">
            {form?.submitLabel || "Enviar"}
          </button>
          <p className="preview-form__message">HTMX POST: {form?.hxPost || "/api/leads"}</p>
        </form>
      </section>
    );
  }

  if (block.type === "customCode") {
    const shouldRenderHtml = ["html", "htmx"].includes(props.codeType) && props.previewMode === "render";

    return (
      <section {...getBlockProps(props, `preview-code-block preview-code-block--${props.codeType || "html"}`)}>
        <div className="preview-code-block__bar">
          <span>{props.codeType === "js" ? "JavaScript" : props.codeType === "htmx" ? "HTMX" : "HTML"}</span>
          {props.codeType === "js" ? <small>Se ejecuta al exportar</small> : null}
        </div>
        {shouldRenderHtml ? (
          <div className="preview-code-block__render" dangerouslySetInnerHTML={{ __html: props.html || "" }} />
        ) : (
          <pre><code>{props.codeType === "js" ? props.js : props.html}</code></pre>
        )}
      </section>
    );
  }

  return <div className="preview-unknown">Bloque no soportado: {block.type}</div>;
}

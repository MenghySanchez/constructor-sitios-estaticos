import { slugify } from "../cms/siteDefaults";

// Esta funcion convierte strings separados por coma o barra en arrays para pintar links/cards.
function splitList(value, separator = ",") {
  return String(value || "")
    .split(separator)
    .map((item) => item.trim())
    .filter(Boolean);
}

// Esta funcion busca el formulario asociado a un bloque de formulario.
function findForm(site, formId) {
  return site.forms.find((form) => form.id === formId) || site.forms[0];
}

// Este componente renderiza un bloque dentro del canvas del admin.
// Es la version React del render estatico que luego se exporta como HTML.
export function ComponentRenderer({ block, site }) {
  const props = block.props || {};

  if (block.type === "hero") {
    return (
      <section className="preview-hero" style={{ "--accent": props.accent || "oklch(0.72 0.145 68)" }}>
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
      <section className={`preview-text preview-text--${props.align || "left"}`}>
        <p className="preview-kicker">{props.kicker}</p>
        <h2>{props.title}</h2>
        <p>{props.body}</p>
      </section>
    );
  }

  if (block.type === "image") {
    return (
      <figure className="preview-image">
        <img src={props.imageUrl} alt={props.alt} />
        <figcaption>{props.caption}</figcaption>
      </figure>
    );
  }

  if (block.type === "button") {
    return (
      <section className="preview-button-row">
        <a className={`preview-button preview-button--${props.style || "primary"}`} href={props.url}>
          {props.label}
        </a>
      </section>
    );
  }

  if (block.type === "features") {
    return (
      <section className="preview-features">
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
      <nav className="preview-navbar">
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
      <footer className="preview-footer">
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
      <section className="preview-form-section" id="contacto">
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

  return <div className="preview-unknown">Bloque no soportado: {block.type}</div>;
}

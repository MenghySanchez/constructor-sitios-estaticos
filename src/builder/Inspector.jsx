import { componentMap } from "../components-library/registry";

const advancedFields = [
  { name: "cssId", label: "ID CSS / metricas", type: "text" },
  { name: "cssClass", label: "Clase CSS", type: "text" },
  { name: "customCss", label: "CSS inline", type: "textarea" },
];

const columnFields = [
  { name: "width", label: "Ancho", type: "text" },
  { name: "minHeight", label: "Alto minimo px", type: "number" },
  { name: "padding", label: "Padding px", type: "number" },
  { name: "gap", label: "Gap px", type: "number" },
  { name: "alignItems", label: "Alinear vertical", type: "select", options: ["stretch", "start", "center", "end"] },
  { name: "justifyContent", label: "Justificar contenido", type: "select", options: ["start", "center", "end", "space-between"] },
  { name: "backgroundType", label: "Tipo de fondo", type: "select", options: ["color", "image", "gradient"] },
  { name: "background", label: "Fondo", type: "color" },
  { name: "backgroundImage", label: "Imagen de fondo", type: "asset" },
  { name: "backgroundGradient", label: "Degradado CSS", type: "textarea" },
  { name: "cssClass", label: "Clase CSS", type: "text" },
  { name: "customCss", label: "CSS inline", type: "textarea" },
];

const responsiveFieldNames = new Set([
  "layout",
  "direction",
  "columns",
  "gap",
  "paddingBlock",
  "paddingInline",
  "backgroundType",
  "background",
  "backgroundImage",
  "backgroundGradient",
  "align",
  "style",
  "accent",
  "customCss",
  "width",
  "minHeight",
  "padding",
  "alignItems",
  "justifyContent",
]);

function getResponsiveValue(props, fieldName, viewportMode) {
  if (viewportMode === "desktop" || !responsiveFieldNames.has(fieldName)) return props?.[fieldName];
  return props?.responsive?.[viewportMode]?.[fieldName] ?? props?.[fieldName];
}

// Este componente pinta el control correcto segun el tipo de campo del bloque.
function FieldControl({ field, value, site, onChange }) {
  if (field.type === "textarea") {
    return <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} rows={4} />;
  }

  if (field.type === "color") {
    return <input type="color" value={value || "#f6c453"} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.type === "number") {
    return <input type="number" min="0" value={value || ""} onChange={(event) => onChange(event.target.value)} />;
  }

  if (field.type === "select") {
    return (
      <select value={value || field.options[0]} onChange={(event) => onChange(event.target.value)}>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (field.type === "asset") {
    return (
      <>
        <input value={value || ""} onChange={(event) => onChange(event.target.value)} placeholder="https://..." />
        <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
          <option value="">Elegir de biblioteca</option>
          {site.assets.map((asset) => (
            <option key={asset.id} value={asset.url}>
              {asset.name}
            </option>
          ))}
        </select>
      </>
    );
  }

  if (field.type === "form") {
    return (
      <select value={value || ""} onChange={(event) => onChange(event.target.value)}>
        <option value="">Elegir formulario</option>
        {site.forms.map((form) => (
          <option key={form.id} value={form.id}>
            {form.name}
          </option>
        ))}
      </select>
    );
  }

  return <input value={value || ""} onChange={(event) => onChange(event.target.value)} />;
}

// El inspector permite editar props, mover, duplicar o borrar el bloque seleccionado.
export function Inspector({ block, site, viewportMode = "desktop", onBackToLibrary, onUpdateBlock, onDeleteBlock, onDuplicateBlock, onMoveBlock }) {
  const definition = block ? componentMap[block.type] : null;

  if (!block || !definition) {
    return (
      <aside className="cms-inspector">
        <div className="cms-panel-heading">
          <p className="cms-eyebrow">Inspector</p>
          <h2>Selecciona un bloque</h2>
        </div>
        <p className="cms-muted">Haz click en cualquier bloque del canvas para editar sus textos, links, imagenes y colores.</p>
      </aside>
    );
  }

  return (
    <aside className="cms-inspector">
      <div className="cms-panel-heading">
        <p className="cms-eyebrow">Inspector</p>
        <h2>{definition.label}</h2>
      </div>

      <button className="cms-panel-switch" type="button" onClick={onBackToLibrary}>
        Volver a elementos
      </button>

      {viewportMode !== "desktop" ? (
        <p className="cms-responsive-note" role="status">Editando overrides responsive: {viewportMode}</p>
      ) : null}

      <div className="cms-inspector__actions">
        <button type="button" onClick={() => onMoveBlock(block.id, -1)}>
          Subir
        </button>
        <button type="button" onClick={() => onMoveBlock(block.id, 1)}>
          Bajar
        </button>
        <button type="button" onClick={() => onDuplicateBlock(block.id)}>
          Duplicar
        </button>
        <button type="button" onClick={() => onDeleteBlock(block.id)}>
          Borrar
        </button>
      </div>

      <div className="cms-field-stack">
        {definition.fields.map((field) => (
          <label className="cms-field" key={field.name}>
            <span>{field.label}</span>
            <FieldControl
              field={field}
              site={site}
              value={getResponsiveValue(block.props, field.name, viewportMode)}
              onChange={(value) => onUpdateBlock(block.id, { [field.name]: value })}
            />
          </label>
        ))}

        <div className="cms-inspector__section-title">
          <p className="cms-eyebrow">Avanzado</p>
          <h3>CSS, ID y clases</h3>
        </div>

        {advancedFields.map((field) => (
          <label className="cms-field" key={field.name}>
            <span>{field.label}</span>
            <FieldControl
              field={field}
              site={site}
              value={getResponsiveValue(block.props, field.name, viewportMode)}
              onChange={(value) => onUpdateBlock(block.id, { [field.name]: value })}
            />
          </label>
        ))}
        <p className="cms-muted">CSS inline acepta declaraciones como: padding: 40px; border-radius: 24px;</p>
      </div>
    </aside>
  );
}

export function ColumnInspector({ column, parentBlock, site, viewportMode = "desktop", onBackToLibrary, onUpdateColumn }) {
  const parentDefinition = parentBlock ? componentMap[parentBlock.type] : null;
  const columnLabel = `Columna ${column.index + 1}`;

  return (
    <aside className="cms-inspector">
      <div className="cms-panel-heading">
        <p className="cms-eyebrow">Inspector</p>
        <h2>{columnLabel}</h2>
      </div>

      <button className="cms-panel-switch" type="button" onClick={onBackToLibrary}>
        Volver a elementos
      </button>

      {viewportMode !== "desktop" ? (
        <p className="cms-responsive-note" role="status">Editando overrides responsive: {viewportMode}</p>
      ) : null}

      <p className="cms-muted">Editando columna dentro de {parentDefinition?.label || parentBlock?.type || "contenedor"}.</p>

      <div className="cms-field-stack">
        {columnFields.map((field) => (
          <label className="cms-field" key={field.name}>
            <span>{field.label}</span>
            <FieldControl
              field={field}
              site={site}
              value={getResponsiveValue(column.props, field.name, viewportMode)}
              onChange={(value) => onUpdateColumn(parentBlock.id, column.index, { [field.name]: value })}
            />
          </label>
        ))}
        <p className="cms-muted">Ejemplos de ancho: 1fr, 2fr, 320px, 40%.</p>
      </div>
    </aside>
  );
}

import { componentMap } from "../components-library/registry";

// Este componente pinta el control correcto segun el tipo de campo del bloque.
function FieldControl({ field, value, site, onChange }) {
  if (field.type === "textarea") {
    return <textarea value={value || ""} onChange={(event) => onChange(event.target.value)} rows={4} />;
  }

  if (field.type === "color") {
    return <input type="color" value={value || "#f6c453"} onChange={(event) => onChange(event.target.value)} />;
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
export function Inspector({ block, site, onUpdateBlock, onDeleteBlock, onDuplicateBlock, onMoveBlock }) {
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
              value={block.props?.[field.name]}
              onChange={(value) => onUpdateBlock(block.id, { [field.name]: value })}
            />
          </label>
        ))}
      </div>
    </aside>
  );
}

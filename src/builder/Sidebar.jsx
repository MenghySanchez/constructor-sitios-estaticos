import { groupComponents } from "../components-library/registry";

// La sidebar muestra la biblioteca de bloques que se pueden arrastrar al canvas.
export function Sidebar({ insertionColumn, insertionColumnCount, insertionTargetLabel, onAddBlock, onSelectInsertionColumn }) {
  const groups = groupComponents();

  return (
    <aside className="cms-sidebar">
      <div className="cms-panel-heading">
        <p className="cms-eyebrow">Biblioteca</p>
        <h2>Bloques</h2>
      </div>

      {insertionTargetLabel ? (
        <div className="cms-insertion-target" role="status">
          <span>Insertando dentro de</span>
          <strong>{insertionTargetLabel}</strong>
          {insertionColumnCount > 1 ? (
            <div className="cms-column-targets" aria-label="Columna destino">
              {Array.from({ length: insertionColumnCount }).map((_, index) => (
                <button
                  aria-pressed={insertionColumn === index}
                  className={insertionColumn === index ? "is-active" : ""}
                  key={index}
                  type="button"
                  onClick={() => onSelectInsertionColumn(index)}
                >
                  Col {index + 1}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {Object.entries(groups).map(([groupName, components]) => (
        <section className="cms-block-group" key={groupName}>
          <h3>{groupName}</h3>
          <div className="cms-block-list">
            {components.map((component) => (
              <button
                className="cms-block-card"
                draggable
                key={component.type}
                type="button"
                onClick={() => onAddBlock(component.type)}
                onDragStart={(event) => {
                  event.dataTransfer.setData("component/type", component.type);
                  event.dataTransfer.effectAllowed = "copy";
                }}
              >
                <span>{component.label}</span>
                <small>{component.description}</small>
              </button>
            ))}
          </div>
        </section>
      ))}
    </aside>
  );
}

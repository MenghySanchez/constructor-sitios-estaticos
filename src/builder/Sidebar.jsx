import { groupComponents } from "../components-library/registry";

// La sidebar muestra la biblioteca de bloques que se pueden arrastrar al canvas.
export function Sidebar({ onAddBlock }) {
  const groups = groupComponents();

  return (
    <aside className="cms-sidebar">
      <div className="cms-panel-heading">
        <p className="cms-eyebrow">Biblioteca</p>
        <h2>Bloques</h2>
      </div>

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

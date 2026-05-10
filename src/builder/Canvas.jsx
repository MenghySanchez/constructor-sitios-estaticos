import { ComponentRenderer } from "../renderer/ComponentRenderer";

// El canvas recibe drops de la sidebar y pinta los bloques de la zona activa.
export function Canvas({ blocks, site, selectedBlockId, areaLabel, onDropBlock, onSelectBlock }) {
  return (
    <main
      aria-label={areaLabel}
      className="cms-canvas"
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(event) => {
        event.preventDefault();
        const type = event.dataTransfer.getData("component/type");
        if (type) onDropBlock(type);
      }}
    >
      <div className="cms-canvas__chrome">
        <span />
        <span />
        <span />
        <strong>{areaLabel}</strong>
      </div>

      <div className="cms-page-preview">
        {blocks.length === 0 ? (
          <div className="cms-empty-dropzone">
            <p>Arrastra un bloque aqui</p>
            <small>Tambien puedes hacer click en un bloque de la biblioteca.</small>
          </div>
        ) : (
          blocks.map((block) => (
            <button
              aria-label={`Editar bloque ${block.type}`}
              className={`cms-rendered-block ${selectedBlockId === block.id ? "is-selected" : ""}`}
              key={block.id}
              type="button"
              onClick={() => onSelectBlock(block.id)}
            >
              <ComponentRenderer block={block} site={site} />
            </button>
          ))
        )}
      </div>
    </main>
  );
}

import { ComponentRenderer } from "../renderer/ComponentRenderer";

const parentBlockTypes = new Set(["section", "container", "innerSection"]);

function RenderedBlock({ block, site, selectedBlockId, onDropBlock, onSelectBlock }) {
  const isSelected = selectedBlockId === block.id;

  function selectCurrentBlock() {
    onSelectBlock(block.id);
  }

  return (
    <div
      aria-label={`Editar bloque ${block.type}`}
      className={`cms-rendered-block ${isSelected ? "is-selected" : ""}`}
      role="button"
      tabIndex={0}
      onClick={(event) => {
        event.stopPropagation();
        selectCurrentBlock();
      }}
      onDragOver={(event) => {
        if (parentBlockTypes.has(block.type)) {
          event.preventDefault();
          event.stopPropagation();
          event.dataTransfer.dropEffect = "copy";
        }
      }}
      onDrop={(event) => {
        if (!parentBlockTypes.has(block.type)) return;

        event.preventDefault();
        event.stopPropagation();
        const type = event.dataTransfer.getData("component/type");
        if (type) onDropBlock(type, block.id);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectCurrentBlock();
        }
      }}
    >
      <ComponentRenderer block={block} site={site}>
        {(block.children || []).map((childBlock) => (
          <RenderedBlock
            block={childBlock}
            key={childBlock.id}
            selectedBlockId={selectedBlockId}
            site={site}
            onDropBlock={onDropBlock}
            onSelectBlock={onSelectBlock}
          />
        ))}
      </ComponentRenderer>
    </div>
  );
}

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
            <RenderedBlock
              block={block}
              key={block.id}
              selectedBlockId={selectedBlockId}
              site={site}
              onDropBlock={onDropBlock}
              onSelectBlock={onSelectBlock}
            />
          ))
        )}
      </div>
    </main>
  );
}

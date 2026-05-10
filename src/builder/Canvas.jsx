import { ComponentRenderer } from "../renderer/ComponentRenderer";

const parentBlockTypes = new Set(["section", "container", "innerSection"]);

function getColumnCount(block) {
  if (!parentBlockTypes.has(block?.type)) return 0;
  const columns = Number.parseInt(block.props?.columns || "1", 10);
  return Math.max(1, Number.isFinite(columns) ? columns : 1);
}

function clampColumn(column, columnCount) {
  const parsed = Number.parseInt(column, 10);
  if (!Number.isFinite(parsed)) return 0;
  return Math.min(Math.max(parsed, 0), Math.max(columnCount - 1, 0));
}

function groupBlocksByColumn(blocks, columnCount) {
  return Array.from({ length: columnCount }, (_, index) => blocks.filter((block) => clampColumn(block.column || 0, columnCount) === index));
}

function RenderedBlock({ block, site, selectedBlockId, onDropBlock, onSelectBlock }) {
  const isSelected = selectedBlockId === block.id;
  const columnCount = getColumnCount(block);
  const columnGroups = groupBlocksByColumn(block.children || [], columnCount);

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
        if (type) onDropBlock(type, block.id, 0);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          selectCurrentBlock();
        }
      }}
    >
      <ComponentRenderer block={block} site={site}>
        {columnCount
          ? columnGroups.map((columnBlocks, columnIndex) => (
              <div
                className="cms-builder-column"
                key={`${block.id}-column-${columnIndex}`}
                onClick={(event) => event.stopPropagation()}
                onDragOver={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  event.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  const type = event.dataTransfer.getData("component/type");
                  if (type) onDropBlock(type, block.id, columnIndex);
                }}
              >
                <div className="cms-builder-column__label">Columna {columnIndex + 1}</div>
                {columnBlocks.length ? (
                  columnBlocks.map((childBlock) => (
                    <RenderedBlock
                      block={childBlock}
                      key={childBlock.id}
                      selectedBlockId={selectedBlockId}
                      site={site}
                      onDropBlock={onDropBlock}
                      onSelectBlock={onSelectBlock}
                    />
                  ))
                ) : (
                  <div className="cms-builder-column__empty">Arrastra aqui</div>
                )}
              </div>
            ))
          : null}
      </ComponentRenderer>
    </div>
  );
}

// El canvas recibe drops de la sidebar y pinta los bloques de la zona activa.
export function Canvas({ blocks, site, viewportWidth, selectedBlockId, areaLabel, onDropBlock, onSelectBlock }) {
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

      <div className="cms-page-preview" style={{ "--cms-preview-width": `${viewportWidth || 1200}px` }}>
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

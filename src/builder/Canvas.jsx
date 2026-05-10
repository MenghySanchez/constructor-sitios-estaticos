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

function getBackgroundStyle(props = {}) {
  if (props.backgroundType === "image" && props.backgroundImage) {
    return `linear-gradient(oklch(0.18 0.018 74 / 0.12), oklch(0.18 0.018 74 / 0.12)), url("${props.backgroundImage}") center / cover`;
  }

  if (props.backgroundType === "gradient" && props.backgroundGradient) return props.backgroundGradient;

  return props.background;
}

function toCssNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? `${parsed}px` : undefined;
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

function getColumnStyle(columnProps = {}) {
  return {
    minHeight: toCssNumber(columnProps.minHeight),
    padding: toCssNumber(columnProps.padding),
    gap: toCssNumber(columnProps.gap),
    alignContent: columnProps.alignItems,
    justifyContent: columnProps.justifyContent,
    background: getBackgroundStyle(columnProps),
    ...parseCssDeclarations(columnProps.customCss),
  };
}

function RenderedBlock({ block, site, selectedBlockId, selectedColumn, onDropBlock, onSelectBlock, onSelectColumn }) {
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
                className={`cms-builder-column ${selectedColumn?.parentId === block.id && selectedColumn?.index === columnIndex ? "is-selected" : ""} ${block.props?.columnSettings?.[columnIndex]?.cssClass || ""}`}
                key={`${block.id}-column-${columnIndex}`}
                style={getColumnStyle(block.props?.columnSettings?.[columnIndex])}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectColumn(block.id, columnIndex);
                }}
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
                      selectedColumn={selectedColumn}
                      site={site}
                      onDropBlock={onDropBlock}
                      onSelectBlock={onSelectBlock}
                      onSelectColumn={onSelectColumn}
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
export function Canvas({ blocks, site, viewportWidth, selectedBlockId, selectedColumn, areaLabel, onDropBlock, onSelectBlock, onSelectColumn }) {
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
              selectedColumn={selectedColumn}
              site={site}
              onDropBlock={onDropBlock}
              onSelectBlock={onSelectBlock}
              onSelectColumn={onSelectColumn}
            />
          ))
        )}
      </div>
    </main>
  );
}

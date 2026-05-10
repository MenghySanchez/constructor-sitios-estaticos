import { useEffect, useState } from "react";
import { createId, slugify } from "../cms/siteDefaults";
import { componentMap, createBlock } from "../components-library/registry";
import { buildStaticPage } from "../exporter/staticExporter";
import { createAsset, createDefaultSite, createField, createForm, createPage, exportPage, loadSite, saveSite } from "../store/builderStore";
import { Canvas } from "./Canvas";
import { ColumnInspector, Inspector } from "./Inspector";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";

// Esta lista define las secciones principales del admin tipo WordPress.
const adminViews = [
  { id: "dashboard", label: "Dashboard", short: "D" },
  { id: "pages", label: "Paginas", short: "P" },
  { id: "builder", label: "Builder", short: "B" },
  { id: "header", label: "Header", short: "H" },
  { id: "navbar", label: "Navbar", short: "N" },
  { id: "footer", label: "Footer", short: "F" },
  { id: "head", label: "Head / Tracking", short: "HT" },
  { id: "media", label: "Biblioteca", short: "M" },
  { id: "forms", label: "Formularios", short: "Fo" },
];

const parentBlockTypes = new Set(["section", "container", "innerSection"]);
const viewportPresets = {
  desktop: { label: "Computadora", width: 1200 },
  laptop: { label: "Laptop", width: 1024 },
  mobile: { label: "Mobile", width: 390 },
  custom: { label: "Custom", width: 768 },
};

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

function findBlockById(blocks, blockId) {
  for (const block of blocks) {
    if (block.id === blockId) return block;
    const childBlock = findBlockById(block.children || [], blockId);
    if (childBlock) return childBlock;
  }

  return null;
}

function findBlockContext(blocks, blockId, parent = null) {
  for (const block of blocks) {
    if (block.id === blockId) return { block, parent };
    const childContext = findBlockContext(block.children || [], blockId, block);
    if (childContext) return childContext;
  }

  return null;
}

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

function splitResponsivePatch(patch) {
  return Object.entries(patch).reduce(
    (groups, [key, value]) => {
      const target = responsiveFieldNames.has(key) ? "responsive" : "base";
      return { ...groups, [target]: { ...groups[target], [key]: value } };
    },
    { base: {}, responsive: {} },
  );
}

function mapBlocks(blocks, mapper) {
  return blocks.map((block) => mapper({ ...block, children: mapBlocks(block.children || [], mapper) }));
}

function addBlockToParent(blocks, parentId, blockToAdd, column = 0) {
  if (!parentId) return [...blocks, { ...blockToAdd, column: 0 }];

  return mapBlocks(blocks, (block) => {
    if (block.id !== parentId) return block;
    const targetColumn = clampColumn(column, getColumnCount(block));
    return { ...block, children: [...(block.children || []), { ...blockToAdd, column: targetColumn }] };
  });
}

function removeBlockById(blocks, blockId) {
  return blocks
    .filter((block) => block.id !== blockId)
    .map((block) => ({ ...block, children: removeBlockById(block.children || [], blockId) }));
}

function duplicateBlockById(blocks, blockId) {
  return blocks.flatMap((block) => {
    const children = duplicateBlockById(block.children || [], blockId);
    const nextBlock = { ...block, children };

    if (block.id !== blockId) return [nextBlock];

    return [nextBlock, cloneBlockWithNewIds(nextBlock)];
  });
}

function cloneBlockWithNewIds(block) {
  return {
    ...block,
    id: createId("block"),
    props: { ...block.props },
    children: (block.children || []).map(cloneBlockWithNewIds),
  };
}

function moveBlockById(blocks, blockId, direction) {
  const index = blocks.findIndex((block) => block.id === blockId);

  if (index >= 0) {
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= blocks.length) return blocks;

    const nextBlocks = [...blocks];
    const [removed] = nextBlocks.splice(index, 1);
    nextBlocks.splice(nextIndex, 0, removed);
    return nextBlocks;
  }

  return blocks.map((block) => ({ ...block, children: moveBlockById(block.children || [], blockId, direction) }));
}

function getBlockLabel(block) {
  return componentMap[block.type]?.label || block.type;
}

function StructureBranch({ blocks, selectedBlockId, selectedColumn, onSelectBlock, onSelectColumn }) {
  if (!blocks.length) return <p className="cms-structure-empty">Sin elementos todavia.</p>;

  return (
    <ol className="cms-structure-list">
      {blocks.map((block) => {
        const children = block.children || [];
        const columnCount = getColumnCount(block);
        const columnGroups = groupBlocksByColumn(children, columnCount);

        return (
          <li key={block.id}>
            <button
              aria-current={selectedBlockId === block.id ? "true" : undefined}
              className={selectedBlockId === block.id ? "is-active" : ""}
              type="button"
              onClick={() => onSelectBlock(block.id)}
            >
              <span aria-hidden="true" />
              {getBlockLabel(block)}
            </button>

            {columnCount ? (
              <ol className="cms-structure-list cms-structure-list--columns">
                {Array.from({ length: columnCount }).map((_, index) => (
                  <li key={`${block.id}-column-${index}`}>
                    <button
                      aria-current={selectedColumn?.parentId === block.id && selectedColumn?.index === index ? "true" : undefined}
                      className={`cms-structure-column ${selectedColumn?.parentId === block.id && selectedColumn?.index === index ? "is-active" : ""}`}
                      type="button"
                      onClick={() => onSelectColumn(block.id, index)}
                    >
                      <span aria-hidden="true" />Columna {index + 1}
                    </button>
                    <StructureBranch
                      blocks={columnGroups[index]}
                      selectedBlockId={selectedBlockId}
                      selectedColumn={selectedColumn}
                      onSelectBlock={onSelectBlock}
                      onSelectColumn={onSelectColumn}
                    />
                  </li>
                ))}
              </ol>
            ) : children.length ? (
              <StructureBranch blocks={children} selectedBlockId={selectedBlockId} selectedColumn={selectedColumn} onSelectBlock={onSelectBlock} onSelectColumn={onSelectColumn} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

// Esta funcion devuelve el nombre legible de la zona editada.
function getAreaLabel(activeView, activePage) {
  if (activeView === "header") return "Seccion global: Header";
  if (activeView === "navbar") return "Seccion global: Navbar";
  if (activeView === "footer") return "Seccion global: Footer";
  return `Pagina: ${activePage?.title || "Sin pagina"}`;
}

// Esta funcion calcula que array de bloques se esta editando en este momento.
function getActiveBlocks(site, activeView, activePage) {
  if (activeView === "header") return site.shared.headerBlocks;
  if (activeView === "navbar") return site.shared.navbarBlocks;
  if (activeView === "footer") return site.shared.footerBlocks;
  return activePage?.blocks || [];
}

// Esta funcion prepara el HTML exportado para verlo dentro de un iframe srcdoc.
// Reemplaza archivos relativos por CSS/JS inline porque el preview no escribe archivos.
function buildPreviewSrcDoc(site, pageId) {
  const output = buildStaticPage(site, pageId);
  const safeScript = output.files["script.js"].replaceAll("</script", "<\\/script");

  return output.files["index.html"]
    .replace('<link rel="stylesheet" href="./styles.css">', `<style>${output.files["styles.css"]}</style>`)
    .replace('<script src="./script.js"></script>', `<script>${safeScript}</script>`);
}

// Builder es el componente principal: administra estado, navegacion y acciones del CMS.
export function Builder({ project, onBackToProjects, onLogout }) {
  const [site, setSite] = useState(createDefaultSite);
  const [activeView, setActiveView] = useState("builder");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [status, setStatus] = useState("Cargando datos...");
  const [assetDraft, setAssetDraft] = useState({ name: "", url: "" });
  const [newPageTitle, setNewPageTitle] = useState("Nueva landing");
  const [isAdminNavCollapsed, setIsAdminNavCollapsed] = useState(false);
  const [builderPanel, setBuilderPanel] = useState("library");
  const [insertionColumn, setInsertionColumn] = useState(0);
  const [selectedColumn, setSelectedColumn] = useState(null);
  const [structureOpen, setStructureOpen] = useState(false);
  const [editorViewport, setEditorViewport] = useState({ mode: "desktop", customWidth: "768" });
  const [preview, setPreview] = useState({ open: false, device: "desktop", srcDoc: "" });

  const activePage = site.pages.find((page) => page.id === site.currentPageId) || site.pages[0];
  const activeBlocks = getActiveBlocks(site, activeView, activePage);
  const selectedContext = findBlockContext(activeBlocks, selectedBlockId);
  const selectedBlock = findBlockById(activeBlocks, selectedBlockId);
  const selectedColumnParent = selectedColumn ? findBlockById(activeBlocks, selectedColumn.parentId) : null;
  const selectedColumnProps = selectedColumnParent?.props?.columnSettings?.[selectedColumn.index] || {};
  const isBuilderView = ["builder", "header", "navbar", "footer"].includes(activeView);
  const insertionParent = selectedColumnParent || (parentBlockTypes.has(selectedBlock?.type) ? selectedBlock : selectedContext?.parent);
  const insertionColumnCount = getColumnCount(insertionParent);
  const activeInsertionColumn = selectedColumn ? selectedColumn.index : insertionParent ? clampColumn(insertionColumn, insertionColumnCount || 1) : 0;
  const insertionTargetLabel = insertionParent ? getBlockLabel(insertionParent) : "";
  const viewportWidth = editorViewport.mode === "custom" ? Number.parseInt(editorViewport.customWidth || "768", 10) || 768 : viewportPresets[editorViewport.mode].width;

  // Al montar el admin, se carga el site.json del proyecto seleccionado.
  useEffect(() => {
    let ignore = false;

    loadSite(project.id)
      .then((loadedSite) => {
        if (!ignore) {
          setSite(loadedSite);
          setStatus(`Datos cargados desde cms-data/projects/${project.slug}/site.json`);
        }
      })
      .catch((error) => {
        if (!ignore) setStatus(error.message);
      });

    return () => {
      ignore = true;
    };
  }, [project.id, project.slug]);

  useEffect(() => {
    if (!preview.open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setPreview({ open: false, device: "desktop", srcDoc: "" });
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [preview.open]);

  // Esta funcion reemplaza los bloques de la zona activa sin tocar otras secciones.
  function updateActiveBlocks(nextBlocks) {
    setSite((currentSite) => {
      if (activeView === "header") {
        return { ...currentSite, shared: { ...currentSite.shared, headerBlocks: nextBlocks } };
      }

      if (activeView === "navbar") {
        return { ...currentSite, shared: { ...currentSite.shared, navbarBlocks: nextBlocks } };
      }

      if (activeView === "footer") {
        return { ...currentSite, shared: { ...currentSite.shared, footerBlocks: nextBlocks } };
      }

      return {
        ...currentSite,
        pages: currentSite.pages.map((page) => (page.id === currentSite.currentPageId ? { ...page, blocks: nextBlocks } : page)),
      };
    });
  }

  // Esta funcion inserta un bloque nuevo cuando se hace click o drop desde la sidebar.
  function handleAddBlock(type, parentId = "", column = activeInsertionColumn) {
    const block = createBlock(type);
    const targetParent = parentId ? findBlockById(activeBlocks, parentId) : insertionParent;
    const targetParentId = targetParent?.id || "";
    const targetColumn = targetParentId ? clampColumn(column, getColumnCount(targetParent)) : 0;
    updateActiveBlocks(addBlockToParent(activeBlocks, targetParentId, block, targetColumn));
    setSelectedBlockId(block.id);
    setSelectedColumn(null);
    setInsertionColumn(targetColumn);
    setBuilderPanel("settings");
    setStatus(targetParentId ? `Bloque agregado en columna ${targetColumn + 1}: ${type}` : `Bloque agregado: ${type}`);
  }

  function handleSelectBlock(blockId) {
    const context = findBlockContext(activeBlocks, blockId);
    setSelectedBlockId(blockId);
    setSelectedColumn(null);
    setInsertionColumn(clampColumn(context?.block?.column || 0, getColumnCount(context?.parent) || 1));
    setBuilderPanel("settings");
  }

  function handleSelectColumn(parentId, columnIndex) {
    const parent = findBlockById(activeBlocks, parentId);
    const safeColumn = clampColumn(columnIndex, getColumnCount(parent));
    setSelectedBlockId("");
    setSelectedColumn({ parentId, index: safeColumn });
    setInsertionColumn(safeColumn);
    setBuilderPanel("settings");
  }

  function handleUpdateColumn(parentId, columnIndex, patch) {
    const { base, responsive } = splitResponsivePatch(patch);

    updateActiveBlocks(
      mapBlocks(activeBlocks, (block) => {
        if (block.id !== parentId) return block;
        const currentSettings = block.props?.columnSettings || {};
        const currentColumnSettings = currentSettings[columnIndex] || {};
        const nextColumnSettings =
          editorViewport.mode === "desktop"
            ? { ...currentColumnSettings, ...base, ...responsive }
            : {
                ...currentColumnSettings,
                ...base,
                responsive: {
                  ...(currentColumnSettings.responsive || {}),
                  [editorViewport.mode]: {
                    ...(currentColumnSettings.responsive?.[editorViewport.mode] || {}),
                    ...responsive,
                  },
                },
              };

        return {
          ...block,
          props: {
            ...block.props,
            columnSettings: {
              ...currentSettings,
              [columnIndex]: nextColumnSettings,
            },
          },
        };
      }),
    );
  }

  // Esta funcion actualiza props del bloque seleccionado desde el inspector.
  function handleUpdateBlock(blockId, patch) {
    const { base, responsive } = splitResponsivePatch(patch);

    updateActiveBlocks(
      mapBlocks(activeBlocks, (block) => {
        if (block.id !== blockId) return block;

        if (editorViewport.mode === "desktop") {
          return { ...block, props: { ...block.props, ...base, ...responsive } };
        }

        return {
          ...block,
          props: {
            ...block.props,
            ...base,
            responsive: {
              ...(block.props?.responsive || {}),
              [editorViewport.mode]: {
                ...(block.props?.responsive?.[editorViewport.mode] || {}),
                ...responsive,
              },
            },
          },
        };
      }),
    );
  }

  // Esta funcion borra un bloque de la zona activa.
  function handleDeleteBlock(blockId) {
    updateActiveBlocks(removeBlockById(activeBlocks, blockId));
    setSelectedBlockId("");
    setSelectedColumn(null);
    setBuilderPanel("library");
  }

  // Esta funcion duplica un bloque conservando sus props.
  function handleDuplicateBlock(blockId) {
    const block = activeBlocks.find((item) => item.id === blockId);
    const nestedBlock = block || findBlockById(activeBlocks, blockId);
    if (!nestedBlock) return;

    updateActiveBlocks(duplicateBlockById(activeBlocks, blockId));
  }

  // Esta funcion mueve bloques arriba o abajo sin salir del canvas.
  function handleMoveBlock(blockId, direction) {
    updateActiveBlocks(moveBlockById(activeBlocks, blockId, direction));
  }

  // Esta funcion persiste manualmente el estado completo del CMS.
  async function handleSave() {
    setStatus("Guardando...");
    try {
      const savedSite = await saveSite(project.id, site);
      setSite(savedSite);
      setStatus(`Guardado en cms-data/projects/${project.slug}/site.json`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  // Esta funcion genera los archivos estaticos de la pagina activa.
  async function handleExport() {
    setStatus("Publicando archivos estaticos...");
    try {
      const payload = await exportPage(project.id, site, activePage.id);
      setStatus(`Publicado en ${payload.path}`);
    } catch (error) {
      setStatus(error.message);
    }
  }

  // Esta funcion abre una vista previa de la landing usando el HTML final generado.
  function handlePreview() {
    if (!activePage) return;

    setPreview({
      open: true,
      device: "desktop",
      srcDoc: buildPreviewSrcDoc(site, activePage.id),
    });
    setStatus(`Vista previa generada para ${activePage.title}`);
  }

  // Esta funcion cierra el modal y libera el srcdoc para no conservar HTML viejo.
  function closePreview() {
    setPreview({ open: false, device: "desktop", srcDoc: "" });
  }

  // Esta funcion renderiza el modal de vista previa con modos desktop/mobile.
  function renderPreviewModal() {
    if (!preview.open) return null;

    return (
      <section className="preview-modal" aria-label="Vista previa de landing" role="dialog" aria-modal="true">
        <div className="preview-modal__bar">
          <div>
            <p className="cms-eyebrow">Vista previa</p>
            <h2>{activePage?.title}</h2>
          </div>
          <div className="preview-modal__actions">
            <button
              aria-pressed={preview.device === "desktop"}
              className={`cms-button ${preview.device === "desktop" ? "cms-button--primary" : "cms-button--secondary"}`}
              type="button"
              onClick={() => setPreview((currentPreview) => ({ ...currentPreview, device: "desktop" }))}
            >
              Desktop
            </button>
            <button
              aria-pressed={preview.device === "mobile"}
              className={`cms-button ${preview.device === "mobile" ? "cms-button--primary" : "cms-button--secondary"}`}
              type="button"
              onClick={() => setPreview((currentPreview) => ({ ...currentPreview, device: "mobile" }))}
            >
              Mobile
            </button>
            <button className="cms-button cms-button--ghost" type="button" onClick={closePreview}>
              Cerrar
            </button>
          </div>
        </div>

        <div className={`preview-modal__stage preview-modal__stage--${preview.device}`}>
          <iframe
            className="preview-modal__frame"
            sandbox="allow-forms allow-same-origin allow-scripts"
            srcDoc={preview.srcDoc}
            title={`Vista previa de ${activePage?.title || "landing"}`}
          />
        </div>
      </section>
    );
  }

  // Esta funcion crea una pagina nueva y la selecciona para editar.
  function handleCreatePage() {
    const page = createPage(newPageTitle);
    setSite((currentSite) => ({
      ...currentSite,
      pages: [...currentSite.pages, page],
      currentPageId: page.id,
    }));
    setNewPageTitle("Nueva landing");
    setActiveView("builder");
    setSelectedBlockId("");
    setSelectedColumn(null);
    setBuilderPanel("library");
  }

  // Esta funcion actualiza metadatos de una pagina.
  function updatePage(pageId, patch) {
    setSite((currentSite) => ({
      ...currentSite,
      pages: currentSite.pages.map((page) => (page.id === pageId ? { ...page, ...patch } : page)),
    }));
  }

  // Esta funcion selecciona una pagina para editarla en el builder.
  function selectPage(pageId) {
    setSite((currentSite) => ({ ...currentSite, currentPageId: pageId }));
    setActiveView("builder");
    setSelectedBlockId("");
    setSelectedColumn(null);
    setBuilderPanel("library");
  }

  // Esta funcion agrega una URL externa a la biblioteca de medios.
  function handleAddAsset() {
    if (!assetDraft.url.trim()) return;

    setSite((currentSite) => ({
      ...currentSite,
      assets: [...currentSite.assets, createAsset(assetDraft)],
    }));
    setAssetDraft({ name: "", url: "" });
  }

  // Esta funcion actualiza una propiedad general del sitio.
  function updateSettings(patch) {
    setSite((currentSite) => ({ ...currentSite, settings: { ...currentSite.settings, ...patch } }));
  }

  // Esta funcion actualiza un formulario reutilizable.
  function updateForm(formId, patch) {
    setSite((currentSite) => ({
      ...currentSite,
      forms: currentSite.forms.map((form) => (form.id === formId ? { ...form, ...patch } : form)),
    }));
  }

  // Esta funcion actualiza un campo dentro de un formulario.
  function updateFormField(formId, fieldId, patch) {
    setSite((currentSite) => ({
      ...currentSite,
      forms: currentSite.forms.map((form) =>
        form.id === formId
          ? {
              ...form,
              fields: form.fields.map((field) => (field.id === fieldId ? { ...field, ...patch } : field)),
            }
          : form,
      ),
    }));
  }

  // Esta funcion muestra el dashboard inicial con el resumen del piloto.
  function renderDashboard() {
    return (
      <section className="cms-content cms-dashboard">
        <div className="cms-hero-card">
          <p className="cms-eyebrow">Piloto CMS</p>
          <h2>Constructor visual para landings estaticas</h2>
          <p>
            Arrastra bloques, edita paginas, guarda datos en JSON y publica carpetas listas para subir a tu servidor.
          </p>
          <button className="cms-button cms-button--primary" type="button" onClick={() => setActiveView("builder")}>
            Abrir builder
          </button>
        </div>
        <div className="cms-stat-grid">
          <article><strong>{site.pages.length}</strong><span>Paginas</span></article>
          <article><strong>{site.assets.length}</strong><span>Archivos</span></article>
          <article><strong>{site.forms.length}</strong><span>Formularios</span></article>
        </div>
      </section>
    );
  }

  // Esta funcion muestra el listado de paginas y sus metadatos editables.
  function renderPages() {
    return (
      <section className="cms-content">
        <div className="cms-section-title">
          <div>
            <p className="cms-eyebrow">Paginas</p>
            <h2>Landings del sitio</h2>
          </div>
          <div className="cms-inline-form">
            <label className="cms-compact-field">
              <span>Titulo nuevo</span>
              <input value={newPageTitle} onChange={(event) => setNewPageTitle(event.target.value)} />
            </label>
            <button className="cms-button cms-button--primary" type="button" onClick={handleCreatePage}>Crear</button>
          </div>
        </div>

        <div className="cms-table-list">
          {site.pages.map((page) => (
            <article className="cms-page-row" key={page.id}>
              <div>
                <label className="cms-compact-field">
                  <span>Titulo</span>
                  <input value={page.title} onChange={(event) => updatePage(page.id, { title: event.target.value })} />
                </label>
                <label className="cms-compact-field">
                  <span>Slug</span>
                  <input value={page.slug} onChange={(event) => updatePage(page.id, { slug: slugify(event.target.value) })} />
                </label>
                <label className="cms-compact-field">
                  <span>Descripcion SEO</span>
                  <textarea value={page.description || ""} onChange={(event) => updatePage(page.id, { description: event.target.value })} rows={2} />
                </label>
              </div>
              <button className="cms-button cms-button--secondary" type="button" onClick={() => selectPage(page.id)}>Editar</button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  // Esta funcion muestra el editor de head, CSS y JS global.
  function renderHeadSettings() {
    return (
      <section className="cms-content cms-settings-grid">
        <label className="cms-field">
          <span>Nombre del sitio</span>
          <input value={site.settings.siteName} onChange={(event) => updateSettings({ siteName: event.target.value })} />
        </label>
        <label className="cms-field">
          <span>Head / tracking pixels</span>
          <textarea value={site.settings.trackingHead} onChange={(event) => updateSettings({ trackingHead: event.target.value })} rows={8} />
        </label>
        <label className="cms-field">
          <span>CSS global exportado</span>
          <textarea value={site.settings.globalCss} onChange={(event) => updateSettings({ globalCss: event.target.value })} rows={8} />
        </label>
        <label className="cms-field">
          <span>JS global exportado</span>
          <textarea value={site.settings.globalJs} onChange={(event) => updateSettings({ globalJs: event.target.value })} rows={8} />
        </label>
      </section>
    );
  }

  // Esta funcion muestra la biblioteca simple de imagenes/archivos por URL.
  function renderMedia() {
    return (
      <section className="cms-content">
        <div className="cms-section-title">
          <div>
            <p className="cms-eyebrow">Biblioteca</p>
            <h2>Imagenes y archivos</h2>
          </div>
          <div className="cms-inline-form">
            <label className="cms-compact-field">
              <span>Nombre</span>
              <input value={assetDraft.name} onChange={(event) => setAssetDraft({ ...assetDraft, name: event.target.value })} />
            </label>
            <label className="cms-compact-field cms-compact-field--wide">
              <span>URL del archivo</span>
              <input type="url" value={assetDraft.url} onChange={(event) => setAssetDraft({ ...assetDraft, url: event.target.value })} />
            </label>
            <button className="cms-button cms-button--primary" type="button" onClick={handleAddAsset}>Agregar</button>
          </div>
        </div>
        <div className="cms-media-grid">
          {site.assets.map((asset) => (
            <article className="cms-media-card" key={asset.id}>
              <img src={asset.url} alt={asset.name} />
              <strong>{asset.name}</strong>
              <small>{asset.url}</small>
            </article>
          ))}
        </div>
      </section>
    );
  }

  // Esta funcion muestra el constructor basico de formularios HTMX.
  function renderForms() {
    return (
      <section className="cms-content">
        <div className="cms-section-title">
          <div>
            <p className="cms-eyebrow">Formularios</p>
            <h2>Captura de leads</h2>
          </div>
          <button
            className="cms-button cms-button--primary"
            type="button"
            onClick={() => setSite((currentSite) => ({ ...currentSite, forms: [...currentSite.forms, createForm()] }))}
          >
            Nuevo formulario
          </button>
        </div>

        <div className="cms-form-list">
          {site.forms.map((form) => (
            <article className="cms-form-card" key={form.id}>
              <div className="cms-form-card__head">
                <label className="cms-compact-field">
                  <span>Nombre</span>
                  <input value={form.name} onChange={(event) => updateForm(form.id, { name: event.target.value })} />
                </label>
                <label className="cms-compact-field">
                  <span>Endpoint</span>
                  <input value={form.hxPost} onChange={(event) => updateForm(form.id, { hxPost: event.target.value })} />
                </label>
                <label className="cms-compact-field">
                  <span>Boton</span>
                  <input value={form.submitLabel} onChange={(event) => updateForm(form.id, { submitLabel: event.target.value })} />
                </label>
              </div>
              <div className="cms-field-list">
                {form.fields.map((field) => (
                  <div className="cms-field-row" key={field.id}>
                    <label className="cms-compact-field">
                      <span>Etiqueta</span>
                      <input value={field.label} onChange={(event) => updateFormField(form.id, field.id, { label: event.target.value })} />
                    </label>
                    <label className="cms-compact-field">
                      <span>Name</span>
                      <input value={field.name} onChange={(event) => updateFormField(form.id, field.id, { name: event.target.value })} />
                    </label>
                    <label className="cms-compact-field">
                      <span>Tipo</span>
                      <select value={field.type} onChange={(event) => updateFormField(form.id, field.id, { type: event.target.value })}>
                        <option value="text">text</option>
                        <option value="email">email</option>
                        <option value="tel">tel</option>
                        <option value="number">number</option>
                      </select>
                    </label>
                    <label className="cms-check">
                      <input type="checkbox" checked={field.required} onChange={(event) => updateFormField(form.id, field.id, { required: event.target.checked })} />
                      requerido
                    </label>
                  </div>
                ))}
              </div>
              <button
                className="cms-button cms-button--secondary"
                type="button"
                onClick={() => updateForm(form.id, { fields: [...form.fields, createField()] })}
              >
                Agregar campo
              </button>
            </article>
          ))}
        </div>
      </section>
    );
  }

  // Esta funcion renderiza la pantalla activa cuando no estamos en el canvas.
  function renderActiveView() {
    if (activeView === "dashboard") return renderDashboard();
    if (activeView === "pages") return renderPages();
    if (activeView === "head") return renderHeadSettings();
    if (activeView === "media") return renderMedia();
    if (activeView === "forms") return renderForms();
    return null;
  }

  function renderStructurePanel() {
    if (!structureOpen) return null;

    return (
      <aside className="cms-structure-panel" aria-label="Estructura del sitio">
        <div className="cms-structure-panel__head">
          <div>
            <p className="cms-eyebrow">Estructura</p>
            <h2>{getAreaLabel(activeView, activePage)}</h2>
          </div>
          <button aria-label="Cerrar estructura" className="cms-structure-close" type="button" onClick={() => setStructureOpen(false)}>
            <span aria-hidden="true" />
          </button>
        </div>
        <StructureBranch
          blocks={activeBlocks}
          selectedBlockId={selectedBlockId}
          selectedColumn={selectedColumn}
          onSelectBlock={handleSelectBlock}
          onSelectColumn={handleSelectColumn}
        />
      </aside>
    );
  }

  function renderViewportControls() {
    return (
      <div className="cms-viewport-bar" aria-label="Ancho del editor">
        <div>
          <p className="cms-eyebrow">Vista</p>
          <strong>{viewportWidth}px</strong>
        </div>
        <div className="cms-viewport-actions">
          {Object.entries(viewportPresets).map(([mode, preset]) => (
            <button
              aria-pressed={editorViewport.mode === mode}
              className={editorViewport.mode === mode ? "is-active" : ""}
              key={mode}
              type="button"
              onClick={() => setEditorViewport((currentViewport) => ({ ...currentViewport, mode }))}
            >
              {preset.label}
            </button>
          ))}
          <label className="cms-viewport-custom">
            <span>Ancho</span>
            <input
              min="320"
              max="1600"
              type="number"
              value={editorViewport.customWidth}
              onChange={(event) => setEditorViewport({ mode: "custom", customWidth: event.target.value })}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <>
      <a className="skip-link" href="#main-content">Saltar al contenido</a>
      <div className={`cms-shell ${isAdminNavCollapsed ? "cms-shell--nav-collapsed" : ""}`}>
        <aside className="cms-admin-nav">
          <div className="cms-brand-row">
            <div className="cms-brand">
              <span>SB</span>
              <div className="cms-brand__text">
                <strong>Static Builder</strong>
                <small>{project.name}</small>
              </div>
            </div>
            <button
              aria-controls="cms-admin-sections"
              aria-expanded={!isAdminNavCollapsed}
              aria-label={isAdminNavCollapsed ? "Expandir menu lateral" : "Minimizar menu lateral"}
              className="cms-admin-nav__toggle"
              type="button"
              onClick={() => setIsAdminNavCollapsed((isCollapsed) => !isCollapsed)}
            >
              <span aria-hidden="true" className="cms-admin-nav__toggle-icon" />
            </button>
          </div>
          <nav aria-label="Secciones del CMS" id="cms-admin-sections">
            {adminViews.map((view) => (
              <button
                aria-label={view.label}
                aria-current={activeView === view.id ? "page" : undefined}
                className={activeView === view.id ? "is-active" : ""}
                key={view.id}
                type="button"
                onClick={() => setActiveView(view.id)}
              >
                <span aria-hidden="true" className="cms-admin-nav__shortcut">{view.short}</span>
                <span className="cms-admin-nav__label">{view.label}</span>
              </button>
            ))}
          </nav>
        </aside>

        <section className="cms-workspace" id="main-content" tabIndex={-1}>
          {isBuilderView ? (
            <>
              <Toolbar
                page={activePage}
                project={project}
                status={status}
                onBackToProjects={onBackToProjects}
                onExport={handleExport}
                onLogout={onLogout}
                onOpenPages={() => setActiveView("pages")}
                onPreview={handlePreview}
                onSave={handleSave}
              />
              {renderViewportControls()}
              <div className="cms-builder-grid">
                {selectedColumn && selectedColumnParent && builderPanel === "settings" ? (
                  <ColumnInspector
                    column={{ ...selectedColumn, props: selectedColumnProps }}
                    parentBlock={selectedColumnParent}
                    site={site}
                    viewportMode={editorViewport.mode}
                    onBackToLibrary={() => setBuilderPanel("library")}
                    onUpdateColumn={handleUpdateColumn}
                  />
                ) : selectedBlock && builderPanel === "settings" ? (
                  <Inspector
                    block={selectedBlock}
                    site={site}
                    viewportMode={editorViewport.mode}
                    onBackToLibrary={() => setBuilderPanel("library")}
                    onDeleteBlock={handleDeleteBlock}
                    onDuplicateBlock={handleDuplicateBlock}
                    onMoveBlock={handleMoveBlock}
                    onUpdateBlock={handleUpdateBlock}
                  />
                ) : (
                  <Sidebar
                    insertionColumn={activeInsertionColumn}
                    insertionColumnCount={insertionColumnCount}
                    insertionTargetLabel={insertionTargetLabel}
                    onAddBlock={handleAddBlock}
                    onSelectInsertionColumn={setInsertionColumn}
                  />
                )}
                <Canvas
                  areaLabel={getAreaLabel(activeView, activePage)}
                  blocks={activeBlocks}
                  viewportWidth={viewportWidth}
                  viewportMode={editorViewport.mode}
                  selectedBlockId={selectedBlockId}
                  selectedColumn={selectedColumn}
                  site={site}
                  onDropBlock={handleAddBlock}
                  onSelectBlock={handleSelectBlock}
                  onSelectColumn={handleSelectColumn}
                />
              </div>
              <button
                aria-expanded={structureOpen}
                aria-label="Mostrar estructura del sitio"
                className="cms-structure-toggle"
                type="button"
                onClick={() => setStructureOpen((isOpen) => !isOpen)}
              >
                <span aria-hidden="true" />
              </button>
              {renderStructurePanel()}
            </>
          ) : (
            <>
              <Toolbar
                page={activePage}
                project={project}
                status={status}
                onBackToProjects={onBackToProjects}
                onExport={handleExport}
                onLogout={onLogout}
                onOpenPages={() => setActiveView("pages")}
                onPreview={handlePreview}
                onSave={handleSave}
              />
              {renderActiveView()}
            </>
          )}
        </section>
        {renderPreviewModal()}
      </div>
    </>
  );
}

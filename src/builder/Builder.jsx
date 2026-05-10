import { useEffect, useState } from "react";
import { createId, slugify } from "../cms/siteDefaults";
import { createBlock } from "../components-library/registry";
import { createAsset, createDefaultSite, createField, createForm, createPage, exportPage, loadSite, saveSite } from "../store/builderStore";
import { Canvas } from "./Canvas";
import { Inspector } from "./Inspector";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";

// Esta lista define las secciones principales del admin tipo WordPress.
const adminViews = [
  { id: "dashboard", label: "Dashboard" },
  { id: "pages", label: "Paginas" },
  { id: "builder", label: "Builder" },
  { id: "header", label: "Header" },
  { id: "navbar", label: "Navbar" },
  { id: "footer", label: "Footer" },
  { id: "head", label: "Head / Tracking" },
  { id: "media", label: "Biblioteca" },
  { id: "forms", label: "Formularios" },
];

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

// Builder es el componente principal: administra estado, navegacion y acciones del CMS.
export function Builder({ project, onBackToProjects, onLogout }) {
  const [site, setSite] = useState(createDefaultSite);
  const [activeView, setActiveView] = useState("dashboard");
  const [selectedBlockId, setSelectedBlockId] = useState("");
  const [status, setStatus] = useState("Cargando datos...");
  const [assetDraft, setAssetDraft] = useState({ name: "", url: "" });
  const [newPageTitle, setNewPageTitle] = useState("Nueva landing");

  const activePage = site.pages.find((page) => page.id === site.currentPageId) || site.pages[0];
  const activeBlocks = getActiveBlocks(site, activeView, activePage);
  const selectedBlock = activeBlocks.find((block) => block.id === selectedBlockId);
  const isBuilderView = ["builder", "header", "navbar", "footer"].includes(activeView);

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
  function handleAddBlock(type) {
    const block = createBlock(type);
    updateActiveBlocks([...activeBlocks, block]);
    setSelectedBlockId(block.id);
    setStatus(`Bloque agregado: ${type}`);
  }

  // Esta funcion actualiza props del bloque seleccionado desde el inspector.
  function handleUpdateBlock(blockId, patch) {
    updateActiveBlocks(
      activeBlocks.map((block) => (block.id === blockId ? { ...block, props: { ...block.props, ...patch } } : block)),
    );
  }

  // Esta funcion borra un bloque de la zona activa.
  function handleDeleteBlock(blockId) {
    updateActiveBlocks(activeBlocks.filter((block) => block.id !== blockId));
    setSelectedBlockId("");
  }

  // Esta funcion duplica un bloque conservando sus props.
  function handleDuplicateBlock(blockId) {
    const block = activeBlocks.find((item) => item.id === blockId);
    if (!block) return;

    const duplicate = { ...block, id: createId("block"), props: { ...block.props } };
    updateActiveBlocks([...activeBlocks, duplicate]);
    setSelectedBlockId(duplicate.id);
  }

  // Esta funcion mueve bloques arriba o abajo sin salir del canvas.
  function handleMoveBlock(blockId, direction) {
    const index = activeBlocks.findIndex((block) => block.id === blockId);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= activeBlocks.length) return;

    const nextBlocks = [...activeBlocks];
    const [removed] = nextBlocks.splice(index, 1);
    nextBlocks.splice(nextIndex, 0, removed);
    updateActiveBlocks(nextBlocks);
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
            <input value={newPageTitle} onChange={(event) => setNewPageTitle(event.target.value)} />
            <button className="cms-button cms-button--primary" type="button" onClick={handleCreatePage}>Crear</button>
          </div>
        </div>

        <div className="cms-table-list">
          {site.pages.map((page) => (
            <article className="cms-page-row" key={page.id}>
              <div>
                <input value={page.title} onChange={(event) => updatePage(page.id, { title: event.target.value })} />
                <input value={page.slug} onChange={(event) => updatePage(page.id, { slug: slugify(event.target.value) })} />
                <textarea value={page.description || ""} onChange={(event) => updatePage(page.id, { description: event.target.value })} rows={2} />
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
            <input placeholder="Nombre" value={assetDraft.name} onChange={(event) => setAssetDraft({ ...assetDraft, name: event.target.value })} />
            <input placeholder="URL" value={assetDraft.url} onChange={(event) => setAssetDraft({ ...assetDraft, url: event.target.value })} />
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
                <input value={form.name} onChange={(event) => updateForm(form.id, { name: event.target.value })} />
                <input value={form.hxPost} onChange={(event) => updateForm(form.id, { hxPost: event.target.value })} />
                <input value={form.submitLabel} onChange={(event) => updateForm(form.id, { submitLabel: event.target.value })} />
              </div>
              <div className="cms-field-list">
                {form.fields.map((field) => (
                  <div className="cms-field-row" key={field.id}>
                    <input value={field.label} onChange={(event) => updateFormField(form.id, field.id, { label: event.target.value })} />
                    <input value={field.name} onChange={(event) => updateFormField(form.id, field.id, { name: event.target.value })} />
                    <select value={field.type} onChange={(event) => updateFormField(form.id, field.id, { type: event.target.value })}>
                      <option value="text">text</option>
                      <option value="email">email</option>
                      <option value="tel">tel</option>
                      <option value="number">number</option>
                    </select>
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

  return (
    <div className="cms-shell">
      <aside className="cms-admin-nav">
        <div className="cms-brand">
          <span>SB</span>
          <div>
            <strong>Static Builder</strong>
          <small>{project.name}</small>
          </div>
        </div>
        <nav>
          {adminViews.map((view) => (
            <button
              aria-current={activeView === view.id ? "page" : undefined}
              className={activeView === view.id ? "is-active" : ""}
              key={view.id}
              type="button"
              onClick={() => setActiveView(view.id)}
            >
              {view.label}
            </button>
          ))}
        </nav>
      </aside>

      <section className="cms-workspace">
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
              onSave={handleSave}
            />
            <div className="cms-builder-grid">
              <Sidebar onAddBlock={handleAddBlock} />
              <Canvas
                areaLabel={getAreaLabel(activeView, activePage)}
                blocks={activeBlocks}
                selectedBlockId={selectedBlockId}
                site={site}
                onDropBlock={handleAddBlock}
                onSelectBlock={setSelectedBlockId}
              />
              <Inspector
                block={selectedBlock}
                site={site}
                onDeleteBlock={handleDeleteBlock}
                onDuplicateBlock={handleDuplicateBlock}
                onMoveBlock={handleMoveBlock}
                onUpdateBlock={handleUpdateBlock}
              />
            </div>
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
              onSave={handleSave}
            />
            {renderActiveView()}
          </>
        )}
      </section>
    </div>
  );
}

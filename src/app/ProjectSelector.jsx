import { useState } from "react";
import { buildStaticPage } from "../exporter/staticExporter";
import { loadSite } from "../store/builderStore";

function buildProjectPreviewSrcDoc(site) {
  const pageId = site.currentPageId || site.pages[0]?.id;
  const output = buildStaticPage(site, pageId);
  const safeScript = output.files["script.js"].replaceAll("</script", "<\\/script");

  return output.files["index.html"]
    .replace('<link rel="stylesheet" href="./styles.css">', `<style>${output.files["styles.css"]}</style>`)
    .replace('<script src="./script.js"></script>', `<script>${safeScript}</script>`);
}

// Esta pantalla aparece antes del builder para mantener cada cliente/proyecto separado.
export function ProjectSelector({ projects, onChangePassword, onCreateProject, onDeleteProject, onLogout, onSelectProject }) {
  const [projectName, setProjectName] = useState("Nuevo proyecto");
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "" });
  const [status, setStatus] = useState("Crea o selecciona un proyecto para continuar.");
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState({ open: false, projectName: "", srcDoc: "" });

  // Esta funcion crea la carpeta y site.json inicial del proyecto.
  async function handleCreateProject(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("Creando proyecto...");

    try {
      const project = await onCreateProject(projectName);
      setProjectName("Nuevo proyecto");
      setStatus(`Proyecto creado: ${project.name}`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  // Esta funcion cambia la clave del usuario local y mantiene el hash fuera del frontend.
  async function handleChangePassword(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("Actualizando contrasena...");

    try {
      await onChangePassword(passwordDraft.currentPassword, passwordDraft.newPassword);
      setPasswordDraft({ currentPassword: "", newPassword: "" });
      setStatus("Contrasena actualizada. El hash quedo guardado en cms-data/auth.json.");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  // Esta funcion confirma y elimina un proyecto para evitar borrados accidentales.
  async function handleDeleteProject(project) {
    const confirmed = window.confirm(
      `Eliminar "${project.name}"? Esta accion borra su carpeta de datos y sus exports locales.`,
    );

    if (!confirmed) return;

    setLoading(true);
    setStatus(`Eliminando proyecto: ${project.name}...`);

    try {
      await onDeleteProject(project.id);
      setStatus(`Proyecto eliminado: ${project.name}`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function handlePreviewProject(project) {
    setLoading(true);
    setStatus(`Preparando vista previa: ${project.name}...`);

    try {
      const site = await loadSite(project.id);
      setPreview({ open: true, projectName: project.name, srcDoc: buildProjectPreviewSrcDoc(site) });
      setStatus(`Vista previa lista: ${project.name}`);
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  function closePreview() {
    setPreview({ open: false, projectName: "", srcDoc: "" });
  }

  return (
    <main className="project-shell">
      <section className="project-hero">
        <div>
          <p className="cms-eyebrow">Panel de proyectos</p>
          <h1>Elige un sitio para previsualizarlo o editarlo.</h1>
          <p>
            El builder solo se abre cuando entras a editar un proyecto. Desde aqui puedes crear, revisar y eliminar sitios.
          </p>
        </div>
        <button className="cms-button cms-button--ghost" type="button" onClick={onLogout}>
          Cerrar sesion
        </button>
      </section>

      <section className="project-grid">
        <div className="project-side-stack">
          <form className="project-create-card" aria-busy={loading} onSubmit={handleCreateProject}>
            <p className="cms-eyebrow">Nuevo</p>
            <h2>Crear proyecto</h2>
            <label className="cms-field">
              <span>Nombre del proyecto</span>
              <input value={projectName} onChange={(event) => setProjectName(event.target.value)} required />
            </label>
            <button className="cms-button cms-button--primary" type="submit" disabled={loading}>
              Crear carpeta del proyecto
            </button>
          </form>

          <form className="project-create-card" aria-busy={loading} onSubmit={handleChangePassword}>
            <p className="cms-eyebrow">Seguridad</p>
            <h2>Cambiar clave</h2>
            <label className="cms-field">
              <span>Contrasena actual</span>
              <input
                type="password"
                value={passwordDraft.currentPassword}
                onChange={(event) => setPasswordDraft({ ...passwordDraft, currentPassword: event.target.value })}
                autoComplete="current-password"
                required
              />
            </label>
            <label className="cms-field">
              <span>Nueva contrasena</span>
              <input
                type="password"
                value={passwordDraft.newPassword}
                onChange={(event) => setPasswordDraft({ ...passwordDraft, newPassword: event.target.value })}
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <button className="cms-button cms-button--secondary" type="submit" disabled={loading}>
              Guardar nueva clave
            </button>
            <p className="auth-status" role="status">{status}</p>
          </form>
        </div>

        <div className="project-list">
          {projects.length === 0 ? (
            <article className="project-empty">
              <h2>No hay proyectos todavia</h2>
              <p>Crea el primero para entrar al builder.</p>
            </article>
          ) : (
            projects.map((project) => (
              <article className="project-card" key={project.id}>
                <div>
                  <p className="cms-eyebrow">{project.slug}</p>
                  <h2>{project.name}</h2>
                  <small>cms-data/projects/{project.slug}/site.json</small>
                </div>
                <div className="project-card__actions">
                  <button
                    className="cms-button cms-button--ghost"
                    type="button"
                    disabled={loading}
                    onClick={() => handlePreviewProject(project)}
                  >
                    Vista previa
                  </button>
                  <button className="cms-button cms-button--secondary" type="button" onClick={() => onSelectProject(project)}>
                    Editar
                  </button>
                  <button
                    className="cms-button cms-button--danger"
                    type="button"
                    disabled={loading}
                    onClick={() => handleDeleteProject(project)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      </section>

      {preview.open ? (
        <section className="preview-modal" aria-label="Vista previa de proyecto" role="dialog" aria-modal="true">
          <div className="preview-modal__bar">
            <div>
              <p className="cms-eyebrow">Vista previa</p>
              <h2>{preview.projectName}</h2>
            </div>
            <button className="cms-button cms-button--ghost" type="button" onClick={closePreview}>
              Cerrar
            </button>
          </div>
          <div className="preview-modal__stage">
            <iframe className="preview-modal__frame" sandbox="allow-forms allow-same-origin allow-scripts" srcDoc={preview.srcDoc} title={`Vista previa de ${preview.projectName}`} />
          </div>
        </section>
      ) : null}
    </main>
  );
}

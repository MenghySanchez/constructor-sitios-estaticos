import { useState } from "react";

// Esta pantalla aparece antes del builder para mantener cada cliente/proyecto separado.
export function ProjectSelector({ projects, onChangePassword, onCreateProject, onDeleteProject, onLogout, onSelectProject }) {
  const [projectName, setProjectName] = useState("Nuevo proyecto");
  const [passwordDraft, setPasswordDraft] = useState({ currentPassword: "", newPassword: "" });
  const [status, setStatus] = useState("Crea o selecciona un proyecto para continuar.");
  const [loading, setLoading] = useState(false);

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

  return (
    <main className="project-shell">
      <section className="project-hero">
        <div>
          <p className="cms-eyebrow">Proyectos</p>
          <h1>Organiza varias landings desde el mismo sistema.</h1>
          <p>
            Cada proyecto guarda sus datos en una carpeta propia y publica sus archivos en un directorio separado.
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
              <input value={projectName} onChange={(event) => setProjectName(event.target.value)} />
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
              />
            </label>
            <label className="cms-field">
              <span>Nueva contrasena</span>
              <input
                type="password"
                value={passwordDraft.newPassword}
                onChange={(event) => setPasswordDraft({ ...passwordDraft, newPassword: event.target.value })}
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
                  <button className="cms-button cms-button--secondary" type="button" onClick={() => onSelectProject(project)}>
                    Abrir builder
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
    </main>
  );
}

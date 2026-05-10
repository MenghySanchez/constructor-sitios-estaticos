// La toolbar concentra acciones globales del editor y del proyecto activo.
export function Toolbar({ page, project, status, onBackToProjects, onLogout, onSave, onExport, onOpenPages, onPreview }) {
  return (
    <header className="cms-toolbar">
      <div>
        <p className="cms-eyebrow">Proyecto: {project?.name || "Sin proyecto"}</p>
        <h1>{page?.title || "Sin pagina seleccionada"}</h1>
      </div>
      <div className="cms-toolbar__actions">
        <span className="cms-status" role="status">{status}</span>
        <button className="cms-button cms-button--ghost" type="button" onClick={onBackToProjects}>
          Proyectos
        </button>
        <button className="cms-button cms-button--ghost" type="button" onClick={onOpenPages}>
          Ver paginas
        </button>
        <button className="cms-button cms-button--secondary" type="button" onClick={onSave}>
          Guardar
        </button>
        <button className="cms-button cms-button--secondary" type="button" onClick={onPreview} disabled={!page}>
          Vista previa
        </button>
        <button className="cms-button cms-button--primary" type="button" onClick={onExport} disabled={!page}>
          Publicar estatico
        </button>
        <button className="cms-button cms-button--ghost" type="button" onClick={onLogout}>
          Salir
        </button>
      </div>
    </header>
  );
}

import { useEffect, useState } from "react";
import { Builder } from "../builder/Builder";
import { changePassword, createProject, deleteProject, getAuthStatus, loadProjects, login, logout } from "../store/builderStore";
import { LoginScreen } from "./LoginScreen";
import { ProjectSelector } from "./ProjectSelector";


export function App() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);

  // Al abrir la app se revisa si ya existe una sesion valida en la cookie.
  useEffect(() => {
    getAuthStatus()
      .then(async (payload) => {
        setAuthenticated(payload.authenticated);

        if (payload.authenticated) {
          const projectPayload = await loadProjects();
          setProjects(projectPayload.projects);
        }
      })
      .finally(() => setCheckingAuth(false));
  }, []);

  // Esta funcion inicia sesion y carga la lista de proyectos.
  async function handleLogin(username, password) {
    await login(username, password);
    const projectPayload = await loadProjects();
    setProjects(projectPayload.projects);
    setAuthenticated(true);
  }

  // Esta funcion crea un proyecto y refresca la lista visible.
  async function handleCreateProject(name) {
    const payload = await createProject(name);
    const projectPayload = await loadProjects();
    setProjects(projectPayload.projects);
    return payload.project;
  }

  // Esta funcion elimina un proyecto y refresca la lista antes de volver al selector.
  async function handleDeleteProject(projectId) {
    const payload = await deleteProject(projectId);
    const projectPayload = await loadProjects();
    setProjects(projectPayload.projects);

    if (selectedProject?.id === projectId) {
      setSelectedProject(null);
    }

    return payload.project;
  }

  // Esta funcion cierra sesion y vuelve a bloquear el admin.
  async function handleLogout() {
    await logout();
    setAuthenticated(false);
    setSelectedProject(null);
    setProjects([]);
  }

  if (checkingAuth) {
    return <div className="app-loading">Cargando CMS...</div>;
  }

  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  if (!selectedProject) {
    return (
      <ProjectSelector
        projects={projects}
        onChangePassword={changePassword}
        onCreateProject={handleCreateProject}
        onDeleteProject={handleDeleteProject}
        onLogout={handleLogout}
        onSelectProject={setSelectedProject}
      />
    );
  }

  return <Builder project={selectedProject} onBackToProjects={() => setSelectedProject(null)} onLogout={handleLogout} />;
}

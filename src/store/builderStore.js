import { createDefaultSite, createId, normalizeSite, slugify } from "../cms/siteDefaults";

// Este archivo concentra operaciones de datos para que los componentes no repitan fetch/update.

// Esta funcion lee respuestas JSON de forma defensiva.
// Si Vercel devuelve HTML o un error de routing, mostramos un mensaje entendible.
async function readApiPayload(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  throw new Error(text ? `La API no devolvio JSON: ${text.slice(0, 120)}` : "La API no respondio correctamente");
}

// Esta funcion revisa si existe una cookie de sesion valida.
export async function getAuthStatus() {
  const response = await fetch("/api/auth/status");
  const payload = await readApiPayload(response);

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "No se pudo revisar la sesion");
  }

  return payload;
}

// Esta funcion inicia sesion contra el auth.json local, sin base de datos.
export async function login(username, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const payload = await readApiPayload(response);

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "No se pudo iniciar sesion");
  }

  return payload;
}

// Esta funcion cierra sesion borrando la cookie firmada.
export async function logout() {
  await fetch("/api/auth/logout", { method: "POST" });
}

// Esta funcion cambia la contrasena local y guarda un hash nuevo en auth.json.
export async function changePassword(currentPassword, newPassword) {
  const response = await fetch("/api/auth/change-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ currentPassword, newPassword }),
  });

  const payload = await readApiPayload(response);

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "No se pudo cambiar la contrasena");
  }

  return payload;
}

// Esta funcion carga el indice de proyectos disponibles.
export async function loadProjects() {
  const response = await fetch("/api/projects");
  const payload = await readApiPayload(response);

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "No se pudieron cargar los proyectos");
  }

  return {
    projects: payload.projects || [],
    currentProjectId: payload.currentProjectId || "",
  };
}

// Esta funcion crea un proyecto con su propia carpeta en cms-data/projects.
export async function createProject(name) {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });

  const payload = await readApiPayload(response);

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "No se pudo crear el proyecto");
  }

  return payload;
}

// Esta funcion elimina un proyecto y pide al servidor limpiar su carpeta y exports.
export async function deleteProject(projectId) {
  const response = await fetch("/api/projects", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId }),
  });

  const payload = await readApiPayload(response);

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "No se pudo eliminar el proyecto");
  }

  return payload;
}

// Esta funcion pide al servidor local el JSON actual del proyecto seleccionado.
export async function loadSite(projectId) {
  const response = await fetch(`/api/site?projectId=${encodeURIComponent(projectId)}`);

  if (!response.ok) {
    throw new Error("No se pudo cargar el sitio");
  }

  const payload = await readApiPayload(response);
  return normalizeSite(payload.site);
}

// Esta funcion guarda el CMS del proyecto activo en cms-data/projects/<slug>/site.json.
export async function saveSite(projectId, site) {
  const response = await fetch("/api/site", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, site }),
  });

  if (!response.ok) {
    throw new Error("No se pudo guardar el sitio");
  }

  const payload = await readApiPayload(response);
  return normalizeSite(payload.site);
}

// Esta funcion publica una pagina como archivos estaticos en exports/<project>/<page>/public.
export async function exportPage(projectId, site, pageId) {
  const response = await fetch("/api/export", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, site, pageId }),
  });

  const payload = await readApiPayload(response);

  if (!response.ok || !payload.ok) {
    throw new Error(payload.error || "No se pudo exportar la pagina");
  }

  return payload;
}

// Esta funcion crea una pagina nueva con slug seguro.
export function createPage(title = "Nueva landing") {
  return {
    id: createId("page"),
    title,
    slug: slugify(title),
    description: "Landing creada desde el CMS.",
    status: "draft",
    blocks: [],
  };
}

// Esta funcion crea un asset por URL para la biblioteca de medios.
export function createAsset({ name, url, type = "image" }) {
  return {
    id: createId("asset"),
    name: name || "Nuevo archivo",
    type,
    url,
  };
}

// Esta funcion crea un formulario reutilizable.
export function createForm(name = "Nuevo formulario") {
  return {
    id: createId("form"),
    name,
    submitLabel: "Enviar",
    hxPost: "/api/leads",
    successMessage: "Gracias. Recibimos tu informacion.",
    fields: [
      {
        id: createId("field"),
        label: "Email",
        name: "email",
        type: "email",
        placeholder: "tu@email.com",
        required: true,
      },
    ],
  };
}

// Esta funcion crea un campo para el constructor de formularios.
export function createField() {
  return {
    id: createId("field"),
    label: "Nuevo campo",
    name: "field_name",
    type: "text",
    placeholder: "Escribe aqui",
    required: false,
  };
}

// Esta funcion se usa como fallback cuando la API aun no respondio.
export { createDefaultSite };

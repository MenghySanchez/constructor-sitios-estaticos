import { useState } from "react";

// Esta pantalla protege el admin antes de mostrar proyectos o builder.
// La autenticacion se valida contra cms-data/auth.json en la API local.
export function LoginScreen({ onLogin }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [status, setStatus] = useState("Usuario inicial: admin / admin123");
  const [loading, setLoading] = useState(false);

  // Esta funcion envia las credenciales y deja que App decida si avanza.
  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setStatus("Validando credenciales...");

    try {
      await onLogin(username, password);
      setStatus("Sesion iniciada");
    } catch (error) {
      setStatus(error.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <div className="auth-card__intro">
          <span>SB</span>
          <p className="cms-eyebrow">Acceso seguro flat-file</p>
          <h1>Entra al CMS antes de editar tus proyectos.</h1>
          <p>
            Similar a Grav: no hay base de datos, solo un archivo local con usuario y password hasheado.
          </p>
        </div>

        <form className="auth-form" aria-busy={loading} onSubmit={handleSubmit}>
          <label className="cms-field">
            <span>Usuario</span>
            <input value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" />
          </label>
          <label className="cms-field">
            <span>Contrasena</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
          <button className="cms-button cms-button--primary" type="submit" disabled={loading}>
            Entrar al admin
          </button>
          <p className="auth-status" role="status">{status}</p>
        </form>
      </section>
    </main>
  );
}

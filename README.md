# Static Builder CMS

Static Builder CMS es un piloto de CMS flat-file para construir landing pages estaticas desde un panel visual tipo Elementor/WordPress. El admin permite crear proyectos, editar paginas con bloques arrastrables, configurar secciones globales, manejar formularios HTMX, agregar scripts de tracking en el `head` y publicar cada landing como archivos estaticos listos para subir a un servidor.

El proyecto usa React y Vite para el panel de administracion. Los datos se guardan en archivos JSON dentro de `cms-data`, sin base de datos. La exportacion genera HTML, CSS y JS dentro de `exports`, organizado por proyecto y pagina.

## Caracteristicas

- Login local sin base de datos, con password hasheado en `cms-data/auth.json`.
- Selector y creador de proyectos.
- Cada proyecto tiene su propio `site.json`.
- Panel admin con dashboard, paginas, builder, header, navbar, footer, head/tracking, biblioteca y formularios.
- Builder visual con drag and drop de bloques.
- Inspector lateral para editar textos, imagenes, links, colores y formularios.
- Formularios exportados con atributos HTMX.
- Exportacion estatica por proyecto y landing.

## Instalacion

Requisitos:

- Node.js instalado.
- npm instalado.

Instala las dependencias:

```bash
npm install
```

Ejecuta el proyecto en modo desarrollo:

```bash
npm run dev
```

Abre la URL que muestre Vite en la terminal, normalmente:

```txt
http://localhost:5173
```

## Acceso Inicial

El usuario inicial del CMS es:

```txt
Usuario: admin
Password: admin123
```

Despues de entrar, puedes cambiar la contrasena desde la pantalla de proyectos. La nueva contrasena se guarda como hash PBKDF2 en:

```txt
cms-data/auth.json
```

## Uso Del Proyecto

1. Inicia sesion con el usuario admin.
2. Crea un proyecto desde la pantalla de proyectos.
3. Abre el builder del proyecto.
4. Entra en `Paginas` para crear o editar landings.
5. Usa `Builder` para arrastrar bloques al canvas.
6. Selecciona un bloque para editarlo desde el inspector lateral.
7. Configura secciones globales desde `Header`, `Navbar` y `Footer`.
8. Pega pixeles o scripts externos desde `Head / Tracking`.
9. Agrega imagenes por URL desde `Biblioteca`.
10. Crea o edita formularios desde `Formularios`.
11. Pulsa `Guardar` para persistir cambios.
12. Pulsa `Publicar estatico` para generar los archivos finales.

## Estructura De Datos

Los proyectos se guardan en:

```txt
cms-data/projects/<proyecto>/site.json
```

El indice de proyectos se guarda en:

```txt
cms-data/projects.json
```

La configuracion de acceso se guarda en:

```txt
cms-data/auth.json
```

## Exportacion Estatica

Cuando publicas una landing, se genera una carpeta como esta:

```txt
exports/<proyecto>/<landing>/public/
  index.html
  styles.css
  script.js
```

Para desplegar una landing en un servidor, apunta el dominio o virtual host a la carpeta `public` de esa landing.

Ejemplo:

```txt
exports/mi-proyecto/landing-principal/public
```

## Scripts Disponibles

Ejecutar entorno local:

```bash
npm run dev
```

Compilar el admin:

```bash
npm run build
```

Revisar errores de lint:

```bash
npm run lint
```

Previsualizar build:

```bash
npm run preview
```

## Notas De Version

### Version 0.2.0

- Agregado login local sin base de datos.
- Agregado hash de contrasena con PBKDF2 y salt.
- Agregada pantalla para cambiar contrasena desde el admin.
- Agregado sistema de proyectos.
- Cada proyecto ahora guarda su propio `site.json`.
- La exportacion ahora separa archivos por proyecto y landing.
- Agregados botones para volver a proyectos y cerrar sesion.

### Version 0.1.0

- Agregado panel admin inicial tipo WordPress.
- Agregado builder visual con drag and drop.
- Agregada biblioteca de bloques: hero, texto, imagen, boton, features, navbar, footer y formulario.
- Agregado inspector lateral para editar propiedades de bloques.
- Agregadas secciones globales de header, navbar y footer.
- Agregada seccion de head para tracking pixels y scripts externos.
- Agregada biblioteca de imagenes/archivos por URL.
- Agregado constructor basico de formularios HTMX.
- Agregada exportacion estatica a `index.html`, `styles.css` y `script.js`.

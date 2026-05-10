import React from "react";                    // importamos la libreria de react
import ReactDOM from "react-dom/client";      // react dom , se ocupa para que se puedan pintar los componentes dentro el navegador
                                              // React    → crea la interfaz
                                              // ReactDOM → la monta en el HTML real del navegador
import {App} from "./app/App";                // se importa al componente principal del desarrollo
import "./styles/global.css";


ReactDOM.createRoot(document.getElementById("root")).render(
<React.StrictMode>

    <App />

</React.StrictMode>
);
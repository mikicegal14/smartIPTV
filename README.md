<div align="center">
  <img src="./public/icon.svg" alt="Smart IPTV Logo" width="110" height="110" />
  <h1>Smart IPTV para LG webOS</h1>
  <p>Aplicación IPTV moderna (10-foot UI) diseñada específicamente para televisores <strong>LG Smart TV (webOS)</strong>, optimizada para <strong>LG Magic Remote</strong> y reproducción en vivo HLS.</p>
</div>

---

## ✨ Características Principales

- **Soporte Multi-Lista IPTV**:
  - **URLs Remotas (`.m3u` / `.m3u8`)** con autocompletado rápido para TV y puente CORS automático opcional.
  - **Archivos Locales (`.m3u` / `.m3u8`)** o pegado directo de bloques `#EXTM3U`.
  - **Xtream Codes API** (conexión directa mediante Servidor, Usuario y Contraseña para TV en Vivo y VOD).
  - **Lista Demo integrada** con canales públicos reales en HLS lista para probar desde el primer inicio.
- **Agrupación Inteligente y Clasificación**:
  - Organización automática por categorías (`group-title`) con contadores en tiempo real.
  - Clasificación automática entre **TV en Vivo (`LIVE`)**, **Películas (`VOD`)** y **Series (`SERIE`)**, además de detección de calidad (`4K`, `FHD`, `HD`, `SD`).
- **Previsualizador en Vivo + Pantalla Completa**:
  - **1 clic / OK** sobre cualquier canal inicia la transmisión en vivo en el panel lateral de previsualización sin perder de vista la lista de canales.
  - **2 clics / OK** o el botón de expandir (`Maximize`) lleva el reproductor a **Pantalla Completa (100vw × 100vh)** con OSD de TV.
- **Alto Rendimiento (Virtual Scrolling)**:
  - Listados de canales y categorías con **Virtual Scrolling por ventana (`translate3d`)** y pre-indexación de búsqueda (`searchKey`), manteniendo 60 FPS fluidos en el procesador de la TV incluso con listas de más de 20,000 canales.
- **Persistencia en IndexedDB + Respaldo JSON**:
  - Almacenamiento local de gran capacidad en `IndexedDB` y exportación/importación de configuración, listas, historial reciente y favoritos en formato `.json`.

---

## 🎮 Controles para LG Magic Remote y Teclado

| Botón Control LG | Código webOS | Atajo Teclado PC | Acción en Smart IPTV |
| :--- | :---: | :---: | :--- |
| 🟨 **Botón Amarillo** | `405` | `Y` / `F` / `F3` | **Agregar o quitar de Favoritos** el canal señalado o en reproducción |
| 🟥 **Botón Rojo** | `403` | `R` / `F1` | Abrir el **Gestor de Listas IPTV** |
| 🟩 **Botón Verde** | `404` | `G` / `/` / `F2` | Enfocar el **Buscador Global** en todas las listas |
| 🟦 **Botón Azul** | `406` | `B` / `F4` | Filtrar directamente la vista de **⭐ Favoritos** |
| 🖱️ **Puntero + Rueda** | `wheel` | Ratón / Rueda | Desplazar listas o cambiar de canal en pantalla completa |
| 🔼🔽 **CH+ / CH-** | `427` / `428` | `RePág` / `AvPág` | Cambiar al canal siguiente / anterior |
| 🔙 **Botón Back** | `461` | `Esc` / `Backspace` | Cerrar modales, salir de pantalla completa o limpiar búsqueda |

---

## 🚀 Desarrollo Local

### Requisitos previos
- **Node.js** 18+ y **npm**

### Instalación y ejecución
```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo (accesible en red local)
npm run dev

# Ejecutar pruebas unitarias
npm test -- --run
```

---

## 📦 Generar `.ipk` e Instalar en un Smart TV LG webOS

El proyecto incluye `@webos-tools/cli` configurado para generar el paquete `.ipk` oficial:

```bash
# Compilar y generar el archivo com.smartiptv.webos.app_1.0.0_all.ipk
npm run package:webos
```

### Instalación directa en el TV por red local (Developer Mode)
1. Instala y abre la app **Developer Mode** desde la tienda **LG Content Store** en tu televisor, activa **Dev Mode Status: ON** y **Key Server: ON**.
2. Registra la IP de tu TV (una sola vez):
   ```bash
   npx ares-setup-device -a mitv -i "username=prisoner" -i "host=TU_IP_DEL_TV" -i "port=9922" -i "default=true"
   ```
3. Vincula la llave SSH ingresando la *Passphrase* de 6 caracteres que muestra la app Developer Mode en el TV:
   ```bash
   npx ares-novacom --device mitv --getkey --passphrase TU_PASSPHRASE
   ```
4. Compila, empaqueta, instala y abre la app en tu TV con un solo comando:
   ```bash
   npm run deploy:tv
   ```

---

## 🗂️ Estructura del Proyecto

```text
smartIPTV/
├── public/
│   ├── appinfo.json          # Manifiesto oficial para LG webOS
│   ├── icon.png              # Icono 80x80 para webOS
│   ├── largeIcon.png         # Icono 130x130 para webOS
│   ├── icon.svg              # Ilustración vectorial de Smart TV
│   └── splash.png            # Splash Screen 1920x1080 para LG webOS
├── src/
│   ├── components/
│   │   ├── CategorySidebar.tsx      # Panel lateral de categorías (Virtualizado)
│   │   ├── ColorKeyLegend.tsx       # Barra inferior de botones de colores LG
│   │   ├── HeaderBar.tsx            # Cabecera con filtros, selector y buscador global
│   │   ├── PlaylistManagerModal.tsx # Gestor de listas (URL, Archivo, Xtream, Backup)
│   │   ├── PreviewPanel.tsx         # Panel derecho con previsualizador en vivo
│   │   ├── StreamList.tsx           # Listado/Cuadrícula de canales (Virtual Scrolling)
│   │   └── VideoPlayer.tsx          # Motor de video HLS.js + HTML5 con modo Fullscreen
│   ├── data/
│   │   └── demoPlaylist.ts          # Lista M3U de canales abiertos de demostración
│   ├── hooks/
│   │   └── useWebOSRemote.ts        # Integración con códigos de tecla LG Magic Remote
│   ├── services/
│   │   ├── m3uParser.ts             # Analizador M3U/M3U8 y clasificador Live/VOD
│   │   ├── storageService.ts        # Persistencia en IndexedDB y localStorage
│   │   └── xtreamService.ts         # Cliente para servidores Xtream Codes API
│   └── types/
│       └── iptv.ts                  # Definiciones TypeScript
└── package.json
```

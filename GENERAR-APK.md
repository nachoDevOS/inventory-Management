# Cómo generar la APK (build local sin EAS)

---

## Requisitos previos

- **Android Studio** instalado (ya incluye el JDK necesario)
- La carpeta del proyecto: `C:\Users\Usuario\Desktop\projects\project\appMovil`

---

## PASO 1 — Generar el proyecto nativo Android

Abrí una terminal en la carpeta `appMovil` y ejecutá:

```bash
npx expo prebuild --platform android --clean
```

Esto crea la carpeta `android/` con todo el proyecto nativo.

> Solo necesitás hacer este paso cuando cambies dependencias nativas (`expo install ...`).
> Para actualizaciones de código JS no es necesario repetirlo.

---

## PASO 2 — Configurar JAVA_HOME

**IMPORTANTE:** Hay que hacerlo en dos comandos separados. Si los unís con `&&` falla porque el path tiene espacios.

**Paso 2a — Entrar a la carpeta android:**
```cmd
cd android
```

**Paso 2b — Configurar JAVA_HOME (comando separado, con comillas):**
```cmd
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
```

---

## PASO 3 — Compilar la APK (debug)

```cmd
.\gradlew.bat assembleDebug
```

Esperá unos minutos (la primera vez puede tardar 5-10 min mientras descarga dependencias). Al terminar verás:

```
BUILD SUCCESSFUL in Xm Xs
```

La APK queda en:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

---

## Secuencia completa (todo junto)

Desde la carpeta `appMovil`, estos son los comandos exactos en orden:

```cmd
cd android
```
```cmd
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
```
```cmd
.\gradlew.bat assembleDebug
```

> Los tres comandos van por separado en la terminal, no encadenados.

---

## PASO 4 — Instalar en el celular

**Opción A — Cable USB:**
1. Habilitá "Depuración USB" en el celular (Ajustes → Opciones de desarrollador)
2. Conectá el cable
3. Ejecutá: `adb install app\build\outputs\apk\debug\app-debug.apk`

**Opción B — WhatsApp / Google Drive / Email:**
- Enviá el archivo `app-debug.apk` al celular
- Abrilo desde el celular (puede pedir permitir instalación de fuentes desconocidas)

---

## Actualizar la app (para futuras versiones)

### Si solo cambiaste código JS (pantallas, lógica, estilos):

Solo recompilar desde la carpeta `appMovil`:

```cmd
cd android
```
```cmd
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
```
```cmd
.\gradlew.bat assembleDebug
```

### Si instalaste nuevas librerías nativas (`expo install ...`):

Volver al paso 1 completo (desde la carpeta `appMovil`):

```cmd
npx expo prebuild --platform android --clean
```
```cmd
cd android
```
```cmd
set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
```
```cmd
.\gradlew.bat assembleDebug
```

---

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `JAVA_HOME is not set` | No se ejecutó el `set` | Ejecutar `set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"` como comando separado |
| `JAVA_HOME is set to an invalid directory` | Se usaron comillas mal o se encadenó con `&&` | Asegurarse de usar comillas: `set "JAVA_HOME=..."` y ejecutarlo solo, sin `&&` |
| `SDK location not found` | SDK de Android no descargado | Abrir Android Studio una vez para que descargue el SDK automáticamente |
| `BUILD FAILED` por memoria | Memoria insuficiente | Ejecutar `.\gradlew.bat assembleDebug --no-daemon` |
| La APK no se instala en el cel | Ajuste de seguridad | Habilitar "Instalar apps desconocidas" en Ajustes del celular |
| `Could not find com.android...` | Sin internet en el primer build | Conectarse a internet, la primera vez descarga dependencias |

---

## Debug vs Release

| | Debug | Release |
|--|-------|---------|
| Para qué sirve | Pruebas internas | Distribución a clientes |
| Requiere keystore | No | Sí |
| Tamaño | Un poco más grande | Optimizada |
| Comando | `assembleDebug` | `assembleRelease` |

Para la mayoría de clientes, la APK **debug funciona perfectamente**.

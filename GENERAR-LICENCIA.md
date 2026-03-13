# Cómo generar una clave de licencia para un cliente

---

## PASO 1 — El cliente abre la app

La app aparece bloqueada. El cliente ve su **Código de dispositivo** (ej: `A1B2C3D4E5F6`) y un botón verde **"Enviar código por WhatsApp"**.

Al presionar el botón, te llega un mensaje automático por WhatsApp con su código.

---

## PASO 2 — Tú generas la clave

Abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
node tools/generar-licencias.js  A1B2C3D4E5F6  1
```

- Reemplazá `A1B2C3D4E5F6` con el código exacto que mandó el cliente
- El número `1` es el serial (usá un número diferente para cada cliente: 1, 2, 3, ...)

---

## PASO 3 — Salida del comando

```
=================================================
  GENERADOR DE LICENCIAS — Solución Digital
=================================================
  Dispositivo : A1B2C3D4E5F6
  Serial      : 0001
  Clave       : 3K9M-PQ7R-0001   [✓]

  Esta clave SOLO funciona en el dispositivo indicado.
  Guarda el registro de serial ↔ cliente ↔ dispositivo.
```

El `[✓]` confirma que la clave es válida.

---

## PASO 4 — Enviás la clave al cliente

Por WhatsApp:

```
Tu clave de activación es: 3K9M-PQ7R-0001
Es válida por 1 año desde hoy.
```

---

## PASO 5 — El cliente activa la app

El cliente escribe la clave en la pantalla de activación y presiona **"Activar Aplicación"**.

- Si la clave es correcta → la app se desbloquea por **1 año**
- Si la clave no corresponde al dispositivo → aparece error

---

## Registro de clientes (recomendado)

Llevá un registro para saber cuándo vence cada uno:

| # Serial | Cliente       | Código dispositivo | Clave          | Activación | Vence      |
|----------|---------------|--------------------|----------------|------------|------------|
| 1        | Juan Pérez    | A1B2C3D4E5F6       | 3K9M-PQ7R-0001 | 2025-03-13 | 2026-03-13 |
| 2        | María García  | B2C3D4E5F6G7       | 7X2K-MN5P-0002 | 2025-03-15 | 2026-03-15 |

**Importante:** Cada cliente necesita su propio serial (1, 2, 3...). La misma clave NO funciona en otro celular.

---

## Cuando la licencia vence

La app muestra pantalla roja "Licencia Vencida". El proceso es el mismo: el cliente te manda su código y vos generás una nueva clave con el siguiente serial.

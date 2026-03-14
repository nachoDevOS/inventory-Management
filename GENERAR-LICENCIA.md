# Cómo generar una clave de licencia para un cliente

---

## Formato de clave

Las claves tienen el siguiente formato:

```
XXXX-XXXX-SSSS-MM
```

| Parte  | Descripción |
|--------|-------------|
| `XXXX-XXXX` | Hash de seguridad (incluye dispositivo + serial + meses) |
| `SSSS` | Número de serie del cliente en base36 |
| `MM`   | Duración en meses en base36 |

> Los meses están **codificados dentro del hash**, por lo que no pueden ser alterados por el cliente.

---

## PASO 1 — El cliente abre la app

La app aparece bloqueada. El cliente ve su **Código de dispositivo** (ej: `A1B2C3D4E5F6`) y un botón verde **"Enviar código por WhatsApp"**.

Al presionar el botón, te llega un mensaje automático por WhatsApp con su código.

---

## PASO 2 — Tú generas la clave

Abrí una terminal en la carpeta del proyecto y ejecutá:

```bash
node tools/generar-licencias.js  <deviceCode>  <serial>  <meses>
```

### Parámetros

| Parámetro    | Descripción | Ejemplo |
|-------------|-------------|---------|
| `deviceCode` | Código exacto del dispositivo del cliente | `A1B2C3D4E5F6` |
| `serial`     | Número único por cliente (1, 2, 3...) | `1` |
| `meses`      | Duración de la licencia en meses | `3`, `6`, `12` |

### Ejemplos por plan

```bash
# Plan 1 mes
node tools/generar-licencias.js  A1B2C3D4E5F6  1  1

# Plan 3 meses
node tools/generar-licencias.js  A1B2C3D4E5F6  1  3

# Plan 6 meses
node tools/generar-licencias.js  A1B2C3D4E5F6  1  6

# Plan 1 año (12 meses)
node tools/generar-licencias.js  A1B2C3D4E5F6  1  12

# Plan 2 años (24 meses)
node tools/generar-licencias.js  A1B2C3D4E5F6  1  24
```

---

## PASO 3 — Salida del comando

```
=================================================
  GENERADOR DE LICENCIAS — Solución Digital
=================================================
  Dispositivo   : A1B2C3D4E5F6
  Serial        : 0001
  Duración      : 3 meses
  Expira aprox. : 2026-06-14
  Clave         : 3K9M-PQ7R-0001-03   [✓ válida]

  Esta clave SOLO funciona en el dispositivo indicado.
  Guarda el registro: serial ↔ cliente ↔ dispositivo ↔ meses.
```

El `[✓ válida]` confirma que la clave fue generada correctamente.

---

## PASO 4 — Enviás la clave al cliente

Por WhatsApp:

```
Tu clave de activación es: 3K9M-PQ7R-0001-03

Es válida por 3 meses desde el día que la actives.
```

> La licencia empieza a contar desde el momento en que el cliente la ingresa en la app, no desde que vos la generás.

---

## PASO 5 — El cliente activa la app

El cliente escribe la clave en la pantalla de activación y presiona **"Activar Aplicación"**.

- Si la clave es correcta → la app se desbloquea por la cantidad de meses indicada
- Si la clave no corresponde al dispositivo → aparece error
- La app calcula automáticamente la fecha de vencimiento desde el momento de activación

---

## Registro de clientes (recomendado)

Llevá un registro para saber cuándo vence cada uno:

| # Serial | Cliente       | Dispositivo    | Meses | Clave               | Activación | Vence aprox. |
|----------|---------------|----------------|-------|---------------------|------------|--------------|
| 1        | Juan Pérez    | A1B2C3D4E5F6   | 3     | 3K9M-PQ7R-0001-03   | 2025-03-14 | 2025-06-14   |
| 2        | María García  | B2C3D4E5F6G7   | 12    | 7X2K-MN5P-0002-0C   | 2025-03-15 | 2026-03-15   |
| 3        | Carlos López  | C3D4E5F6G7H8   | 6     | 9P1R-XZ4Q-0003-06   | 2025-04-01 | 2025-10-01   |

> **Importante:** Cada cliente necesita su propio serial (1, 2, 3...). La misma clave **NO** funciona en otro celular.

---

## Cuando la licencia vence

La app muestra pantalla roja "Licencia Vencida". El proceso de renovación es el mismo:

1. El cliente te manda su código de dispositivo
2. Vos generás una nueva clave con el **siguiente serial** y los meses del nuevo plan
3. El cliente ingresa la nueva clave → la app se renueva desde ese momento

---

## Compatibilidad con claves antiguas

Las claves del formato anterior (`XXXX-XXXX-XXXX`, sin guión de meses) siguen funcionando y se tratan como **12 meses** automáticamente.

---

## Rango de valores válidos

| Parámetro | Mínimo | Máximo |
|-----------|--------|--------|
| Serial    | 1      | 1.679.615 |
| Meses     | 1      | 1.295 |

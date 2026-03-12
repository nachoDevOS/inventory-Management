export const initDatabase = async (db) => {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS clientes (
      idcliente INTEGER PRIMARY KEY AUTOINCREMENT,
      carnet_identidad TEXT,
      nombre TEXT NOT NULL,
      celular TEXT,
      correo TEXT,
      contacto_referencia TEXT,
      detalle TEXT,
      fecha_registro TEXT DEFAULT (datetime('now','localtime'))
    );

    CREATE TABLE IF NOT EXISTS articulos (
      idarticulo INTEGER PRIMARY KEY AUTOINCREMENT,
      imagen TEXT,
      nombre TEXT NOT NULL,
      detalle TEXT
    );

    CREATE TABLE IF NOT EXISTS compras (
      idcompra INTEGER PRIMARY KEY AUTOINCREMENT,
      idarticulo INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1,
      precio_compra REAL NOT NULL DEFAULT 0,
      precio_envio REAL DEFAULT 0,
      precio_venta_sugerido REAL DEFAULT 0,
      fecha TEXT DEFAULT (datetime('now','localtime')),
      detalle TEXT,
      FOREIGN KEY (idarticulo) REFERENCES articulos(idarticulo)
    );

    CREATE TABLE IF NOT EXISTS proformas (
      idproforma INTEGER PRIMARY KEY AUTOINCREMENT,
      idcliente INTEGER NOT NULL,
      fecha TEXT DEFAULT (datetime('now','localtime')),
      estado TEXT DEFAULT 'pendiente',
      detalle TEXT,
      FOREIGN KEY (idcliente) REFERENCES clientes(idcliente)
    );

    CREATE TABLE IF NOT EXISTS proforma_detalle (
      iddetalle INTEGER PRIMARY KEY AUTOINCREMENT,
      idproforma INTEGER NOT NULL,
      idarticulo INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1,
      precio_cotizacion REAL NOT NULL DEFAULT 0,
      descuento REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (idproforma) REFERENCES proformas(idproforma),
      FOREIGN KEY (idarticulo) REFERENCES articulos(idarticulo)
    );

    CREATE TABLE IF NOT EXISTS ventas (
      idventa INTEGER PRIMARY KEY AUTOINCREMENT,
      idproforma INTEGER,
      idcliente INTEGER NOT NULL,
      fecha TEXT DEFAULT (datetime('now','localtime')),
      total REAL NOT NULL DEFAULT 0,
      detalle TEXT,
      FOREIGN KEY (idproforma) REFERENCES proformas(idproforma),
      FOREIGN KEY (idcliente) REFERENCES clientes(idcliente)
    );

    CREATE TABLE IF NOT EXISTS venta_detalle (
      iddetalle INTEGER PRIMARY KEY AUTOINCREMENT,
      idventa INTEGER NOT NULL,
      idarticulo INTEGER NOT NULL,
      cantidad INTEGER NOT NULL DEFAULT 1,
      precio_venta REAL NOT NULL DEFAULT 0,
      descuento REAL NOT NULL DEFAULT 0,
      subtotal REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (idventa) REFERENCES ventas(idventa),
      FOREIGN KEY (idarticulo) REFERENCES articulos(idarticulo)
    );
  `);

  // Migración: agregar columna descuento si no existe (para instalaciones previas)
  try {
    await db.execAsync('ALTER TABLE proforma_detalle ADD COLUMN descuento REAL NOT NULL DEFAULT 0');
  } catch (_) {}
  try {
    await db.execAsync('ALTER TABLE venta_detalle ADD COLUMN descuento REAL NOT NULL DEFAULT 0');
  } catch (_) {}
};

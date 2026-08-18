#!/usr/bin/env node
'use strict';

/**
 * Inicialización estructural de Flutt-Water.
 *
 * Seguridad:
 * - No contiene credenciales ni valores reales.
 * - Usa GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_JSON.
 * - Funciona en dry-run por defecto; requiere --apply para escribir.
 * - No crea usuarios, clientes, rutas, jornadas, ventas, cajas ni movimientos.
 * - Es idempotente: usa IDs explícitos y set(..., { merge: true }).
 *
 * Uso:
 *   node scripts/init-firestore-structure.js --config ./firestore-structure.config.json
 *   node scripts/init-firestore-structure.js --config ./firestore-structure.config.json --apply
 *
 * Dependencia:
 *   npm install firebase-admin
 */

const fs = require('node:fs');
const path = require('node:path');

let admin;
try {
  admin = require('firebase-admin');
} catch (error) {
  console.error('Falta firebase-admin. Instala la dependencia con: npm install firebase-admin');
  process.exit(1);
}

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const configIndex = args.indexOf('--config');
const configPath = configIndex >= 0 ? args[configIndex + 1] : '';

if (!configPath) {
  console.error('Uso: node scripts/init-firestore-structure.js --config <archivo.json> [--apply]');
  process.exit(1);
}

const absoluteConfigPath = path.resolve(process.cwd(), configPath);
if (!fs.existsSync(absoluteConfigPath)) {
  console.error(`No existe el archivo de configuración: ${absoluteConfigPath}`);
  process.exit(1);
}

let config;
try {
  config = JSON.parse(fs.readFileSync(absoluteConfigPath, 'utf8'));
} catch (error) {
  console.error(`El archivo de configuración no es JSON válido: ${error.message}`);
  process.exit(1);
}

const requiredArrays = ['ubicaciones', 'medidores', 'plantas', 'productos'];
for (const key of requiredArrays) {
  if (config[key] !== undefined && !Array.isArray(config[key])) {
    console.error(`La propiedad "${key}" debe ser un arreglo.`);
    process.exit(1);
  }
}

const collections = {
  ubicaciones: 'ubicaciones',
  medidores: 'medidores',
  plantas: 'plantas',
  productos: 'productos'
};

const assertId = (entry, collectionName) => {
  if (!entry || typeof entry.id !== 'string' || !entry.id.trim()) {
    throw new Error(`Cada elemento de ${collectionName} necesita un id explícito.`);
  }
  if (entry.id.includes('/')) {
    throw new Error(`El id ${entry.id} de ${collectionName} no puede contener '/'.`);
  }
};

const byId = (items, name) => {
  const map = new Map();
  for (const item of items || []) {
    assertId(item, name);
    if (map.has(item.id)) throw new Error(`ID duplicado en ${name}: ${item.id}`);
    map.set(item.id, item);
  }
  return map;
};

const ubicaciones = byId(config.ubicaciones || [], 'ubicaciones');
const medidores = byId(config.medidores || [], 'medidores');
const plantas = byId(config.plantas || [], 'plantas');
const productos = byId(config.productos || [], 'productos');

for (const medidor of medidores.values()) {
  if (!['vehiculo', 'planta'].includes(medidor.tipo)) {
    throw new Error(`El medidor ${medidor.id} debe tener tipo "vehiculo" o "planta".`);
  }
  if (!medidor.tipoFlujoMedidor || !medidor.unidadMedida || Number(medidor.cantidadPorDigito ?? medidor.factorLitrosPorUnidad) <= 0) {
    throw new Error(`El medidor ${medidor.id} necesita tipoFlujoMedidor, unidadMedida y cantidadPorDigito mayor que cero.`);
  }
  if (Array.isArray(medidor.preciosMedidor) && medidor.preciosMedidor.length > 5) {
    throw new Error(`El medidor ${medidor.id} no puede tener más de cinco precios.`);
  }
  if (medidor.tipoFlujoMedidor !== 'volumen_acumulado' && Array.isArray(medidor.preciosMedidor) && medidor.preciosMedidor.length > 0) {
    throw new Error(`El medidor ${medidor.id} solo puede tener precios si su magnitud es volumen_acumulado.`);
  }
  if (medidor.propietarioTipo && medidor.propietarioId) {
    if (medidor.propietarioTipo === 'planta' && !plantas.has(medidor.propietarioId)) {
      throw new Error(`El medidor ${medidor.id} referencia una planta inexistente: ${medidor.propietarioId}`);
    }
  }
}

for (const planta of plantas.values()) {
  if (planta.ubicacionId && !ubicaciones.has(planta.ubicacionId)) {
    throw new Error(`La planta ${planta.id} referencia una ubicación inexistente: ${planta.ubicacionId}`);
  }
  if (planta.medidorId && !medidores.has(planta.medidorId)) {
    throw new Error(`La planta ${planta.id} referencia un medidor inexistente: ${planta.medidorId}`);
  }
}

for (const producto of productos.values()) {
  if (!producto.nombre || !producto.tipoProducto || !producto.unidadInventario) {
    throw new Error(`El producto ${producto.id} necesita nombre, tipoProducto y unidadInventario.`);
  }
  if (producto.tipoVenta && !['granel', 'pieza', 'paquete', 'peso', 'unidad'].includes(producto.tipoVenta)) {
    throw new Error(`El producto ${producto.id} tiene un tipoVenta no soportado.`);
  }
  if (producto.contenidoPorUnidad !== undefined && Number(producto.contenidoPorUnidad) < 0) {
    throw new Error(`El contenidoPorUnidad del producto ${producto.id} no puede ser negativo.`);
  }
  if (producto.unidadContenido !== undefined && typeof producto.unidadContenido !== 'string') {
    throw new Error(`La unidadContenido del producto ${producto.id} debe ser texto.`);
  }
  if (producto.unidadInventario === 'litro' && Number(producto.contenidoLitros || 0) < 0) {
    throw new Error(`El contenidoLitros del producto ${producto.id} no puede ser negativo.`);
  }
  if (producto.productoVacioId && !productos.has(producto.productoVacioId)) {
    throw new Error(`El producto ${producto.id} referencia un envase vacío inexistente: ${producto.productoVacioId}`);
  }
  if (producto.productoContenidoId && !productos.has(producto.productoContenidoId)) {
    throw new Error(`El paquete ${producto.id} referencia un SKU de contenido inexistente: ${producto.productoContenidoId}`);
  }
}

const credentialJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS && !credentialJson) {
  console.error('Configura GOOGLE_APPLICATION_CREDENTIALS o FIREBASE_SERVICE_ACCOUNT_JSON. Nunca guardes la credencial en Git.');
  process.exit(1);
}

if (credentialJson) {
  try {
    const serviceAccount = JSON.parse(credentialJson);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  } catch (error) {
    console.error(`FIREBASE_SERVICE_ACCOUNT_JSON no es válido: ${error.message}`);
    process.exit(1);
  }
} else {
  admin.initializeApp({ credential: admin.credential.applicationDefault() });
}

const db = admin.firestore();
const now = admin.firestore.FieldValue.serverTimestamp();

const buildWrites = () => {
  const writes = [];
  const add = (collection, id, data) => writes.push({ collection, id, data });

  for (const item of ubicaciones.values()) {
    add(collections.ubicaciones, item.id, {
      ...item,
      activa: item.activa !== false,
      actualizadoEn: now,
      origenBootstrap: 'flutt-water-structure'
    });
  }

  for (const item of medidores.values()) {
    add(collections.medidores, item.id, {
      ...item,
      permiteDecimales: item.permiteDecimales !== false,
      activo: item.activo !== false,
      actualizadoEn: now,
      origenBootstrap: 'flutt-water-structure'
    });
  }

  for (const item of plantas.values()) {
    add(collections.plantas, item.id, {
      ...item,
      activa: item.activa !== false,
      actualizadoEn: now,
      origenBootstrap: 'flutt-water-structure'
    });
  }

  for (const item of productos.values()) {
    add(collections.productos, item.id, {
      ...item,
      activo: item.activo !== false,
      actualizadoEn: now,
      origenBootstrap: 'flutt-water-structure'
    });
  }

  // Este documento es un marcador de versión, no un dato operativo.
  add('_meta', 'schema_inventory_plant_v1', {
    schemaVersion: 'inventory-plant-v1',
    collections: [
      'ubicaciones',
      'medidores',
      'plantas',
      'productos',
      'inventario_saldos',
      'movimientos_inventario',
      'operaciones',
      'llenados_planta',
      'ventas',
      'movimientos_caja',
      'envases_prestados'
    ],
    creadoPor: 'scripts/init-firestore-structure.js',
    actualizadoEn: now
  });

  return writes;
};

const writes = buildWrites();
console.log(`${apply ? 'APPLY' : 'DRY-RUN'}: ${writes.length} documentos preparados.`);
for (const write of writes) console.log(`- ${write.collection}/${write.id}`);

if (!apply) {
  console.log('Dry-run terminado. Agrega --apply para escribir en Firestore.');
  process.exit(0);
}

(async () => {
  for (let offset = 0; offset < writes.length; offset += 450) {
    const chunk = writes.slice(offset, offset + 450);
    const batch = db.batch();
    for (const write of chunk) {
      batch.set(db.collection(write.collection).doc(write.id), write.data, { merge: true });
    }
    await batch.commit();
  }
  console.log('Inicialización estructural completada.');
})().catch(error => {
  console.error(`Falló la inicialización: ${error.message}`);
  process.exit(1);
});

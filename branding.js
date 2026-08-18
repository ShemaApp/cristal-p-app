/* Flutt-Water — identidad técnica y marca comercial configurable. */
const BRANDING_DEFAULTS = Object.freeze({
  nombreComercial: 'Flutt-Water',
  subtitulo: 'Purificadora y reparto de agua',
  lema: '',
  telefono: '',
  logoPath: 'icons/icon-192.png',
  logoLoginPath: 'icons/logo-flutt-water-login-3d.png'
});

function normalizarBranding(data = {}) {
  const texto = (value, fallback, max) => {
    const limpio = String(value ?? '').trim().replace(/\s+/g, ' ');
    return (limpio || fallback).slice(0, max);
  };
  const logoPath = String(data.logoPath || BRANDING_DEFAULTS.logoPath).trim();
  const logoLoginPath = String(data.logoLoginPath || BRANDING_DEFAULTS.logoLoginPath).trim();
  return {
    nombreComercial: texto(data.nombreComercial, BRANDING_DEFAULTS.nombreComercial, 80),
    subtitulo: texto(data.subtitulo, BRANDING_DEFAULTS.subtitulo, 100),
    lema: texto(data.lema, '', 120),
    telefono: String(data.telefono || '').trim().slice(0, 30),
    logoPath: /^([\w./-]+)$/.test(logoPath) ? logoPath : BRANDING_DEFAULTS.logoPath,
    logoLoginPath: /^([\w./-]+)$/.test(logoLoginPath) ? logoLoginPath : BRANDING_DEFAULTS.logoLoginPath
  };
}

function brandingTitulo(branding) {
  return normalizarBranding(branding).nombreComercial;
}

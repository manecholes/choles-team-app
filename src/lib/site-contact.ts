/**
 * Datos de contacto publico del club, reusados en el header/footer del
 * sitio, la pagina /contacto y la pagina /tienda (para preguntar por un
 * producto). Numero de WhatsApp: el mismo que ya usa el bot del club.
 */
export const CLUB_WHATSAPP_NUMBER = "573246384445";
export const CLUB_EMAIL = "contacto@cholesteam.com";

export function buildWhatsAppLink(message?: string) {
  const base = `https://wa.me/${CLUB_WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function buildMailtoLink(subject?: string) {
  return subject ? `mailto:${CLUB_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${CLUB_EMAIL}`;
}

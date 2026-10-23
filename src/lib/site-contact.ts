/**
 * Datos de contacto publico del club, reusados en el header/footer del
 * sitio, la pagina /contacto y la pagina /tienda (para preguntar por un
 * producto). Numero principal de WhatsApp: el mismo que ya usa el bot del club.
 */
export const CLUB_WHATSAPP_NUMBER = "573246384445";
/** Segundo numero de contacto del club (se muestra en el pie de pagina y en /contacto). */
export const CLUB_WHATSAPP_NUMBER_2 = "573013739651";

/** Todos los numeros de WhatsApp que se muestran al publico, en orden. */
export const CLUB_WHATSAPP_NUMBERS = [CLUB_WHATSAPP_NUMBER, CLUB_WHATSAPP_NUMBER_2];

/** "573246384445" -> "324 638 4445" (se muestra sin el indicativo de Colombia). */
export function prettyPhone(n: string) {
  const local = n.startsWith("57") ? n.slice(2) : n;
  return local.length === 10 ? `${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}` : local;
}

/** Enlace de WhatsApp a un numero especifico (opcionalmente con mensaje ya escrito). */
export function buildWhatsAppLinkTo(number: string, message?: string) {
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
export const CLUB_EMAIL = "cholesteambc@gmail.com";

export function buildWhatsAppLink(message?: string) {
  const base = `https://wa.me/${CLUB_WHATSAPP_NUMBER}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function buildMailtoLink(subject?: string) {
  return subject ? `mailto:${CLUB_EMAIL}?subject=${encodeURIComponent(subject)}` : `mailto:${CLUB_EMAIL}`;
}

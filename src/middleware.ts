import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

/**
 * Protege las rutas de la app (todo lo que no sea /login ni /api/auth/*).
 * Corre en el runtime Edge, por eso usa `jose` (compatible con Web Crypto)
 * en vez de `jsonwebtoken`. Solo valida firma/expiracion del access token;
 * la resolucion fina de     permisos por rol se hace en cada pagina/ruta API
 * (que si corren en Node.js y pueden consultar la base de datos si hace
 * falta).
 */

const PUBLIC_PATHS = [
    // Landing page publica (cholesteam.com); si ya hay sesion, page.tsx
    // redirige a /dashboard, pero primero debe poder cargar sin ser
    // interceptada por este middleware.
    "/",
  "/login",
  "/api/auth/login",
  "/api/auth/refresh",
  // Webhook oficial de WhatsApp Business (Meta) -- lo llama Meta directamente,
  // sin sesion de usuario, asi que no puede exigir el access_token del login.
  // La unica proteccion de esta ruta es el WHATSAPP_VERIFY_TOKEN (ver
  // src/app/api/whatsapp/webhook/route.ts).
  "/api/whatsapp/webhook",
  // Politica de privacidad publica -- requerida por Meta para publicar la
  // app de WhatsApp Business Platform (debe ser accesible sin sesion).
  "/privacidad",
];

function isPublic(pathname: string) {
  return (
    PUBLIC_PATHS.some((p) => pathname === p) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/public")
  );
}

async function isValidAccessToken(token: string | undefined) {
  if (!token) return false;
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return false;
  try {
    await jwtVerify(token, new TextEncoder().encode(secret));
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublic(pathname)) {
    return NextResponse.next();
  }

  const token = req.cookies.get("access_token")?.value;
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : undefined;

  const valid =
    (await isValidAccessToken(token)) || (await isValidAccessToken(bearerToken));

  if (!valid) {
    // Las llamadas API devuelven 401 JSON; la navegacion normal redirige a /login
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Aplica a todo excepto archivos estaticos de Next y assets publicos.
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};

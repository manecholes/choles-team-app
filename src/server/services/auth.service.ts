import "server-only";
import crypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import {
  hashPassword,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from "@/lib/auth";
import { UnauthorizedError } from "@/lib/auth";

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function authenticate(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
    include: { club: true },
  });

  if (!user || !user.active) {
    throw new UnauthorizedError("Credenciales invalidas");
  }

  const validPassword = await verifyPassword(password, user.passwordHash);
  if (!validPassword) {
    throw new UnauthorizedError("Credenciales invalidas");
  }

  if (user.club && !user.club.active) {
    throw new UnauthorizedError("El club de este usuario esta inactivo");
  }

  const accessToken = await signAccessToken({
    userId: user.id,
    role: user.role,
    clubId: user.clubId,
    email: user.email,
  });

  // Se guarda el hash del refresh token (nunca el token en claro) para poder
  // revocarlo (logout, cambio de password, "cerrar todas las sesiones").
  const placeholderExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);
  const refreshRecord = await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: "pending", // se reemplaza abajo una vez firmado, evita 2 inserts
      expiresAt: placeholderExpiry,
    },
  });

  const refreshToken = await signRefreshToken({
    userId: user.id,
    tokenId: refreshRecord.id,
  });

  await prisma.refreshToken.update({
    where: { id: refreshRecord.id },
    data: { tokenHash: hashToken(refreshToken) },
  });

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  const { passwordHash: _omit, ...safeUser } = user;
  return { accessToken, refreshToken, user: safeUser };
}

export async function rotateRefreshToken(refreshToken: string) {
  const decoded = await verifyRefreshToken(refreshToken);
  if (!decoded) throw new UnauthorizedError("Refresh token invalido");

  const record = await prisma.refreshToken.findUnique({
    where: { id: decoded.tokenId },
    include: { user: true },
  });

  if (
    !record ||
    record.revokedAt ||
    record.expiresAt < new Date() ||
    record.tokenHash !== hashToken(refreshToken) ||
    record.userId !== decoded.userId
  ) {
    throw new UnauthorizedError("Sesion expirada, inicia sesion nuevamente");
  }

  if (!record.user.active) {
    throw new UnauthorizedError("Usuario inactivo");
  }

  // Rotacion: se revoca el token usado y se emite uno nuevo (mitiga replay).
  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const newRecord = await prisma.refreshToken.create({
    data: {
      userId: record.userId,
      tokenHash: "pending",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    },
  });

  const newRefreshToken = await signRefreshToken({
    userId: record.userId,
    tokenId: newRecord.id,
  });

  await prisma.refreshToken.update({
    where: { id: newRecord.id },
    data: { tokenHash: hashToken(newRefreshToken) },
  });

  const accessToken = await signAccessToken({
    userId: record.user.id,
    role: record.user.role,
    clubId: record.user.clubId,
    email: record.user.email,
  });

  return { accessToken, refreshToken: newRefreshToken };
}

export async function revokeRefreshToken(refreshToken: string) {
  const decoded = await verifyRefreshToken(refreshToken).catch(() => null);
  if (!decoded) return;
  await prisma.refreshToken
    .update({
      where: { id: decoded.tokenId },
      data: { revokedAt: new Date() },
    })
    .catch(() => {
      /* token ya no existe o ya estaba revocado: no es un error para logout */
    });
}

export async function changePassword(
  userId: number,
  currentPassword: string,
  newPassword: string
) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new UnauthorizedError("La contrasena actual no es correcta");

  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newHash, mustChangePassword: false },
  });

  // Al cambiar la clave se revocan todas las sesiones activas por seguridad.
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
}

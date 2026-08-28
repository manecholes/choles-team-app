import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { getPlayerProfile } from "@/server/services/player.service";
import { can } from "@/lib/permissions";
import { PlayerProfileTabs } from "@/components/player/PlayerProfileTabs";

export default async function PlayerProfilePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!user.clubId) redirect("/dashboard");

  const profile = await getPlayerProfile(user.clubId, Number(params.id));

  return (
    <div className="space-y-6">
      <Link href="/jugadores" className="inline-flex items-center gap-1 text-sm text-turqui-700 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Volver a jugadores
      </Link>

      <PlayerProfileTabs
        profile={JSON.parse(JSON.stringify(profile))}
        canEdit={can(user.role, "players:write")}
        canManageDocuments={can(user.role, "documents:write")}
      />
    </div>
  );
}

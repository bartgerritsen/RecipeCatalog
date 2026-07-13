import ConnectClient from "./ConnectClient";
import { getUserId } from "@/lib/auth";
import { isConnected } from "@/lib/ah/tokens";

export const dynamic = "force-dynamic";

export default async function ConnectPage() {
  const userId = await getUserId();
  const connected = userId ? await isConnected(userId) : false;
  return <ConnectClient initiallyConnected={connected} />;
}

import BrowseClient from "./BrowseClient";
import { listLocalRecipes } from "@/lib/recipes/list";

export const dynamic = "force-dynamic";

export default async function BrowsePage() {
  const initial = await listLocalRecipes();
  return (
    <>
      <h1 style={{ marginBottom: 0 }}>Recepten</h1>
      <p className="muted" style={{ marginTop: 4 }}>
        Blader door alle recepten. Zoek je iets specifieks en het staat er niet bij, dan halen we
        recepten van Albert Heijn erbij.
      </p>
      <BrowseClient initial={initial} />
    </>
  );
}

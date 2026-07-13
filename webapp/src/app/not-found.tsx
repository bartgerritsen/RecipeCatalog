import Link from "next/link";

export default function NotFound() {
  return (
    <div className="empty">
      <h1>Niet gevonden</h1>
      <p>Dit recept bestaat niet (meer) of is verlopen.</p>
      <Link href="/browse" className="btn primary">
        Naar recepten
      </Link>
    </div>
  );
}

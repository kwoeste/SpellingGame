import Link from "next/link";
import { Mascot } from "@/components/ui/Mascot";

export default function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <Mascot mood="think" size={120} />
        <h1>Page not found</h1>
        <p>We couldn&apos;t find what you&apos;re looking for. It might have moved or been removed.</p>
        <div className="not-found-links">
          <Link href="/" className="btn">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

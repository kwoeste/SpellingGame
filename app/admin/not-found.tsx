import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="ad-wrap" style={{ paddingTop: 60, textAlign: "center" }}>
      <div className="ad-empty-state">
        <span className="ad-empty-icon">🔍</span>
        <h3 className="ad-empty-title">Page not found</h3>
        <p className="ad-empty-hint">
          This admin page doesn&apos;t exist or may have been moved.
        </p>
        <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/admin" className="ad-btn">
            Back to Admin
          </Link>
          <Link href="/" className="ad-btn secondary">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

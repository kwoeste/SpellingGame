import Link from "next/link";

export default function AdminNotFound() {
  return (
    <div className="pd-wrap" style={{ paddingTop: 60, textAlign: "center" }}>
      <div className="pd-empty-state">
        <span className="pd-empty-icon">🔍</span>
        <h3 className="pd-empty-title">Page not found</h3>
        <p className="pd-empty-hint">
          This admin page doesn&apos;t exist or may have been moved.
        </p>
        <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
          <Link href="/admin" className="pd-btn">
            Back to Admin
          </Link>
          <Link href="/" className="pd-btn secondary">
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="wrap" style={{ paddingTop: 0, paddingBottom: 0 }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <div
            style={{
              width: 56,
              height: 56,
              border: "3px solid white",
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              fontWeight: 800,
            }}
          >
            MW
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.6rem" }}>MW Design</h1>
            <p style={{ margin: "4px 0 10px", opacity: 0.9 }}>3D printing, games, and Study</p>
            <nav className="site-nav" aria-label="Main">
              <Link href="/">Shop</Link>
              <Link href="/store">Store</Link>
              <Link href="/games">Games</Link>
              <Link href="/study">Study</Link>
              <Link href="/sign-in">Sign in</Link>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

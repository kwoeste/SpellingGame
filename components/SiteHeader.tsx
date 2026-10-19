import Link from "next/link";
import { auth, signOut } from "@/lib/auth/config";
import { headerNav, headerViewer, type HeaderNav } from "@/lib/nav";

export async function SiteHeader() {
  const session = await auth().catch(() => null);
  return <SiteHeaderView nav={headerNav(headerViewer(session))} />;
}

export function SiteHeaderView({ nav }: { nav: HeaderNav }) {
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
            <p style={{ margin: "4px 0 10px", opacity: 0.9 }}>Free 3D prints</p>
            <nav className="site-nav" aria-label="Main">
              {nav.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              {nav.account === "sign-in" ? (
                <Link href="/sign-in">Sign in</Link>
              ) : (
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/store" });
                  }}
                >
                  <button type="submit" className="linkish">
                    Sign out
                  </button>
                </form>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}

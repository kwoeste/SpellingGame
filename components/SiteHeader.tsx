import Link from "next/link";
import { auth, signOut } from "@/lib/auth/config";
import { headerNav, headerViewer, type HeaderNav } from "@/lib/nav";
import { Mascot } from "@/components/ui/Mascot";
import { SoundToggle } from "@/components/ui/SoundToggle";

export async function SiteHeader() {
  const session = await auth().catch(() => null);
  return <SiteHeaderView nav={headerNav(headerViewer(session))} />;
}

export function SiteHeaderView({ nav }: { nav: HeaderNav }) {
  return (
    <header className="site-header">
      <div className="site-header-inner">
        <Link href={nav.homeHref} className="brand" aria-label="Mae's Lab home">
          <span className="brand-mark">
            <Mascot size={52} />
          </span>
          <span>
            <h1>Mae&apos;s Lab</h1>
            <p>{nav.account === "sign-in" ? "Free 3D prints" : "Let's learn"}</p>
          </span>
        </Link>
        <div className="site-header-right">
          {nav.links.length ? (
            <nav className="site-nav" aria-label="Main">
              {nav.links.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
            </nav>
          ) : (
            <nav className="site-nav" aria-label="Main" />
          )}
          {nav.account === "sign-out" ? (
            <div className="site-header-tools">
              <SoundToggle />
            </div>
          ) : null}
          {nav.account === "sign-in" ? (
            <Link href="/sign-in" className="header-account">
              Sign in
            </Link>
          ) : (
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button type="submit" className="header-account">
                Sign out
              </button>
            </form>
          )}
        </div>
      </div>
    </header>
  );
}

import { Mascot } from "@/components/ui/Mascot";

export function NotAllowed() {
  return (
    <main className="kid-shell">
      <div className="card" style={{ textAlign: "center", maxWidth: 480, margin: "40px auto" }}>
        <Mascot mood="think" size={96} />
        <h1>Not allowed</h1>
        <p>You do not have access to this page.</p>
      </div>
    </main>
  );
}

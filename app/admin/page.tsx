import Link from "next/link";

export default function AdminHomePage() {
  return (
    <div className="wrap">
      <h1>Parent dashboard</h1>
      <p>Admin only. Mae never sees mastery, time, or strategy here.</p>
      <div className="grid cols-2">
        <Link className="card" href="/admin/knowledge-map">Knowledge map</Link>
        <Link className="card" href="/admin/wrong-answers">Wrong answers</Link>
        <Link className="card" href="/admin/privacy">Privacy</Link>
      </div>
    </div>
  );
}

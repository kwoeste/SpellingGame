/** Same header on every admin page: small kicker, plain title, one-sentence description. */
export function PageHeader({ kicker, title, lead }: { kicker: string; title: string; lead: string }) {
  return (
    <header className="pd-page-header">
      <p className="pd-kicker">{kicker}</p>
      <h1>{title}</h1>
      <p className="pd-lead">{lead}</p>
    </header>
  );
}

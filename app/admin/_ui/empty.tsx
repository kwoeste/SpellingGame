export function EmptyState(props: { title: string; body: string }) {
  return (
    <div className="ad-empty">
      <h3>{props.title}</h3>
      <p>{props.body}</p>
    </div>
  );
}

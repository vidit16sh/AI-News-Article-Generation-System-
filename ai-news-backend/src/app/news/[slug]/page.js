export default function ArticlePage({ params }) {
  return (
    <div style={{ padding: "40px", color: "white" }}>
      <h1>Article: {params.slug}</h1>
      <p>Content will load here…</p>
    </div>
  );
}

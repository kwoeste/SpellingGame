import Link from "next/link";

export default function ThankYouPage() {
  return (
    <div className="wrap">
      <div className="card" style={{ maxWidth: 520, margin: "40px auto", textAlign: "center" }}>
        <h1>Request Received!</h1>
        <p>Thank you. Mae will get started on your free print soon.</p>
        <ol style={{ textAlign: "left" }}>
          <li>Your request arrives by email.</li>
          <li>Mae prints the item in the color you chose.</li>
          <li>Your print is sent to you — free.</li>
        </ol>
        <Link className="btn" href="/" style={{ display: "inline-block", textDecoration: "none" }}>
          Back to shop
        </Link>
      </div>
    </div>
  );
}

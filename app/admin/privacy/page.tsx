import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin · Privacy | Mae's Lab",
};

export default function AdminPrivacyPage() {
  return (
    <div className="pd-wrap">
      <p className="pd-kicker">Privacy</p>
      <h1>What we keep</h1>
      <div className="pd-card">
        <ul>
          <li>Collected: Google email for sign-in, nickname, learning events, likes, coarse device type.</li>
          <li>Not collected: date of birth, address, school ID, photos, voice, location.</li>
          <li>Raw events are kept 24 months, then rolled up.</li>
          <li>Mae never sees this page. Admin-only, same gate as the rest of /admin.</li>
        </ul>
      </div>
    </div>
  );
}

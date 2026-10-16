export default function AdminPrivacyPage() {
  return (
    <div className="wrap">
      <h1>Privacy notes</h1>
      <ul>
        <li>Collected: Google email for sign-in, nickname, learning events, likes, coarse device type.</li>
        <li>Not collected: date of birth, address, school ID, photos, voice, location.</li>
        <li>Raw events are kept 24 months, then rolled up.</li>
      </ul>
    </div>
  );
}

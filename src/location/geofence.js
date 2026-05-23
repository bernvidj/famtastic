// ============================================
// FamTastic — geofence helpers (pure functions)
// ============================================

const EARTH_R = 6_371_000; // meter

export function haversineMeters(lat1, lng1, lat2, lng2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat  = toRad(lat2 - lat1);
  const dLng  = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_R * Math.asin(Math.sqrt(a));
}

// Returnerar den plats vars radie positionen är inom, eller null
export function findPlace(location, places) {
  if (!location || !Array.isArray(places)) return null;
  return (
    places.find((p) =>
      haversineMeters(
        location.latitude,
        location.longitude,
        p.latitude,
        p.longitude
      ) <= p.radius_meters
    ) || null
  );
}

// "Just nu" / "5 min sedan" / "Igår 18:42" / "2 maj 14:32"
export function formatLastSeen(timestamp) {
  if (!timestamp) return 'Okänt';
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60_000);

  if (mins < 2)  return 'Just nu';
  if (mins < 60) return `${mins} min sedan`;

  const hours = Math.floor(mins / 60);
  if (hours < 3) return `${hours} tim sedan`;

  const d   = new Date(timestamp);
  const now = new Date();
  const timeStr = d.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

  if (
    d.getDate()     === now.getDate() &&
    d.getMonth()    === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  ) {
    return `Idag ${timeStr}`;
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (
    d.getDate()     === yesterday.getDate() &&
    d.getMonth()    === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
  ) {
    return `Igår ${timeStr}`;
  }

  const dateStr = d.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' });
  return `${dateStr} ${timeStr}`;
}

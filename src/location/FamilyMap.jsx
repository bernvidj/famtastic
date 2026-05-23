// ============================================
// FamTastic — FamilyMap
// Leaflet-karta med en pin per aktiv familjemedlem
// ============================================

import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Leaflet behöver rätt ikon-URL:er (CRA buntar inte default-ikonerna)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Zoomar kartan till bounds för alla aktiva pins
function AutoBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (!positions.length) return;
    if (positions.length === 1) {
      map.setView([positions[0].lat, positions[0].lng], 14);
    } else {
      const bounds = L.latLngBounds(positions.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [40, 40] });
    }
  }, [positions, map]);
  return null;
}

function memberIcon(member) {
  const color = member.color || '#FF7A59';
  const emoji = member.avatar || '👤';
  const html = `
    <div style="
      width:38px; height:38px; border-radius:50%;
      background:${color};
      border:3px solid #fff;
      box-shadow:0 2px 8px rgba(0,0,0,0.25);
      display:flex; align-items:center; justify-content:center;
      font-size:20px; line-height:1;
    ">${emoji}</div>`;
  return L.divIcon({ html, className: '', iconSize: [38, 38], iconAnchor: [19, 19] });
}

export function FamilyMap({ locations, members }) {
  const active = locations.filter(
    (loc) => loc.sharing_enabled
  );

  const memberMap = Object.fromEntries(members.map((m) => [m.id, m]));

  const positions = active
    .filter((loc) => memberMap[loc.member_id])
    .map((loc) => ({ lat: loc.latitude, lng: loc.longitude, loc }));

  const center = positions.length
    ? [positions[0].lat, positions[0].lng]
    : [59.33, 18.07]; // Stockholm fallback

  return (
    <div style={{ height: '50vh', borderRadius: 16, overflow: 'hidden', border: '1.5px solid #F5F5F4' }}>
      <MapContainer
        center={center}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
        zoomControl={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <AutoBounds positions={positions} />
        {positions.map(({ lat, lng, loc }) => {
          const m = memberMap[loc.member_id];
          return (
            <Marker
              key={loc.member_id}
              position={[lat, lng]}
              icon={memberIcon(m)}
            />
          );
        })}
      </MapContainer>
    </div>
  );
}

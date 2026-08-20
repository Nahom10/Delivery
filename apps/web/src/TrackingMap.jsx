import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';

const destinationIcon = new L.Icon({ iconUrl: markerIconUrl, shadowUrl: markerShadowUrl, iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41] });
const riderIcon = new L.DivIcon({ className: 'rider-map-pin', html: '🛵', iconSize: [34, 34], iconAnchor: [17, 17] });

function FitRoute({ rider, destination }) {
  const map = useMap();
  useEffect(() => { map.fitBounds([[rider.lat, rider.lng], [destination.lat, destination.lng]], { padding: [34, 34], maxZoom: 15, animate: true }); }, [map, rider.lat, rider.lng, destination.lat, destination.lng]);
  return null;
}

export default function TrackingMap({ rider, destination }) {
  if (!rider || !destination) return null;
  return <div className="tracking-map"><MapContainer center={[rider.lat, rider.lng]} zoom={14} scrollWheelZoom={false}><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><FitRoute rider={rider} destination={destination} /><Marker position={[rider.lat, rider.lng]} icon={riderIcon} /><Marker position={[destination.lat, destination.lng]} icon={destinationIcon} /></MapContainer><p>Rider’s latest shared location</p></div>;
}

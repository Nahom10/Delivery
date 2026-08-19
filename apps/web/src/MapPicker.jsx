import { useEffect } from 'react';
import L from 'leaflet';
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import markerIconUrl from 'leaflet/dist/images/marker-icon.png';
import markerShadowUrl from 'leaflet/dist/images/marker-shadow.png';
import 'leaflet/dist/leaflet.css';

const pinIcon = new L.Icon({ iconUrl: markerIconUrl, shadowUrl: markerShadowUrl, iconSize: [25, 41], iconAnchor: [12, 41], shadowSize: [41, 41] });

function MapEvents({ position, onChange }) {
  const map = useMap();
  useMapEvents({ click(event) { onChange({ lat: event.latlng.lat, lng: event.latlng.lng }); } });
  useEffect(() => { map.setView([position.lat, position.lng], Math.max(map.getZoom(), 14), { animate: true }); }, [map, position.lat, position.lng]);
  return null;
}

export default function MapPicker({ position, onChange }) {
  return <div className="map-picker"><MapContainer center={[position.lat, position.lng]} zoom={14} scrollWheelZoom={false} aria-label="Delivery location map"><MapEvents position={position} onChange={onChange} /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /><Marker position={[position.lat, position.lng]} icon={pinIcon} draggable eventHandlers={{ dragend: (event) => { const pin = event.target.getLatLng(); onChange({ lat: pin.lat, lng: pin.lng }); } }} /></MapContainer><p>Tap the map or drag the pin to your exact delivery point.</p></div>;
}

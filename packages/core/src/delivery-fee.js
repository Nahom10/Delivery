const EARTH_RADIUS_KM = 6371.0088;

function radians(value) { return Number(value) * Math.PI / 180; }

export function validCoordinates(point) {
  return point && Number.isFinite(Number(point.lat)) && Number.isFinite(Number(point.lng))
    && Math.abs(Number(point.lat)) <= 90 && Math.abs(Number(point.lng)) <= 180;
}

export function haversineKm(origin, destination) {
  if (!validCoordinates(origin) || !validCoordinates(destination)) throw new Error('Valid latitude and longitude are required');
  const latDelta = radians(Number(destination.lat) - Number(origin.lat));
  const lngDelta = radians(Number(destination.lng) - Number(origin.lng));
  const originLat = radians(origin.lat);
  const destinationLat = radians(destination.lat);
  const a = Math.sin(latDelta / 2) ** 2 + Math.cos(originLat) * Math.cos(destinationLat) * Math.sin(lngDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

export function pointInPolygon(point, polygon) {
  if (!validCoordinates(point) || !Array.isArray(polygon) || polygon.length < 3) return false;
  let contains = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index]; const b = polygon[previous];
    const intersects = ((Number(a.lat) > Number(point.lat)) !== (Number(b.lat) > Number(point.lat)))
      && (Number(point.lng) < (Number(b.lng) - Number(a.lng)) * (Number(point.lat) - Number(a.lat)) / (Number(b.lat) - Number(a.lat)) + Number(a.lng));
    if (intersects) contains = !contains;
  }
  return contains;
}

export function zoneAvailability(destination, zones = []) {
  const activeZones = zones.filter((zone) => zone.active !== false);
  const exclusions = activeZones.filter((zone) => zone.kind === 'exclusion');
  if (exclusions.some((zone) => zone.type === 'polygon' && pointInPolygon(destination, zone.coordinates))) {
    return { available: false, reason: 'This address is in an excluded delivery area.' };
  }
  const inclusions = activeZones.filter((zone) => zone.kind !== 'exclusion');
  if (!inclusions.length) return { available: true };
  const matchesInclusion = inclusions.some((zone) => {
    if (zone.type === 'radius') return haversineKm(zone.center, destination) <= Number(zone.radiusKm);
    return zone.type === 'polygon' && pointInPolygon(destination, zone.coordinates);
  });
  return matchesInclusion ? { available: true } : { available: false, reason: 'This address is outside the delivery service area.' };
}

export function deliveryFee({ distanceKm, subtotal, rules }) {
  const distance = Number(distanceKm); const basketTotal = Number(subtotal);
  if (!Number.isFinite(distance) || distance < 0 || !Number.isFinite(basketTotal) || basketTotal < 0) throw new Error('Distance and subtotal must be non-negative numbers');
  const normalized = {
    baseFee: Number(rules.baseFee), includedKm: Number(rules.includedKm), perKmRate: Number(rules.perKmRate),
    freeDeliveryThreshold: Number(rules.freeDeliveryThreshold), freeDeliveryMaxKm: Number(rules.freeDeliveryMaxKm), maxServiceKm: Number(rules.maxServiceKm)
  };
  if (Object.values(normalized).some((value) => !Number.isFinite(value) || value < 0)) throw new Error('Delivery rules must contain non-negative numbers');
  if (distance > normalized.maxServiceKm) return { available: false, reason: `Delivery is available up to ${normalized.maxServiceKm} km from the shop.`, fee: null };
  const freeDelivery = basketTotal >= normalized.freeDeliveryThreshold && distance <= normalized.freeDeliveryMaxKm;
  const additionalKm = Math.max(0, distance - normalized.includedKm);
  const fee = freeDelivery ? 0 : Math.round(normalized.baseFee + additionalKm * normalized.perKmRate);
  return { available: true, fee, freeDelivery, additionalKm: Math.round(additionalKm * 100) / 100, currency: rules.currency || 'ETB' };
}

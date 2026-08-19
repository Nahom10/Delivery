import { deliveryFee, haversineKm, validCoordinates, zoneAvailability } from '@allfreshmart/core/src/delivery-fee.js';

export function createDeliveryService({ openRouteServiceKey = '', fetchImpl = fetch } = {}) {
  async function drivingDistance(origin, destination) {
    if (!openRouteServiceKey) return null;
    const response = await fetchImpl('https://api.openrouteservice.org/v2/directions/driving-car', {
      method: 'POST',
      headers: { authorization: openRouteServiceKey, 'content-type': 'application/json' },
      body: JSON.stringify({ coordinates: [[Number(origin.lng), Number(origin.lat)], [Number(destination.lng), Number(destination.lat)]] })
    });
    if (!response.ok) throw new Error(`OpenRouteService returned ${response.status}`);
    const body = await response.json();
    const meters = body.routes?.[0]?.summary?.distance;
    if (!Number.isFinite(meters)) throw new Error('OpenRouteService did not return a route distance');
    return meters / 1000;
  }

  return {
    async quote({ origin, destination, subtotal, rules, zones }) {
      if (!validCoordinates(destination)) throw new Error('Choose a valid location on the map.');
      const zone = zoneAvailability(destination, zones);
      if (!zone.available) return { available: false, reason: zone.reason, distanceKm: null, source: null };
      let distanceKm; let source;
      try {
        distanceKm = await drivingDistance(origin, destination);
        source = 'openrouteservice';
      } catch (error) {
        // The checkout remains usable through the documented, conservative straight-line fallback.
        console.warn(`Driving route unavailable; using Haversine fallback: ${error.message}`);
      }
      if (distanceKm == null) {
        distanceKm = haversineKm(origin, destination) * 1.3;
        source = 'haversine_x_1.3';
      }
      const fee = deliveryFee({ distanceKm, subtotal, rules });
      return { ...fee, distanceKm: Math.round(distanceKm * 100) / 100, source };
    },
    async reverseGeocode({ lat, lng }) {
      if (!validCoordinates({ lat, lng })) throw new Error('Choose a valid location on the map.');
      const response = await fetchImpl(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}&addressdetails=1`, {
        headers: { 'user-agent': 'AllFreshMart-MiniApp/0.2 (support@example.com)', accept: 'application/json' }
      });
      if (!response.ok) throw new Error('We could not look up that location. You can enter the address details manually.');
      const result = await response.json();
      const address = result.address || {};
      return {
        displayName: result.display_name || '', street: [address.road, address.neighbourhood || address.suburb].filter(Boolean).join(', '),
        area: address.suburb || address.city_district || address.city || address.town || '', landmark: address.amenity || address.building || ''
      };
    }
  };
}

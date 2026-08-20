const ORDER_PATHS = {
  delivery: ['placed', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'completed'],
  pickup: ['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'collected', 'completed']
};

const CANCELLABLE_STATUSES = new Set(['placed', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery']);

export function orderStatuses(orderType) {
  const path = ORDER_PATHS[orderType];
  if (!path) throw new Error(`Unsupported order type: ${orderType}`);
  return [...path, 'cancelled', 'refunded'];
}

export function canTransition(orderType, from, to) {
  const path = ORDER_PATHS[orderType];
  if (!path || !path.includes(from) || !orderStatuses(orderType).includes(to)) return false;
  if (CANCELLABLE_STATUSES.has(from) && (to === 'cancelled' || to === 'refunded')) return true;
  return path.indexOf(to) === path.indexOf(from) + 1;
}

export function assertTransition(orderType, from, to) {
  if (!canTransition(orderType, from, to)) throw new Error(`Cannot move a ${orderType} order from ${from} to ${to}.`);
}

export function displayStatus(status) {
  return status.replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

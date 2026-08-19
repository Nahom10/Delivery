export function asMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

export function activeDiscount(product, at = new Date()) {
  const discount = product.discount;
  if (!discount || !discount.active) return null;
  if (discount.startsAt && new Date(discount.startsAt) > at) return null;
  if (discount.endsAt && new Date(discount.endsAt) <= at) return null;
  return discount;
}

export function priceFor(product, at = new Date()) {
  const price = Number(product.price);
  const discount = activeDiscount(product, at);
  if (!discount) return { original: price, current: price, discountPercent: 0 };

  const current = discount.kind === 'percentage'
    ? price * (1 - Number(discount.value) / 100)
    : Math.max(0, price - Number(discount.value));
  return {
    original: asMoney(price),
    current: asMoney(current),
    discountPercent: discount.kind === 'percentage'
      ? Number(discount.value)
      : Math.round((1 - current / price) * 100)
  };
}

export function cartSummary(lines, products, at = new Date()) {
  const byId = new Map(products.map((product) => [product.id, product]));
  const items = lines.map(({ productId, quantity }) => {
    const product = byId.get(productId);
    if (!product || !product.active) throw new Error(`Unknown product: ${productId}`);
    if (!Number.isInteger(quantity) || quantity < 1) throw new Error('Quantity must be a positive integer');
    if (product.stock < quantity) throw new Error(`${product.name} has insufficient stock`);
    const price = priceFor(product, at);
    return { productId, name: product.name, quantity, unit: product.unit, unitPrice: price.current, lineTotal: asMoney(price.current * quantity) };
  });
  return { items, subtotal: asMoney(items.reduce((sum, item) => sum + item.lineTotal, 0)) };
}

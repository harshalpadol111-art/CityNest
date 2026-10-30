const FOOD_IMAGES = [
  "https://images.unsplash.com/photo-1742281257707-0c7f7e5ca9c6?auto=format&fit=crop&w=1400&q=84",
  "https://images.unsplash.com/photo-1711153419402-336ee48f2138?auto=format&fit=crop&w=1400&q=84",
  "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=84",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1400&q=84",
  "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1400&q=84",
];

export function getFoodImage(id) {
  const numericId = Number(id);
  if (!Number.isFinite(numericId)) return FOOD_IMAGES[0];
  return FOOD_IMAGES[Math.abs(numericId - 1) % FOOD_IMAGES.length];
}

export { FOOD_IMAGES };

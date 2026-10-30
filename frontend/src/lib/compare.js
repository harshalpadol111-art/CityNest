const KEY = "citynest_compare";

export function getCompareSelection(type) {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || "{}");
    return Array.isArray(data[type]) ? data[type].map(Number) : [];
  } catch {
    return [];
  }
}

export function toggleCompare(type, id) {
  const current = getCompareSelection(type);
  const numericId = Number(id);
  const next = current.includes(numericId)
    ? current.filter((value) => value !== numericId)
    : current.length >= 3
      ? current
      : [...current, numericId];
  const data = JSON.parse(localStorage.getItem(KEY) || "{}");
  data[type] = next;
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("citynest-compare-change"));
  return next;
}

export function clearCompare(type) {
  const data = JSON.parse(localStorage.getItem(KEY) || "{}");
  delete data[type];
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("citynest-compare-change"));
}

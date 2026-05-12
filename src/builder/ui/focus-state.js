let pendingBuilderFocusKey = null;

export function requestBuilderFocus(key) {
  pendingBuilderFocusKey = key;
}

export function takePendingBuilderFocus() {
  const key = pendingBuilderFocusKey;
  pendingBuilderFocusKey = null;
  return key;
}
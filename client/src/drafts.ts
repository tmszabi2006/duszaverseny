const draftPrefix = 'minescript:draft:';

export function loadCustomDraft(mapId: number): string | null {
  try { return window.localStorage.getItem(`minescript:custom-draft:${mapId}`); } catch { return null; }
}

export function saveCustomDraft(mapId: number, source: string): void {
  try { window.localStorage.setItem(`minescript:custom-draft:${mapId}`, source); } catch { /* Storage is optional. */ }
}

export function draftKey(mapId: number): string {
  return `${draftPrefix}${mapId}`;
}

export function loadDraft(mapId: number): string | null {
  try {
    return window.localStorage.getItem(draftKey(mapId));
  } catch {
    return null;
  }
}

export function saveDraft(mapId: number, source: string): void {
  try {
    window.localStorage.setItem(draftKey(mapId), source);
  } catch {
    // Ha a böngésző tiltja a helyi tárolást, a játék továbbra is működik.
  }
}

export function clearDraft(mapId: number): void {
  try {
    window.localStorage.removeItem(draftKey(mapId));
  } catch {
    // Ugyanaz, mint a mentésnél.
  }
}

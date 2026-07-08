export function shouldShowPageIntro(storageKey: string): boolean {
  return localStorage.getItem(storageKey) !== "true";
}

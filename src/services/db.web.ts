// Web platform fallback for database operations.
// Returns null so all repositories use the robust AsyncStorage implementation on web.
export function getDatabase(): null {
  return null;
}

export function getRange(range: string) {
  const now = new Date();

  if (range === "1h") {
    return {
      from: new Date(now.getTime() - 1000 * 60 * 60),
      to: now,
    };
  }

  if (range === "24h") {
    return {
      from: new Date(now.getTime() - 1000 * 60 * 60 * 24),
      to: now,
    };
  }

  if (range === "7d") {
    return {
      from: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7),
      to: now,
    };
  }

  return null;
}

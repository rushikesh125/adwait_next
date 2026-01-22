const getDestinationOfpkg = (Quote) => {
  let resultString = "";

  if (
    !Quote ||
    !Array.isArray(Quote.hotelSummary) ||
    Quote.hotelSummary.length === 0
  ) {
    if (Quote?.transportSummary?.state) {
      return `${Quote.transportSummary.state} (Transport)\n`;
    }

    if (Array.isArray(Quote?.activitySummary)) {
      const map = new Map();
      Quote.activitySummary.forEach((a) => {
        if (a.state && a.city) {
          if (!map.has(a.state)) {
            map.set(a.state, new Set());
          }
          map.get(a.state).add(a.city);
        }
      });

      let str = "";
      map.forEach((cities, state) => {
        str += `${state} (${[...cities].join(", ")})\n`;
      });

      return str.trim() || "N/A";
    }

    return "N/A";
  }

  const map = new Map();

  Quote.hotelSummary.forEach((h) => {
    if (!map.has(h.state)) {
      map.set(h.state, new Set());
    }
    map.get(h.state).add(h.city);
  });

  map.forEach((cities, state) => {
    resultString += `${state} (${[...cities].join(", ")})\n`;
  });

  return resultString.trim();
};

// Shared-artifact copy only. The live town lookup (Open-Meteo) is blocked inside the
// artifact frame, so when it fails, search this built-in list of towns instead.
(function () {
  // [town, state or province, country, latitude, longitude]
  const TOWNS = [
    ["Princeton", "New Jersey", "United States", 40.357, -74.667],
    ["Trenton", "New Jersey", "United States", 40.221, -74.760],
    ["West Windsor", "New Jersey", "United States", 40.290, -74.624],
    ["Titusville", "New Jersey", "United States", 40.307, -74.868],
    ["New Brunswick", "New Jersey", "United States", 40.486, -74.452],
    ["Newark", "New Jersey", "United States", 40.736, -74.172],
    ["Jersey City", "New Jersey", "United States", 40.718, -74.043],
    ["Hoboken", "New Jersey", "United States", 40.744, -74.032],
    ["New York", "New York", "United States", 40.713, -74.006],
    ["Philadelphia", "Pennsylvania", "United States", 39.953, -75.165],
    ["Boston", "Massachusetts", "United States", 42.360, -71.059],
    ["Washington", "District of Columbia", "United States", 38.907, -77.037],
    ["Chicago", "Illinois", "United States", 41.878, -87.630],
    ["Atlanta", "Georgia", "United States", 33.749, -84.388],
    ["Miami", "Florida", "United States", 25.762, -80.192],
    ["Boulder", "Colorado", "United States", 40.015, -105.271],
    ["Denver", "Colorado", "United States", 39.739, -104.990],
    ["Flagstaff", "Arizona", "United States", 35.198, -111.651],
    ["Phoenix", "Arizona", "United States", 33.448, -112.074],
    ["Austin", "Texas", "United States", 30.267, -97.743],
    ["Houston", "Texas", "United States", 29.760, -95.370],
    ["Dallas", "Texas", "United States", 32.777, -96.797],
    ["Los Angeles", "California", "United States", 34.052, -118.244],
    ["San Francisco", "California", "United States", 37.775, -122.419],
    ["Seattle", "Washington", "United States", 47.606, -122.332],
    ["Portland", "Oregon", "United States", 45.515, -122.678],
    ["Portland", "Maine", "United States", 43.659, -70.257],
    ["Springfield", "Missouri", "United States", 37.209, -93.292],
    ["Springfield", "Illinois", "United States", 39.782, -89.650],
    ["Springfield", "Massachusetts", "United States", 42.102, -72.590],
    ["Toronto", "Ontario", "Canada", 43.653, -79.383],
    ["Montreal", "Quebec", "Canada", 45.502, -73.567],
    ["Vancouver", "British Columbia", "Canada", 49.283, -123.121],
    ["London", "England", "United Kingdom", 51.507, -0.128],
    ["Bristol", "England", "United Kingdom", 51.455, -2.588],
    ["Utrecht", "Utrecht", "Netherlands", 52.091, 5.121],
    ["Amsterdam", "North Holland", "Netherlands", 52.368, 4.904],
    ["Paris", "Île-de-France", "France", 48.857, 2.352],
    ["Berlin", "Berlin", "Germany", 52.520, 13.405],
    ["Melbourne", "Victoria", "Australia", -37.814, 144.963],
    ["Sydney", "New South Wales", "Australia", -33.869, 151.209],
  ];

  function offline(query, count) {
    const name = query.split(",")[0].trim().toLowerCase();
    const typed = query.split(",").slice(1).join(" ").trim().toLowerCase();
    const hint = REGION_ABBR[typed] || typed;
    const matchesHint = (t) => [t[1], t[2]].some((v) => v.toLowerCase().startsWith(hint));
    return TOWNS
      .filter((t) => name && t[0].toLowerCase().startsWith(name))
      .sort((a, b) => (hint ? matchesHint(b) - matchesHint(a) : 0))
      .slice(0, count)
      .map(([town, region, country, lat, lon]) => ({
        lat, lon, name: town,
        detail: [region, country].filter((v) => v !== town).join(", "),
        label: [town, region, country].join(", "),
      }));
  }

  const online = searchPlaces;
  searchPlaces = async (query, count = 10) => {
    try { return await online(query, count); }
    catch { return offline(query, count); }
  };
})();

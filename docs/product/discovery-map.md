# Discovery geography and experience context

The geographic index helps a first-time visitor distinguish Tokyo, Osaka and the Okinawa island groups before choosing a neighbourhood. Clicking a cluster zooms into its areas; clicking an area filters the catalogue. The ordinary area chooser remains available for keyboard use and unlocated ideas. The map does not calculate proximity, routing, transport, availability or opening hours.

`apps/friends/public/area-data.js` contains 144 public area references covering 276 of 300 catalogue entries. Each record retains its source page, source title, coordinates, read date and area-level precision. Wikimedia GeoData was read on September 8, 2026; the source title is the anchor, which can be a station, municipality, island or landmark. These are broad reference locations, never verified venue entrances. No runtime geocoding occurs.

Nine labels remain unlocated: Tokyo: arrange location; Tochigi; Osaka: arrange location; Inunaki; Ibakita; Osaka: confirm branch; Main island: arrange location; Awase; Main island: food mission. The Tochigi city and central Ibaraki station references were excluded because they would misleadingly locate wider catalogue outings. Unlocated entries remain in the list and never acquire invented pins.

Leaflet 1.9.4 is vendored from its official distribution, under its included BSD-2-Clause license. Base tiles use `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, visible attribution, ordinary browser caching and a valid origin referrer. Loading starts when the map enters the viewport, with no offline prefetch or tile buffer. Only public tile coordinates are requested; profile, hotel and host meeting information is not sent to this provider. Failed tiles leave the markers and area chooser usable. The service is best-effort and can be replaced in `discovery-map.js` if usage outgrows the public tile policy.

- [Leaflet distribution](https://leafletjs.com/download.html)
- [Wikimedia GeoData](https://www.mediawiki.org/wiki/Extension:GeoData)
- [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/)

Experience descriptions, practical information, source status and host notes are visible without nested disclosure. Karahori and its optional curry stop have expanded context; Komagata Dozeu explains the meal and links the official menu. The curry link explicitly identifies historical diner-uploaded menu photos. Restaurant selection and bookings are never inferred from an optional food link. Three additional licensed photos cover the Karahori arcade and Dozeu exterior/dish, bringing coverage to 27 entries and 28 images; the remaining entries stay text-led. Image provenance is under `apps/friends/public/assets/discovery/README.md`.

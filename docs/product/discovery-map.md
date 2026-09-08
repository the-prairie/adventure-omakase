# Discovery geography and experience context

The geographic index helps a first-time visitor distinguish Tokyo, Osaka and the Okinawa island groups before choosing a neighbourhood. Clicking a cluster zooms into its areas; clicking an area filters the catalogue. The ordinary area chooser remains available for keyboard use and unlocated ideas. The map does not calculate proximity, routing, transport, availability or opening hours.

`apps/friends/public/area-data.js` contains 144 public area references covering 276 of 300 catalogue entries. Each record retains its source page, source title, coordinates, read date and area-level precision. Wikimedia GeoData was read on September 8, 2026; the source title is the anchor, which can be a station, municipality, island or landmark. These are broad reference locations, never verified venue entrances. No runtime geocoding occurs.

Nine labels remain unlocated: Tokyo: arrange location; Tochigi; Osaka: arrange location; Inunaki; Ibakita; Osaka: confirm branch; Main island: arrange location; Awase; Main island: food mission. The Tochigi city and central Ibaraki station references were excluded because they would misleadingly locate wider catalogue outings. Unlocated entries remain in the list and never acquire invented pins.

Leaflet 1.9.4 is vendored from its official distribution, under its included BSD-2-Clause license. Base tiles use `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, visible attribution, ordinary browser caching and a valid origin referrer. Loading starts when the map enters the viewport, with no offline prefetch or tile buffer. Only public tile coordinates are requested; profile, hotel and host meeting information is not sent to this provider. Failed tiles leave the markers and area chooser usable. The service is best-effort and can be replaced in `discovery-map.js` if usage outgrows the public tile policy.

- [Leaflet distribution](https://leafletjs.com/download.html)
- [Wikimedia GeoData](https://www.mediawiki.org/wiki/Extension:GeoData)
- [OpenStreetMap tile policy](https://operations.osmfoundation.org/policies/tiles/)

Experience descriptions, practical information, source status and host notes are visible without nested disclosure. Karahori and its optional curry stop have expanded context; Komagata Dozeu explains the meal and links the official menu. The curry link explicitly identifies historical diner-uploaded menu photos. Restaurant selection and bookings are never inferred from an optional food link. Three additional licensed photos cover the Karahori arcade and Dozeu exterior/dish, bringing coverage to 27 entries and 28 images; the remaining entries stay text-led. Image provenance is under `apps/friends/public/assets/discovery/README.md`.

## Atlas dice

After a successful roll, the result takes focus and preferences collapse. Roll again reuses the current shortlist settings. Change preferences restores those settings and focuses the region control; the next successful roll collapses them again.

The selected interaction combines the atlas concept with tactile dice physics. The draw opens a map stage; dragging and releasing the die supplies bounded velocity to a short gravity, friction and rebound simulation. Tapping, keyboard activation and the form button use the same draw. The existing catalogue filter and unbiased random selection remain authoritative; gesture strength never changes eligibility or odds.

After the die settles, the map flies from the chosen area's wider surroundings to its area reference, then reveals the discovery card. The marker explicitly identifies an approximate area, not a venue entrance. Unlocated ideas receive no fabricated marker; failed tiles leave drawing and detail actions usable. Actual venue search and directions remain in the discovery detail and journey link. No new provider key, geolocation, audio, backend event or canonical plan is introduced.

`dice-atlas.js` owns presentation and cancellation. Closing or replacing the dialog disposes animation frames, event listeners and the Leaflet instance. Reduced-motion mode skips the physical roll, camera flight and card animation. Map tiles use the same attribution, referrer and no-prefetch policy as discovery geography. Browser-emulated touch layouts do not establish performance on physical phones.

## Connected Map and Fieldbook views — September 8

Fieldbook is the first-visit view. The explicit Map / Fieldbook switch preserves the shared filters, shortlist and selected discovery; the last chosen view is remembered on this device where local storage is available. Show on map links cards and details to their location. Selecting a site marker reveals its discovery; selecting an area filters the same collection. A new filter clears the previous selection so the camera does not follow a place outside the new region.

The primary map uses Google Maps JavaScript, loaded only on demand. Its DOM node and map instance survive ordinary re-renders and view switches, retaining the camera when the scope is unchanged. The map renders our own catalogue; it makes no Places, geocoding or routing calls. Fifteen existing discoveries now have site references from Wikimedia GeoData, recorded with source, precision and read date in `area-data.js`. These identify landmarks, not verified entrances or current operating status. Other discoveries remain grouped under their documented area anchors; the original unlocated records stay available through Fieldbook.

`GET /api/maps/config` returns only `GOOGLE_MAPS_BROWSER_KEY`, which is deliberately public and must be restricted to the deployed website and Maps JavaScript API. It never returns the existing server Maps key. The preview browser key is restricted to the preview origin and `maps-backend.googleapis.com`; production requires its own configured restriction. The document sends origin-only referrers so Google can validate the website restriction without receiving URL paths or query parameters. Existing explicit no-referrer embeds and links retain their policy.

If Google cannot load or is not configured, the existing Leaflet area map and accessible area chooser remain available. This is an area fallback, not a substitute claim of Google or exact-site verification. The dice presentation still uses its existing Leaflet map. Source research, privacy, fieldbook saves and canonical invitations remain independent of the map provider.

The existing CA$5 monthly Maps budget in `amateur-time` now covers Maps API, Places (New) and Routes: actual alerts at 50%, 90%, 100%, and a forecast alert at 100%. Alerts notify billing admins/users; they are not a spending cutoff. Configuration was read back through the Budget API. All five billed projects were checked for September 1–8 reported Maps requests before implementation; only the existing Places/Routes test traffic appeared. Monitoring is not final invoiced usage.

Empty dice shortlists show an explanation and recovery controls directly on the atlas instead of leaving an unexplained faded die. When only the regional/advance-arrangement exclusion blocks an otherwise matching idea, an explicit Include these ideas and roll action enables that option and draws; other filters remain in force. Change filters focuses the area chooser. No filter is relaxed automatically.

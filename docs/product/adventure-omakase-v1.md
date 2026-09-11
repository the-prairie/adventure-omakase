# Adventure Omakase — Ambitious Implementation Blueprint

> **A warm, editorial Japanese travel journal that becomes a live game master when friends cannot decide what to do next.**

The visual system should feel calm, premium and trustworthy before the roll, magical during the roll, and almost invisible once the adventure begins. It should not become a neon gaming app, a generic itinerary planner, or a kawaii mascot product.

The ambition should live in the **quality of the real-world experience**, not in an excessive number of screens or mechanics.

---

# 1. The product we are actually building

Adventure Omakase has five connected systems:

1. **Party Pulse** privately understands what everyone can enjoy.
2. **The Fate Contract** turns those preferences into explicit boundaries.
3. **The Adventure Compiler** finds and validates feasible experiences.
4. **Decision Dice** randomly selects among several genuinely good options.
5. **The Adventure Runtime** guides the group, repairs failures and records the memory.

The core promise is:

> **Give us control of the next hour, and we will give you something your group probably would not have chosen—but will be glad happened.**

## Non-negotiable product principles

| Principle                               | Consequence                                                     |
| --------------------------------------- | --------------------------------------------------------------- |
| Reachable, not merely nearby            | Rank by actual walking or transit time                          |
| Intelligence before randomness          | Dice select only from validated options                         |
| Reliability before delight              | An unreliable option never wins because it sounds exciting      |
| Group consent before mystery            | Cost, exertion, allergens and accessibility are never concealed |
| One decisive recommendation             | Do not replace indecision with another long list                |
| AI adds theatre, not facts              | Venue validity, routes and opening hours remain deterministic   |
| Graceful failure is part of the product | Every meaningful course has a fallback                          |
| Screens down during the adventure       | The app guides briefly, then gets out of the way                |
| Memories over engagement metrics        | Do not optimize for notifications or screen time                |
| Warm and human                          | No casino language, loot-box mechanics or manipulative rerolls  |

---

# 2. What should ship first

The first version should not attempt to cover all of Japan.

Despite the concept artwork showing Kyoto, make **Osaka the first production content city**, using three dense pilot zones:

- Namba, Shinsaibashi and Amerikamura
- Umeda and Nakazakicho
- Tennoji and Shinsekai

Those areas provide dense combinations of food, arcades, shopping streets, tiny cultural sites, atmospheric alleys, viewpoints and playful activities.

## First release scope

The first genuinely usable release should support:

- Groups of 2–8 friends
- Guest joining through an invite link or QR code
- One navigator sharing foreground location
- Party Pulse
- A 45-, 60-, 90- or 120-minute Fate Contract
- Walking-only adventures
- Six locked options
- One server-authoritative dice roll
- One- to three-course adventures
- A backup for every destination-dependent course
- Manual or proximity-based check-in
- A lightweight trip journal
- An offline Adventure Packet
- Three curated Osaka zones
- Approximately 100–150 verified adventure atoms

## Explicitly defer from the first release

Do not initially build:

- Public profiles or follower systems
- A public social feed
- XP economies or complex badges
- Paid rerolls
- Restaurant reservations
- Live queue guarantees
- Background location tracking
- Random long-distance transit
- AR characters
- Party Merge with strangers
- Fully generative itineraries
- Coverage for all Japanese cities
- Venue sponsorship inside dice results

Those can all be added later. None is required to prove that Adventure Omakase makes a real day better.

---

# 3. Build a native mobile app, not merely a responsive website

This product depends on:

- Location
- Haptics
- Device motion
- Camera and photo library
- Push notifications
- Offline persistence
- Deep links
- Reliable real-time group state
- A polished dice animation

Build the consumer experience in **React Native with Expo Router and strict TypeScript**. Expo Router provides native, file-based navigation across iOS, Android and web, while supporting deep links and universal links. Expo also provides device modules for location, secure local storage and persistent SQLite.

The product should consist of three surfaces:

| Surface                | Technology                      | Purpose                                        |
| ---------------------- | ------------------------------- | ---------------------------------------------- |
| **Mobile app**         | Expo, React Native, Expo Router | Traveler-facing experience                     |
| **Curator Studio**     | Next.js App Router              | Build and verify the Magic Graph               |
| **Operations Console** | Next.js App Router              | Monitor failures, provider health and feedback |

A lightweight public web surface should support:

- Invite landing pages
- Viewing a shared completed adventure
- Privacy policy and terms
- App-store routing
- Eventually, submitting a Party Pulse without installing the app

The full live experience remains native.

---

# 4. Recommended technical architecture

## Application stack

### Mobile

- React Native
- Expo Router
- Strict TypeScript
- React Native Reanimated
- Gesture Handler
- Rive or a similarly deterministic animation system for the dice ritual
- Expo Location
- Expo Haptics
- Expo SQLite
- Expo SecureStore
- Expo Notifications
- React Native Maps
- TanStack Query
- Zod
- React Hook Form
- Sentry
- PostHog or an equivalent privacy-aware product analytics layer

### Web and internal tools

- Next.js App Router
- React
- Strict TypeScript
- Tailwind CSS
- Radix or shadcn primitives for internal tools
- Zod
- TanStack Table
- Playwright

### Backend

- TypeScript API service
- Fastify with Zod-backed request contracts
- PostgreSQL
- PostGIS
- Supabase Auth
- Supabase Realtime
- Supabase Storage
- Drizzle for normal relational access
- Explicit SQL functions and views for complex PostGIS operations
- Redis only when usage proves it necessary
- Cloud Run for the Adventure Compiler API
- Scheduled jobs for content verification and operational refreshes

Supabase is pragmatic because it combines Postgres, Auth, Realtime and storage. Its Realtime product provides broadcast, presence and database-change subscriptions; Auth integrates with JWTs and database-level authorization; PostGIS supports spatially indexed proximity queries; and Row Level Security can enforce trip-level access inside Postgres itself.

## Maps and live place data

Use:

- Google Places Nearby Search
- Google Places Text Search
- Google Place Details
- Google Routes API
- A weather provider
- Curated event sources
- Adventure Omakase’s own Magic Graph

Nearby Search can retrieve places by area and type, while field masks let us request only the fields necessary at each stage. Routes can then calculate real walking or transit durations across candidate destinations.

Use Google Maps for the actual map surface on both iOS and Android. `react-native-maps` supports Google Maps on both platforms and can apply a Google Map ID for a custom warm visual style.

## High-level system diagram

```text
┌─────────────────────┐
│ React Native App    │
│                     │
│ Party Pulse         │
│ Fate Contract       │
│ Decision Dice       │
│ Adventure Runtime   │
│ Trip Journal        │
└──────────┬──────────┘
           │ HTTPS + Realtime
           ▼
┌───────────────────────────────────────────┐
│ Adventure Omakase API                    │
│                                           │
│ Session Service      Fate Service         │
│ Party Aggregator     Adventure Compiler   │
│ Revalidation         Journal Service      │
│ Media Service        Feedback Recorder    │
└──────────┬───────────────────┬────────────┘
           │                   │
           ▼                   ▼
┌──────────────────┐   ┌──────────────────────┐
│ Postgres/PostGIS │   │ External Providers   │
│                  │   │                      │
│ Magic Graph      │   │ Google Places        │
│ Trips & Parties  │   │ Google Routes        │
│ Candidate Sets   │   │ Weather              │
│ Adventure Plans  │   │ Events               │
│ Flight Recorder  │   │ Narrative Model      │
└─────────┬────────┘   └──────────────────────┘
          │
          ▼
┌─────────────────────┐
│ Curator Studio      │
│                     │
│ Atom editor         │
│ Map editor          │
│ Route simulator     │
│ Verification queue  │
│ Incident review     │
└─────────────────────┘
```

---

# 5. Monorepo structure

Keep all business logic independent of React, Expo and Next.js.

```text
adventure-omakase/
├── apps/
│   ├── mobile/
│   │   ├── app/
│   │   ├── components/
│   │   ├── features/
│   │   ├── local-db/
│   │   └── assets/
│   │
│   ├── curator/
│   │   ├── app/
│   │   ├── components/
│   │   └── features/
│   │
│   ├── operations/
│   │   ├── app/
│   │   └── dashboards/
│   │
│   └── api/
│       ├── routes/
│       ├── services/
│       ├── providers/
│       ├── jobs/
│       └── server.ts
│
├── packages/
│   ├── domain/
│   │   ├── party/
│   │   ├── fate/
│   │   ├── adventure/
│   │   ├── compiler/
│   │   ├── content/
│   │   └── journal/
│   │
│   ├── contracts/
│   │   ├── schemas/
│   │   ├── api/
│   │   └── events/
│   │
│   ├── design-tokens/
│   ├── ui-native/
│   ├── ui-web/
│   ├── maps/
│   ├── provider-clients/
│   ├── analytics/
│   ├── observability/
│   ├── test-fixtures/
│   └── config/
│
├── supabase/
│   ├── migrations/
│   ├── seed/
│   ├── functions/
│   └── tests/
│
├── simulations/
│   ├── scenarios/
│   ├── compiler/
│   └── reports/
│
└── infra/
    ├── cloud-run/
    ├── monitoring/
    └── environments/
```

## Dependency rule

```text
UI → Application Services → Domain
                         ↘ Provider Interfaces

Infrastructure implements provider interfaces.
Domain imports no framework, database or API SDK.
```

This makes it possible to:

- Unit-test the compiler without Maps APIs
- Replay historical adventures
- Simulate bad weather and closures
- Replace providers
- Build future recommendation models
- Run the compiler in shadow mode
- Keep core behavior explainable

---

# 6. Translate the locked design into a production design system

The visual direction is:

> **Quiet Japanese editorial luxury with tactile travel-journal warmth.**

It should feel closer to a beautifully designed boutique travel book than a gamified tourist app.

## Core palette

These are starting tokens, not sampled absolutes:

| Token           | Suggested value | Use                              |
| --------------- | --------------: | -------------------------------- |
| `paper.base`    |       `#F7F2E8` | Main background                  |
| `paper.surface` |       `#FFFCF6` | Cards and sheets                 |
| `paper.sunken`  |       `#F0E8DA` | Secondary controls               |
| `ink.primary`   |       `#1D1C19` | Text and primary buttons         |
| `ink.secondary` |       `#6F685C` | Supporting text                  |
| `ink.tertiary`  |       `#958C7C` | Metadata                         |
| `brass.primary` |       `#B58C4A` | Fate, progress, special moments  |
| `brass.soft`    |       `#DCC89D` | Borders and selected surfaces    |
| `vermilion`     |       `#C65D47` | Seals, warnings, rare highlights |
| `moss`          |       `#68755F` | Verified and available states    |
| `border.subtle` |       `#E5DCCB` | Card outlines                    |
| `night`         |       `#171717` | Image overlays and CTA surfaces  |

Use vermilion sparingly. Brass should signal ritual and fate. Black should remain the strongest action color.

## Typography

Use a two-family system.

### Display and editorial headings

- Newsreader, Noto Serif JP or a similarly legible editorial serif
- High contrast, but not excessively ornamental
- Used for:
  - Screen titles
  - Adventure names
  - Result reveals
  - Journal narratives
  - Brand moments

### Interface and metadata

- Geist, Inter or Noto Sans JP
- Used for:
  - Form labels
  - Buttons
  - Time and distance
  - Maps
  - Accessibility information
  - Supporting copy

Japanese venue names should use a Japanese-capable family rather than falling back to an unrelated system font.

## Spacing and geometry

- 4-point base grid
- 16–20 px screen gutters
- 12 px card gaps
- 16–20 px card radius
- 28–32 px major sheet radius
- 48–56 px primary button height
- Minimum 44 × 44 pt interaction targets
- Fine 1 px borders instead of large shadows
- Shadows only for elevated ritual moments

## Surface language

Three surface levels are sufficient:

1. **Paper:** the screen background
2. **Card:** grouped information
3. **Ritual surface:** dice, result and lock moments

Do not make every card visually unique. The magic screens should be exceptional because the surrounding app is restrained.

## Texture

The faint paper texture is important, but implement it conservatively:

- One optimized, seamless noise asset
- Very low opacity
- Cached locally
- Never layered repeatedly inside scrolling lists
- Disabled in high-contrast or reduced-transparency modes
- No texture beneath small body copy

## Photography

Photos should be:

- Warm
- Cinematic
- Human-scale
- Specific to the location
- Slightly desaturated
- Never generic AI “Japan” imagery inside live recommendations

Use a consistent editorial crop and image treatment. Avoid showing star ratings on the result card. Reviews may help construct the candidate set, but they should not invite post-roll second-guessing.

## Map styling

Create a dedicated warm Google Map ID:

- Cream land
- Muted beige buildings
- Soft gray streets
- Low-saturation water
- Brass route line
- Vermilion destination pin
- Black origin pin
- Hide nonessential POI labels
- Preserve transit and accessibility information
- Keep Google attribution visible

## Core components

Build these as first-class design-system primitives:

```text
AppScreen
AppHeader
EditorialTitle
PaperCard
InkButton
BrassButton
QuietButton
FateChip
VibeChip
SealBadge
PrivateConstraintRow
PartyAvatarStack
PartyPresenceDot
PulseWave
FateProgressThread
AdventureOptionCard
LockedOptionCard
DiceStage
ResultHero
RouteCard
CourseTimeline
MysteryInstruction
FateRepairSheet
JournalPhotoGrid
EditorialQuote
SourceAttribution
```

Each component should include:

- Loading state
- Disabled state
- Offline state
- Error state
- High-contrast variant
- Dynamic-type behavior
- VoiceOver/TalkBack labels

---

# 7. Motion and haptic design

Motion should feel ceremonial, not hyperactive.

## Everyday motion

- 180–240 ms transitions
- Gentle vertical sheets
- Soft fade and scale for selected cards
- No bouncing navigation
- No constant particle systems
- No autoplay motion behind forms

## The lock ritual

When everyone accepts the Fate Contract:

1. Each avatar receives a small brass ring.
2. A line connects the participants.
3. The contract card compresses slightly.
4. A soft lock sound plays.
5. One firm haptic confirms the pact.
6. The screen transitions to the locked option set.

## The dice ritual

This is the primary spectacle.

1. Participants see who is ready.
2. Each person taps or shakes.
3. Their avatar illuminates as their input arrives.
4. The die lifts from an ink-circle ripple.
5. The roll begins only when required participants are ready.
6. The die settles on the server-selected result.
7. Every device reveals simultaneously.
8. Confetti is limited to a few paper fragments or petals.
9. The result card emerges from behind the die.

The animation should never determine the outcome. The server chooses first; the animation renders that result.

Use a deterministic Rive state machine or pre-authored result animation rather than a physics simulation whose final face might disagree with the canonical roll.

## Haptic choreography

| Moment             | Haptic                |
| ------------------ | --------------------- |
| Select a vibe      | Light                 |
| Private veto saved | Soft confirmation     |
| Contract locked    | Firm                  |
| Shake registered   | Light pulse           |
| Die hits surface   | Medium                |
| Final result       | Firm double pulse     |
| Course completed   | Warm success pulse    |
| Fate Repair        | Neutral warning pulse |

Respect reduced-motion and system haptic settings.

---

# 8. Information architecture and screen inventory

## Primary navigation

Keep the locked five-tab structure:

1. **Home**
2. **Adventures**
3. **Dice**
4. **Journal**
5. **Profile**

During an active adventure, temporarily replace normal tab navigation with a focused Adventure Runtime surface.

## Full screen inventory

### Onboarding and identity

- Brand welcome
- Create trip
- Join trip
- Invite friends
- Guest identity
- Sign in or upgrade guest
- Location explanation
- Notification explanation
- Trip preferences
- Accessibility profile

### Home

- Current location and weather
- Party status
- Party Pulse summary
- Next calendar anchor
- Roll the Omakase CTA
- Quick Decision Dice
- Active adventure card
- Previous memory

### Party Pulse

- Energy
- Hunger
- Budget
- Walking tolerance
- Social bravery
- Desired vibes
- Private deal breakers
- Participant presence
- Aggregate result

### Fate Contract

- What Fate may decide
- Time available
- Required end time
- End location
- Budget per person
- Travel mode
- Maximum travel time
- Vibes
- Disclosure mode
- Private constraints
- Review
- Group consent

### Candidate set and roll

- Six locked options
- Full mystery
- Soft mystery
- Transparent mode
- Readiness state
- Dice ritual
- Result reveal
- Why this fits
- Material disclosures
- Start adventure

### Adventure Runtime

- Course timeline
- Current instruction
- Compass
- Route overview
- Open in Google Maps
- Check in
- Challenge
- Group progress
- Complete
- Quiet veto
- Fate Repair
- End on a high
- Adventure completion

### Journal

- Day timeline
- Adventure cards
- Selected photos
- Quotes
- Completed challenges
- Map
- Memory summary
- Private/shareable state
- Export and share

### Settings

- Profile
- Default budget
- Dietary preferences
- Mobility profile
- Alcohol and smoking preferences
- Privacy
- Location history
- Notification cadence
- Data deletion
- Attribution and sources

---

# 9. The guest-first group model

Requiring every friend to create an account before the first roll would damage adoption.

## Recommended join flow

1. Organizer creates a trip.
2. App generates an invite link and QR code.
3. Friend taps or scans it.
4. Friend enters a display name and optionally chooses a photo.
5. The system creates an anonymous authenticated identity.
6. They immediately join the trip.
7. They can connect Apple, Google or email later without losing history.

Supabase Auth supports anonymous sign-ins, social login and mobile deep linking, which fits this guest-to-member progression.

## Roles

| Role       | Capabilities                                      |
| ---------- | ------------------------------------------------- |
| Owner      | Trip settings, members, deletion                  |
| Navigator  | Shares current location and starts adventures     |
| Member     | Pulse, consent, roll participation, feedback      |
| Guest      | Same trip participation, limited account recovery |
| Curator    | Content tools only                                |
| Operations | Incident and provider tools                       |

Navigator status must be transferable without restarting the adventure.

---

# 10. Party Pulse architecture

Each participant submits a private preference vector.

```typescript
type PartyPulse = {
  memberId: string;
  sessionId: string;

  energy: 1 | 2 | 3 | 4 | 5;
  hunger: 'none' | 'snack' | 'meal';
  budgetBand: 'free' | 'low' | 'medium' | 'flexible';
  walkingToleranceMinutes: number;
  socialBravery: 1 | 2 | 3 | 4 | 5;

  desiredVibes: Array<
    | 'adventure'
    | 'food'
    | 'culture'
    | 'chill'
    | 'local'
    | 'nightlife'
    | 'nature'
    | 'weird'
  >;

  privateConstraints: PrivateConstraint[];
};
```

## Privacy behavior

Other friends may see:

> Medium-high energy · snack-seeking · open to playful activities · one private constraint applied

They must not see:

- Who set a constraint
- Which private category was excluded
- Individual spending limits
- Individual mobility or dietary details

Private constraints should be visible only to:

- The submitting traveler
- The server-side compiler
- Explicitly authorized support staff under controlled access

## Group aggregation

Do not simply average every value.

Use:

- Hard constraints: union
- Maximum affordable budget: minimum unless someone explicitly opts to subsidize
- Walking tolerance: lower quartile or minimum, depending on mobility context
- Social bravery: conservative percentile
- Desired vibes: weighted overlap plus fairness rotation
- Energy: median
- Hunger: maximum urgency
- Individual preference fairness across the trip

The group profile could be represented as:

```typescript
type PartyProfile = {
  energy: number;
  hungerUrgency: number;
  effectiveBudgetYen: number;
  walkingLimitMinutes: number;
  socialBraveryCeiling: number;

  desiredVibeWeights: Record<Vibe, number>;
  hardConstraintIds: string[];

  underservedMemberIds: string[];
};
```

---

# 11. Fate Contract domain

The Fate Contract is the consent and feasibility snapshot used to compile options.

```typescript
type FateContract = {
  id: string;
  tripId: string;
  sessionId: string;
  version: number;

  decisionScope:
    'next_course' | 'activity' | 'food' | 'detour' | 'full_adventure';

  startsAt: string;
  mustFinishBy: string;

  origin: GeoPoint;
  requiredEndLocation?: GeoPoint;

  travelMode: 'walk' | 'transit';
  maxLegMinutes: number;
  maxTotalTravelMinutes: number;

  maxBudgetYenPerPerson: number;
  minimumGroupSize: number;
  maximumGroupSize: number;

  vibes: Vibe[];
  mysteryMode: 'full' | 'soft' | 'transparent';
  chaosLevel: 1 | 2 | 3 | 4 | 5;

  privateConstraintSnapshotId: string;
  status:
    'draft' | 'awaiting_consent' | 'locked' | 'compiled' | 'rolled' | 'expired';
};
```

## Critical invariant

Once all required participants consent:

- The contract version becomes immutable.
- Any edit creates a new version.
- All previous consent is invalidated.
- The candidate set records the exact contract version used.

This prevents a race where someone changes the budget or walking limit while another participant is rolling.

---

# 12. The Magic Graph

The Magic Graph is the long-term moat.

Google Places tells us that a place exists. The Magic Graph tells us how to turn it into a moment.

## Core entities

### `PlaceAnchor`

A real location or geographic feature.

```text
PlaceAnchor
- internal ID
- provider references
- durable Google place ID
- coordinates
- neighborhood
- venue type
- original editorial notes
- accessibility notes
- group-size notes
- verification status
- latest verification date
```

### `AdventureAtom`

The smallest meaningful experience unit.

```text
AdventureAtom
- title
- course role
- anchor
- duration
- approximate cost
- group-size range
- energy requirement
- social-bravery requirement
- indoor/outdoor
- valid time windows
- seasonality
- material disclosures
- instructions
- payoff
- failure modes
- fallback category
- source evidence
- editorial confidence
```

### `AdventureMechanic`

Reusable group play.

Examples:

- Everyone has ¥500 to buy an object representing another friend.
- Pair off and select each other’s gachapon machine.
- Losing arcade team chooses dessert.
- Photograph three objects matching an assigned color.
- Each person chooses one snack without translation.
- Give the group five minutes to find the smallest doorway.
- Everyone predicts what the next shop sells before turning the corner.

### `AdventureTemplate`

Defines the emotional arc.

```text
Template: Spark → Main Event → Payoff

Spark:
  10–20 minutes
  low commitment
  creates a physical object or inside joke

Main Event:
  25–50 minutes
  participatory
  high social-memory potential

Payoff:
  15–35 minutes
  food, atmosphere or reflection
  supports reveal or conversation
```

### `AtomEdge`

Relationships between atoms.

```text
pairs_well_with
contrasts_with
requires
creates_callback_to
good_finale_after
avoid_in_same_adventure
backup_for
walkable_to
best_before
```

## Content lifecycle

```text
draft
→ desk_verified
→ field_verified
→ live
→ needs_review
→ paused
→ retired
```

Each live atom should contain:

- A named verifier
- A verification date
- A confidence level
- Known failure conditions
- A review deadline

---

# 13. Adventure Compiler design

The compiler is not an LLM prompt. It is a deterministic planning system.

## Input

```typescript
type CompileAdventureInput = {
  contract: FateContract;
  party: PartyProfile;
  tripHistory: TripExperienceHistory;
  currentWeather: WeatherSnapshot;
  currentLocalTime: string;
  operationalSignals: OperationalSignal[];
};
```

## Output

```typescript
type CompiledCandidateSet = {
  id: string;
  contractVersion: number;
  createdAt: string;
  validUntil: string;

  options: AdventureOption[];
  compilationEvidence: CompilationEvidence;
};
```

Each option contains:

```typescript
type AdventureOption = {
  id: string;
  mysteryTitle: string;
  broadCategory: string;

  reliabilityScore: number;
  delightScore: number;

  estimatedDurationMinutes: number;
  estimatedCostYenPerPerson: CostRange;

  courses: CompiledCourse[];
  fallbackPlan: CompiledFallbackPlan;

  materialDisclosures: MaterialDisclosure[];
};
```

## Compilation pipeline

### Stage 1: Define the reachability envelope

Use the current navigator location and contract to establish:

- Maximum first-leg walking time
- Maximum subsequent-leg time
- Required finish location
- End-time buffer
- Weather constraints
- Transit allowance
- Accessibility restrictions

### Stage 2: Retrieve local Magic Graph candidates

Use PostGIS:

- `ST_DWithin` for initial radius
- Spatial indexes
- Neighborhood and zone filters
- Temporal validity
- Group-size compatibility
- Atom status and confidence

PostGIS provides indexed geographic types and distance querying, making it appropriate for this local candidate layer.

### Stage 3: Retrieve provider candidates

Use Places API only where the Magic Graph has gaps:

- Restaurant categories
- Arcades
- Museums
- Parks
- Shopping
- Cafés
- Points of interest

Request lightweight fields first:

- Place ID
- Type
- Coordinates
- Business status
- Display name

Request expensive or volatile fields only for finalists:

- Current opening hours
- Price range
- Group suitability
- Accessibility
- Photos
- Website

Google requires field masks for Nearby Search and recommends limiting fields to reduce unnecessary processing and billing.

### Stage 4: Hard feasibility gates

Reject any candidate that fails:

```text
Operational status
Opening window
Arrival time
Completion before closing
Budget
Group size
Private constraints
Accessibility
Weather
Required end time
Required end location
Travel mode
Maximum leg time
Minimum content confidence
Prohibited safety category
```

Opening viability should use:

```text
arrival time
+ expected duration
+ queue buffer
+ exit buffer
≤ effective closing time
```

### Stage 5: Actual travel-time evaluation

For walking candidates:

- Use routing summaries when available.
- Use a route matrix for finalists.
- Prefer place IDs as route endpoints.
- Reject awkward access or implausible entrances.
- Add station-complexity penalties where relevant.

For later transit support:

- Use a transit route matrix.
- Penalize transfers.
- Include station entry and exit walking.
- Protect final-train and appointment buffers.

### Stage 6: Reliability score

Reliability is a gate, not merely one weighted feature.

```text
Operational confidence          25%
Content verification freshness  20%
Route confidence                15%
Opening-window margin           15%
Fallback quality                15%
Provider agreement              10%
```

Anything below the release threshold is excluded.

### Stage 7: Delight score

```text
Group fit                       20%
Social-memory potential         20%
Distinctive Japanese context    15%
Novelty for this group          15%
Editorial quality               10%
Narrative payoff                10%
Atmosphere and timing           10%
```

### Stage 8: Sequence composition

Use a beam search rather than brute force.

For each possible first course:

1. Keep the best N partial sequences.
2. Extend with compatible courses.
3. Apply route and timing constraints.
4. Penalize category repetition.
5. Reward emotional contrast and callbacks.
6. Require an ending that makes sense.
7. Stop when the contract duration is filled.

This remains understandable and testable while being sufficient for three-course routes.

### Stage 9: Fallback compilation

Every destination-dependent course needs:

- A primary fallback
- A reason it is compatible
- A maximum diversion time
- A valid-until time
- A replacement story line

### Stage 10: Build six diverse options

The dice candidate set should maximize the quality of its weakest option.

Use a maximin-style objective:

```text
Maximize:
  minimum reliability among all six
  minimum predicted delight among all six
  category diversity
  route diversity
  emotional-arc diversity

Subject to:
  every option satisfies the same Fate Contract
```

Do not include five strong options and one filler simply to reach six.

---

# 14. Decision Dice implementation

## Server-authoritative roll

The client must never decide the canonical result.

Flow:

1. Contract is locked.
2. Candidate set is compiled.
3. Candidate mapping is frozen.
4. Server stores a hash of the immutable mapping.
5. Group initiates the roll.
6. Server uses a cryptographically secure random generator.
7. Result is committed in a database transaction.
8. Realtime broadcasts the result.
9. Every client fetches the canonical state.
10. Animation renders the selected face.

```typescript
type FateRoll = {
  id: string;
  candidateSetId: string;
  idempotencyKey: string;

  optionMappingHash: string;
  selectedIndex: number;
  selectedOptionId: string;

  randomizationMethod: 'server_crypto';
  rolledAt: string;
  state: 'resolved' | 'accepted' | 'ended' | 'repaired';
};
```

## Critical invariants

- One candidate set can produce only one active roll.
- Repeated taps return the existing result.
- Reconnecting clients receive the same result.
- Candidate mappings cannot change after lock.
- Sponsors cannot influence weighting.
- Every option has equal probability.
- No payment can create a reroll.
- Any user may safely end participation.

## Fate Repair

Fate Repair is triggered when the original promises are no longer true.

Valid reasons:

- Closed
- Unexpectedly full
- Route unavailable
- Price materially wrong
- Accessibility mismatch
- Weather conflict
- Safety concern
- Material consent information missing
- End-time risk

Invalid reason:

> “We saw the result and now prefer option four.”

The app can still let the group end the roll. It simply should not present endless rerolls as the default behavior.

---

# 15. Real-time group synchronization

Use Realtime for:

- Participant presence
- Pulse completion
- Contract consent
- Roll readiness
- Roll resolution
- Current course
- Challenge completion
- Group reactions

## Architecture rule

**Realtime messages are notifications, not the source of truth.**

For every critical event:

1. Client calls the API.
2. API validates and commits to Postgres.
3. API emits a realtime event.
4. Clients refetch or apply the committed revision.
5. Reconnecting clients fetch the latest canonical snapshot.

Every party session should carry an increasing revision number.

```text
sessionRevision: 41
contractRevision: 7
adventureRevision: 12
```

Clients ignore events older than their latest revision.

## Suggested events

```text
party.member_joined
party.member_left
pulse.submitted
pulse.aggregate_updated
contract.updated
contract.consent_added
contract.locked
compiler.started
compiler.completed
roll.member_ready
roll.started
roll.resolved
adventure.started
course.revealed
course.completed
adventure.repaired
adventure.completed
```

---

# 16. Location model

Only the navigator needs to share live location.

## Initial privacy posture

- Ask for foreground location at the moment the group requests an adventure.
- Do not request background location in v1.
- Do not collect every member’s coordinates.
- Do not preserve raw continuous traces.
- Store course arrival, departure and coarse route data only when necessary.
- Let the navigator transfer their role.
- Allow manual origin selection when location permission is denied.

## Sampling strategy

During active navigation:

- Normal mode: update after meaningful displacement or elapsed time.
- Near-course mode: temporarily increase accuracy.
- Stationary mode: reduce requests.
- App backgrounded: stop continuous updates in v1.
- Manual “We’re here” remains available.

## Check-in

A course may complete through:

1. Manual check-in
2. Proximity threshold
3. Curated visual clue
4. QR or venue code in future
5. Challenge completion

Do not make GPS precision the sole gate. Dense Japanese buildings and station interiors can produce unreliable location readings.

---

# 17. Offline Adventure Packet

Connectivity may fail inside stations, basements and narrow buildings.

Once an adventure is accepted, cache an encrypted local packet in SQLite.

```text
Adventure Packet
- canonical adventure ID and revision
- course sequence
- destination coordinates
- venue name in English and Japanese
- address
- route summary
- material disclosures
- instructions
- challenge content
- fallback details
- latest validity time
- emergency end location
- provider attribution
```

Expo SQLite persists local data across restarts, and SecureStore should hold small sensitive credentials rather than large adventure payloads.

## Offline behavior

### Offline before compilation

Explain that live options cannot be safely generated. Offer:

- A previously downloaded curated neighborhood pack
- A manual Quick Dice list
- Resume when connected

### Offline after compilation but before roll

Permit the roll only if:

- The candidate set was already locked
- It remains within its valid-until window
- The result can later be reconciled safely

The safest v1 behavior is to require connectivity for the canonical roll.

### Offline after roll

Allow the group to:

- Read all instructions
- Navigate using cached coordinates
- Open external maps
- Complete courses
- Queue feedback
- Resume synchronization later

## Offline map treatment

Do not attempt to reproduce full offline Google Maps initially.

Display:

- A simplified cached route line
- Origin and destination
- Key route steps
- Distance and heading
- Japanese address text
- An “Open in Maps” deep link

This keeps the Adventure Runtime useful without introducing a full tile-storage system.

---

# 18. Google Places data policy architecture

Store Adventure Omakase’s own original content permanently:

- Atom instructions
- Challenge mechanics
- Editorial notes
- Verification records
- Accessibility observations
- Internal ratings
- Failure history

Store external references carefully.

Google permits place IDs to be retained, but Places content has caching and attribution restrictions. Places results displayed on maps must appear on Google Maps, and non-map displays require correct attribution.

Therefore:

```text
Store indefinitely:
- Our own place_anchor ID
- Google place ID
- Our own editorial content
- Our own verification findings

Refresh from provider:
- Display name
- Opening hours
- Business status
- Rating
- Price level
- Provider photos
- Reviews
```

Every provider-derived snapshot should carry:

```text
source
retrieved_at
expires_at
field_mask
attribution
```

---

# 19. AI layer

AI should not determine whether a venue is open, reachable or safe.

## Suitable AI responsibilities

- Generate mystery path names
- Turn structured course data into concise clues
- Write recovery dialogue
- Create journal summaries
- Produce alternate tones
- Translate original Adventure Omakase copy
- Suggest draft atom tags for curators
- Cluster qualitative failure feedback

## Prohibited AI responsibilities

- Inventing venues
- Claiming current availability
- Estimating allergies
- Overriding accessibility constraints
- Choosing route feasibility
- Deciding final-train safety
- Creating unverified cultural etiquette
- Selecting a sponsored result
- Generating public content without review

## Runtime pattern

```text
Structured verified facts
        ↓
Narrative request
        ↓
Schema-constrained model output
        ↓
Fact-field validator
        ↓
Safety and length validator
        ↓
Rendered clue
```

Every AI call should have a deterministic template fallback.

Example:

```text
AI unavailable:
“Walk seven minutes to the next location.
Your challenge will be revealed when the group arrives.”
```

A model timeout should never prevent the adventure from starting.

---

# 20. Curator Studio

The Curator Studio is essential. Without it, the Magic Graph becomes unmaintainable.

## Main views

### City overview

- Map of all anchors
- Coverage heatmap
- Atom density
- Verification freshness
- Neighborhood status
- Provider incidents
- Frequent failure zones

### Place Anchor editor

- Location
- Provider IDs
- Venue category
- Entrance notes
- Group-size notes
- Accessibility
- Best timing
- Photo rights
- Attribution
- Verification history

### Atom editor

- Course role
- Instructions
- Payoff
- Conditions
- Duration
- Cost
- Energy
- Bravery
- Failure modes
- Fallbacks
- Material disclosures

### Template builder

A visual graph for:

```text
Spark
  → Main Event
      → Finale

with optional fallback branches
```

### Route simulator

Enter:

- Starting location
- Date and time
- Group size
- Budget
- Weather
- Walking tolerance
- End location

Then inspect:

- Candidates considered
- Rejection reasons
- Scores
- Route matrix
- Final six options
- Fallback tree

### Verification queue

Automatically flag:

- Content past review date
- Repeated skips
- Repeated closure reports
- Duration consistently underestimated
- Provider discrepancy
- Low delight despite high reliability
- Frequently activated fallback
- Inaccessible entrance report

### Incident dashboard

Show:

- Active provider outages
- Compile failures
- Roll inconsistencies
- Realtime disconnections
- High Fate Repair rates
- City-specific degradation
- Cost spikes

---

# 21. Data model

A production schema could include:

```text
identity
├── profiles
├── user_preferences
├── accessibility_profiles
└── linked_identities

trips
├── trips
├── trip_members
├── trip_invites
├── trip_anchors
└── trip_settings

party
├── party_sessions
├── party_presence
├── party_pulses
├── private_constraints
└── party_aggregates

fate
├── fate_contracts
├── fate_contract_consents
├── candidate_sets
├── candidate_options
├── fate_rolls
└── fate_repairs

content
├── cities
├── neighborhoods
├── place_anchors
├── provider_references
├── adventure_atoms
├── atom_edges
├── adventure_mechanics
├── adventure_templates
├── content_verifications
└── content_incidents

runtime
├── adventures
├── adventure_courses
├── course_branches
├── course_events
├── check_ins
└── operational_snapshots

memory
├── journal_entries
├── journal_moments
├── media_assets
├── shared_exports
└── reactions

evaluation
├── compiler_runs
├── candidate_evaluations
├── provider_calls
├── feedback_events
├── experiment_assignments
└── quality_alerts
```

## Important database invariants

- Every exposed table has RLS.
- Only trip members can read trip data.
- Private constraints cannot be read by other members.
- Candidate sets are immutable after lock.
- One roll result exists per active candidate set.
- Every course references its source atom version.
- Every external operational fact records retrieval time.
- Every destination-dependent course has a fallback.
- Every completed course has an explicit outcome.
- Raw media remains private unless deliberately shared.

Supabase’s guidance is to enable RLS on every exposed table and use policies as row-level authorization rules.

---

# 22. API shape

Use contract-first REST with Zod schemas and generated clients.

## Trip and party

```text
POST   /v1/trips
GET    /v1/trips/:tripId
POST   /v1/trips/:tripId/invites
POST   /v1/trip-invites/:token/join
PATCH  /v1/trips/:tripId/members/:memberId
POST   /v1/trips/:tripId/sessions
```

## Pulse and contract

```text
PUT    /v1/sessions/:sessionId/pulse
GET    /v1/sessions/:sessionId/party-profile

POST   /v1/sessions/:sessionId/fate-contracts
PATCH  /v1/fate-contracts/:contractId
POST   /v1/fate-contracts/:contractId/consents
POST   /v1/fate-contracts/:contractId/lock
```

## Compile and roll

```text
POST   /v1/fate-contracts/:contractId/compile
GET    /v1/candidate-sets/:candidateSetId
POST   /v1/candidate-sets/:candidateSetId/readiness
POST   /v1/candidate-sets/:candidateSetId/roll
GET    /v1/fate-rolls/:rollId
POST   /v1/fate-rolls/:rollId/accept
POST   /v1/fate-rolls/:rollId/end
```

## Runtime

```text
GET    /v1/adventures/:adventureId
GET    /v1/adventures/:adventureId/packet
POST   /v1/adventures/:adventureId/start
POST   /v1/adventures/:adventureId/revalidate

POST   /v1/adventures/:adventureId/courses/:courseId/check-in
POST   /v1/adventures/:adventureId/courses/:courseId/complete
POST   /v1/adventures/:adventureId/courses/:courseId/skip

POST   /v1/adventures/:adventureId/fate-repair
POST   /v1/adventures/:adventureId/complete
```

## Memory and feedback

```text
POST   /v1/adventures/:adventureId/reactions
POST   /v1/adventures/:adventureId/media
POST   /v1/adventures/:adventureId/journal
PATCH  /v1/journal-entries/:entryId
POST   /v1/journal-entries/:entryId/share
```

Every mutation should support:

- Idempotency keys
- Request IDs
- Expected revision
- Structured error codes

---

# 23. Adventure Flight Recorder

For every compilation and adventure, record:

- Contract snapshot
- Party aggregate
- Private-constraint IDs applied
- Weather snapshot
- Candidate sources
- Candidate rejection reasons
- Route calculations
- Reliability and delight subscores
- Final option set
- Roll result
- Provider calls and latency
- Revalidations
- Fallback activations
- Actual versus expected duration
- Course outcomes
- Feedback
- Journal creation
- Whether another adventure was requested

Do not put raw traces into the normal analytics product. Keep detailed operational records in a secured system with a limited retention period.

## Core quality metrics

| Metric               | Meaning                            |
| -------------------- | ---------------------------------- |
| Time to commitment   | Time from opening Fate to movement |
| Compile success      | Valid option set produced          |
| Roll acceptance      | Result followed                    |
| Operational failure  | Venue or route proved invalid      |
| Fate Repair success  | Group recovered and continued      |
| Adventure completion | Group reached an ending            |
| Legendary reaction   | Strong positive course reaction    |
| Glad-we-rolled rate  | Group values the random outcome    |
| Repeat surrender     | Group uses Fate again              |
| Memory creation      | Journal or photo moment saved      |
| Constraint violation | Any hard promise broken            |

## North-star metric

> **Trusted delight:** the percentage of started adventures completed without a material contract failure that receive a positive “glad we rolled” response.

---

# 24. Safety system

Safety is part of compilation, not a disclaimer shown afterward.

## Prohibited randomization

Never delegate:

- Allergens
- Health decisions
- Intoxication
- Nudity or onsen participation
- Material financial commitments
- Harassment or unsolicited stranger contact
- Private-property access
- Risky road crossings
- Critical transportation
- Activities a participant privately excluded

## Safety signals

Every atom should declare:

- Alcohol
- Smoking
- Nudity
- Stairs
- Uneven ground
- High noise
- Crowding
- Late-night context
- Adult-only
- Stranger interaction
- Physical exertion
- Weather exposure
- Photography restrictions

## Runtime safety controls

Always provide:

- End adventure
- Reveal destination
- Open standard navigation
- Return to hotel
- Report incorrect information
- Quiet private veto
- Transfer navigator
- Emergency local information

Mystery must never conceal material consent information.

---

# 25. Accessibility and localization

## Accessibility

Support from the beginning:

- Dynamic type
- VoiceOver and TalkBack
- Reduced motion
- High contrast
- Non-color status indicators
- Large interaction targets
- Captions for sound-driven moments
- Haptic alternatives
- Screen-reader labels for maps
- Mobility-aware route constraints
- Explicit stairs and elevator information when verified

## Language

Initial interface:

- English UI
- Japanese venue names and addresses
- Japanese text available for showing staff or taxi drivers
- JPY as the default currency
- 12- or 24-hour time based on device locale

Example destination card:

```text
Retro Arcade Showdown
レトロゲームセンター

2 Chome…
大阪府大阪市…

Show address in Japanese
Open in Google Maps
```

Do not automatically translate proper venue names when that would make them harder to locate.

---

# 26. Performance targets

These should be engineering targets, not marketing guarantees.

## Mobile

| Measure                    |                      Target |
| -------------------------- | --------------------------: |
| Warm launch                |              Under 1 second |
| Cold launch to usable home |    Under 2.5 seconds median |
| Screen transition response |                Under 150 ms |
| Dice animation             | 60 fps on supported devices |
| Offline packet open        |                Under 250 ms |
| Crash-free sessions        |         Above 99.5% in beta |
| Initial mobile bundle      |     Kept deliberately small |

## Backend

| Measure                   |                       Target |
| ------------------------- | ---------------------------: |
| Pulse update              |             P95 under 500 ms |
| Contract lock             |             P95 under 700 ms |
| Roll resolution           |             P95 under 500 ms |
| Walking compiler          | P50 under 3 s; P95 under 7 s |
| Revalidation              |                P95 under 2 s |
| Candidate-set consistency |                         100% |
| Duplicate roll results    |                            0 |

## Cost controls

- Use lightweight Places fields during discovery.
- Route only shortlisted candidates.
- Fetch rich details only for finalists and fallbacks.
- Cache Adventure Omakase’s own data aggressively.
- Use explicit provider budgets per compile.
- Record cost per successful adventure.
- Degrade gracefully when optional provider fields fail.
- Place hard daily API spending alerts.

---

# 27. Testing strategy

## Domain unit tests

Use Vitest for:

- Contract aggregation
- Private constraint application
- Opening-window calculations
- Budget limits
- Walking limits
- End-location constraints
- Reliability gates
- Delight scoring
- Sequence composition
- Option-set diversity
- Dice mapping
- Fate Repair
- Content expiry

## Property-based tests

Use generated scenarios to prove invariants:

```text
No compiled option violates a hard constraint.
No adventure ends after mustFinishBy.
No option exists without a fallback where one is required.
No candidate set changes after lock.
No roll resolves to an option outside the locked set.
No private constraint appears in a group-visible payload.
No mystery response conceals material disclosures.
```

## Database tests

Use a real local Postgres/PostGIS instance to test:

- Spatial radius
- Distance ordering
- Bounding zones
- RLS
- Concurrent consent
- Concurrent roll requests
- Revision conflicts
- Transactional idempotency

## Provider contract tests

Keep recorded and synthetic fixtures for:

- Places success
- Permanently closed place
- Missing opening hours
- Route not found
- Transit disruption
- Provider timeout
- Malformed photo attribution
- Weather unavailable
- Rate limit

## Mobile tests

- React Native Testing Library for components
- Maestro for native end-to-end journeys
- Simulated location changes
- Network drop during roll
- Network drop after roll
- App termination and restore
- Different font sizes
- VoiceOver and TalkBack
- Low-memory Android devices

## Web tests

Use Playwright for:

- Curator workflows
- Content publishing
- Simulator
- Verification queue
- Operations dashboard
- RLS behavior through user-facing APIs

## Physical field testing

Software tests are not sufficient.

For every pilot zone:

- Walk at least 20 generated routes
- Test daytime, evening and rain
- Test station exits
- Test weak connectivity
- Verify actual durations
- Verify group-size assumptions
- Check that instructions are culturally appropriate
- Check every backup independently

---

# 28. Deployment and release process

Use:

- GitHub Actions for CI
- EAS Build for iOS and Android binaries
- EAS internal distribution for testers
- EAS Submit for store submissions
- EAS Update for compatible JS, style and asset fixes
- Preview, staging and production environments
- Database migrations reviewed before deployment
- Feature flags by city and cohort
- Provider kill switches
- Manual production promotion

EAS Build produces iOS and Android binaries, supports internal distribution and automated submissions. EAS Update can publish compatible JavaScript, styling and asset updates between app-store releases, while runtime-version controls prevent incompatible native updates from reaching the wrong binary.

## Release channels

```text
development
internal
field-test
beta
production
```

## Feature flags

At minimum:

```text
city_osaka_enabled
zone_namba_enabled
zone_umeda_enabled
zone_tennoji_enabled

decision_dice_enabled
full_adventure_enabled
quick_roll_enabled
ai_copy_enabled
weather_enabled
journal_enabled
transit_enabled
```

---

# 29. The first vertical slice

Do not build all screens horizontally before the product works.

The first vertical slice should prove the whole promise:

> Four friends join, set the vibe, lock boundaries, receive six valid Osaka options, roll one result, reach it and save the memory.

## Day-10 vertical slice

### Included

- Expo app shell
- Locked visual tokens
- Create a trip
- Join through code or link
- Four participants
- Party Pulse
- 60-minute Fate Contract
- Six pre-seeded Namba options
- Everyone consents
- Server roll
- Result reveal
- Simple navigation
- Manual check-in
- One challenge
- Completion reaction
- One journal card

### Not included

- Dynamic Google discovery
- Full compiler
- Provider revalidation
- Multiple cities
- Transit
- AI copy
- Sophisticated curator tooling

This slice proves the interaction and social ritual before investing in live recommendation infrastructure.

---

# 30. Accelerated dogfood plan for the September 30 trip

Given the September 30 Japan departure, the realistic goal should be a **private dogfood release**, not a public app-store launch.

## Week 1 — August 24–30

### Foundation and visual fidelity

Deliver:

- Monorepo
- Expo app
- CI
- Environments
- Design tokens
- Typography
- Core components
- All locked mockup screens reproduced as native layouts
- Static navigation
- Dice animation spike
- Local SQLite setup
- Next.js curator shell

Exit criterion:

> The app visually matches the locked light/warm concept on a real iPhone and Android device.

## Week 2 — August 31–September 6

### Trip, party and Fate Contract

Deliver:

- Guest identity
- Create trip
- Invite link and QR
- Join trip
- Realtime presence
- Party Pulse
- Private constraints
- Group aggregate
- Set the Pact
- Review and consent
- Locked candidate-set model
- Server-authoritative dice roll
- Reconnect consistency

Exit criterion:

> Four phones can join, privately submit preferences, lock a shared pact and receive the same roll result.

## Week 3 — September 7–13

### Live location and compiler v0

Deliver:

- Foreground navigator location
- Place anchors and atoms schema
- PostGIS
- Google Places provider
- Google Routes provider
- Walking-time envelope
- Opening-hours gate
- Budget gate
- Candidate evaluation
- Six-option builder
- One-course adventure compilation
- Styled map
- Provider attribution

Seed:

- 30–40 field-verifiable atoms in Namba/Shinsaibashi

Exit criterion:

> From a live Osaka coordinate, the system produces six reachable and open options within the Fate Contract.

## Week 4 — September 14–20

### Adventure Runtime and content expansion

Deliver:

- Result reveal
- Course timeline
- Adventure Packet
- Local persistence
- Route card
- Check-in
- Challenge
- Completion
- Fate Repair
- Backup selection
- Feedback
- Journal card
- Basic Curator Studio

Expand content:

- 75–100 atoms
- All three pilot zones
- At least 25 reliable place anchors
- 15 challenge mechanics
- Six emotional-arc templates

Exit criterion:

> A group can complete an adventure through weak connectivity and recover from one invalid venue.

## Week 5 — September 21–27

### Field testing and hardening

Deliver:

- Physical field tests
- Provider failure handling
- Accessibility pass
- Crash monitoring
- Privacy review
- Performance pass
- TestFlight build
- Android internal build
- Analytics
- Operations dashboard
- Content review queue
- Final offline packs
- App-update strategy

Field-test:

- 10 routes in each pilot zone
- At least three evening tests
- At least one rain simulation
- Multiple group sizes
- One app-kill-and-restore per flow

Exit criterion:

> No known issue can produce a different roll across devices, violate a hard constraint or leave the group without an understandable recovery path.

## September 28–29

### Freeze

Only permit:

- Critical reliability fixes
- Content corrections
- Provider configuration changes
- Copy corrections that do not affect flow

Do not introduce new features.

---

# 31. Post-trip public-beta plan

The private Japan build will generate better product evidence than another month of theorizing.

## Phase 2 — Four weeks

- Analyze Flight Recorder data
- Rework friction
- Improve compiler scores
- Add multi-course composition
- Improve content CMS
- Add Apple and Google account linking
- Strengthen RLS
- Add app-store privacy disclosures
- Refine Android performance
- Recruit 10–20 external groups

## Phase 3 — Four weeks

- Transit support
- Required end-location routing
- Better accessibility metadata
- More robust weather adaptation
- Magic Windows v0
- Content contribution workflow
- Moderation and reporting
- Shareable trip journal
- Full operations alerting

## Phase 4 — Four to six weeks

- Expand Osaka content
- Add Kyoto pilot
- Add Tokyo pilot zones
- Introduce curator roles
- Add experiment framework
- Run shadow compiler models
- Prepare public beta
- Complete app-store review and launch operations

---

# 32. Recommended team

For an ambitious production build:

| Role                         | Focus                                            |
| ---------------------------- | ------------------------------------------------ |
| Product and experience lead  | Product decisions, content, field testing        |
| Mobile engineer              | Expo app, animation, offline, device integration |
| Backend/algorithm engineer   | Compiler, PostGIS, APIs, reliability             |
| Full-stack or tools engineer | Curator Studio, operations, analytics            |
| Local curator/researcher     | Osaka verification and atom authoring            |
| Part-time motion designer    | Dice, lock and reveal rituals                    |
| Part-time QA/accessibility   | Device matrix and field testing                  |

For the September dogfood build, a smaller team can succeed:

- One strong full-stack/mobile builder
- You as product and field-test lead
- AI coding agents
- One part-time Osaka content researcher or verifier

The scope must remain walking-only and private for that schedule.

---

# 33. Epics and acceptance criteria

## Epic 1 — Native foundation

Done when:

- iOS and Android builds install
- Deep links open the correct trip
- Environments are separated
- CI blocks type, lint and test failures
- App resumes correctly after termination

## Epic 2 — Design system

Done when:

- Locked screens match the visual direction
- Components support dynamic type
- Reduced motion works
- Loading, error and offline states exist
- Color and typography tokens are centralized

## Epic 3 — Identity and groups

Done when:

- Guests join in under 30 seconds
- Invite links are revocable
- Navigator transfers
- Removed members lose access immediately
- Anonymous accounts can upgrade safely

## Epic 4 — Party Pulse

Done when:

- Every participant submits privately
- Aggregate updates live
- No participant can inspect another’s constraints
- The compiler receives the complete constraint union
- Pulse defaults reduce repeated input

## Epic 5 — Fate Contract

Done when:

- Contract versions are immutable after consent
- Editing invalidates prior consent
- All members see the same snapshot
- Material disclosures are visible
- Contract expiration is enforced

## Epic 6 — Magic Graph

Done when:

- Curators can create and version atoms
- Anchors support PostGIS
- Verification dates are tracked
- Content can be paused instantly
- Every live atom has evidence and failure notes

## Epic 7 — Adventure Compiler

Done when:

- All hard constraints are enforced
- Route time uses live data
- Final six pass minimum reliability
- Rejection reasons are recorded
- One valid fallback exists per destination-dependent course

## Epic 8 — Decision Dice

Done when:

- Candidate set is immutable
- Result is server-generated
- Duplicate requests return the same result
- All clients converge
- Statistical tests show uniform mapping

## Epic 9 — Adventure Runtime

Done when:

- Current course survives app restart
- Revalidation occurs before reveal
- Fate Repair works
- Offline packet works
- The group can safely end at any point

## Epic 10 — Journal

Done when:

- Media is opt-in
- Journal can be edited
- Private is default
- Shared exports omit hidden/private data
- Media deletion propagates correctly

## Epic 11 — Flight Recorder

Done when:

- Every compiler run is explainable
- Provider latency is visible
- Failure reasons are structured
- Quality alerts create review tasks
- Raw location is not copied into analytics

## Epic 12 — Operations

Done when:

- Cities and zones can be disabled remotely
- Provider outages trigger safe degradation
- On-call can inspect a failed adventure
- Content can be paused without an app release
- Cost anomalies create alerts

---

# 34. Launch gates

Do not release publicly until all are true.

## Reliability

- Fewer than 2% of test courses encounter an operational failure
- More than 90% of operational failures recover through Fate Repair
- Zero duplicate or divergent dice results
- Every live course has a valid source version
- Every live option satisfies all hard constraints in replay tests

## Experience

- Median time from opening Fate to roll under 90 seconds
- At least 70% of started adventures complete
- At least 60% receive “glad we rolled”
- At least 30% of groups roll again during the same trip
- Users understand why a result cannot be casually rerolled
- Private vetoes are understood and trusted

## Product quality

- Crash-free sessions above 99.5%
- VoiceOver and TalkBack paths complete
- Offline recovery tested
- Privacy and deletion flows complete
- Provider attribution correct
- App-store requirements satisfied

---

# 35. Ambitious roadmap after the core works

## Magic Windows

Temporary, verified opportunities:

- Sunset
- Illumination
- Festival
- Pop-up
- Weather break
- Live performance
- Seasonal food

## Dérive Mode

Bounded intentional wandering using safe route forks and environmental clues.

## Physical Dice

Manual physical-dice entry first, camera recognition later.

## Living Manga

Turn completed adventures into a serialized group story.

## Friendship Conspiracy

Private missions that help friends create surprises for one another.

## Lantern Network

Curated location-bound secrets from local contributors and previous groups.

## Venue partnerships

Real availability, exclusive micro-experiences and verified challenges—without allowing payment to affect neutral dice outcomes.

## App Clip or lightweight guest companion

Let friends join, submit Pulse and consent before installing the full application.

---

# 36. The build order to follow

1. Reproduce the locked visual system natively.
2. Build guest joining and party presence.
3. Build Party Pulse and private constraints.
4. Build immutable Fate Contracts.
5. Build server-authoritative dice.
6. Complete one static end-to-end adventure.
7. Build the Magic Graph schema and smallest curator.
8. Add PostGIS and live location.
9. Add Google Places and Routes behind provider interfaces.
10. Build compiler v0 for one-course walking adventures.
11. Add revalidation and fallback.
12. Add offline Adventure Packets.
13. Add multi-course composition.
14. Add the journal.
15. Add the Flight Recorder and simulator.
16. Field-test repeatedly before expanding geography.

The first meaningful milestone is not “all nine mockup screens are coded.”

It is:

> **Four friends in Osaka can hand the next hour to the app, receive one trustworthy roll, experience something specific and playful, recover if reality changes, and end with a memory they would not otherwise have made.**

That is the vertical slice around which the entire project should be organized.

---

# Reference documentation

- [Expo Router](https://docs.expo.dev/router/introduction/)
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/)
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/)
- [EAS Build](https://docs.expo.dev/build/introduction/)
- [Supabase Auth](https://supabase.com/docs/guides/auth)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase PostGIS](https://supabase.com/docs/guides/database/extensions/postgis)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Google Places Nearby Search](https://developers.google.com/maps/documentation/places/web-service/nearby-search)
- [Google Places policies](https://developers.google.com/maps/documentation/places/web-service/policies)
- [Google Routes API](https://developers.google.com/maps/documentation/routes)
- [react-native-maps](https://github.com/react-native-maps/react-native-maps)

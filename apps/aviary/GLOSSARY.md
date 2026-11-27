# Aviary

A private list of Birds, for the Owner alone.

## Language

### Birds

**Bird**:
One individual, with a name and a picture. One Bird per person. It has an Arrival, an optional Habitat, Songs, notes and five flags: Seen, Flown, Lost, Roosted, Nest.
_Avoid_: Entry, item

**Arrival**:
When the Bird came, optional. A full day, or only a year when the day is unknown.

**Habitat**:
Where the Bird came from, optional, one per Bird.

**Songs**:
The set of channels the Owner shares with a Bird. It can be empty.

**Sighting**:
One time the Owner saw a Bird, with an optional day. A Bird has any number of Sightings. Notes live on the Bird, not on a Sighting.

### Flags

Each flag is stored on the Bird and is independent of the others.

**Seen**:
The Owner has seen the Bird. A Bird with a Sighting is always Seen. A Bird can be Seen with no Sighting recorded.

**Flown**:
The Bird left, or the Owner let it go. The app does not record who.

**Lost**:
The Bird still exists but the Owner cannot reach it any more. It is not Flown.

**Roosted**:
A flag the Owner sets by hand.

**Nest**:
The Owner saw the Bird many times in a short span. The Owner sets it by hand; it is not worked out from the Sightings.

### Views

**Aloft**:
Every Bird that is neither Flown nor Lost.

**Grounded**:
Every Bird that is Flown or Lost. Not stored: it follows from the two flags.

### People

**Owner**:
The only user. Every page, route and picture is behind the Owner login.
_Avoid_: Viewer (the app has none)

### Display words

The app shows real words, not these code names. They are kept outside the repository, in the private database.

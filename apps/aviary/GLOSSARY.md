# Aviary

A private list of Birds, for the Owner alone.

## Language

### Birds

**Bird**:
One individual, with a name and one or more pictures. One Bird per person. It has an Arrival, an optional Habitat, Songs, notes and five flags: Seen, Flown, Lost, Roosted, Nest.
_Avoid_: Entry, item

**Pictures**:
The ordered pictures of a Bird, at least one. The first is the tile picture. Each is cropped square by the user (move and zoom) and resized in the browser before upload.

**Arrival**:
When the Bird came, optional. A full day, a month (when the day is unknown) or only a year.

**Habitat**:
Where the Bird came from, optional, one per Bird. The values come from a list kept on the Admin page.

**Songs**:
The set of channels where the Owner has the Bird and can write to them. It can be empty. Having talked there is not enough. The values come from a list kept on the Admin page.

**Sighting**:
One time the Owner saw a Bird, with an optional day. A Bird has any number of Sightings. Notes live on the Bird, not on a Sighting.

### Flags

Each flag is stored on the Bird and is independent of the others.

**Seen**:
The Owner has seen the Bird. A Bird with a Sighting is always Seen. A Bird can be Seen with no Sighting recorded.

**Flown**:
The Bird unmatched the Owner on the app, so contact through it ended. Its cause is the Bird; see Lost for the other cause.

**Lost**:
The Owner deleted the app, so contact through it ended. Its cause is the Owner. It is not Flown.

**Roosted**:
A flag the Owner sets by hand. Never shown on a tile; it only drives the Roosted filter.

**Nest**:
The Owner saw the Bird many times in a short span. The Owner sets it by hand; it is not worked out from the Sightings.

### Views

**Aloft**:
Every Bird that is not Grounded and not Archived. A Flown or Lost Bird with Songs stays Aloft.

**Flock** (tab):
Every Bird that is not Archived: all of Aloft and Grounded together. The Seen filter narrows it.

**Seen** (tab):
Every Seen Bird that is not Archived, whether Aloft or Grounded. The Nest and Roosted filters narrow it.

**Grounded**:
Every Bird that is Flown or Lost, has no Songs, and is not Archived. Not stored: it follows from the flags and the Songs.

### Archive

**Archived**:
A Bird the Owner does not want to see on the pages, for any reason. It is stored on the Bird. An Archived Bird is in no tab and no filter. It is not the same as Flown or Lost. It can be restored, or deleted for good, from the Admin page only.

### Admin

**Admin page**:
The page, behind the Owner login, where the Owner keeps the Habitat and Songs lists, changes the Habitat, flags and Songs of several Birds at once, and manages the Archived Birds. A value can be added, renamed, or removed after moving every Bird that uses it to another value.

### People

**Owner**:
The only user. Every page, route and picture is behind the Owner login.
_Avoid_: Viewer (the app has none)

### Display words

The app shows real words, not these code names. They are kept outside the repository, in the private database.

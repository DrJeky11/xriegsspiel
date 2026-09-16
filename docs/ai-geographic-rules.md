# Geographic maritime exercises, rules 1.0.0

Implemented 2026-09-16. This is an original training game, not a reconstruction of vessel performance or real operational guidance. New AI matches use scenario library `maritime-crises.v2.json` (2.0.0), `maritime-geographic-rules/1.0.0`, `maritime-engine/2`, and `maritime-geography/1`.

## Board and starting forces

Use the existing Pacific or CENTCOM terrain and native tile identifiers. The Spratlys scenarios use Second Thomas Shoal, the Senkaku scenarios use the western island focus, and Hormuz and Bab al-Mandeb use their existing maps. Geography versions and source hashes are pinned with every exercise. The six catalog map assemblies remain separately saved.

Every ready vessel, including Red's patrols, occupies a particular water hex. Initial positions and objective areas are authored exercise choices on the largest connected water component, not reported deployments. Red staff counters from the sector prototype are now visible patrol vessels. Generic miniatures show the scenario's actors; they do not claim accurate equipment variants.

Ordinary vessels use the same conservative terrain policy as the catalog workspace: open water only; land, mixed coast, reef, and lagoon are excluded. Source terrain classifications and original terrain rendering remain unchanged. Unknown channels are never manufactured to shorten a route. Sierra Madre's map landmark anchors the objective label. Delivery occurs from the outlined adjacent offshore transfer area, an explicit game abstraction rather than a reef crossing.

## Orders and movement

Each side has three command points and at most three orders per round. A vessel takes one action per round. Moving costs one command point and covers up to four adjacent water hexes. These are movement points, not ship speeds or elapsed minutes. Water hexes cost one point; the route preview and authoritative resolver use the same deterministic shortest-path search and starting occupancy. The player chooses a destination, previews the route, then adds it to the plan. Grip release drafts the same move; it does not immediately move the authoritative ship.

Both plans are sealed and resolved together. Handling uses starting positions and occurs before movement. Same-round arrivals cannot deliver, rescue, transfer, or hand over evidence. A receiver may accept a starting-adjacent donor's cargo before that donor departs; cargo identity and delay counts persist. Delivery and transfer reserve their individual cargo item, and each receiver acts once.

Movement resolves in up to four ticks. Each tick excludes hexes occupied at its start, even when that occupant will depart during the tick. A route stops before a conflicting hex. Two ships cannot swap places, stack, or pass through each other. Competing moves into an empty hex favor Blue on odd rounds and Red on even rounds; the unsuccessful route stops. A side cannot submit two moves to the same destination. Ships that complete their passage at the marked exit leave the board. A detained ship remains visible in custody.

## Spatial opposition

Red commits one ready vessel to intercept a named eligible Blue vessel (or the evidence handover). The assigned Red vessel stays at its starting hex for that action. Interception works only if the named target's actual route or handling location is in that hex or one connected water hex away. The moving target stops before entering interception range, or its handling action is delayed. An out-of-range commitment or a different route causes no delay but still spends pressure. The patrol cannot move and intercept in one round.

An adjacent ready Blue response launch can use its action and one or two command points to escort a named vessel for the round. The starting adjacency represents an escort assignment; equal or greater assurance defeats interception. Escorting and independently moving the launch cannot be combined. Early strong-escort restrictions in Stena Impero remain in effect. Medical cargo and rescue missions remain protected.

Pressure is finite, never regenerates, and costs the chosen interception effort. Each merchant, routine manifest or handover can receive at most two imposed delays. Movement delays attach to all carried routine manifests; a protected or capped manifest makes the vessel's movement unchallengeable. Handling delays attach to the named item. Traffic conflicts are distinct from imposed delays. Two consecutive intercepted T1 movement attempts in Stena Impero trigger its authored custody outcome; an intervening round without an intercepted attempt resets the streak.

## Missions, information and scoring

Scenario deadlines, manifests, reports, negotiations, rescue obligations, conduct limits and scorecards carry forward from the [authored library](scenarios/README.md). Each physical task additionally requires the appropriate native objective area. Verification and agreements use starting-round prerequisites. Competing rescues credit each survivor group once. The first accepted coordination agreement follows the same alternating side priority.

All vessel positions are public. Private reports, verification results, and unverified truth remain role-filtered. The AI receives its own observation and public water topology; it receives neither the human draft nor their actual sealed commitment. Its forecasts describe hypothetical opposing choices and cannot insert future referee injects. Opposing private verification orders are hidden during live review. Completed replay exports contain both sides' decision histories.

Final scoring requires the last review and no unresolved contest. Player contests freeze advancement; recorded referee rulings either uphold the result or create a preserved replay branch. Referee takeover is explicit. Paused or unfinished exercises have no terminal result.

## Compatibility and limits

Earlier sector matches retain `maritime-engine/1`, the original scenario library and resolver. They replay under those rules; they are not silently converted to hex matches. New HTTP-created exercises use geographic rules. The internal legacy factory remains for compatibility tests and archived sessions.

Shared water passability and map geometry are reused from the catalog workspace. The scenario's four-point movement allowance, finite pressure, simultaneous turn cycle, cargo and objectives are its own versioned rule package; catalog combat/service facts are not substituted for those rules. There is no weapons, damage, depth, tide or sensor simulation. Human balance testing and hands-on Quest usability remain separate from automated checks.

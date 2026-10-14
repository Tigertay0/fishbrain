// Rigs, written for this app. Parts are listed top (rod side) to bottom (fish
// side) and drive the diagram; steps are what you actually tie.

export type Method = 'bait' | 'lure' | 'fly'

export type PartKind =
  | 'line'
  | 'bobber'
  | 'slipbobber'
  | 'stop'
  | 'bead'
  | 'splitshot'
  | 'swivel'
  | 'snap'
  | 'egg'
  | 'bullet'
  | 'bell'
  | 'jighead'
  | 'hook'
  | 'circle'
  | 'treble'
  | 'lure'
  | 'spinner'
  | 'indicator'
  | 'dryfly'
  | 'nymph'
  | 'bouncer'
  | 'harness'
  | 'wire'
  | 'feeder'
  | 'hair'

export type RigPart = { kind: PartKind; label: string }

export type RigId =
  | 'fixed-bobber'
  | 'slip-bobber'
  | 'split-shot'
  | 'slip-sinker'
  | 'floating-bait'
  | 'texas'
  | 'carolina'
  | 'drop-shot'
  | 'ned'
  | 'wacky'
  | 'jig-minnow'
  | 'harness'
  | 'straight-lure'
  | 'nymph-indicator'
  | 'dry-dropper'
  | 'streamer'
  | 'wire-float'
  | 'hair-rig'
  | 'feeder'

export type Rig = {
  id: RigId
  name: string
  summary: string
  when: string
  methods: Method[]
  parts: RigPart[]
  steps: string[]
  tips: string[]
}

export const RIGS: Rig[] = [
  {
    id: 'fixed-bobber',
    name: 'Fixed bobber rig',
    summary: 'A float clipped to the line holds bait at a set depth.',
    when: 'Panfish and stocked trout in water up to about 6 ft (2 m) deep. The easiest rig there is.',
    methods: ['bait'],
    parts: [
      { kind: 'line', label: '4–6 lb mono' },
      { kind: 'bobber', label: 'Small round bobber' },
      { kind: 'line', label: '2–4 ft to the hook' },
      { kind: 'splitshot', label: '1–2 split shot' },
      { kind: 'line', label: '6–10 in' },
      { kind: 'hook', label: '#8–#6 hook, worm or cricket' },
    ],
    steps: [
      'Tie the hook on with an improved clinch knot.',
      'Pinch one or two split shot 6–10 in above the hook so the bobber stands upright.',
      'Clip the bobber on so the bait hangs just above the weeds or bottom.',
      'Use the smallest bobber that floats your weight: fish feel less resistance.',
    ],
    tips: ['When the bobber dips or swims off, reel the slack tight and lift. Don’t yank.'],
  },
  {
    id: 'slip-bobber',
    name: 'Slip bobber rig',
    summary: 'A float that slides up to a stop knot, so you can fish deep and still cast.',
    when: 'Crappie, perch, walleye and bluegill suspended deeper than 6 ft, or holding over brush.',
    methods: ['bait'],
    parts: [
      { kind: 'line', label: '6–8 lb mono' },
      { kind: 'stop', label: 'Bobber stop (sets depth)' },
      { kind: 'bead', label: 'Small bead' },
      { kind: 'slipbobber', label: 'Slip bobber' },
      { kind: 'line', label: 'Line slides freely' },
      { kind: 'splitshot', label: 'Split shot' },
      { kind: 'line', label: '12–18 in' },
      { kind: 'hook', label: '#6–#2 hook or 1/32 oz jig' },
    ],
    steps: [
      'Slide the bobber stop onto the main line, then a bead, then the slip bobber.',
      'Tie on the hook or small jig and add split shot 12–18 in above it.',
      'Slide the stop up the line to the depth you want; it reels onto the spool fine.',
      'Bait with a minnow (hooked under the dorsal fin), leech or worm.',
    ],
    tips: ['Set depth a foot above the fish or the top of the brush, not on the bottom.'],
  },
  {
    id: 'split-shot',
    name: 'Split-shot drift rig',
    summary: 'Bait or a small nymph drifting naturally along the bottom of moving water.',
    when: 'Trout and other river fish when you want the bait tumbling with the current.',
    methods: ['bait'],
    parts: [
      { kind: 'line', label: '4–6 lb line' },
      { kind: 'splitshot', label: '1–3 split shot' },
      { kind: 'line', label: '12–18 in' },
      { kind: 'hook', label: '#10–#6 hook, worm or salmon egg' },
    ],
    steps: [
      'Tie on a small hook and add just enough split shot 12–18 in above it to tick bottom now and then.',
      'Cast upstream and across, then let it drift down while keeping slack out of the line.',
      'A pause, tap or the line moving upstream is a bite: tighten up.',
    ],
    tips: ['Snagging a lot? Remove a shot. Never feeling bottom? Add one.'],
  },
  {
    id: 'slip-sinker',
    name: 'Slip-sinker bottom rig',
    summary: 'A sliding weight on the main line, a swivel, then a leader: fish pick up bait without feeling the sinker.',
    when: 'Catfish, carp and bottom-feeding fish in lakes and slow rivers.',
    methods: ['bait'],
    parts: [
      { kind: 'line', label: '12–20 lb main line' },
      { kind: 'egg', label: 'Egg or no-roll sinker, ½–2 oz' },
      { kind: 'bead', label: 'Bead (protects the knot)' },
      { kind: 'swivel', label: 'Barrel swivel' },
      { kind: 'line', label: '12–24 in leader' },
      { kind: 'circle', label: '2/0–6/0 circle hook' },
    ],
    steps: [
      'Thread the sinker and then a bead onto the main line.',
      'Tie the main line to one end of the swivel.',
      'Tie a 12–24 in leader to the other end and a circle hook to the leader.',
      'Bait up, cast, reel tight and set the rod in a holder.',
    ],
    tips: ['With circle hooks, don’t jerk: when the rod loads up, just reel steadily and the hook sets itself.'],
  },
  {
    id: 'floating-bait',
    name: 'Floating dough-bait rig',
    summary: 'A slip-sinker rig with a buoyant bait that floats up off the bottom weeds.',
    when: 'Stocked trout in lakes and ponds.',
    methods: ['bait'],
    parts: [
      { kind: 'line', label: '4–6 lb line' },
      { kind: 'egg', label: '⅛–¼ oz sliding sinker' },
      { kind: 'swivel', label: 'Small swivel' },
      { kind: 'line', label: '18–30 in leader' },
      { kind: 'treble', label: '#14–#10 treble, floating dough bait' },
    ],
    steps: [
      'Slide the sinker on, tie on the swivel, then add an 18–30 in leader.',
      'Mold floating dough bait around the treble hook so it’s fully covered.',
      'Cast, let it sink, reel just tight. The bait floats up to the length of the leader.',
    ],
    tips: ['Leader length sets how high the bait floats: longer for thick weeds.'],
  },
  {
    id: 'texas',
    name: 'Texas rig',
    summary: 'A soft plastic hooked weedless with a sliding bullet weight.',
    when: 'Bass in weeds, wood and rocks, any season. The default bass rig.',
    methods: ['lure'],
    parts: [
      { kind: 'line', label: '12–17 lb fluorocarbon' },
      { kind: 'bullet', label: '⅛–½ oz bullet weight' },
      { kind: 'bead', label: 'Optional bead or peg' },
      { kind: 'hook', label: '3/0–5/0 offset worm hook' },
      { kind: 'lure', label: 'Soft plastic worm, craw or creature' },
    ],
    steps: [
      'Slide the bullet weight on point first (narrow end up the line), then tie on the hook.',
      'Push the hook point ¼ in into the head of the plastic and out the side.',
      'Slide the plastic up to the hook eye and rotate the hook.',
      'Insert the point back into the body so it lies straight and weedless.',
    ],
    tips: ['Use the lightest weight that reaches bottom; heavier only to punch through thick cover.'],
  },
  {
    id: 'carolina',
    name: 'Carolina rig',
    summary: 'A heavy weight drags bottom while a long leader lets the bait float behind.',
    when: 'Bass on flats, points and drop-offs in summer; covers water fast.',
    methods: ['lure', 'bait'],
    parts: [
      { kind: 'line', label: '15–20 lb main line' },
      { kind: 'egg', label: '½–1 oz egg or bullet weight' },
      { kind: 'bead', label: 'Glass bead (clicks)' },
      { kind: 'swivel', label: 'Barrel swivel' },
      { kind: 'line', label: '18–36 in leader' },
      { kind: 'hook', label: '2/0–4/0 hook, soft plastic' },
    ],
    steps: [
      'Thread the weight and a bead onto the main line, then tie on the swivel.',
      'Tie an 18–36 in leader to the swivel and a hook to the leader.',
      'Rig a lizard, worm or craw Texas-style on the hook.',
      'Drag it slowly along the bottom with the rod tip, then reel up slack.',
    ],
    tips: ['Use a lighter leader than the main line so a snag only costs you the hook.'],
  },
  {
    id: 'drop-shot',
    name: 'Drop shot',
    summary: 'The weight is at the bottom and the bait hangs above it, nearly still.',
    when: 'Finesse fishing for pressured or deep bass, perch and walleye; cold fronts.',
    methods: ['lure', 'bait'],
    parts: [
      { kind: 'line', label: '6–10 lb fluorocarbon' },
      { kind: 'hook', label: '#1–1/0 drop-shot hook, nose-hooked plastic' },
      { kind: 'line', label: '8–18 in tag end' },
      { kind: 'bell', label: '⅛–⅜ oz drop-shot weight' },
    ],
    steps: [
      'Tie the hook with a palomar knot, leaving a tag end of 8–18 in.',
      'Pass the tag end back through the hook eye from the top so the point faces up.',
      'Clip the drop-shot weight onto the end of the tag.',
      'Nose-hook a small worm or minnow bait. Shake the slack line, don’t move the weight.',
    ],
    tips: ['Tag length = how far off bottom the fish are: shorter for fish hugging bottom.'],
  },
  {
    id: 'ned',
    name: 'Ned rig',
    summary: 'A light mushroom jighead with a short floating plastic standing up off bottom.',
    when: 'Smallmouth and largemouth when they won’t bite anything else, especially in clear or cold water.',
    methods: ['lure'],
    parts: [
      { kind: 'line', label: '6–10 lb line' },
      { kind: 'jighead', label: '1/16–⅛ oz mushroom jighead' },
      { kind: 'lure', label: '2.5–3 in floating stick bait' },
    ],
    steps: [
      'Tie the jighead on directly.',
      'Thread the plastic on straight and push it snug against the head.',
      'Cast, let it hit bottom, then crawl and hop it slowly with small twitches.',
    ],
    tips: ['Slower than you think. Most bites come as the bait sits still.'],
  },
  {
    id: 'wacky',
    name: 'Wacky rig',
    summary: 'A stick worm hooked through the middle, falling with both ends shimmying.',
    when: 'Bass around docks, laydowns and spawning flats.',
    methods: ['lure'],
    parts: [
      { kind: 'line', label: '8–12 lb line' },
      { kind: 'hook', label: '#1–2/0 wacky hook (O-ring helps)' },
      { kind: 'lure', label: '5 in stick worm' },
    ],
    steps: [
      'Slide an O-ring to the middle of the worm (saves worms) or hook it straight through the middle.',
      'Cast past the target and let it sink on slack line.',
      'Watch the line: if it jumps or moves sideways, reel down and set.',
    ],
    tips: ['Weightless sinks slowly; add a nail weight in one end for deeper water.'],
  },
  {
    id: 'jig-minnow',
    name: 'Jig and minnow',
    summary: 'A jighead tipped with a live or plastic minnow, worked near bottom.',
    when: 'Walleye, sauger, zander and perch; crappie with smaller jigs.',
    methods: ['bait', 'lure'],
    parts: [
      { kind: 'line', label: '6–10 lb line' },
      { kind: 'jighead', label: '⅛–⅜ oz jighead' },
      { kind: 'lure', label: 'Minnow through the lips, or 3 in plastic' },
    ],
    steps: [
      'Tie the jig on directly with a loop knot for more action.',
      'Hook a minnow up through the lower lip and out the top, or thread a plastic grub.',
      'Drop to bottom, then lift 6–12 in and let it fall back. Most bites come on the fall.',
    ],
    tips: ['Use just enough weight to stay near bottom: heavier in current or wind.'],
  },
  {
    id: 'harness',
    name: 'Crawler harness with bottom bouncer',
    summary: 'A spinner blade and two hooks with a nightcrawler, pulled slowly along bottom.',
    when: 'Walleye on flats and breaks in summer, trolled or drifted.',
    methods: ['bait'],
    parts: [
      { kind: 'line', label: '10 lb line' },
      { kind: 'bouncer', label: '1–2 oz bottom bouncer' },
      { kind: 'line', label: '3–5 ft leader' },
      { kind: 'harness', label: 'Blade, beads, two #4 hooks + crawler' },
    ],
    steps: [
      'Tie the main line to the bouncer’s bend; clip the harness to its short arm.',
      'Hook the crawler in the head with the front hook and mid-body with the back one, stretched straight.',
      'Let out line until the bouncer ticks bottom at a 45° angle, then move at 0.8–1.2 mph.',
    ],
    tips: ['Bites feel like extra weight. Give it a second, then sweep the rod.'],
  },
  {
    id: 'straight-lure',
    name: 'Lure on a snap',
    summary: 'A spinner, spoon or crankbait tied straight on, with a snap to change quickly.',
    when: 'Covering water for trout, bass, pike and anything that chases.',
    methods: ['lure'],
    parts: [
      { kind: 'line', label: '6–12 lb line' },
      { kind: 'snap', label: 'Small snap (swivel for spinners and spoons)' },
      { kind: 'spinner', label: 'Spinner, spoon or crankbait' },
    ],
    steps: [
      'Tie on a snap (a snap swivel for spinners and spoons, which twist line).',
      'Clip on the lure. Cast past where you think fish are and retrieve through the spot.',
      'Vary speed until something works: steady, then add pauses and twitches.',
    ],
    tips: ['Skip the swivel on crankbaits and jerkbaits; tie direct or use a plain snap.'],
  },
  {
    id: 'nymph-indicator',
    name: 'Nymph rig with indicator',
    summary: 'A weighted fly drifting near bottom under a float that shows the take.',
    when: 'Trout in moving water most of the year, when nothing is rising.',
    methods: ['fly'],
    parts: [
      { kind: 'line', label: 'Floating fly line, 9 ft 4X–5X leader' },
      { kind: 'indicator', label: 'Strike indicator, 1.5–2× water depth up' },
      { kind: 'splitshot', label: 'Optional split shot' },
      { kind: 'nymph', label: 'Bead-head nymph #14–#18' },
      { kind: 'line', label: '12–18 in tippet' },
      { kind: 'nymph', label: 'Dropper nymph or midge #18–#22' },
    ],
    steps: [
      'Set the indicator about 1.5 times the water depth above the first fly.',
      'Tie the heavier nymph on the leader; tie tippet to its hook bend and add a smaller fly.',
      'Cast upstream, mend so the indicator floats at the speed of the current.',
      'Any pause or dip of the indicator: set the hook downstream.',
    ],
    tips: ['If you’re not snagging bottom once in a while, you’re not deep enough.'],
  },
  {
    id: 'dry-dropper',
    name: 'Dry-dropper',
    summary: 'A floating dry fly that doubles as an indicator, with a small nymph below.',
    when: 'Shallow riffles and summer trout, when fish rise now and then.',
    methods: ['fly'],
    parts: [
      { kind: 'line', label: '9 ft 4X–5X leader' },
      { kind: 'dryfly', label: 'Buoyant dry #10–#14 (hopper, Stimulator)' },
      { kind: 'line', label: '12–24 in tippet' },
      { kind: 'nymph', label: 'Small bead-head nymph #16–#18' },
    ],
    steps: [
      'Tie on a buoyant dry fly that can hold up a small nymph.',
      'Tie 12–24 in of tippet to the bend of the dry’s hook.',
      'Add a small bead-head nymph. Fish it like a dry: if the dry dips, set.',
    ],
    tips: ['Dropper length ≈ the depth of the water you’re fishing.'],
  },
  {
    id: 'streamer',
    name: 'Streamer stripped back',
    summary: 'A baitfish or leech fly cast across and stripped in.',
    when: 'Big trout, bass and pike, especially in low light or stained water.',
    methods: ['fly'],
    parts: [
      { kind: 'line', label: 'Floating or sink-tip line' },
      { kind: 'line', label: '6–7 ft 0X–2X leader' },
      { kind: 'lure', label: 'Woolly Bugger, sculpin, Clouser' },
    ],
    steps: [
      'Tie the streamer on with a loop knot so it swims.',
      'Cast across or toward the bank, let it sink, then strip in with short pulls and pauses.',
      'Set with a strip of the line, not by lifting the rod.',
    ],
    tips: ['Fish it faster in warm water, slower and deeper in cold.'],
  },
  {
    id: 'wire-float',
    name: 'Float rig with wire leader',
    summary: 'A large float suspending live or dead bait on a bite-proof leader.',
    when: 'Pike and other toothy fish along weed edges, where live or dead bait is legal.',
    methods: ['bait'],
    parts: [
      { kind: 'line', label: '20–30 lb braid or mono' },
      { kind: 'stop', label: 'Float stop' },
      { kind: 'slipbobber', label: 'Pike float' },
      { kind: 'swivel', label: 'Swivel' },
      { kind: 'wire', label: '12–18 in wire or heavy fluoro leader' },
      { kind: 'treble', label: 'Two-hook trace / quick-strike rig' },
    ],
    steps: [
      'Thread a float stop and the float, then tie on a swivel.',
      'Attach a wire leader with a two-hook trace.',
      'Hook the bait so you can strike quickly; set depth just above the weeds.',
      'When the float goes under, wind down and set promptly so fish don’t swallow the hooks.',
    ],
    tips: ['Carry long-nose pliers and unhook in the water where you can.'],
  },
  {
    id: 'hair-rig',
    name: 'Hair rig',
    summary: 'The bait sits on a short hair below the hook, so the hook is bare and catches the lip.',
    when: 'Carp, and big bream, on the bottom with corn, pellets or boilies.',
    methods: ['bait'],
    parts: [
      { kind: 'line', label: '10–15 lb main line' },
      { kind: 'egg', label: 'Lead (safety clip or inline)' },
      { kind: 'swivel', label: 'Swivel' },
      { kind: 'line', label: '6–10 in hooklink' },
      { kind: 'hook', label: '#8–#4 wide-gape hook' },
      { kind: 'hair', label: 'Hair with corn or boilie' },
    ],
    steps: [
      'Tie a knotless knot with a loop (the hair) hanging just below the hook bend.',
      'Thread bait onto the hair with a baiting needle and lock it with a stop.',
      'Attach the hooklink to the swivel and lead; cast to a baited spot and wait.',
    ],
    tips: ['Scatter a few handfuls of the same bait around the spot to hold fish there.'],
  },
  {
    id: 'feeder',
    name: 'Feeder rig',
    summary: 'A cage or method feeder packed with groundbait puts food right next to the hook.',
    when: 'Roach, bream, carp and chub, especially in rivers and big lakes.',
    methods: ['bait'],
    parts: [
      { kind: 'line', label: '6–8 lb main line' },
      { kind: 'feeder', label: 'Cage or method feeder' },
      { kind: 'swivel', label: 'Swivel' },
      { kind: 'line', label: '12–30 in hooklink' },
      { kind: 'hook', label: '#16–#10 hook, maggot, corn or worm' },
    ],
    steps: [
      'Run the feeder on the main line above a swivel (or use an inline method feeder).',
      'Tie a fine hooklink and a small hook; bait with maggots, corn or a worm.',
      'Pack the feeder with groundbait, cast to the same spot every time and watch the rod tip.',
    ],
    tips: ['Accuracy matters more than distance: clip the line so every cast lands on the bait pile.'],
  },
]

export const RIG_BY_ID = Object.fromEntries(RIGS.map((r) => [r.id, r])) as Record<RigId, Rig>

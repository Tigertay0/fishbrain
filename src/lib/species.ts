// Species knowledge for the advice engine, written for this app from general
// angling practice. Temperatures are °F and approximate: local strains,
// forage and pressure all shift them. Advice is a starting point, not a rule.
import type { RigId } from './rigs'

export type { Method } from './rigs'
export type WaterType = 'stream' | 'river' | 'lake' | 'pond' | 'reservoir'
export type Region = 'na' | 'eu'
export type Phase = 'cold' | 'prespawn' | 'spawn' | 'summer' | 'fall' | 'hot'
export type Group = 'trout' | 'bass' | 'panfish' | 'perch' | 'pike' | 'catfish' | 'carp' | 'temperate-bass' | 'coarse'

export type Tactic = {
  /** where to look, for still water (lakes, ponds) and moving water (streams, rivers) */
  still?: string
  moving?: string
  how: string
  rigs: RigId[]
  baits: string[]
  lures: string[]
  flies: string[]
}

export type Profile = {
  id: string
  name: string
  /** scientific names this profile answers to, including old names (iNaturalist and agencies differ) */
  latin: string[]
  /** whole genera that map here (e.g. every Lepomis sunfish) */
  genus?: string[]
  group: Group
  regions: Region[]
  waters: WaterType[]
  tempF: { active: [number, number]; best: [number, number]; spawn?: [number, number]; spawnSeason?: 'spring' | 'fall' }
  idTips: string
  tactics: { default: Tactic } & Partial<Record<Phase, Partial<Tactic>>>
  tackle: { line: string; hooks: string }
  notes?: string[]
}

const TROUT_TACTICS: Profile['tactics'] = {
  default: {
    moving: 'Seams where fast water meets slow, riffles, pocket water behind rocks, undercut banks and the tails of pools.',
    still: 'Inlets, drop-offs and cool deeper water; shallow edges at dawn and dusk.',
    how: 'Drift naturally with the current. Approach from downstream, stay low, and use light line.',
    rigs: ['nymph-indicator', 'dry-dropper', 'split-shot', 'straight-lure', 'floating-bait'],
    baits: ['Nightcrawler', 'Salmon eggs', 'Floating dough bait (stocked fish)', 'Mealworm or waxworm', 'Live minnow (where allowed)'],
    lures: [
      'Inline spinner, size 0–2',
      'Small spoon',
      'Small minnow plug (jerkbait)',
      'Micro jig, 1/32–1/16 oz, under a float',
      'Small soft-plastic minnow on a light jighead',
      'Small crankbait (crayfish colours)',
    ],
    flies: ['Pheasant Tail nymph', "Hare's Ear nymph", 'Elk Hair Caddis', 'Parachute Adams', 'Woolly Bugger', 'San Juan Worm'],
  },
  cold: {
    moving: 'Slow, deep pools and tailouts. Midday, when the water is warmest, is best.',
    still: 'Deeper water near drop-offs; sunny shallows on warm afternoons.',
    how: 'Slow and deep: get the fly or bait right on the bottom and drift it slowly.',
    rigs: ['nymph-indicator', 'split-shot', 'floating-bait'],
    baits: ['Salmon eggs', 'Nightcrawler'],
    lures: ['Micro jig, 1/32–1/16 oz, under a float', 'Small spoon'],
    flies: ['Zebra Midge', 'Egg pattern', 'Small bead-head nymph'],
  },
  summer: {
    flies: ['Hopper', 'Ant or beetle', 'Elk Hair Caddis', 'Pheasant Tail nymph', 'Sculpin streamer'],
  },
  hot: {
    moving: 'Spring creeks, tailwaters below dams, shaded headwaters and spring inflows: the coldest water around.',
    still: 'Deep, cool water and inflows; surface only at first light.',
    how: 'Fish only at first light, use heavier tippet to land fish fast, and keep them in the water.',
    rigs: ['nymph-indicator', 'straight-lure'],
  },
}

const TROUT_NOTES = ['Many trout waters are flies or artificial lures only. Check the rules for this water.']

export const PROFILES: Profile[] = [
  {
    id: 'largemouth',
    name: 'Largemouth bass',
    latin: ['Micropterus nigricans', 'Micropterus salmoides', 'Micropterus floridanus'],
    group: 'bass',
    regions: ['na', 'eu'],
    waters: ['lake', 'pond', 'reservoir', 'river'],
    tempF: { active: [50, 88], best: [65, 80], spawn: [60, 72], spawnSeason: 'spring' },
    idTips: 'Green with a dark horizontal stripe; the jaw reaches past the eye.',
    tactics: {
      default: {
        still: 'Weed edges, docks, wood and lily pads; points and drop-offs nearby.',
        moving: 'Slack water: backwaters, eddies, and wood out of the current.',
        how: 'Fish tight to cover. Start fast to find active fish, then slow down.',
        rigs: ['texas', 'straight-lure', 'wacky', 'carolina'],
        baits: ['Live golden shiner under a float', 'Nightcrawler', 'Live crayfish', 'Leech'],
        lures: [
          'Texas-rigged plastic worm',
          'Soft plastic craw or creature bait',
          'Wacky-rigged stick worm',
          'Spinnerbait',
          'Bladed jig (chatterbait)',
          'Square-bill crankbait',
          'Jig with a craw trailer',
          'Paddle-tail swimbait',
        ],
        flies: ['Popper', 'Deer-hair frog', 'Baitfish streamer', 'Woolly Bugger', 'Crayfish fly'],
      },
      cold: {
        still: 'Deep main-lake points, channel bends and steep banks. On sunny afternoons, shallow dark rock that warms.',
        moving: 'Deep, slow wintering holes away from current.',
        how: 'Very slow. Drag and pause; let baits sit.',
        rigs: ['ned', 'drop-shot', 'texas'],
        lures: ['Finesse or football jig', 'Suspending jerkbait', 'Blade bait', 'Ned rig'],
        flies: ['Slow-stripped leech or crayfish fly'],
      },
      prespawn: {
        still: 'Secondary points and the first drop outside spawning coves. Dark-bottomed shallows warm first.',
        how: 'Medium speed: long pauses on jerkbaits, crankbaits deflecting off rock.',
        rigs: ['straight-lure', 'texas', 'ned'],
        lures: ['Suspending jerkbait', 'Lipless crankbait', 'Square-bill crankbait', 'Jig with a craw trailer'],
      },
      spawn: {
        still: 'Shallow, firm-bottomed, protected flats 1–4 ft deep, next to cover.',
        how: 'Slow soft plastics. Target cruising fish; release bedding fish right where you caught them.',
        rigs: ['wacky', 'texas'],
        lures: ['Wacky-rigged stick worm', 'Soft jerkbait (fluke)', 'Soft plastic craw or creature bait'],
        flies: ['Popper', 'Small baitfish fly'],
      },
      summer: {
        still: 'Dawn and dusk: shallow weeds, topwater. Midday: deep weed edges, shade under docks, offshore humps 8–20 ft.',
        moving: 'Current breaks, eddies behind rock and wood, shade.',
        how: 'Fast and shallow in low light; slower and deeper in midday sun.',
        rigs: ['texas', 'carolina', 'drop-shot', 'straight-lure'],
        lures: [
          'Topwater popper or walking bait (low light)',
          'Hollow-body frog (over weeds)',
          '10 in Texas-rigged worm',
          'Deep crankbait',
          'Swim jig',
          'Drop-shot worm (deep, midday)',
        ],
      },
      fall: {
        still: 'Follow baitfish into creek arms and onto flats.',
        how: 'Match the baitfish size and cover water.',
        rigs: ['straight-lure', 'texas'],
        lures: ['Spinnerbait', 'Square-bill crankbait', 'Lipless crankbait', 'Paddle-tail swimbait', 'Topwater walking bait'],
      },
      hot: {
        still: 'The deepest cool water with oxygen, heavy shade, springs. Night fishing.',
        how: 'Early, late and after dark.',
        rigs: ['drop-shot', 'texas'],
        lures: ['Drop-shot worm', 'Deep crankbait', 'Black buzzbait or topwater after dark'],
      },
    },
    tackle: { line: '10–17 lb fluorocarbon, or 30–50 lb braid in heavy cover', hooks: '3/0–5/0 offset worm hooks' },
    notes: ['Some places close or restrict bass fishing during the spawn.'],
  },
  {
    id: 'smallmouth',
    name: 'Smallmouth bass',
    latin: ['Micropterus dolomieu', 'Micropterus dolomieui'],
    group: 'bass',
    regions: ['na'],
    waters: ['river', 'stream', 'lake', 'reservoir'],
    tempF: { active: [45, 82], best: [62, 75], spawn: [58, 66], spawnSeason: 'spring' },
    idTips: 'Bronze-brown with faint vertical bars and red eyes; the jaw stops below the eye.',
    tactics: {
      default: {
        still: 'Rock: points, humps, boulders and gravel 10–25 ft deep. Topwater over shallow rock at dawn.',
        moving: 'Current seams, ledges, boulders, and riffle tails dropping into pools.',
        how: 'Bottom contact around rock. Crayfish imitations are hard to beat.',
        rigs: ['ned', 'drop-shot', 'straight-lure', 'texas'],
        baits: ['Live crayfish', 'Nightcrawler', 'Leech', 'Minnow', 'Hellgrammite (rivers)'],
        lures: ['Tube', 'Ned worm', 'Crankbait (crayfish colours)', 'Inline spinner (rivers)', 'Jerkbait', 'Drop-shot minnow', 'Paddle-tail swimbait'],
        flies: ['Crayfish fly', 'Clouser Minnow', 'Popper', 'Woolly Bugger', 'Hellgrammite fly'],
      },
      summer: { lures: ['Topwater walker or popper (low light)', 'Tube', 'Ned worm'] },
      cold: {
        still: 'Deep rock, bluff walls and steep breaks.',
        moving: 'Deep wintering pools with slow current.',
        how: 'Very slow, right on the bottom.',
        rigs: ['ned', 'drop-shot', 'jig-minnow'],
        lures: ['Hair jig', 'Blade bait', 'Ned worm'],
      },
      prespawn: { still: 'Rocky points and gravel near spawning flats.', lures: ['Jerkbait', 'Tube', 'Ned worm'] },
      spawn: {
        still: 'Gravel and rock flats 3–8 ft deep.',
        moving: 'Slack water behind boulders and along gravel banks.',
        how: 'Slow plastics. Release bedding fish where you caught them.',
        rigs: ['ned', 'texas'],
      },
      fall: { how: 'Fish feed hard before winter: follow the baitfish.', lures: ['Jerkbait', 'Paddle-tail swimbait', 'Crankbait (crayfish colours)'] },
    },
    tackle: { line: '6–10 lb fluorocarbon on spinning gear', hooks: '1/16–¼ oz jigheads, #1–2/0 hooks' },
  },
  {
    id: 'sunfish',
    name: 'Bluegill and sunfish',
    latin: ['Lepomis macrochirus'],
    genus: ['Lepomis'],
    group: 'panfish',
    regions: ['na', 'eu'],
    waters: ['pond', 'lake', 'reservoir', 'river'],
    tempF: { active: [55, 90], best: [68, 82], spawn: [67, 75], spawnSeason: 'spring' },
    idTips: 'Deep, round body; a dark flap at the gill cover. Many sunfish species hybridise.',
    tactics: {
      default: {
        still: 'Weed edges, docks, wood and shade near shore.',
        moving: 'Backwaters, eddies and slack water near cover.',
        how: 'Small baits, small hooks, light line. If one bites, there are more.',
        rigs: ['fixed-bobber', 'slip-bobber'],
        baits: ['Piece of nightcrawler or red worm', 'Cricket', 'Waxworm', 'Mealworm', 'Spike (maggot)'],
        lures: [
          '1/32–1/16 oz tube or grub jig',
          'Small inline spinner',
          'Small safety-pin spinner with a grub',
          'Micro jig under a float',
          'Tiny crankbait',
          'Small popper on a spinning rod',
        ],
        flies: ['Small popper', 'Foam spider', 'Wet fly', 'Small bead-head nymph'],
      },
      cold: {
        still: 'Deeper weed edges and the basin, 10–20 ft.',
        how: 'Tiny baits, very still.',
        rigs: ['slip-bobber', 'drop-shot'],
        baits: ['Waxworm', 'Spike (maggot)'],
      },
      spawn: { still: 'Colonies of round, light-coloured beds in 1–4 ft of water, often on sand or gravel.', how: 'Easy fishing: take a few and leave the rest to spawn.' },
    },
    tackle: { line: '2–6 lb line on an ultralight rod', hooks: '#10–#6 long-shank hooks' },
  },
  {
    id: 'crappie',
    name: 'Crappie',
    latin: ['Pomoxis nigromaculatus', 'Pomoxis annularis'],
    genus: ['Pomoxis'],
    group: 'panfish',
    regions: ['na'],
    waters: ['lake', 'reservoir', 'pond', 'river'],
    tempF: { active: [45, 85], best: [60, 75], spawn: [56, 65], spawnSeason: 'spring' },
    idTips: 'Silvery-green, speckled with black; big mouth, tall dorsal fin.',
    tactics: {
      default: {
        still: 'Suspended near brush piles, standing timber, bridges and deep docks, 10–20 ft. Under lights at night.',
        moving: 'Slack water around wood and bridge pilings.',
        how: 'Find the depth they suspend at, then keep your bait just above them.',
        rigs: ['slip-bobber', 'jig-minnow', 'fixed-bobber'],
        baits: ['Small live minnow', 'Waxworm', 'Piece of nightcrawler or red worm'],
        lures: [
          '1/32–1/16 oz tube or grub jig',
          'Marabou hair jig',
          'Small swimbait on a jighead',
          'Micro jig under a float',
          'Small blade bait',
          'Small crankbait (trolled)',
          'Small spoon (cold water, vertical)',
        ],
        flies: ['Small Clouser Minnow', 'Crappie bugger', 'Marabou jig fly'],
      },
      cold: { still: 'Suspended over the deep basin or channels, 15–30 ft.', how: 'Vertical and slow.' },
      prespawn: { still: 'Brush and wood along the routes into spawning coves, 6–12 ft.' },
      spawn: { still: 'Shallow wood, reeds and docks, 1–6 ft.' },
      fall: { still: 'Schools follow shad into creek arms.' },
    },
    tackle: { line: '4–6 lb line, long light rod', hooks: '#6–#2 thin-wire hooks (they bend free of snags)' },
    notes: ['Thin "paper" mouths: play them gently.'],
  },
  {
    id: 'perch',
    name: 'Perch',
    latin: ['Perca flavescens', 'Perca fluviatilis'],
    genus: ['Perca'],
    group: 'perch',
    regions: ['na', 'eu'],
    waters: ['lake', 'reservoir', 'pond', 'river'],
    tempF: { active: [40, 80], best: [60, 72], spawn: [45, 52], spawnSeason: 'spring' },
    idTips: 'Yellow-green with dark vertical bars and orange lower fins; spiny first dorsal fin.',
    tactics: {
      default: {
        still: 'Near the bottom on sand, gravel and weed edges, 8–25 ft. Schools roam: move until you find them.',
        moving: 'Slow pools and slack water near weed beds, harbours and bridge piers.',
        how: 'Keep it near the bottom. Once you catch one, stay put: perch school by size.',
        rigs: ['drop-shot', 'slip-bobber', 'jig-minnow'],
        baits: ['Small minnow', 'Piece of worm', 'Waxworm', 'Spike (maggot)'],
        lures: ['Small jig with a grub', 'Drop-shot minnow', 'Small spoon', 'Inline spinner', 'Small blade bait', 'Jigging minnow (ice and deep water)'],
        flies: ['Small streamer', 'Small Woolly Bugger'],
      },
      cold: { still: 'Deeper basin edges. Classic ice-fishing fish.', baits: ['Waxworm', 'Minnow head'] },
    },
    tackle: { line: '4–6 lb line', hooks: '#8–#4 hooks, 1/16–⅛ oz jigs' },
  },
  {
    id: 'walleye',
    name: 'Walleye and sauger',
    latin: ['Sander vitreus', 'Sander canadensis'],
    group: 'perch',
    regions: ['na'],
    waters: ['lake', 'reservoir', 'river'],
    tempF: { active: [40, 78], best: [60, 72], spawn: [42, 50], spawnSeason: 'spring' },
    idTips: 'Glassy, reflective eyes; white tip on the lower lobe of the tail.',
    tactics: {
      default: {
        still: 'By day: mid-lake humps, weed edges and breaks 15–30 ft. At dusk and night: shallow flats and rocky points.',
        moving: 'Current breaks below dams, deep eddies, the downstream side of wing dams.',
        how: 'Dawn, dusk, night and cloudy days. Wind pushing waves onto a point ("walleye chop") is ideal.',
        rigs: ['jig-minnow', 'harness', 'drop-shot', 'slip-bobber'],
        baits: ['Nightcrawler', 'Leech', 'Minnow'],
        lures: [
          'Jig with a soft plastic (paddle tail or ringworm)',
          'Crankbait (trolled, or cast at night)',
          'Blade bait',
          'Jigging spoon',
          'Slim minnow jerkbait (shallow, at night)',
          'Bottom bouncer with a spinner rig',
        ],
        flies: ['Not usually fished on the fly'],
      },
      cold: { moving: 'Deep holes below dams and riffles.', how: 'Slow, vertical jigging.', rigs: ['jig-minnow'] },
      spawn: { still: 'Rocky shoals and river mouths.', moving: 'Gravel and rock below dams. Many waters close for the spawn.' },
      fall: { still: 'Rocky points and steep breaks.', baits: ['Large minnow'] },
    },
    tackle: { line: '6–10 lb line', hooks: '⅛–⅜ oz jigheads, #4–#2 harness hooks' },
  },
  {
    id: 'zander',
    name: 'Zander',
    latin: ['Sander lucioperca'],
    group: 'perch',
    regions: ['eu'],
    waters: ['river', 'lake', 'reservoir'],
    tempF: { active: [40, 80], best: [58, 72], spawn: [50, 60], spawnSeason: 'spring' },
    idTips: 'Long, grey-green body with dark saddles, glassy eyes and long fangs.',
    tactics: {
      default: {
        still: 'Hard bottom, drop-offs and snags, deep by day; shallow at dusk.',
        moving: 'Deep slow water, eddies, bridge piers and harbour walls.',
        how: 'Low light and murky water are best. Bump the bottom with soft lures.',
        rigs: ['jig-minnow', 'drop-shot', 'slip-sinker'],
        baits: ['Small dead fish (where allowed)', 'Live fish (where allowed)', 'Fish strip', 'Lobworm'],
        lures: ['Soft shad on a jighead', 'Drop-shot minnow', 'Slim crankbait', 'Finesse soft lure (Texas or jighead)', 'Blade bait', 'Jigging spoon'],
        flies: ['Not usually fished on the fly'],
      },
    },
    tackle: { line: '8–12 lb braid with a 15–20 lb fluorocarbon leader', hooks: '10–20 g jigheads' },
  },
  {
    id: 'pike',
    name: 'Pike and pickerel',
    latin: ['Esox lucius', 'Esox masquinongy', 'Esox niger'],
    genus: ['Esox'],
    group: 'pike',
    regions: ['na', 'eu'],
    waters: ['lake', 'river', 'reservoir', 'pond'],
    tempF: { active: [38, 78], best: [55, 70], spawn: [38, 46], spawnSeason: 'spring' },
    idTips: 'Long body; rows of pale spots on dark green (pike), chain pattern (pickerel), bars (muskie). Teeth.',
    tactics: {
      default: {
        still: 'Weed edges and weedlines, points and bays. Big fish sit deeper and cooler.',
        moving: 'Slack water beside the current: backwaters, weed beds, eddies.',
        how: 'Cover water along the weed edge. Always use a bite-proof leader.',
        rigs: ['straight-lure', 'wire-float', 'streamer'],
        baits: ['Dead fish on the bottom or under a float (where allowed)', 'Live sucker or shiner under a float (where allowed)', 'Smelt or herring (dead)'],
        lures: ['Spinnerbait', 'Large inline or bucktail spinner', 'Spoon', 'Jerkbait', 'Swimbait', 'Soft-plastic jerkbait', 'Lipless crankbait'],
        flies: ['Big streamer on a wire bite tippet', 'Deceiver-style baitfish fly'],
      },
      summer: { lures: ['Topwater (prop bait or walk-the-dog)', 'Spinnerbait', 'Large inline or bucktail spinner'] },
      cold: { still: 'Shallow, dark-bottomed bays that warm first in late winter.', how: 'Slow: deadbait, slow jerkbait.', rigs: ['wire-float', 'straight-lure'] },
      spawn: { still: 'Shallow marshy bays and flooded grass. Many waters are closed now.' },
      hot: { still: 'Deep, cool water. Pike tire fast when it’s warm.', how: 'Fish early and land them quickly.' },
    },
    tackle: { line: '20–30 lb line or 30–65 lb braid', hooks: 'Wire or 40–60 lb fluorocarbon leader, always' },
    notes: ['Sharp teeth: carry long-nose pliers and jaw spreaders.'],
  },
  {
    id: 'catfish',
    name: 'Channel and blue catfish',
    latin: ['Ictalurus punctatus', 'Ictalurus furcatus'],
    genus: ['Ictalurus', 'Ameiurus'],
    group: 'catfish',
    regions: ['na'],
    waters: ['river', 'lake', 'reservoir', 'pond'],
    tempF: { active: [55, 90], best: [70, 85], spawn: [70, 80], spawnSeason: 'spring' },
    idTips: 'Whiskers (barbels), smooth skin, forked tail. Bullheads have square tails.',
    tactics: {
      default: {
        still: 'Deep holes, channel edges and coves; shallow flats at night. Inflows after rain.',
        moving: 'Deep outside bends, below riffles and dams, log jams.',
        how: 'Bait on the bottom, evening and night. Rising water after rain gets them feeding.',
        rigs: ['slip-sinker', 'slip-bobber'],
        baits: ['Cut bait (shad or sucker)', 'Nightcrawlers', 'Chicken liver', 'Dip or punch bait'],
        lures: ['Not usual; bait works best'],
        flies: ['Not usual'],
      },
      cold: { still: 'Deep wintering holes.', how: 'Small cut bait, fished slowly in the deepest water.' },
    },
    tackle: { line: '15–30 lb line', hooks: '2/0–6/0 circle hooks (#4–1/0 for bullheads)' },
  },
  {
    id: 'flathead',
    name: 'Flathead catfish',
    latin: ['Pylodictis olivaris'],
    group: 'catfish',
    regions: ['na'],
    waters: ['river', 'reservoir', 'lake'],
    tempF: { active: [60, 90], best: [72, 86] },
    idTips: 'Flat, wide head; mottled brown; lower jaw sticks out past the upper.',
    tactics: {
      default: {
        still: 'Deep holes near wood and rock.',
        moving: 'Log jams and deep holes in big rivers.',
        how: 'Live bait on the bottom at night, next to cover. Patience.',
        rigs: ['slip-sinker'],
        baits: ['Live green sunfish or bluegill (where allowed)', 'Live bullhead (where allowed)', 'Live shad or sucker', 'Big cut bait (live works better)'],
        lures: ['Not usual'],
        flies: ['Not usual'],
      },
    },
    tackle: { line: '30–50 lb line', hooks: '5/0–8/0 circle hooks' },
  },
  {
    id: 'wels',
    name: 'Wels catfish',
    latin: ['Silurus glanis'],
    group: 'catfish',
    regions: ['eu'],
    waters: ['river', 'lake', 'reservoir'],
    tempF: { active: [55, 82], best: [64, 78] },
    idTips: 'Huge, scaleless, with long whiskers and a long anal fin.',
    tactics: {
      default: {
        still: 'Deep holes, snags and drop-offs; margins at night.',
        moving: 'Deep slow bends, behind obstacles, below weirs.',
        how: 'Night and warm, unsettled weather. Strong gear: these fish can exceed 100 lb.',
        rigs: ['slip-sinker'],
        baits: ['Big bunch of worms', 'Halibut pellets', 'Live or dead fish (where allowed)'],
        lures: ['Large soft shad', 'Vertical "clonk" fishing with a teaser', 'Big swimbait', 'Large spoon', 'Large inline spinner'],
        flies: ['Not usual'],
      },
    },
    tackle: { line: '50–80 lb braid', hooks: '4/0–8/0 strong hooks' },
  },
  {
    id: 'carp',
    name: 'Carp',
    latin: ['Cyprinus carpio'],
    group: 'carp',
    regions: ['na', 'eu'],
    waters: ['lake', 'pond', 'reservoir', 'river'],
    tempF: { active: [55, 85], best: [65, 80], spawn: [62, 70], spawnSeason: 'spring' },
    idTips: 'Big golden-bronze scales and two pairs of barbels at the mouth.',
    tactics: {
      default: {
        still: 'Margins, reed beds, inlets and shallow bays. Clouds of mud and bubbles show feeding fish.',
        moving: 'Slow, deep bends and slack water.',
        how: 'Bait one spot, stay quiet and wait. Stealth beats distance.',
        rigs: ['hair-rig', 'feeder', 'slip-sinker'],
        baits: ['Sweet corn', 'Boilies', 'Pellets', 'Bread (on the surface)'],
        lures: ['Not usual'],
        flies: ['Small nymph, sight-fished to feeding carp'],
      },
      cold: { still: 'Deeper water; sunny shallows on warm afternoons.', how: 'Small baits, little free bait.' },
      spawn: { still: 'Splashy shallows. Spawning carp rarely feed: try elsewhere.' },
    },
    tackle: { line: '10–15 lb line, strong rod', hooks: '#8–#4 wide-gape hooks' },
  },
  {
    id: 'rainbow',
    name: 'Rainbow trout',
    latin: ['Oncorhynchus mykiss'],
    group: 'trout',
    regions: ['na', 'eu'],
    waters: ['stream', 'river', 'lake', 'pond', 'reservoir'],
    tempF: { active: [42, 68], best: [55, 65], spawn: [42, 52], spawnSeason: 'spring' },
    idTips: 'Pink stripe along the side; small black spots across the back and tail.',
    tactics: TROUT_TACTICS,
    tackle: { line: '4–6 lb line, or 5X–6X tippet', hooks: '#14–#8 hooks' },
    notes: TROUT_NOTES,
  },
  {
    id: 'brown',
    name: 'Brown trout',
    latin: ['Salmo trutta'],
    group: 'trout',
    regions: ['na', 'eu'],
    waters: ['stream', 'river', 'lake', 'reservoir'],
    tempF: { active: [40, 70], best: [54, 65], spawn: [44, 50], spawnSeason: 'fall' },
    idTips: 'Golden-brown with black and red spots, often with pale halos; few spots on the tail.',
    tactics: {
      ...TROUT_TACTICS,
      default: { ...TROUT_TACTICS.default, how: `${TROUT_TACTICS.default.how} Browns feed most at dawn, dusk and under clouds; big ones eat streamers.` },
      spawn: { how: 'Browns are spawning: leave fish on the light gravel nests (redds) alone and don’t wade through them.' },
    },
    tackle: { line: '4–8 lb line, or 4X–5X tippet', hooks: '#14–#6 hooks' },
    notes: TROUT_NOTES,
  },
  {
    id: 'brook',
    name: 'Brook trout',
    latin: ['Salvelinus fontinalis'],
    group: 'trout',
    regions: ['na'],
    waters: ['stream', 'river', 'lake', 'pond'],
    tempF: { active: [40, 66], best: [50, 60], spawn: [40, 49], spawnSeason: 'fall' },
    idTips: 'Dark back with pale wormy marbling; red spots with blue halos; white-edged lower fins.',
    tactics: { ...TROUT_TACTICS, spawn: { how: 'Brookies spawn in fall: leave fish on gravel nests alone.' } },
    tackle: { line: '2–4 lb line, or 5X–6X tippet', hooks: '#16–#10 hooks' },
    notes: TROUT_NOTES,
  },
  {
    id: 'cutthroat',
    name: 'Cutthroat trout',
    latin: ['Oncorhynchus clarkii', 'Oncorhynchus lewisi', 'Oncorhynchus virginalis', 'Oncorhynchus henshawi'],
    group: 'trout',
    regions: ['na'],
    waters: ['stream', 'river', 'lake'],
    tempF: { active: [40, 66], best: [50, 60], spawn: [42, 50], spawnSeason: 'spring' },
    idTips: 'Red-orange slash under the lower jaw; spots crowd toward the tail.',
    tactics: TROUT_TACTICS,
    tackle: { line: '4–6 lb line, or 5X tippet', hooks: '#14–#8 hooks' },
    notes: [...TROUT_NOTES, 'Many native cutthroat waters are catch and release.'],
  },
  {
    id: 'laketrout',
    name: 'Lake trout',
    latin: ['Salvelinus namaycush'],
    group: 'trout',
    regions: ['na'],
    waters: ['lake', 'reservoir'],
    tempF: { active: [38, 60], best: [46, 55] },
    idTips: 'Grey-green with pale spots and a deeply forked tail.',
    tactics: {
      default: {
        still: 'Deep and cold: 40–100 ft in summer over basins and humps. Shallow after ice-out and in late fall.',
        how: 'Get deep: vertical jigging over fish you see on sonar, or trolling.',
        rigs: ['jig-minnow', 'straight-lure'],
        baits: ['Cisco or sucker strip', 'Dead smelt or minnow on a jig', 'Live minnow'],
        lures: ['Tube jig', 'Spoon', 'Swimbait', 'Jigging spoon or blade bait', 'Bucktail jig', 'Crankbait (trolled)'],
        flies: ['Streamer on a sinking line (after ice-out)'],
      },
    },
    tackle: { line: '10–20 lb braid with fluorocarbon leader', hooks: '½–1 oz jigs' },
  },
  {
    id: 'grayling',
    name: 'Grayling',
    latin: ['Thymallus arcticus', 'Thymallus thymallus'],
    genus: ['Thymallus'],
    group: 'trout',
    regions: ['na', 'eu'],
    waters: ['stream', 'river', 'lake'],
    tempF: { active: [40, 65], best: [48, 60] },
    idTips: 'Silver-grey with a tall, sail-like, colourful dorsal fin.',
    tactics: {
      default: {
        moving: 'Gravel runs and the tails of pools.',
        still: 'Inlets and outlets.',
        how: 'Small flies drifted naturally; they rise freely.',
        rigs: ['dry-dropper', 'nymph-indicator', 'straight-lure'],
        baits: ['Small worm (where allowed)', 'Maggots (where allowed)', 'Caddis larva'],
        lures: ['Small inline spinner', 'Tiny spoon', 'Micro jig', 'Small minnow plug', 'Small soft grub on a light jighead'],
        flies: ['Small dry flies', 'Small nymphs', 'Small Elk Hair Caddis', 'Soft-hackle wet fly'],
      },
    },
    tackle: { line: '2–4 lb line, 6X tippet', hooks: '#18–#12' },
  },
  {
    id: 'whitebass',
    name: 'White bass and stripers',
    latin: ['Morone chrysops', 'Morone saxatilis', 'Morone mississippiensis'],
    genus: ['Morone'],
    group: 'temperate-bass',
    regions: ['na'],
    waters: ['reservoir', 'lake', 'river'],
    tempF: { active: [50, 85], best: [65, 78], spawn: [54, 68], spawnSeason: 'spring' },
    idTips: 'Silver with dark horizontal stripes.',
    tactics: {
      default: {
        still: 'Schools chasing shad over points and humps. Watch for birds and surface boils.',
        moving: 'Below dams and in tailraces.',
        how: 'Find the school, then cast into it. Fast retrieves.',
        rigs: ['straight-lure', 'jig-minnow', 'slip-sinker'],
        baits: ['Live shad (stripers)', 'Minnow', 'Cut bait'],
        lures: [
          'Small white jig or grub',
          'Spoon',
          'Inline spinner',
          'Lipless crankbait',
          'Slab spoon (jigging)',
          'Bucktail jig',
          'Swimbait (stripers)',
          'Topwater (on boils)',
        ],
        flies: ['Clouser Minnow', 'Small Deceiver'],
      },
      spawn: { moving: 'Spring runs up rivers to riffles and below dams.', still: 'River inflows.' },
    },
    tackle: { line: '8–12 lb (white bass), 15–30 lb (stripers)', hooks: '⅛–½ oz jigs' },
  },
  {
    id: 'coarse',
    name: 'Roach, bream and tench',
    latin: ['Rutilus rutilus', 'Abramis brama', 'Blicca bjoerkna', 'Scardinius erythrophthalmus', 'Tinca tinca'],
    genus: ['Rutilus', 'Abramis', 'Tinca', 'Scardinius'],
    group: 'coarse',
    regions: ['eu'],
    waters: ['lake', 'pond', 'river', 'reservoir'],
    tempF: { active: [45, 80], best: [60, 75] },
    idTips: 'Silver shoal fish (roach red eye, bream deep-bodied bronze); tench olive with red eyes.',
    tactics: {
      default: {
        still: 'Margins, weed edges and gentle drop-offs. Build a swim with a little groundbait.',
        moving: 'Steady, even-paced glides and the inside of bends.',
        how: 'Feed little and often to one spot, and fish fine.',
        rigs: ['feeder', 'fixed-bobber', 'hair-rig'],
        baits: ['Maggots', 'Sweet corn', 'Bread flake', 'Red worm', 'Casters'],
        lures: ['Not usual'],
        flies: ['Small wet flies (roach, rudd)'],
      },
    },
    tackle: { line: '3–6 lb line', hooks: '#18–#12 hooks' },
  },
  {
    id: 'chub',
    name: 'Chub and barbel',
    latin: ['Squalius cephalus', 'Barbus barbus', 'Leuciscus leuciscus'],
    genus: ['Squalius', 'Barbus'],
    group: 'coarse',
    regions: ['eu'],
    waters: ['river', 'stream'],
    tempF: { active: [40, 80], best: [55, 72] },
    idTips: 'Chub: big mouth, dark-edged scales, convex fins. Barbel: bronze, four barbels, bottom-hugging.',
    tactics: {
      default: {
        moving: 'Under overhanging trees, along undercut banks, behind weed beds; barbel in fast gravel runs.',
        still: 'Rare in still water.',
        how: 'Chub spook easily: stay hidden. Barbel feed best at dusk on a bed of bait.',
        rigs: ['split-shot', 'feeder', 'straight-lure', 'hair-rig'],
        baits: ['Bread flake', 'Cheese paste', 'Lobworm', 'Luncheon meat', 'Pellets (barbel)'],
        lures: ['Small crankbait', 'Inline spinner', 'Small soft lure on a light jighead', 'Tiny spoon', 'Small surface lure (summer)'],
        flies: ['Dry flies and beetles in summer'],
      },
    },
    tackle: { line: '6–10 lb line', hooks: '#10–#4 hooks' },
  },
]

export const PROFILE_BY_ID: Record<string, Profile> = Object.fromEntries(PROFILES.map((p) => [p.id, p]))

/** Matches a scientific name (from iNaturalist or an agency) to a profile: exact species first, then genus. */
export function profileForLatin(latin: string): Profile | undefined {
  const name = latin.trim()
  const exact = PROFILES.find((p) => p.latin.includes(name))
  if (exact) return exact
  const genus = name.split(/\s+/)[0]
  return PROFILES.find((p) => p.genus?.includes(genus))
}

/** Small fish that tell you what predators are eating, and so which lure colour to pick. */
const FORAGE: Record<string, string> = {
  Dorosoma: 'shad',
  Alosa: 'shad',
  Notropis: 'shiners',
  Notemigonus: 'shiners',
  Pimephales: 'minnows',
  Cyprinella: 'shiners',
  Luxilus: 'shiners',
  Rhinichthys: 'dace',
  Neogobius: 'gobies',
  Coregonus: 'cisco',
  Osmerus: 'smelt',
  Cottus: 'sculpin',
  Alburnus: 'bleak',
  Gobio: 'gudgeon',
}

export function forageFor(latin: string): string | undefined {
  return FORAGE[latin.trim().split(/\s+/)[0]]
}

export const SPECIES_NAMES = [...new Set(PROFILES.flatMap((p) => (p.id === 'sunfish' ? ['Bluegill', 'Pumpkinseed', 'Redear sunfish'] : [p.name])))].concat([
  'Yellow perch',
  'Walleye',
  'Sauger',
  'Northern pike',
  'Muskellunge',
  'Channel catfish',
  'Blue catfish',
  'Bullhead',
  'Striped bass',
  'White bass',
  'Roach',
  'Bream',
  'Tench',
  'Chub',
  'Barbel',
])

export const LURES = [
  ...new Set(
    PROFILES.flatMap((p) => [...p.tactics.default.lures, ...p.tactics.default.flies, ...p.tactics.default.baits]).filter(
      (x) => !/^Not usual/.test(x),
    ),
  ),
].sort()

export const METHODS = ['Fly', 'Spin', 'Bait', 'Other']

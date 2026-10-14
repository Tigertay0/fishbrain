// Inshore saltwater fish for the advice engine, written for this app from
// general angling practice. Same shape as the freshwater profiles, plus which
// coasts each fish lives on and the stage of the tide that suits it.
// Temperatures are °F and approximate. Size, bag and season rules vary a lot
// by state and change often: the app always says to check them.
import type { Coast, Profile } from './species'

export const SALT_PROFILES: Profile[] = [
  {
    id: 'striper',
    name: 'Striped bass',
    latin: ['Morone saxatilis'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['ne', 'se', 'pacific'],
    tempF: { active: [45, 75], best: [55, 68] },
    tide: { pref: 'moving', why: 'Moving water sweeps bait past them. At inlets and points, the first hours of the outgoing tide are often best.' },
    idTips: 'Silver with 7–8 unbroken dark stripes along the side.',
    tactics: {
      default: {
        still: 'Inlets, jetties, rocky points, sandbars and rips where current sweeps bait past; cuts and holes in the surf. Dawn, dusk and night are best.',
        how: 'Fish where current gathers bait. Swim lures slowly with the current; at night go slower and darker.',
        rigs: ['fishfinder', 'straight-lure', 'jig-minnow'],
        baits: ['Bunker (menhaden), chunked or live (where allowed)', 'Clams', 'Sandworms or bloodworms', 'Live eel (where allowed)'],
        lures: [
          'Bucktail jig',
          'Paddle-tail soft plastic on a jighead',
          'Swimming plug (minnow)',
          'Pencil popper or walking topwater',
          'Metal spoon or diamond jig',
          'Needlefish plug (night)',
        ],
        flies: ['Clouser Minnow', 'Deceiver', 'Sand eel fly'],
      },
      cold: {
        how: 'Slow and deep: soft plastics bounced along the bottom, or bait on the bottom.',
        lures: ['Paddle-tail soft plastic on a jighead', 'Bucktail jig'],
      },
      fall: {
        still: 'The fall run: follow diving birds and bait schools along beaches and inlets.',
        lures: ['Metal spoon or diamond jig', 'Pencil popper or walking topwater', 'Swimming plug (minnow)'],
      },
    },
    tackle: { line: '20–30 lb braid with a 30–40 lb fluorocarbon leader', hooks: '6/0–8/0 inline circle hooks with bait' },
    notes: ['Most Atlantic states require inline circle hooks when bait fishing for striped bass, and set a slot limit.'],
  },
  {
    id: 'bluefish',
    name: 'Bluefish',
    latin: ['Pomatomus saltatrix'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['ne', 'se', 'gulf'],
    tempF: { active: [58, 82], best: [66, 76] },
    tide: { pref: 'moving', why: 'Moving water stacks bait at inlets and rips, and blues feed hard on either tide.' },
    idTips: 'Blue-green back, silver sides, a black spot at the base of the pectoral fin, and very sharp teeth.',
    tactics: {
      default: {
        still: 'Inlets, rips and beaches with bait schools. Watch for diving birds and spraying baitfish.',
        how: 'Fast retrieves. Use a short wire or heavy bite leader: they cut line.',
        rigs: ['straight-lure', 'fishfinder'],
        baits: ['Cut mullet or menhaden', 'Finger mullet (live or dead)', 'Squid strip'],
        lures: ['Metal spoon or diamond jig', 'Topwater popper', 'Swimming plug (minnow)', 'Casting jig', 'Paddle-tail soft plastic (expect to lose tails)'],
        flies: ['Deceiver on a wire bite tippet', 'Popper'],
      },
    },
    tackle: { line: '15–30 lb line with a short wire or 50–60 lb bite leader', hooks: 'Single hooks with the barbs pinched: easier on you and the fish' },
    notes: ['Sharp teeth: unhook them with long pliers.'],
  },
  {
    id: 'flounder',
    name: 'Flounder (fluke)',
    latin: ['Paralichthys dentatus', 'Paralichthys lethostigma', 'Paralichthys albigutta'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['ne', 'se', 'gulf'],
    tempF: { active: [50, 80], best: [58, 72] },
    tide: { pref: 'falling', why: 'Outgoing tide: flounder lie on the bottom at inlet and creek mouths and ambush bait the current carries out.' },
    idTips: 'Flat, with both eyes on one side; brown with spots on top and white below.',
    tactics: {
      default: {
        still: 'Sandy bottom next to structure: inlet mouths, channel edges, creek mouths, and drop-offs beside bridges and docks.',
        how: 'Drag or slowly hop bait along the bottom. When you feel the bite, wait a few seconds before setting the hook.',
        rigs: ['carolina', 'jig-minnow', 'high-low'],
        baits: ['Live mud minnow or killifish', 'Finger mullet', 'Squid strip with a minnow', 'Live shrimp'],
        lures: [
          'Bucktail jig with a squid strip or soft-plastic trailer',
          'Scented soft-plastic mullet on a jighead',
          'Paddle-tail soft plastic, dragged slowly',
          'Soft-plastic shrimp on a jighead',
          'Small spoon',
        ],
        flies: ['Clouser Minnow, bounced on the bottom'],
      },
    },
    tackle: { line: '10–20 lb braid with a 20 lb fluorocarbon leader', hooks: '1/0–4/0 wide-gap hooks, ½–1 oz jigs' },
  },
  {
    id: 'redfish',
    name: 'Redfish (red drum)',
    latin: ['Sciaenops ocellatus'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['ne', 'se', 'gulf'],
    tempF: { active: [55, 90], best: [68, 84] },
    tide: {
      pref: 'moving',
      why: 'Rising tide: reds push onto flats and into flooded grass to feed. Falling tide: they wait at creek mouths and marsh drains for bait to wash out.',
    },
    idTips: 'Copper-bronze, with one or more black spots near the tail.',
    tactics: {
      default: {
        still: 'Shallow flats, oyster bars, marsh edges and creek mouths; tailing fish on calm flats. Jetties and the surf for big "bull" reds in fall.',
        how: 'Look for tails, wakes and nervous bait. Cast past the fish and bring the bait across their path.',
        rigs: ['popping-cork', 'carolina', 'jig-minnow', 'straight-lure'],
        baits: ['Cut mullet or menhaden', 'Live shrimp', 'Blue crab (quartered)', 'Finger mullet', 'Mud minnow'],
        lures: [
          'Gold weedless spoon',
          'Paddle-tail soft plastic on a jighead',
          'Soft-plastic shrimp under a popping cork',
          'Topwater walking bait',
          'Redfish spinnerbait',
          'Soft jerkbait',
        ],
        flies: ['Crab fly', 'Spoon fly', 'Clouser Minnow', 'Shrimp fly'],
      },
      cold: {
        still: 'Deeper creek holes and dark mud bottoms that hold heat; sunny afternoons on shallow flats.',
        how: 'Slow down: soft plastics dragged on the bottom, or cut bait.',
      },
    },
    tackle: { line: '10–20 lb braid with a 20–30 lb fluorocarbon leader', hooks: '1/0–3/0 for lures, 5/0–8/0 circle hooks for bull reds' },
    notes: ['Slot limits are common: big "bull" reds usually must go back.'],
  },
  {
    id: 'seatrout',
    name: 'Speckled trout (spotted seatrout)',
    latin: ['Cynoscion nebulosus'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['se', 'gulf', 'ne'],
    tempF: { active: [55, 85], best: [65, 78] },
    tide: { pref: 'moving', why: 'Moving water over the grass flats; the incoming tide often brings cleaner water and more bait.' },
    idTips: 'Silver-grey with black spots on the back, fins and tail; two fangs in the upper jaw.',
    tactics: {
      default: {
        still: 'Grass flats 2–6 ft deep, sand potholes in the grass, drop-offs and channel edges; around dock lights at night.',
        how: 'Topwater at dawn in warm weather; otherwise work lures slowly near the bottom. Set the hook gently: their mouths tear.',
        rigs: ['popping-cork', 'jig-minnow', 'straight-lure'],
        baits: ['Live shrimp', 'Finger mullet', 'Pinfish or croaker (where allowed)'],
        lures: [
          'Soft-plastic shrimp under a popping cork',
          'Paddle-tail soft plastic on a jighead',
          'Topwater walking bait',
          'Suspending twitchbait',
          'Soft jerkbait',
          'Small spoon',
        ],
        flies: ['Clouser Minnow', 'Shrimp fly', 'Seaducer'],
      },
      cold: {
        still: 'Deep holes, channels and residential canals that stay warmer.',
        how: 'Very slow: suspending baits paused for long seconds, soft plastics bumped on the bottom.',
        lures: ['Suspending twitchbait', 'Paddle-tail soft plastic on a jighead'],
      },
    },
    tackle: { line: '10–15 lb braid with a 15–20 lb fluorocarbon leader', hooks: '1/8–1/4 oz jigheads, #1–1/0 kahle hooks' },
  },
  {
    id: 'snook',
    name: 'Snook',
    latin: ['Centropomus undecimalis'],
    genus: ['Centropomus'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['gulf', 'se'],
    tempF: { active: [62, 92], best: [72, 86] },
    tide: { pref: 'falling', why: 'Outgoing tide: snook face into the current at passes, bridges and mangrove points, waiting for bait to wash past. Night is best.' },
    idTips: 'Silver with a bold black line along the side, a sloping forehead and a jutting lower jaw.',
    tactics: {
      default: {
        still: 'Passes, inlets, bridge shadow lines, mangrove shorelines and lit docks at night; beaches in summer.',
        how: 'Cast up-current and let the bait or lure swing into the shadow line. Hold on: they run for structure.',
        rigs: ['jig-minnow', 'straight-lure', 'popping-cork'],
        baits: ['Live pilchard (whitebait)', 'Live shrimp', 'Pinfish', 'Finger mullet'],
        lures: [
          'Soft-plastic swimbait on a jighead',
          'Bucktail jig',
          'Soft jerkbait',
          'Suspending twitchbait',
          'Topwater walking bait',
          'Small flair-hair jig (bridges at night)',
        ],
        flies: ['Deceiver', 'Glass minnow fly', 'Clouser Minnow'],
      },
    },
    tackle: { line: '20–30 lb braid with a 30–50 lb fluorocarbon leader (sharp gill plates)', hooks: '2/0–5/0 circle hooks for live bait' },
    notes: ['Florida has closed seasons and a tight slot for snook. Below about 60°F water they are stressed: release them quickly.'],
  },
  {
    id: 'sheepshead',
    name: 'Sheepshead',
    latin: ['Archosargus probatocephalus'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['ne', 'se', 'gulf'],
    tempF: { active: [50, 82], best: [60, 74] },
    tide: { pref: 'slack', why: 'Around the turn of the tide, when the current is light enough to keep a bait tight to the pilings.' },
    idTips: 'Five or six black vertical bars on silver-grey, and human-like front teeth.',
    tactics: {
      default: {
        still: 'Bridge and dock pilings, jetties, oyster bars and wrecks: anywhere with barnacles.',
        how: 'Drop bait right against the structure. Bites are light taps: set the hook at the first sign of weight.',
        rigs: ['high-low', 'carolina', 'jig-minnow'],
        baits: ['Fiddler crab', 'Sand flea (mole crab)', 'Live shrimp', 'Barnacles or oysters scraped from the pilings'],
        lures: ['Not usual; a small jig tipped with shrimp or fiddler crab works'],
        flies: ['Not usual'],
      },
    },
    tackle: { line: '20–30 lb braid with a 20–30 lb leader', hooks: '#1–1/0 strong short-shank hooks' },
  },
  {
    id: 'blackdrum',
    name: 'Black drum',
    latin: ['Pogonias cromis'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['ne', 'se', 'gulf'],
    tempF: { active: [50, 85], best: [60, 78] },
    tide: { pref: 'moving', why: 'Moving water carries the scent of your bait along the bottom to them.' },
    idTips: 'Grey-black and deep-bodied with whiskers on the chin; young fish have dark vertical bars.',
    tactics: {
      default: {
        still: 'Deep channels, bridge pilings, oyster bars and the surf; big fish in inlets and bays in spring.',
        how: 'Bait on the bottom, and patience. They crush shellfish, so crab and clam are hard to beat.',
        rigs: ['fishfinder', 'high-low', 'carolina'],
        baits: ['Clams', 'Blue crab (quartered)', 'Live shrimp', 'Cut mullet or menhaden'],
        lures: ['Not usual; a jig tipped with shrimp catches smaller drum'],
        flies: ['Not usual'],
      },
    },
    tackle: { line: '20–30 lb line', hooks: '3/0–7/0 circle hooks' },
  },
  {
    id: 'tautog',
    name: 'Tautog (blackfish)',
    latin: ['Tautoga onitis'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['ne'],
    tempF: { active: [45, 72], best: [52, 64] },
    tide: { pref: 'slack', why: 'Around slack tide, when the current lets your bait sit down in the rocks.' },
    idTips: 'Dark, thick-lipped and blunt-headed, with strong crushing teeth.',
    tactics: {
      default: {
        still: 'Rock piles, jetties, wrecks, bridge abutments and mussel beds, 5–60 ft.',
        how: 'Bait on the bottom, tight to the rocks. Tog nibble, then crunch: lift hard when you feel weight. Expect to lose rigs.',
        rigs: ['high-low', 'jig-minnow'],
        baits: ['Green crab', 'Asian shore crab', 'Clams', 'Fiddler crab'],
        lures: ['Not usual; a tog jig tipped with crab works'],
        flies: ['Not usual'],
      },
    },
    tackle: { line: '30–50 lb braid with a 40 lb leader', hooks: '2/0–4/0 strong hooks or tog jigs' },
  },
  {
    id: 'spanish',
    name: 'Spanish mackerel',
    latin: ['Scomberomorus maculatus'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['se', 'gulf', 'ne'],
    tempF: { active: [68, 88], best: [72, 82] },
    tide: { pref: 'moving', why: 'Moving, clean water: the incoming tide at inlets often brings it in.' },
    idTips: 'Sleek and silver with gold-yellow spots, and sharp teeth.',
    tactics: {
      default: {
        still: 'Bait schools along beaches, inlets and piers; look for birds and skipping baitfish.',
        how: 'Fast retrieves with small, shiny lures. Use a short light wire or heavy leader.',
        rigs: ['straight-lure'],
        baits: ['Live glass minnows or small baitfish', 'Cut bait under a float', 'Live shrimp'],
        lures: ['Small metal spoon', 'Casting jig plug (Gotcha style)', 'Small tin or diamond jig', 'Small swimming plug', 'Sabiki or small bucktail'],
        flies: ['Small Clouser Minnow', 'Glass minnow fly'],
      },
    },
    tackle: { line: '10–20 lb line with a short light wire or 40 lb leader', hooks: 'Small single hooks, or the lure’s own trebles' },
  },
  {
    id: 'surfperch',
    name: 'Surfperch',
    latin: ['Amphistichus argenteus', 'Amphistichus rhodoterus', 'Hyperprosopon argenteum', 'Embiotoca jacksoni'],
    genus: ['Amphistichus', 'Hyperprosopon', 'Embiotoca', 'Rhacochilus'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['pacific'],
    tempF: { active: [48, 70], best: [54, 64] },
    tide: { pref: 'rising', why: 'Incoming tide, especially the first hours: perch move into the troughs to feed on sand crabs.' },
    idTips: 'Deep-bodied, silver or barred, with a forked tail. Females carry live young.',
    tactics: {
      default: {
        still: 'Troughs and holes just behind the breakers, rip currents and the edges of sandbars; jetty walls.',
        how: 'Cast into the trough and drag the bait slowly back. The fish are close: don’t overcast.',
        rigs: ['carolina', 'high-low'],
        baits: ['Sand crabs', 'Ghost shrimp', 'Bloodworm or lugworm', 'Clam or mussel'],
        lures: ['Scented sandworm soft plastic on a Carolina rig', 'Small grub on a light jighead', 'Small curly-tail grub', 'Small spoon', 'Small swimbait'],
        flies: ['Small orange or chartreuse surf fly'],
      },
    },
    tackle: { line: '8–12 lb line', hooks: '#6–#2 hooks' },
  },
  {
    id: 'rockfish',
    name: 'Rockfish and lingcod',
    latin: ['Ophiodon elongatus'],
    genus: ['Sebastes', 'Ophiodon'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['pacific'],
    tempF: { active: [44, 64], best: [48, 58] },
    tide: { pref: 'slack', why: 'Around slack tide, when you can keep a jig in the rocks without the current dragging it off.' },
    idTips: 'Rockfish: spiny, big-eyed, many colours. Lingcod: long and mottled, with a huge mouth full of teeth.',
    tactics: {
      default: {
        still: 'Rocky reefs, kelp beds, jetties and breakwaters.',
        how: 'Jig or bounce bait right on the rocks. Lingcod often grab a hooked rockfish: be ready.',
        rigs: ['jig-minnow', 'high-low', 'straight-lure'],
        baits: ['Squid strip', 'Herring or anchovy', 'Live bait for lingcod (where allowed)'],
        lures: ['Swimbait on a heavy jighead', 'Leadhead jig with a curly-tail grub', 'Metal jig', 'Shrimp fly rig above a jig', 'Large paddle tail (lingcod)'],
        flies: ['Weighted baitfish fly on a sinking line'],
      },
    },
    tackle: { line: '20–40 lb braid', hooks: '2–6 oz jigs, depending on depth and current' },
    notes: ['Rockfish seasons, depth limits and species rules change often: check before you go. Use a descending device for fish caught deep.'],
  },
  {
    id: 'halibut',
    name: 'California halibut',
    latin: ['Paralichthys californicus'],
    group: 'saltwater',
    regions: ['na'],
    waters: ['coast'],
    coasts: ['pacific'],
    tempF: { active: [55, 72], best: [60, 68] },
    tide: { pref: 'moving', why: 'Moving water near the bottom; in bays, often the incoming tide.' },
    idTips: 'Flat with a large, toothy mouth; the eyes can be on either side.',
    tactics: {
      default: {
        still: 'Sandy bottom in bays, harbours and along beaches, often near eelgrass and structure.',
        how: 'Drag bait or swimbaits slowly along the bottom. Give them time to turn the bait before you set the hook.',
        rigs: ['carolina', 'jig-minnow'],
        baits: ['Live anchovy or sardine', 'Live smelt (where allowed)', 'Squid'],
        lures: ['Paddle-tail swimbait on a jighead', 'Soft-plastic swimbait on a Carolina rig', 'Bucktail jig', 'Small spoon', 'Diving plug (trolled)'],
        flies: ['Clouser Minnow on a sinking line'],
      },
    },
    tackle: { line: '15–20 lb line', hooks: '1/0–4/0 hooks, ½–1 oz jigheads' },
    notes: ['Size limits are strict: measure carefully.'],
  },
  {
    id: 'seabass',
    name: 'European sea bass',
    latin: ['Dicentrarchus labrax'],
    group: 'saltwater',
    regions: ['eu'],
    waters: ['coast'],
    coasts: ['eu'],
    tempF: { active: [48, 72], best: [56, 68] },
    tide: { pref: 'rising', why: 'The flood (incoming) tide: bass follow it into estuaries, over flooded rocks and into the surf to feed.' },
    idTips: 'Silver with a grey back, two dorsal fins and a sharp spine on the gill cover.',
    tactics: {
      default: {
        still: 'Surf beaches with a little swell, rocky points, estuary mouths and harbour walls; dawn, dusk and night.',
        how: 'Fish the first hours of the flood. Retrieve lures slowly, just under the surface.',
        rigs: ['straight-lure', 'fishfinder', 'jig-minnow'],
        baits: ['Peeler crab', 'Ragworm', 'Sandeel (live or dead)', 'Squid or mackerel strip'],
        lures: ['Soft-plastic sandeel on a jighead', 'Shallow minnow plug', 'Surface stickbait or popper', 'Metal casting jig', 'Weedless soft jerkbait'],
        flies: ['Sandeel fly', 'Clouser Minnow'],
      },
    },
    tackle: { line: '10–20 lb braid with a 15–20 lb fluorocarbon leader', hooks: '1/0–4/0 hooks for bait' },
    notes: ['Sea bass have bag limits and closed seasons in much of Europe, and the rules change yearly.'],
  },
  {
    id: 'mackerel',
    name: 'Atlantic mackerel',
    latin: ['Scomber scombrus'],
    group: 'saltwater',
    regions: ['eu', 'na'],
    waters: ['coast'],
    coasts: ['eu', 'ne'],
    tempF: { active: [50, 68], best: [54, 64] },
    tide: { pref: 'moving', why: 'Moving water, often around high tide, brings shoals within casting range.' },
    idTips: 'Green-blue back with black wavy bars over silver; small, fast and in shoals.',
    tactics: {
      default: {
        still: 'Piers, harbour walls, rocky points and beaches when shoals come inshore in summer.',
        how: 'Cast and retrieve at different depths until you find the shoal; then stay on that depth.',
        rigs: ['straight-lure'],
        baits: ['Mackerel strip', 'Fish strip under a float', 'Ragworm'],
        lures: ['Feathers or a sabiki string', 'Small metal casting spoon', 'Small spinner', 'Small casting jig', 'Small soft-plastic shad'],
        flies: ['Small baitfish fly'],
      },
    },
    tackle: { line: '8–15 lb line', hooks: 'Small hooks; feathers come rigged' },
  },
]

/**
 * Which stretch of coast a point is on: rough boxes, good enough to pick likely
 * fish. Undefined outside the coasts the guide covers (Hawaii, the Caribbean,
 * the rest of the world), so it never guesses fish that don't live there.
 */
export function coastFor(lat: number, lon: number): Coast | undefined {
  if (lon >= -12 && lon <= 40 && lat >= 35 && lat <= 72) return 'eu'
  if (lon < -100 && lon > -170 && lat > 31 && lat < 72) return 'pacific'
  if (lon < -100 || lon > -52 || lat < 24 || lat > 52) return undefined
  // Florida's Atlantic side runs west of -81.6 only below Jacksonville's latitude.
  if (lat < 31 && lon < -81.6) return 'gulf'
  if (lat < 36.5) return 'se'
  return 'ne'
}

/** The fish that usually live on this coast, when no records say otherwise. */
export function defaultSaltTargets(coast: Coast | undefined, lat: number): string[] {
  if (!coast) return []
  const subtropical = lat < 29.5
  switch (coast) {
    case 'ne':
      return lat < 39 ? ['striper', 'flounder', 'bluefish', 'redfish', 'seatrout', 'tautog'] : ['striper', 'bluefish', 'flounder', 'tautog', 'mackerel']
    case 'se':
      return ['redfish', 'seatrout', 'flounder', 'bluefish', 'sheepshead', 'blackdrum', ...(subtropical ? ['snook'] : [])]
    case 'gulf':
      return ['redfish', 'seatrout', 'flounder', 'sheepshead', 'blackdrum', 'spanish', ...(subtropical ? ['snook'] : [])]
    case 'pacific':
      return ['surfperch', 'rockfish', ...(lat < 38.5 ? ['halibut'] : []), ...(lat > 36.5 && lat < 44.5 ? ['striper'] : [])]
    case 'eu':
      return ['seabass', 'mackerel']
  }
}

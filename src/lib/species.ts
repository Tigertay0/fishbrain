// Written for this app. Temperatures are the commonly cited preferred ranges,
// approximate by design: local strains and seasons vary.
export type Species = {
  id: string
  name: string
  latin: string
  group: 'trout' | 'other'
  id_tips: string
  range: string
  tempF: [number, number]
  tactics: string
}

export const SPECIES: Species[] = [
  {
    id: 'brook',
    name: 'Brook trout',
    latin: 'Salvelinus fontinalis',
    group: 'trout',
    id_tips: 'Dark olive back with pale, worm-like marbling; red spots ringed in blue; lower fins edged white then black. Technically a char.',
    range: 'Native to the East and upper Midwest; stocked widely in cold western headwaters.',
    tempF: [50, 60],
    tactics: 'Small, cold, shaded water. Bushy attractor dries, small nymphs, and a careful approach. First to suffer when water warms.',
  },
  {
    id: 'brown',
    name: 'Brown trout',
    latin: 'Salmo trutta',
    group: 'trout',
    id_tips: 'Golden-brown to olive body, black and red-orange spots often with pale halos, few or no spots on the tail.',
    range: 'Brought from Europe in the 1880s; now in cold rivers across most of the country.',
    tempF: [52, 65],
    tactics: 'Warier than other trout and most active at dawn, dusk and under cloud. Streamers for big fish, nymphs and caddis for the rest.',
  },
  {
    id: 'rainbow',
    name: 'Rainbow trout',
    latin: 'Oncorhynchus mykiss',
    group: 'trout',
    id_tips: 'Pink to red stripe along the side, small black spots over the back and right across the tail. Sea-run fish are steelhead.',
    range: 'Native to Pacific drainages; the most stocked trout in the US.',
    tempF: [55, 65],
    tactics: 'Feeds in faster water than browns. Midges and egg patterns in tailwaters, dries during hatches, small spinners.',
  },
  {
    id: 'cutthroat',
    name: 'Cutthroat trout',
    latin: 'Oncorhynchus clarkii',
    group: 'trout',
    id_tips: 'Red or orange slash under the lower jaw; spots crowd toward the tail. Several subspecies, some protected.',
    range: 'Native to the Rocky Mountain and Pacific states.',
    tempF: [50, 60],
    tactics: 'Often willing on dry flies; hoppers in late summer. Check rules: many waters are catch and release for natives.',
  },
  {
    id: 'lake',
    name: 'Lake trout',
    latin: 'Salvelinus namaycush',
    group: 'trout',
    id_tips: 'Grey-green with pale spots, deeply forked tail. A char of big, deep, cold lakes.',
    range: 'Great Lakes, northern lakes, some western reservoirs.',
    tempF: [46, 55],
    tactics: 'Shallow after ice-out and in fall, deep in summer. Jigs, spoons and trolling.',
  },
  {
    id: 'grayling',
    name: 'Arctic grayling',
    latin: 'Thymallus arcticus',
    group: 'trout',
    id_tips: 'Silver-grey with a tall, sail-like dorsal fin speckled with color.',
    range: 'Alaska, plus a few waters in Montana and the Mountain West.',
    tempF: [45, 60],
    tactics: 'Rises freely to small dry flies.',
  },
  {
    id: 'smallmouth',
    name: 'Smallmouth bass',
    latin: 'Micropterus dolomieu',
    group: 'other',
    id_tips: 'Bronze-brown with faint vertical bars; the jaw stops below the eye.',
    range: 'Rocky rivers and clear lakes across the East and Midwest; many western rivers now.',
    tempF: [65, 75],
    tactics: 'Crayfish patterns, tubes, Clouser Minnows around current breaks and rock.',
  },
  {
    id: 'largemouth',
    name: 'Largemouth bass',
    latin: 'Micropterus salmoides',
    group: 'other',
    id_tips: 'Green with a dark horizontal stripe; the jaw reaches past the eye.',
    range: 'Warm, weedy lakes and slow rivers in all lower 48 states.',
    tempF: [65, 80],
    tactics: 'Soft plastics and topwater around weeds, wood and docks.',
  },
  {
    id: 'walleye',
    name: 'Walleye',
    latin: 'Sander vitreus',
    group: 'other',
    id_tips: 'Glassy, reflective eyes; white tip on the lower lobe of the tail.',
    range: 'Large lakes and rivers of the Midwest and North.',
    tempF: [60, 70],
    tactics: 'Low-light feeder. Jigs with minnows, crankbaits along breaks at dusk.',
  },
  {
    id: 'pike',
    name: 'Northern pike',
    latin: 'Esox lucius',
    group: 'other',
    id_tips: 'Long body, rows of pale bean-shaped spots on dark green, a mouth full of sharp teeth.',
    range: 'Northern lakes and slow rivers.',
    tempF: [55, 70],
    tactics: 'Big streamers, spoons and jerkbaits. Use a bite leader.',
  },
  {
    id: 'bluegill',
    name: 'Bluegill',
    latin: 'Lepomis macrochirus',
    group: 'other',
    id_tips: 'Deep, round body; dark flap at the gill cover; often a dark spot at the back of the dorsal fin.',
    range: 'Ponds, lakes and slow rivers everywhere.',
    tempF: [70, 80],
    tactics: 'Small poppers, wet flies and worms near cover.',
  },
  {
    id: 'channel',
    name: 'Channel catfish',
    latin: 'Ictalurus punctatus',
    group: 'other',
    id_tips: 'Forked tail, whisker-like barbels, scattered dark spots on younger fish.',
    range: 'Warm rivers and lakes across most of the country.',
    tempF: [75, 85],
    tactics: 'Cut bait and nightcrawlers on the bottom, best at night.',
  },
]

export const SPECIES_NAMES = SPECIES.map((s) => s.name)

export const LURES = [
  'Pheasant Tail nymph', "Hare's Ear nymph", 'Zebra Midge', 'Prince nymph', 'Copper John', 'Perdigon', 'Scud', 'San Juan Worm',
  'Egg pattern', 'Woolly Bugger', 'Sculpin streamer', 'Clouser Minnow', 'Elk Hair Caddis', 'Parachute Adams', 'Royal Wulff',
  "Griffith's Gnat", 'Blue-Winged Olive', 'Hopper', 'Ant', 'Beetle', 'Inline spinner', 'Spoon', 'Jig', 'Crankbait', 'Soft plastic',
  'Nightcrawler', 'Dough bait', 'Live minnow',
]

export const METHODS = ['Fly', 'Spin', 'Bait', 'Other']

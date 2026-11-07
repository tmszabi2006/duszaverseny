export interface DemoMapDefinition {
  legacyName?: string;
  name: string;
  description: string;
  data: string;
}

/**
 * Rendszerindításkor elérhető játékkörnyezet.
 * A térképek érvényesek, és a bennük lévő aranyrögök mind elérhetők.
 */
export const DEMO_MAPS: DemoMapDefinition[] = [
  {
    name: 'Hajnalcsillag-tárna',
    legacyName: 'Aranyér',
    description:
      'Kezdőknek ajánlott, keskeny tárna: a robot egyenesen halad előre, és útközben minden aranyrögöt ki tud bányászni. Próbáld ki az „Hajnalcsillag – három aranyrög” mintaprogramot!',
    data: ['3 15', '>..@...@...@...', '###############', '...............'].join('\n'),
  },
  {
    name: 'Deres szikla',
    legacyName: 'Bemutató bánya',
    description:
      'A feladatsor első példája. A robot kelet felé néz, de a tárna végén a szél állja az útját. Nézz körül, és tervezz be egy fordulót!',
    data: ['3 15', '....@..........', '.#############.', '.......@...>...'].join('\n'),
  },
  {
    name: 'Jégcsap-akna',
    legacyName: 'Kis akna',
    description:
      'Hét sorból és hét oszlopból álló, kanyargós kis labirintus két aranyröggel. Mire elég 1000 feldolgozott programsor?',
    data: [
      '7 7',
      '#######',
      '#v#@..#',
      '#.#.#.#',
      '#.#.@.#',
      '#.###.#',
      '#.....#',
      '#######',
    ].join('\n'),
  },
  {
    name: 'Fagyos kanyarulat',
    legacyName: 'Kanyargó tárna',
    description:
      'Tizenegy sorból álló, zegzugos aknarendszer öt aranyröggel. A falak között érdemes falkövető stratégiát írni.',
    data: [
      '11 11',
      '###########',
      '#v#@......#',
      '#.#####.#.#',
      '#.....#.#.#',
      '#####.###.#',
      '#..@#...#.#',
      '#.#.###.#.#',
      '#.@..@#...#',
      '#.#######.#',
      '#@........#',
      '###########',
    ].join('\n'),
  },
  {
    name: 'Északi aranymély',
    legacyName: 'Nagy bánya',
    description:
      'Haladó kihívás: 15×15-ös labirintus tíz aranyröggel. Itt már igazán számít, mennyire okos a programod.',
    data: [
      '15 15',
      '###############',
      '#>............#',
      '#.###########.#',
      '#.#...........#',
      '#.#.#######.#.#',
      '#...#.......#.#',
      '#####.#####.#.#',
      '#@....#.....#.#',
      '###.#########.#',
      '#...#..@#.....#',
      '#@###@#.#.#####',
      '#.#@..#.#.#..@#',
      '#.#.###@#.#.#.#',
      '#.@..@#.....@.#',
      '###############',
    ].join('\n'),
  },
  {
    name: 'Örökfagy labirintusa',
    description: 'Mesterpálya: 15 × 15 mező, 18 aranyrög, hosszú kerülők és zsákutcák. Minden kincs elérhető, de az 1000 soros kerethez gondos útvonaltervezés kell.',
    data: [
      '15 15',
      '###############',
      '#>#@@.#.......#',
      '#.#.#.#.#####.#',
      '#.#@#.#.....#.#',
      '#@###.#####.#.#',
      '#@..#......@#.#',
      '###.#@#######.#',
      '#@#.#@#@....#.#',
      '#.#.###.###@#.#',
      '#.#.....#...#.#',
      '#.#######.###.#',
      '#......@#.#..@#',
      '#.###@###.#.#@#',
      '#..@#..@....#@#',
      '###############',
    ].join('\n'),
  },
];

/** A szerkesztő új térképének kiinduló rácsai. */
export const NEW_MAP_TEMPLATE = [
  '#########',
  '#.......#',
  '#.......#',
  '#.......#',
  '#...>...#',
  '#.......#',
  '#.......#',
  '#.......#',
  '#########',
].join('\n');

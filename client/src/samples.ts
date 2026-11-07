export interface SampleProgram {
  name: string;
  description: string;
  source: string;
}

const ARANYER: SampleProgram = {
  name: 'Hajnalcsillag – három aranyrög',
  description: 'Egyenesen előrehalad, és minden aranyrög fölött megbányássza a termést.',
  source: ['step forward 3', 'mine here', 'step forward 4', 'mine here', 'step forward 4', 'mine here'].join(
    '\n',
  ),
};

const BEMUTATO: SampleProgram = {
  name: 'Deres szikla – körút',
  description: 'Körbejárja a falat, és mindkét aranyrögöt összeszedi.',
  source: [
    'turn by 2',
    'step forward 4',
    'mine here',
    'turn by 2',
    'step forward 7',
    'turn by 1',
    'step forward 2',
    'turn by 1',
    'step forward 10',
    'mine here',
  ].join('\n'),
};

const KIS_AKNA: SampleProgram = {
  name: 'Jégcsap-akna – körbe a járaton',
  description: 'Végigjárja a kanyargós tárnát, és mindkét aranyrögöt kihozza.',
  source: [
    'step forward 4',
    'turn by 1',
    'step forward 4',
    'turn by 1',
    'step forward 2',
    'turn by 1',
    'step forward 1',
    'mine here',
    'turn by 2',
    'step forward 1',
    'turn by 1',
    'step forward 2',
    'turn by 1',
    'step forward 2',
    'mine here',
  ].join('\n'),
};

const SYNTAX: SampleProgram = {
  name: 'Szintaxis-bemutató',
  description:
    'Változók, logikai értékek, isThere és print egy helyen. Bármelyik térképen lefut.',
  source: [
    'set aranyAfalban to false',
    'set elottem to isThere 1',
    'set x to 5',
    'set x to x + 2',
    'print x',
    'print elottem',
    'print aranyAfalban',
  ].join('\n'),
};

const BY_MAP_NAME: Record<string, SampleProgram[]> = {
  'Hajnalcsillag-tárna': [ARANYER, SYNTAX],
  'Deres szikla': [BEMUTATO, SYNTAX],
  'Jégcsap-akna': [KIS_AKNA, SYNTAX],
  Aranyér: [ARANYER, SYNTAX],
  'Bemutató bánya': [BEMUTATO, SYNTAX],
  'Kis akna': [KIS_AKNA, SYNTAX],
};

export const GENERIC_SAMPLE = SYNTAX;

export function samplesForMap(mapName: string): SampleProgram[] {
  return BY_MAP_NAME[mapName] ?? [SYNTAX];
}

export function defaultProgramForMap(mapName: string): string {
  return samplesForMap(mapName)[0]?.source ?? '';
}

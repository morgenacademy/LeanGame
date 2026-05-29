// Socratische debrief: de game vraagt eerst, benoemt het principe pas na het antwoord.
// "Discovery, not persuasion" — geen fout antwoord, het gaat om de reflectie.

import { euro, secs } from './colors';
import type { GameState } from './types';

export interface DebriefStep {
  question: string;
  hint?: string;
  options: string[];
  /** Wordt pas getoond nadat de speler een optie koos. */
  reveal: string;
  principle: string;
}

export interface DebriefScript {
  tag: string;
  steps: DebriefStep[];
}

export function buildDebrief(g: GameState): DebriefScript {
  const m = g.metrics;

  if (g.mode === 'push') {
    return {
      tag: 'Ronde 1 · Push',
      steps: [
        {
          question: 'Je bouwde volop. Hoeveel huizen kocht de klant uiteindelijk?',
          hint: 'Je kon dit niet weten: pas aan het eind bleek wélke kleur de klant wilde. Dat is juist het punt van push.',
          options: ['Veel gebouwd, weinig verkocht', 'Ongeveer gelijk', 'Weet ik niet'],
          reveal: `Je bouwde ${m.housesBuilt} huizen, de klant kocht er ${m.housesSold}. De andere ${m.housesUnsold} liggen onverkocht — gemaakt op voorraad, zonder te weten wat de klant wilde.`,
          principle: 'Overproductie — de hoofdverspilling',
        },
        {
          question: 'Waar stapelde het werk zich op?',
          options: ['Tussen de stations', 'Bij mij, de bouwer', 'Overal een beetje'],
          reveal: `Elke wachtende set tussen stations is WIP (work-in-process): vastgelegd geld dat nergens waarde levert. Piek-WIP deze ronde: ${m.peakWip}.`,
          principle: 'WIP = verborgen kosten',
        },
        {
          question: 'Hoe voelde het tempo?',
          options: ['Gejaagd, chaotisch', 'Druk maar oké', 'Te rustig'],
          reveal: `Iedereen werkte zo hard mogelijk en tóch: ${euro(m.profit)}. Hard werken is niet hetzelfde als waarde leveren. Dit heet push — produceren op planning in plaats van op vraag.`,
          principle: 'Push duwt werk de lijn in, of de klant het nu wil of niet',
        },
      ],
    };
  }

  // pull
  const r1 = g.roundResults[0];
  return {
    tag: 'Ronde 2 · Pull',
    steps: [
      {
        question: 'Stond je deze ronde wel eens stil?',
        hint: 'Met lege handen wachten op materiaal.',
        options: ['Ja, regelmatig', 'Soms even', 'Nauwelijks'],
        reveal: `Stilstaan voelt verkeerd, maar het werk blééf stromen. Niet iedereen hoeft 100% bezig te zijn — het gaat erom dat het werk doorstroomt.`,
        principle: 'Flow-efficiëntie boven resource-efficiëntie',
      },
      {
        question: 'Hoeveel van wat je bouwde, raakte nu verkocht?',
        options: ['Bijna alles', 'Ongeveer de helft', 'Weinig'],
        reveal: `Gebouwd: ${m.housesBuilt}, verkocht: ${m.housesSold}. Je maakte op signaal van de klant (pull / kanban), dus nauwelijks voorraad voor de prullenbak. Eerste huis al na ${secs(m.firstHouseMs)}.`,
        principle: 'Pull trekt werk pas binnen op vraag',
      },
      {
        question: 'Vergelijk nu de winst van beide rondes. Wat veranderde er?',
        hint: r1 ? `Ronde 1: ${euro(r1.profit)} · Ronde 2: ${euro(m.profit)}` : undefined,
        options: ['Wij werkten slimmer', 'De spelregels veranderden', 'Geluk'],
        reveal: r1
          ? `Ronde 1: ${euro(r1.profit)}. Ronde 2: ${euro(m.profit)}. Zelfde mensen, zelfde stenen — alleen andere spelregels. Dáár zit lean: niet harder werken, maar het systeem anders inrichten.`
          : `Niet harder werken, maar het systeem anders inrichten. Dáár zit lean.`,
        principle: 'Principes boven praktijken',
      },
    ],
  };
}

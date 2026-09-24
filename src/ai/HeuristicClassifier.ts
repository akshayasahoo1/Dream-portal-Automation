import type { DreamClassifier, DreamLabel } from './types';

const BAD_WORDS = new Set([
  'monster', 'chase', 'chased', 'chasing', 'falling', 'fall', 'lost', 'maze', 'trapped', 'drown', 'drowning',
  'nightmare', 'fire', 'burning', 'dark', 'ghost', 'haunted', 'haunting', 'attack', 'attacked', 'attacking', 'exam', 'late', 'teeth', 'death', 'dead',
  'die', 'dying', 'war', 'scream', 'storm', 'alone', 'spider', 'snake', 'zombie', 'kidnap', 'crash', 'naked',
  'monsters', 'demon', 'blood', 'cliff', 'skyscraper', 'stuck', 'paralyzed', 'paralysis', 'chases', 'falls', 'fell', 'lose', 'losing', 'nightmares', 'ghosts', 'zombies', 'spiders', 'snakes', 'sharks', 'monster', 'dying', 'burn', 'burned', 'drowned', 'lonely', 'fail', 'shark', 'tsunami',
]);

const GOOD_WORDS = new Set([
  'flying', 'fly', 'beach', 'garden', 'treasure', 'dance', 'dancing', 'music', 'family', 'friends', 'flowers',
  'ocean', 'meadow', 'win', 'winning', 'puppies', 'puppy', 'laugh', 'laughing', 'paradise', 'stars', 'rainbow',
  'magical', 'magic', 'waterfall', 'parties', 'party', 'celebration', 'wedding', 'sunny', 'relax', 'relaxing', 'swimming',
  'picnic', 'festival', 'hero', 'castle', 'butterflies', 'peaceful', 'love', 'gift', 'vacation', 'mountains', 'mountain', 'fun', 'happy', 'sunshine', 'flowers', 'dreamland',
]);

/**
 * OFFLINE FALLBACK - a keyword lexicon, not a real AI model.
 * Lets the AI test run deterministically with no API key / network. The report always labels it
 * as "offline heuristic" so nobody mistakes it for an LLM result.
 */
export class HeuristicClassifier implements DreamClassifier {
  readonly isRealModel = false;
  readonly name = 'Offline heuristic (keyword lexicon - not an AI model)';

  async classify(dreamName: string): Promise<DreamLabel> {
    // whole-word matching so that "late" does not fire on "chocolate"
    const tokens = new Set(dreamName.toLowerCase().split(/[^a-z]+/).filter(Boolean));
    const hits = (words: Set<string>) => [...words].filter((w) => tokens.has(w)).length;
    return hits(BAD_WORDS) > hits(GOOD_WORDS) ? 'Bad' : 'Good';
  }
}

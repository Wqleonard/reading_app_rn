import { parseStoryWithNodes } from '@/src/data/story/parser';
import type { StoryCharacter, StoryWithNodes } from '@/src/data/story/types';
import story001Raw from '@/src/data/story/mock/story_001_merged.json';

const stories: StoryWithNodes[] = [parseStoryWithNodes(story001Raw)];
const storyMap = new Map<string, StoryWithNodes>(stories.map((s) => [s.id, s]));

export function getStoryById(storyId: string): StoryWithNodes | null {
  return storyMap.get(storyId) ?? null;
}

export function listStories(): StoryWithNodes[] {
  return stories;
}

export function getCharacterById(
  characterId: string
): { story: StoryWithNodes; character: StoryCharacter } | null {
  for (const story of stories) {
    const character = story.mainCharacters.find((item) => item.id === characterId);
    if (character) {
      return { story, character };
    }
  }
  return null;
}

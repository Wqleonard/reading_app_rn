import { router } from 'expo-router';

type CharacterLike = { id?: string | null } | null | undefined;

export class AppNavigator {
  static toSearch() {
    router.push('/search');
  }

  static toEncounterTab() {
    router.push('/(tabs)/encounter');
  }

  static toStoryDetail(storyId: string) {
    if (!storyId) return;
    router.push(`/story/${storyId}`);
  }

  static toReaderPure(storyId: string) {
    if (!storyId) return;
    router.push(`/reader/${storyId}?mode=pure`);
  }

  static toReaderInteractive(storyId: string) {
    if (!storyId) return;
    router.push(`/reader/${storyId}?mode=interactive`);
  }

  static toReader(storyId: string) {
    if (!storyId) return;
    router.push(`/reader/${storyId}`);
  }

  static toCharacterDetail(characterId: string) {
    if (!characterId) return;
    router.push(`/character/${characterId}`);
  }

  static toCharacterDetailFromObject(character: CharacterLike) {
    const id = character?.id;
    if (!id) return;
    this.toCharacterDetail(id);
  }

  static back() {
    router.back();
  }
}


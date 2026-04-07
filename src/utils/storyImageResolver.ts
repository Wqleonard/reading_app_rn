import type { ImageSourcePropType } from 'react-native';

const STORY_LOCAL_IMAGE_SOURCES: Record<string, ImageSourcePropType> = {
  'assets/mock/我心归处是良人/images/cover.jpg': require('../../assets/story/cover.jpg'),
  'assets/mock/我心归处是良人/images/avatar.jpg': require('../../assets/story/avatar.jpg'),
  'assets/mock/我心归处是良人/images/iconic_scene/scene_1.png': require('../../assets/story/iconic_scene/scene_1.png'),
  'assets/mock/我心归处是良人/images/iconic_scene/scene_2.png': require('../../assets/story/iconic_scene/scene_2.png'),
  'assets/mock/我心归处是良人/images/iconic_scene/scene_3.png': require('../../assets/story/iconic_scene/scene_3.png'),
  'assets/mock/我心归处是良人/images/reader_panel/panel_char_1.png': require('../../assets/story/reader_panel/panel_char_1.png'),
  'assets/mock/我心归处是良人/images/reader_panel/panel_char_2.png': require('../../assets/story/reader_panel/panel_char_2.png'),
  'assets/mock/我心归处是良人/images/reader_panel/panel_locked_bg.png': require('../../assets/story/reader_panel/panel_locked_bg.png'),

  'assets/mock/我心归处是良人/images/branch_display/兄长遇刺.jpg': require('../../assets/story/branch_display/scene_brother_attack.jpg'),
  'assets/mock/我心归处是良人/images/branch_display/十五暗恋.jpg': require('../../assets/story/branch_display/scene_guard_secret_love.jpg'),
  'assets/mock/我心归处是良人/images/branch_display/卑微追妻.png': require('../../assets/story/branch_display/scene_humble_chase.png'),
  'assets/mock/我心归处是良人/images/branch_display/宫宴遇刺.png': require('../../assets/story/branch_display/scene_banquet_assassin.png'),
  'assets/mock/我心归处是良人/images/branch_display/岁岁相依.png': require('../../assets/story/branch_display/scene_stay_together.png'),
  'assets/mock/我心归处是良人/images/branch_display/心悦于你.png': require('../../assets/story/branch_display/scene_love_you.png'),
  'assets/mock/我心归处是良人/images/branch_display/意外心声.png': require('../../assets/story/branch_display/scene_inner_voice.png'),
  'assets/mock/我心归处是良人/images/branch_display/暗卫十五.png': require('../../assets/story/branch_display/scene_guard_fifteen.png'),
  'assets/mock/我心归处是良人/images/branch_display/皇帝赏赐.jpg': require('../../assets/story/branch_display/scene_emperor_reward.jpg'),
  'assets/mock/我心归处是良人/images/branch_display/背走殿下.png': require('../../assets/story/branch_display/scene_carry_prince.png'),
  'assets/mock/我心归处是良人/images/branch_display/追击刺客.png': require('../../assets/story/branch_display/scene_chase_assassin.png'),

  'assets/mock/我心归处是良人/images/赵秉入_avatar.png': require('../../assets/story/avatars/avatar_zhaobingru.png'),
  'assets/mock/我心归处是良人/images/赵秉承_avatar.png': require('../../assets/story/avatars/avatar_zhaobingcheng.png'),
  'assets/mock/我心归处是良人/images/暗卫十五_avatar.png': require('../../assets/story/avatars/avatar_guard15.png'),
  'assets/mock/我心归处是良人/images/赵秉入_cover.png': require('../../assets/story/iconic_scene/scene_2.png'),
  'assets/mock/我心归处是良人/images/赵秉承_cover.png': require('../../assets/story/iconic_scene/scene_1.png'),
  'assets/mock/我心归处是良人/images/暗卫十五_cover.png': require('../../assets/story/iconic_scene/scene_3.png'),
  'assets/story/me/role_1.png': require('../../assets/story/me/role_1.png'),
  'assets/story/me/role_2.png': require('../../assets/story/me/role_2.png'),
  'assets/story/characters/char_3.png': require('../../assets/story/characters/char_3.png'),
  'assets/story/characters/char_4.png': require('../../assets/story/characters/char_4.png'),
  'assets/story/characters/char_5.png': require('../../assets/story/characters/char_5.png'),
  'assets/story/characters/char_6.png': require('../../assets/story/characters/char_6.png'),
  'assets/story/characters/char_7.png': require('../../assets/story/characters/char_7.png'),
  'assets/story/characters/char_8.png': require('../../assets/story/characters/char_8.png'),
  'assets/story/characters/char_9.png': require('../../assets/story/characters/char_9.png'),
  'assets/story/characters/qinche_hero.png': require('../../assets/story/characters/qinche_hero.png'),
  'assets/story/characters/work1.png': require('../../assets/story/characters/work1.png'),
  'assets/story/characters/work2.png': require('../../assets/story/characters/work2.png'),
  'assets/story/characters/work3.png': require('../../assets/story/characters/work3.png'),
};

export function resolveStoryImageSource(
  imageUrl: string | null | undefined
): ImageSourcePropType | null {
  if (!imageUrl) return null;
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return { uri: imageUrl };
  }
  return STORY_LOCAL_IMAGE_SOURCES[imageUrl] ?? null;
}


import type { StoryCharacter, StoryCharacterWork } from '@/src/data/story/types';
import { getCharacterById } from '@/src/data/story/storyService';

export type CharacterDetailEntity = {
  id: string;
  name: string;
  avatar?: string;
  cover?: string;
  subtitle?: string;
  quote?: string;
  tags: string[];
  encounterCount: number;
  works: StoryCharacterWork[];
  isFollowed: boolean;
};

type VirtualCharacterSeed = {
  id: string;
  name: string;
  avatar: string;
  cover?: string;
  subtitle?: string;
  quote?: string;
  tags?: string[] | string;
};

const VIRTUAL_CHARACTER_SEEDS: VirtualCharacterSeed[] = [
  {
    id: 'char_001',
    name: '秦彻',
    avatar: 'assets/story/me/role_1.png',
    cover: 'assets/story/characters/qinche_hero.png',
    subtitle: 'Daddy系气质 · 霸总魅力',
    quote: '外面的世界很吵。留在我这里，我会替你挡住一切',
    tags: '霸总 · 占有欲 · 保护欲',
  },
  {
    id: 'char_002',
    name: '林晓',
    avatar: 'assets/story/me/role_2.png',
    quote: '你没发消息的这些时间里，我都在想你。',
    tags: '温柔 · 治愈系 · 陪伴型',
  },
  {
    id: 'char_003',
    name: '陈墨',
    avatar: 'assets/story/characters/char_3.png',
    quote: '我不擅长说甜言蜜语，但我会用行动证明一切。',
    tags: '高冷 · 行动派 · 可靠',
  },
  {
    id: 'char_004',
    name: '苏瑾',
    avatar: 'assets/story/characters/char_4.png',
    quote: '在我面前，你可以做任何想做的事。',
    tags: '宠溺 · 包容 · 温暖',
  },
  {
    id: 'char_005',
    name: '顾言',
    avatar: 'assets/story/characters/char_5.png',
    quote: '别怕，有我在。',
    tags: '强势 · 安全感 · 霸道',
  },
  {
    id: 'char_006',
    name: '江城',
    avatar: 'assets/story/characters/char_6.png',
    quote: '你笑起来的样子，是我见过最美的风景。',
    tags: '浪漫 · 细腻 · 深情',
  },
  {
    id: 'char_007',
    name: '白羽',
    avatar: 'assets/story/characters/char_7.png',
    quote: '我会一直陪在你身边，直到永远。',
    tags: '忠诚 · 专一 · 守护',
  },
  {
    id: 'char_008',
    name: '夏凉',
    avatar: 'assets/story/characters/char_8.png',
    quote: '和你在一起的每一刻，都是我最珍贵的回忆。',
    tags: '阳光 · 活力 · 开朗',
  },
  {
    id: 'char_009',
    name: '慕容',
    avatar: 'assets/story/characters/char_9.png',
    quote: '你是我唯一的例外。',
    tags: '神秘 · 禁欲 · 克制',
  },
];

function toTagList(tags: StoryCharacter['tags'] | VirtualCharacterSeed['tags']): string[] {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags.map((tag) => String(tag));
  return String(tags)
    .split('·')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function defaultWorks(characterName: string): StoryCharacterWork[] {
  return [
    {
      id: 'virtual_work_001',
      title: `【${characterName}×你】审讯室"角色扮演"`,
      cover: 'assets/story/characters/work1.png',
      description:
        `${characterName}以训练抗压能力为名，将你带入废弃审讯室。他虚扣你的手腕，松领口坐于桌上，匕首轻划下颌，逼问如何求饶或诱惑。这场...`,
      popularity: 7000,
    },
    {
      id: 'virtual_work_002',
      title: `【${characterName}×你】当${characterName}是我的霸道上司`,
      cover: 'assets/story/characters/work2.png',
      description:
        '商业谈判桌上，他冷厉否决调离你的提议，宣称“我的人”。深夜办公室，他单膝跪地为你穿回高跟鞋，指腹摩挲脚踝，警告：“下次...”',
      popularity: 340,
    },
    {
      id: 'virtual_work_003',
      title: `【${characterName}×你】通缉令"应对演练"`,
      cover: 'assets/story/characters/work3.png',
      description:
        `${characterName}，星际通缉犯，用通缉令教你应对危险。演练挟持场景，他手臂环颈，唇贴耳廓教示弱，却轻吻耳尖：“骗你的，我怎么会让...”`,
      popularity: 110,
    },
  ];
}

function enrichRealCharacter(character: StoryCharacter): CharacterDetailEntity {
  const firstTag = toTagList(character.tags)[0] ?? '';
  return {
    id: character.id,
    name: character.name,
    avatar: character.avatar,
    cover: character.cover || character.avatar,
    subtitle: character.subtitle ?? (firstTag ? `${firstTag}系气质` : undefined),
    quote: character.quote,
    tags: toTagList(character.tags),
    encounterCount: character.encounterCount ?? 552,
    works: character.works && character.works.length > 0 ? character.works : defaultWorks(character.name),
    isFollowed: false,
  };
}

function enrichVirtualCharacter(seed: VirtualCharacterSeed): CharacterDetailEntity {
  const firstTag = toTagList(seed.tags)[0] ?? '';
  return {
    id: seed.id,
    name: seed.name,
    avatar: seed.avatar,
    cover: seed.cover ?? seed.avatar,
    subtitle: seed.subtitle ?? (firstTag ? `${firstTag}系气质` : undefined),
    quote: seed.quote,
    tags: toTagList(seed.tags),
    encounterCount: 552,
    works: defaultWorks(seed.name),
    isFollowed: false,
  };
}

export function getCharacterDetailById(characterId: string): CharacterDetailEntity | null {
  const realCharacter = getCharacterById(characterId)?.character;
  if (realCharacter) {
    return enrichRealCharacter(realCharacter);
  }
  const virtualCharacter = VIRTUAL_CHARACTER_SEEDS.find((item) => item.id === characterId);
  if (virtualCharacter) {
    return enrichVirtualCharacter(virtualCharacter);
  }
  return null;
}

export function formatPopularity(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(count % 1000 === 0 ? 0 : 1)}k+`;
  }
  return String(count);
}


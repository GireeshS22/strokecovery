export interface GameOption {
  label: string;
  isCorrect: boolean;
}

export interface Game {
  id: string;
  type: 'emoji_to_word' | 'word_to_emoji';
  prompt: string;
  options: GameOption[];
  correctIndex: number;
}

// Type A: Emoji to Word - Show emoji, pick the correct word
const emojiToWordGames: Game[] = [
  {
    id: 'emoji_1',
    type: 'emoji_to_word',
    prompt: '🍎',
    options: [
      { label: 'Apple', isCorrect: true },
      { label: 'Banana', isCorrect: false },
      { label: 'Orange', isCorrect: false },
      { label: 'Grape', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'emoji_2',
    type: 'emoji_to_word',
    prompt: '🐕',
    options: [
      { label: 'Cat', isCorrect: false },
      { label: 'Dog', isCorrect: true },
      { label: 'Bird', isCorrect: false },
      { label: 'Fish', isCorrect: false },
    ],
    correctIndex: 1,
  },
  {
    id: 'emoji_3',
    type: 'emoji_to_word',
    prompt: '🏠',
    options: [
      { label: 'Car', isCorrect: false },
      { label: 'Tree', isCorrect: false },
      { label: 'House', isCorrect: true },
      { label: 'Building', isCorrect: false },
    ],
    correctIndex: 2,
  },
  {
    id: 'emoji_4',
    type: 'emoji_to_word',
    prompt: '☀️',
    options: [
      { label: 'Moon', isCorrect: false },
      { label: 'Cloud', isCorrect: false },
      { label: 'Rain', isCorrect: false },
      { label: 'Sun', isCorrect: true },
    ],
    correctIndex: 3,
  },
  {
    id: 'emoji_5',
    type: 'emoji_to_word',
    prompt: '📖',
    options: [
      { label: 'Book', isCorrect: true },
      { label: 'Phone', isCorrect: false },
      { label: 'Computer', isCorrect: false },
      { label: 'TV', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'emoji_6',
    type: 'emoji_to_word',
    prompt: '🌙',
    options: [
      { label: 'Moon', isCorrect: true },
      { label: 'Star', isCorrect: false },
      { label: 'Cloud', isCorrect: false },
      { label: 'Night', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'emoji_7',
    type: 'emoji_to_word',
    prompt: '🎂',
    options: [
      { label: 'Cake', isCorrect: true },
      { label: 'Cookie', isCorrect: false },
      { label: 'Bread', isCorrect: false },
      { label: 'Pie', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'emoji_8',
    type: 'emoji_to_word',
    prompt: '🌳',
    options: [
      { label: 'Tree', isCorrect: true },
      { label: 'Flower', isCorrect: false },
      { label: 'Grass', isCorrect: false },
      { label: 'Bush', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'emoji_9',
    type: 'emoji_to_word',
    prompt: '🐱',
    options: [
      { label: 'Cat', isCorrect: true },
      { label: 'Dog', isCorrect: false },
      { label: 'Mouse', isCorrect: false },
      { label: 'Rabbit', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'emoji_10',
    type: 'emoji_to_word',
    prompt: '✈️',
    options: [
      { label: 'Plane', isCorrect: true },
      { label: 'Car', isCorrect: false },
      { label: 'Boat', isCorrect: false },
      { label: 'Train', isCorrect: false },
    ],
    correctIndex: 0,
  },
];

// Type B: Word to Emoji - Show word, pick the correct emoji
const wordToEmojiGames: Game[] = [
  {
    id: 'word_1',
    type: 'word_to_emoji',
    prompt: 'Heart',
    options: [
      { label: '⭐', isCorrect: false },
      { label: '❤️', isCorrect: true },
      { label: '🔵', isCorrect: false },
      { label: '🟢', isCorrect: false },
    ],
    correctIndex: 1,
  },
  {
    id: 'word_2',
    type: 'word_to_emoji',
    prompt: 'Car',
    options: [
      { label: '🚗', isCorrect: true },
      { label: '🚲', isCorrect: false },
      { label: '✈️', isCorrect: false },
      { label: '🚢', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'word_3',
    type: 'word_to_emoji',
    prompt: 'Clock',
    options: [
      { label: '📅', isCorrect: false },
      { label: '📞', isCorrect: false },
      { label: '⏰', isCorrect: true },
      { label: '💡', isCorrect: false },
    ],
    correctIndex: 2,
  },
  {
    id: 'word_4',
    type: 'word_to_emoji',
    prompt: 'Music',
    options: [
      { label: '🎬', isCorrect: false },
      { label: '📷', isCorrect: false },
      { label: '🎮', isCorrect: false },
      { label: '🎵', isCorrect: true },
    ],
    correctIndex: 3,
  },
  {
    id: 'word_5',
    type: 'word_to_emoji',
    prompt: 'Rain',
    options: [
      { label: '🌧️', isCorrect: true },
      { label: '❄️', isCorrect: false },
      { label: '🌈', isCorrect: false },
      { label: '⚡', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'word_6',
    type: 'word_to_emoji',
    prompt: 'Fire',
    options: [
      { label: '🔥', isCorrect: true },
      { label: '💧', isCorrect: false },
      { label: '🌊', isCorrect: false },
      { label: '💨', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'word_7',
    type: 'word_to_emoji',
    prompt: 'Star',
    options: [
      { label: '⭐', isCorrect: true },
      { label: '🌙', isCorrect: false },
      { label: '☀️', isCorrect: false },
      { label: '🌈', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'word_8',
    type: 'word_to_emoji',
    prompt: 'Phone',
    options: [
      { label: '📱', isCorrect: true },
      { label: '💻', isCorrect: false },
      { label: '📺', isCorrect: false },
      { label: '🎮', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'word_9',
    type: 'word_to_emoji',
    prompt: 'Flower',
    options: [
      { label: '🌸', isCorrect: true },
      { label: '🌳', isCorrect: false },
      { label: '🍀', isCorrect: false },
      { label: '🌵', isCorrect: false },
    ],
    correctIndex: 0,
  },
  {
    id: 'word_10',
    type: 'word_to_emoji',
    prompt: 'Fish',
    options: [
      { label: '🐟', isCorrect: true },
      { label: '🐕', isCorrect: false },
      { label: '🐱', isCorrect: false },
      { label: '🐦', isCorrect: false },
    ],
    correctIndex: 0,
  },
];

export const allGames: Game[] = [...emojiToWordGames, ...wordToEmojiGames];

export const getGamesByType = (type: 'emoji_to_word' | 'word_to_emoji'): Game[] => {
  return allGames.filter(game => game.type === type);
};

export const getGameById = (id: string): Game | undefined => {
  return allGames.find(game => game.id === id);
};

export const gameTypeLabels = {
  emoji_to_word: 'Emoji to Word',
  word_to_emoji: 'Word to Emoji',
};

export const gameTypeDescriptions = {
  emoji_to_word: 'See an emoji, pick the matching word',
  word_to_emoji: 'See a word, pick the matching emoji',
};

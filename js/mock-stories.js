// Mock data for development
// In a real app, this would come from Supabase
export const mockStories = [
  {
    id: "story-1",
    title: "The Change of Seasons",
    slug: "menopause-matters",
    script: "Speaker 1: Welcome to Menopause Matters. Today we're discussing the change of seasons in our bodies. [laugh] It's important to understand that menopause is a natural transition. Speaker 2: Absolutely, and many women find this time to be empowering. The hormonal changes can be challenging, but with the right support and knowledge, this can be a time of incredible growth and self-discovery.",
    ttsAudioUrl:
      "https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/media/stories/d6e461a7-2cf7-4139-873a-8ce35f18e12a/tts-2025-06-20T05-05-25.mp3",
    shows: {
      name: "Menopause Matters",
      image_url: "1750366730893.png",
      music_url: "https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/media/static/drop.mp3",
    },
    likes: [{ count: 42 }],
  },
  {
    id: "story-2",
    title: "The Tiny Explorer",
    slug: "paws-and-psychology",
    script: "Speaker 1: Once upon a time, there was a tiny mouse named Oliver who lived in a cozy burrow beneath the old oak tree. [sound of birds chirping] Every morning, Oliver would wake up excited to explore the world around him. Speaker 2: Today was different though. Today, Oliver decided he would venture further than ever before, into the mysterious meadow that his grandmother had always warned him about.",
    ttsAudioUrl:
      "https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/media/stories/c8734e87-7d75-4a97-96a6-e57c6e08fa7b/tts-2025-06-20T04-52-17.mp3",
    shows: {
      name: "Tiny Tales",
      image_url: "1750319500256.png",
      music_url: "https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/media/static/drop.mp3",
    },
    likes: [{ count: 28 }],
  },
  {
    id: "story-3",
    title: "Midnight in the Garden",
    slug: "menopause-matters",
    ttsAudioUrl:
      "https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/media/stories/af949d37-b6b7-496f-b72a-bfa958294249/tts-2025-06-20T05-03-55.mp3",
    shows: {
      name: "Tiny Tales",
      image_url: "1750190747152.png",
      music_url: "https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/media/static/drop.mp3",
    },
    likes: [{ count: 35 }],
  },
  {
    id: "story-4",
    title: "The Last Sunset",
    slug: "empowerment-stories",
    ttsAudioUrl:
      "https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/media/stories/6ccc845e-b27a-4edc-bc82-84acafb7e45d/tts-2025-06-20T05-03-55.mp3",
    shows: {
      name: "Tiny Tales",
      image_url: "1750367739723.png",
    },
    likes: [{ count: 19 }],
  },
];

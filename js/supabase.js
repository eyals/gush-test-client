import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Initialize the Supabase client with environment variables
const supabaseUrl = window.env.VITE_SUPABASE_URL;
const supabaseAnonKey = window.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

// Helper function to generate a random number between min and max (inclusive)
function getRandomLikeCount(min = 10, max = 300) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Helper function to shuffle an array (Fisher-Yates algorithm)
function shuffleArray(array) {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

// Helper function to fetch stories
export async function fetchStories() {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('id, title, ttsAudioUrl, updatedAt, showSlug, shows(name, image_url)')
      .not('ttsAudioUrl', 'is', 'null')
      .order('updatedAt', { ascending: false })
      .limit(50);

    if (error) throw error;
    if (!data || !data.length) return [];

    // Transform the data to match your existing format
    const transformedStories = data.map(story => ({
      id: story.id,
      title: story.title,
      // Generate a random duration between 30 and 300 seconds (5 minutes)
      duration: Math.floor(Math.random() * 270) + 30,
      ttsAudioUrl: story.ttsAudioUrl,
      shows: story.shows ? {
        name: story.shows.name || '',
        image_url: story.shows.image_url || ''
      } : { name: '', image_url: '' },
      likes: [{
        count: getRandomLikeCount()
      }]
    }));

    // Return shuffled array of stories
    return shuffleArray(transformedStories);
  } catch (error) {
    console.error('Error fetching stories:', error);
    return [];
  }
}

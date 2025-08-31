import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Helper function to safely get environment variables with fallbacks
function getEnvVar(name, fallback = '') {
  try {
    // Check if running in browser with env.js loaded
    if (typeof window !== 'undefined' && window.env && window.env[name] !== undefined) {
      return window.env[name];
    }
    // Check for Vite environment variables during development
    if (import.meta && import.meta.env && import.meta.env[name] !== undefined) {
      return import.meta.env[name];
    }
    return fallback;
  } catch (e) {
    console.warn(`Failed to get env var ${name}:`, e);
    return fallback;
  }
}

// Initialize the Supabase client - will be set when initializeSupabase is called
let supabase = null;

// Function to initialize Supabase client after env is loaded
function initializeSupabase() {
  const supabaseUrl = getEnvVar('VITE_SUPABASE_URL');
  const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY');

  console.log('Supabase initialization:', {
    url: supabaseUrl ? 'Found' : 'Missing',
    key: supabaseAnonKey ? 'Found' : 'Missing',
    windowEnv: typeof window !== 'undefined' ? !!window.env : 'No window'
  });

  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log('Supabase client created successfully');
    return true;
  } else {
    console.warn('Supabase client not initialized - missing required environment variables');
    console.warn('URL:', supabaseUrl);
    console.warn('Key:', supabaseAnonKey);
    return false;
  }
}

export { supabase, initializeSupabase };

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
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }
    
    const { data, error } = await supabase
      .from('stories')
      .select('id, title, script, ttsAudioUrl, updatedAt, showSlug, shows(name, image_url, music_url)')
      .not('ttsAudioUrl', 'is', 'null')
      .order('updatedAt', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }
    
    if (!data || !data.length) {
      return [];
    }

    // Transform the data to match your existing format
    const transformedStories = data.map(story => {
      return {
        id: story.id,
        title: story.title,
        slug: story.showSlug,
        script: story.script || '',
        // Generate a random duration between 30 and 300 seconds (5 minutes)
        duration: Math.floor(Math.random() * 270) + 30,
        ttsAudioUrl: story.ttsAudioUrl,
        shows: story.shows ? {
          name: story.shows.name || '',
          image_url: story.shows.image_url || '',
          music_url: story.shows.music_url || null
        } : { name: '', image_url: '', music_url: null },
        likes: [{
          count: getRandomLikeCount()
        }]
      };
    });

    // Return shuffled array of stories
    return shuffleArray(transformedStories);
  } catch (error) {
    throw error; // Re-throw to allow handling in the calling function
  }
}

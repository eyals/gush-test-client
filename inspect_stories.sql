-- Get table structure for stories table
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'stories' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Get a sample record to see the actual data
SELECT id, title, "showSlug", ttsAudioUrl 
FROM stories 
LIMIT 1;

-- Check if showSlug column exists and has data
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'stories' 
      AND column_name = 'showSlug'
    ) THEN 'showSlug column exists'
    ELSE 'showSlug column does NOT exist'
  END as showslug_status;

-- Sample shows data to see image_url format
SELECT name, image_url, music_url 
FROM shows 
LIMIT 3;
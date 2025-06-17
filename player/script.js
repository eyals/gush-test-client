// Supabase configuration
const SUPABASE_URL = 'https://ifsdyucvpgshyglmoxkp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlmc2R5dWN2cGdzaHlnbG1veGtwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk1NzkxNzYsImV4cCI6MjA2NTE1NTE3Nn0.fie3isEuyIvWjQGvgHtaBpbeZJTcJXqrJyuwFSpPneA';

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global state
let currentAudio = null;
let autoAdvanceEnabled = true;
let stories = [];

// Create and preload transition cue sound effect
const transitionCue = new Audio('https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/audio/drop.mp3');
transitionCue.preload = 'auto';
transitionCue.volume = 0.7;

// DOM elements
const loadingEl = document.getElementById('loading');
const noStoriesEl = document.getElementById('no-stories');
const storiesListEl = document.getElementById('stories-list');
const startSectionEl = document.getElementById('start-section');
const startPlayingBtnEl = document.getElementById('start-playing-btn');

// Utility function to shuffle array
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Fetch stories from Supabase
async function fetchStories() {
    try {
        const { data, error } = await supabase
            .from('stories')
            .select(`
                id,
                title,
                ttsAudioUrl,
                mixedAudioUrl,
                updatedAt,
                showSlug,
                shows(name, image_url)
            `)
            .or('ttsAudioUrl.not.is.null,mixedAudioUrl.not.is.null')
            .order('updatedAt', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching stories:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching stories:', error);
        return [];
    }
}

// Create story card HTML
function createStoryCard(story, index) {
    const showName = story.shows?.name || 'Unknown Show';
    const storyName = story.title || 'Untitled Story';
    const audioUrl = story.mixedAudioUrl || story.ttsAudioUrl;
    const imageUrl = story.shows?.image_url;

    return `
        <div class="story-card" data-story-id="${story.id}" data-index="${index}"${imageUrl ? ` style="background-image: url('${imageUrl}'); background-size: cover; background-position: center; background-repeat: no-repeat;"` : ''}>
            <div class="story-info">
                <h3 class="show-name">${showName}</h3>
                <h4 class="story-name">${storyName}</h4>
            </div>
            <div class="audio-section">
                ${audioUrl ? `
                    <audio class="audio-player" preload="metadata">
                        <source src="${audioUrl}" type="audio/mpeg">
                        Your browser does not support the audio element.
                    </audio>
                    <div class="audio-controls">
                        <button class="control-btn skip-back" data-action="skip-back">
                            <span>◀︎◀︎</span>
                        </button>
                        <button class="control-btn play-pause" data-action="play-pause">
                            <span class="play-icon">&#9654;</span>
                            <span class="pause-icon hidden">&#9612;&#9612;</span>
                        </button>
                        <button class="control-btn skip-forward" data-action="skip-forward">
                            <span>▶︎▶︎</span>
                        </button>
                    </div>
                    <div class="progress-section hidden">
                        <div class="progress-bar">
                            <div class="progress-fill"></div>
                        </div>
                        <div class="time-display">
                            <span class="current-time">0:00</span>
                            <span class="duration">0:00</span>
                        </div>
                    </div>
                ` : `
                    <div class="audio-error">Audio not loaded</div>
                `}
            </div>
        </div>
    `;
}

// Format time for display
function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Update progress bar for a specific audio element
function updateProgress(audio) {
    const card = audio.closest('.story-card');
    const progressFill = card.querySelector('.progress-fill');
    const currentTimeEl = card.querySelector('.current-time');
    const durationEl = card.querySelector('.duration');
    
    if (audio.duration) {
        const progress = (audio.currentTime / audio.duration) * 100;
        progressFill.style.width = `${progress}%`;
        currentTimeEl.textContent = formatTime(audio.currentTime);
        durationEl.textContent = formatTime(audio.duration);
    }
}

// Stop all currently playing audio
function stopAllAudio() {
    const allAudio = document.querySelectorAll('.audio-player');
    allAudio.forEach(audio => {
        if (!audio.paused) {
            audio.pause();
            audio.currentTime = 0;
        }
    });
    
    // Remove active state from all cards and hide progress bars
    document.querySelectorAll('.story-card').forEach(card => {
        card.classList.remove('playing');
        const progressSection = card.querySelector('.progress-section');
        if (progressSection) {
            progressSection.classList.add('hidden');
        }
    });
    
    // Reset all play buttons
    document.querySelectorAll('.play-pause').forEach(btn => {
        const playIcon = btn.querySelector('.play-icon');
        const pauseIcon = btn.querySelector('.pause-icon');
        if (playIcon && pauseIcon) {
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
        }
    });
    
    currentAudio = null;
}

// Handle card and audio control clicks
function handleAudioControl(event) {
    const controlBtn = event.target.closest('.control-btn');
    const action = controlBtn?.dataset.action;
    
    // If not a control button, check if it's a card click
    if (!action) {
        const card = event.target.closest('.story-card');
        if (card && !card.classList.contains('playing')) {
            // Rewind the audio before playing
            const audio = card.querySelector('.audio-player');
            if (audio) {
                audio.currentTime = 0;
            }
            
            // Simulate play button click
            const playPauseBtn = card.querySelector('.play-pause');
            if (playPauseBtn) {
                playPauseBtn.click();
            }
        }
        // If card is already playing, do nothing (only pause button should stop it)
        return;
    }

    const card = event.target.closest('.story-card');
    const audio = card.querySelector('.audio-player');
    const playPauseBtn = card.querySelector('.play-pause');
    const playIcon = playPauseBtn.querySelector('.play-icon');
    const pauseIcon = playPauseBtn.querySelector('.pause-icon');

    switch (action) {
        case 'play-pause':
            if (audio.paused) {
                // Stop any other playing audio
                stopAllAudio();
                
                // Play this audio
                audio.play().then(() => {
                    currentAudio = audio;
                    card.classList.add('playing');
                    playIcon.classList.add('hidden');
                    pauseIcon.classList.remove('hidden');
                    autoAdvanceEnabled = true; // Re-enable auto-advance on new play
                    
                    // Show progress bar for this card
                    const progressSection = card.querySelector('.progress-section');
                    if (progressSection) {
                        progressSection.classList.remove('hidden');
                    }
                    
                    // Scroll playing card with 250px offset from top
                    const cardTop = card.offsetTop;
                    const scrollTarget = Math.max(0, cardTop - 250);
                    card.closest('main').scrollTo({ 
                        top: scrollTarget, 
                        behavior: 'smooth' 
                    });
                }).catch(error => {
                    console.error('Error playing audio:', error);
                });
            } else {
                // Pause this audio
                audio.pause();
                card.classList.remove('playing');
                playIcon.classList.remove('hidden');
                pauseIcon.classList.add('hidden');
                autoAdvanceEnabled = false; // Disable auto-advance when manually paused
                currentAudio = null;
                
                // Hide progress bar
                const progressSection = card.querySelector('.progress-section');
                if (progressSection) {
                    progressSection.classList.add('hidden');
                }
            }
            break;

        case 'skip-back':
            if (audio) {
                audio.currentTime = Math.max(0, audio.currentTime - 10);
            }
            break;

        case 'skip-forward':
            if (audio) {
                audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + 10);
            }
            break;
    }
}

// Auto-advance to next story
function autoAdvanceToNext(currentIndex) {
    if (!autoAdvanceEnabled) return;

    const nextIndex = currentIndex + 1;
    if (nextIndex >= stories.length) return; // No more stories

    const nextCard = document.querySelector(`[data-index="${nextIndex}"]`);
    if (nextCard) {
        const nextPlayBtn = nextCard.querySelector('.play-pause');
        if (nextPlayBtn) {
            nextPlayBtn.click();
        }
    }
}

// Handle start playing button click
function handleStartPlaying() {
    // Hide the start section with animation
    startSectionEl.classList.add('hiding');
    
    // Start playing the first story after the animation
    setTimeout(() => {
        const firstCard = document.querySelector('[data-index="0"]');
        if (firstCard) {
            const audio = firstCard.querySelector('.audio-player');
            if (audio) {
                audio.currentTime = 0; // Rewind to start
            }
            
            const firstPlayBtn = firstCard.querySelector('.play-pause');
            if (firstPlayBtn) {
                firstPlayBtn.click();
            }
        }
    }, 150); // Start playing during the animation for smooth transition
}

// Set up audio event listeners
function setupAudioListeners() {
    document.querySelectorAll('.audio-player').forEach((audio, index) => {
        // Update progress bar as audio plays
        audio.addEventListener('timeupdate', () => {
            if (!audio.paused) {
                updateProgress(audio);
            }
        });
        
        // Set duration when metadata loads
        audio.addEventListener('loadedmetadata', () => {
            updateProgress(audio);
        });
        
        audio.addEventListener('ended', () => {
            const card = audio.closest('.story-card');
            card.classList.remove('playing');
            
            const playPauseBtn = card.querySelector('.play-pause');
            const playIcon = playPauseBtn.querySelector('.play-icon');
            const pauseIcon = playPauseBtn.querySelector('.pause-icon');
            
            playIcon.classList.remove('hidden');
            pauseIcon.classList.add('hidden');
            
            // Hide progress bar
            const progressSection = card.querySelector('.progress-section');
            if (progressSection) {
                progressSection.classList.add('hidden');
            }
            
            currentAudio = null;
            
            // Play transition cue after 1 second
            setTimeout(() => {
                transitionCue.currentTime = 0; // Reset to beginning
                transitionCue.play().catch(error => {
                    console.log('Transition cue could not play:', error);
                });
            }, 1000);
            
            // Auto-advance to next story after 3 seconds
            setTimeout(() => {
                autoAdvanceToNext(parseInt(card.dataset.index));
            }, 3000);
        });

        audio.addEventListener('error', () => {
            console.error('Audio loading error for story:', audio.src);
            const card = audio.closest('.story-card');
            const audioSection = card.querySelector('.audio-section');
            audioSection.innerHTML = '<div class="audio-error">Audio not loaded</div>';
        });
    });
}

// Render stories
function renderStories(storiesData) {
    if (storiesData.length === 0) {
        loadingEl.classList.add('hidden');
        noStoriesEl.classList.remove('hidden');
        return;
    }

    const storiesHTML = storiesData.map((story, index) => createStoryCard(story, index)).join('');
    storiesListEl.innerHTML = storiesHTML;
    
    loadingEl.classList.add('hidden');
    storiesListEl.classList.remove('hidden');
    
    // Set up event listeners
    storiesListEl.addEventListener('click', handleAudioControl);
    setupAudioListeners();
    
    // Set up start button
    startPlayingBtnEl.addEventListener('click', handleStartPlaying);
    
}

// Initialize the app
async function init() {
    console.log('Fetching stories...');
    
    const fetchedStories = await fetchStories();
    stories = shuffleArray(fetchedStories);
    
    console.log(`Loaded ${stories.length} stories`);
    renderStories(stories);
}

// Start the app when DOM is loaded
document.addEventListener('DOMContentLoaded', init);
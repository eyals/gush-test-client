// Import Supabase client and fetch function
import { fetchStories } from "./supabase.js";
// Keep mock stories as fallback
import { mockStories } from "./mock-stories.js";

class MusedropsPlayer {
  
  // Image transformation function
  transformImageUrl(imageUrl, size = 'full') {
    if (!imageUrl) return imageUrl;
    
    // Replace =/object/ with /render/image/
    let transformedUrl = imageUrl.replace('=/object/', '/render/image/');
    
    // Add transformation parameters based on size
    if (size === 'full') {
      transformedUrl += '?resize=contain&quality=50&width=500';
    } else if (size === 'smallThumb') {
      transformedUrl += '?resize=cover&quality=50&width=192&height=192';
    } else if (size === 'largeThumb') {
      transformedUrl += '?resize=cover&quality=50&width=512&height=512';
    }
    
    return transformedUrl;
  }

  constructor() {
    // Initialize state first
    this.isInitialized = false;
    this.isTransitioning = false;
    this.touchStartX = null;
    this.stories = [];
    this.currentStoryIndex = 0;
    this.isPlaying = false;
    this.progressInterval = null;
    this.hasInteracted = false;
    
    // Initialize audio
    this.audio = new Audio();
    this.dropSound = document.getElementById("drop-sound");
    
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initialize());
    } else {
      // DOM already loaded, initialize immediately
      this.initialize();
    }
  }
  
  initialize() {
    try {
      // Get required elements with null checks
      this.app = document.getElementById("app");
      this.initialMode = document.getElementById("initial-mode");
      this.playerView = document.getElementById("player-view");
      this.storiesContainer = document.getElementById("stories-container");
      this.playIndicator = document.querySelector(".play-indicator");
      
      // Player elements
      this.progressFill = document.querySelector(".progress-fill");
      this.progressTimes = document.querySelectorAll(".progress-time");
      
      // Buttons
      this.rewindBtn = document.getElementById("rewind-btn");
      this.forwardBtn = document.getElementById("forward-btn");
      this.likeBtn = document.querySelector(".like-btn");
      this.likeCount = document.querySelector(".like-count");
      
      // Check for required elements
      if (!this.initialMode || !this.playerView || !this.storiesContainer) {
        throw new Error('Required elements not found in DOM');
      }
      
      this.isTouchDevice = 'ontouchstart' in window || 
                          navigator.maxTouchPoints > 0 || 
                          navigator.msMaxTouchPoints > 0;
      
      // Initialize the app
      this.initializeEventListeners();
      this.initializeAudio();
      this.loadStories();
      
      this.isInitialized = true;
      console.log('MusedropsPlayer initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MusedropsPlayer:', error);
      this.showError('Failed to initialize player. Please refresh the page.');
    }
  }

  initializeAudio() {
    // Audio initialization
    this.initializeMediaSession();
  }

  initializeMediaSession() {
    if ('mediaSession' in navigator) {
      // Set up action handlers for bluetooth/media controls
      navigator.mediaSession.setActionHandler('play', () => {
        this.play();
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        this.nextStory();
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        this.previousStory();
      });
    }
  }

  showError(message) {
    console.error(message);
    const errorDiv = document.createElement('div');
    errorDiv.style.position = 'fixed';
    errorDiv.style.bottom = '20px';
    errorDiv.style.left = '50%';
    errorDiv.style.transform = 'translateX(-50%)';
    errorDiv.style.background = 'rgba(255, 0, 0, 0.8)';
    errorDiv.style.color = 'white';
    errorDiv.style.padding = '10px 20px';
    errorDiv.style.borderRadius = '5px';
    errorDiv.style.zIndex = '10000';
    errorDiv.textContent = message;
    document.body.appendChild(errorDiv);
    
    // Remove after 5 seconds
    setTimeout(() => {
      errorDiv.remove();
    }, 5000);
  }
  
  initializeEventListeners() {
    console.log("Initializing event listeners...");
    
    try {
      // Initial mode click/tap - use both touch and click for maximum compatibility
      const handleInitialTap = (e) => {
        if (e) {
          e.preventDefault();
          e.stopPropagation();
        }
        console.log("Initial mode tapped");
        this.showPlayer();
      };
      
      // Add multiple event types to ensure cross-device compatibility
      this.initialMode.addEventListener('click', handleInitialTap, { passive: false });
      this.initialMode.addEventListener('touchend', handleInitialTap, { passive: false });
      
      // Make sure the element is interactive
      this.initialMode.style.cursor = 'pointer';
      
      // Add debug button handler if it exists
      const debugButton = document.getElementById('debug-start');
      if (debugButton) {
        debugButton.addEventListener('click', handleInitialTap);
      }
      
      console.log('Event listeners initialized');
    } catch (error) {
      console.error('Error initializing event listeners:', error);
      this.showError('Error setting up player controls');
    }
    if (this.forwardBtn) {
      this.forwardBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.skipForward();
      });
    }
    if (this.rewindBtn) {
      this.rewindBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.skipBackward();
      });
    }
    if (this.playerView) {
      // Touch events
      this.playerView.addEventListener(
        "touchstart",
        this.handleGestureStart.bind(this),
        { passive: true }
      );
      this.playerView.addEventListener(
        "touchend",
        this.handleGestureEnd.bind(this)
      );
      // Mouse events
      if (!this.isTouchDevice) {
        this.playerView.addEventListener(
          "mousedown",
          this.handleGestureStart.bind(this)
        );
        this.playerView.addEventListener(
          "mouseup",
          this.handleGestureEnd.bind(this)
        );
      }

      this.audio.addEventListener("ended", this.handleStoryEnd.bind(this));
      this.audio.addEventListener("play", () =>
        this.updatePlayIndicator(false)
      );
      this.audio.addEventListener("pause", () => {
        // Don't show play indicator if audio ended naturally
        if (!this.audio.ended) {
          this.updatePlayIndicator(true);
        }
      });
      this.audio.addEventListener("timeupdate", this.handleTimeUpdate.bind(this));
      this.audio.addEventListener("durationchange", this.handleDurationChange.bind(this));
    }
  }

  async loadStories() {
    try {
      // Try to fetch from Supabase first
      let stories = [];
      
      try {
        stories = await fetchStories();
      } catch (error) {
        // Silently handle the error - we'll fall back to mock data
      }
      
      // If we got stories from Supabase, use them
      if (stories && stories.length > 0) {
        this.stories = stories;
      } else {
        // If no stories from Supabase, use mock data
        this.showError('No stories available. Using demo content.');
        this.stories = mockStories;
      }
      
      // Make sure we have at least one story
      if (!this.stories || this.stories.length === 0) {
        this.showError('No stories available');
        throw new Error('No stories available from any source');
      }
      
    } catch (error) {
      // If there's any error, use mock data
      this.showError('Loading stories. Using demo content.');
      this.stories = mockStories;
    } finally {
      // Always render whatever stories we have
      try {
        this.renderStories();
      } catch (renderError) {
        this.showError('Failed to load stories');
      }
    }
  }

  renderStories() {
    if (!this.storiesContainer) return;
    this.storiesContainer.innerHTML = "";

    this.stories.forEach((story, index) => {
      const storyEl = this.renderStory(story);
      storyEl.dataset.index = index;
      this.storiesContainer.appendChild(storyEl);
    });

    // The first story will be shown when the player is activated.
  }

  renderStory(story) {
    const storyEl = document.createElement("div");
    storyEl.className = "story";
    storyEl.dataset.id = story.id;
    // The background image is set via CSS in the updateStoryInfo method
    return storyEl;
  }

  handleGestureStart(e) {
    this.touchStartX = (e.touches ? e.touches[0] : e).clientX;
  }

  handleGestureEnd(e) {
    if (!this.touchStartX) return;
    
    const endX = (e.changedTouches ? e.changedTouches[0] : e).clientX;
    const deltaX = this.touchStartX - endX;
    const absDeltaX = Math.abs(deltaX);
    
    // Minimum distance to consider it a swipe (in pixels)
    const swipeThreshold = 50;

    if (absDeltaX >= swipeThreshold) {
      if (deltaX > 0) {
        // Swiped left - go to next story
        this.nextStory();
      } else {
        // Swiped right - go to previous story
        this.previousStory();
      }
    } else if (absDeltaX < 10) {
      // It's a tap, toggle play/pause unless it's on a button
      if (!e.target.closest(".control-btn, .action-btn")) {
        this.togglePlayPause();
      }
    }
    
    // Reset touch start position
    this.touchStartX = null;
  }

  handleStartButtonClick(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    if (this.hasInteracted) return;
    this.hasInteracted = true;
    
    this.showPlayer();
    
    // Start playing the first story after a short delay
    setTimeout(() => {
      this.play();
    }, 100);
  }

  async showPlayer() {
    try {
      console.log("showPlayer called");
      
      // Check if we're already showing the player
      if (this.isTransitioning || !this.playerView) {
        return;
      }
      
      this.isTransitioning = true;
      
      // Make sure we have stories loaded
      if (!this.stories || this.stories.length === 0) {
        await this.loadStories();
      }
      
      // Remove the initial mode with animation if it exists
      if (this.initialMode) {
        this.initialMode.style.pointerEvents = 'none';
        this.initialMode.classList.add("exiting");
        
        // Wait for the animation to complete before removing
        setTimeout(() => {
          if (this.initialMode) {
            this.initialMode.remove();
            this.initialMode = null;
          }
          this.finishShowingPlayer();
        }, 300);
      } else {
        this.finishShowingPlayer();
      }
    } catch (error) {
      console.error('Error in showPlayer:', error);
      this.showError('Error loading player');
      this.isTransitioning = false;
    }
  }
  
  finishShowingPlayer() {
    try {
      // Show the player and start with the first story
      this.playerView.classList.remove("hidden");
      this.showStory(0, true); // Auto-play the first story
    } catch (error) {
      console.error('Error finishing player show:', error);
      this.showError('Error initializing player');
    } finally {
      this.isTransitioning = false;
    }
  }

  async showStory(index, autoPlay = false) {
    if (index < 0 || index >= this.stories.length) return;

    this.currentStoryIndex = index;
    const currentStory = this.stories[index];
    this.currentStory = currentStory;

    // Update active story in the UI
    const stories = document.querySelectorAll(".story");
    stories.forEach((story, i) => {
      if (i === index) {
        story.classList.add("active");
      } else {
        story.classList.remove("active");
      }
    });

    // Update story info in the UI
    this.updateStoryInfo(currentStory);

    // Handle audio loading
    if (this.audio) {
      // Pause current audio if playing
      if (this.audio.src) {
        this.audio.pause();
        this.stopProgressTracking();
      }

      // Set new audio source
      this.audio.src = currentStory.ttsAudioUrl;
      
      try {
        // Load the new audio
        await new Promise((resolve, reject) => {
          this.audio.oncanplay = resolve;
          this.audio.onerror = reject;
          this.audio.load();
        });

        // If autoplay is requested, start playing
        if (autoPlay) {
          await this.play();
        } else {
          this.updatePlayIndicator(true);
        }
      } catch (error) {
        console.error('Error loading audio:', error);
        this.showError('Error loading audio');
        this.updatePlayIndicator(true);
      }
    }
  }

  updatePlayIndicator(isPaused) {
    if (!this.playIndicator) return;
    if (isPaused) {
      this.playIndicator.classList.remove("hidden");
    } else {
      this.playIndicator.classList.add("hidden");
    }
  }

  updateStoryInfo(story) {
    if (!story) return;

    const titleEl = document.querySelector(".story-title");
    const seriesEl = document.querySelector(".story-series");

    if (titleEl) titleEl.textContent = story.title;
    if (seriesEl) seriesEl.textContent = story.shows.name || "";

    // Update like count
    if (this.likeCount) {
      this.likeCount.textContent = story.likes?.[0]?.count || 0;
    }

    // Update story background image
    const storyEl = document.querySelector(`.story[data-id="${story.id}"]`);
    if (storyEl && story.shows.image_url) {
      const transformedUrl = this.transformImageUrl(story.shows.image_url, 'full');
      storyEl.style.backgroundImage = `url(${transformedUrl})`;
    }

    this.updateProgress(0, story.duration || 0);
    
    // Update media session metadata for bluetooth controls
    this.updateMediaSessionMetadata(story);
  }

  updateMediaSessionMetadata(story) {
    if ('mediaSession' in navigator && story) {
      try {
        const showName = story.shows.name || 'Stories';
        navigator.mediaSession.metadata = new MediaMetadata({
          title: story.title,
          artist: `Musedrops - ${showName}`,
          album: showName,
          artwork: story.shows.image_url ? [
            {
              src: this.transformImageUrl(story.shows.image_url, 'smallThumb'),
              sizes: '192x192',
              type: 'image/jpeg'
            },
            {
              src: this.transformImageUrl(story.shows.image_url, 'largeThumb'),
              sizes: '512x512',
              type: 'image/jpeg'
            }
          ] : []
        });
        
        // Set duration explicitly for Samsung compatibility
        if (this.audio && this.audio.duration > 0) {
          navigator.mediaSession.metadata = new MediaMetadata({
            ...navigator.mediaSession.metadata,
            duration: this.audio.duration
          });
        }
      } catch (error) {
        console.error('Error setting media session metadata:', error);
      }
    }
  }

  handleTimeUpdate() {
    if (this.audio && this.audio.duration > 0) {
      this.updateProgress(this.audio.currentTime, this.audio.duration);
      this.updateMediaSessionPositionState();
    }
  }

  handleDurationChange() {
    if (this.audio && this.audio.duration > 0) {
      this.updateMediaSessionPositionState();
    }
  }

  updateMediaSessionPositionState() {
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        if (this.audio && this.audio.duration > 0 && !isNaN(this.audio.duration)) {
          const position = Math.min(this.audio.currentTime || 0, this.audio.duration);
          navigator.mediaSession.setPositionState({
            duration: this.audio.duration,
            playbackRate: this.audio.playbackRate || 1.0,
            position: Math.max(0, position)
          });
        }
      } catch (error) {
        console.error('Error setting media session position state:', error);
      }
    }
  }

  updateProgress(currentTime, duration) {
    // Update progress bar if we have a valid duration
    if (duration > 0) {
      const progress = Math.min(100, (currentTime / duration) * 100);
      if (this.progressFill) {
        this.progressFill.style.width = `${progress}%`;
      }
    }

    // Always update time display
    if (this.progressTimes && this.progressTimes.length >= 2) {
      this.progressTimes[0].textContent = this.formatTime(currentTime);
      // Only show duration if it's a valid number greater than 0
      this.progressTimes[1].textContent = duration > 0 ? this.formatTime(duration) : '-:--';
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  play() {
    if (!this.audio) return;

    this.audio
      .play()
      .then(() => {
        this.isPlaying = true;
        this.startProgressTracking();
      })
      .catch((error) => {
        console.error("Error playing audio:", error);
      });
  }

  pause() {
    if (!this.audio) return;

    this.audio.pause();
    this.isPlaying = false;
    this.stopProgressTracking();
    
    // Clear position state on Samsung devices to prevent stuck progress
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.audio.duration || 0,
          playbackRate: 0,
          position: this.audio.currentTime || 0
        });
      } catch (error) {
        console.error('Error clearing position state on pause:', error);
      }
    }
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  startProgressTracking() {
    // Progress tracking is now handled by timeupdate event listener
    // Keep this method for compatibility but no longer use interval
  }

  stopProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  skipForward() {
    if (!this.audio) return;
    this.audio.currentTime = Math.min(
      this.audio.duration,
      this.audio.currentTime + 10
    );
  }

  skipBackward() {
    if (!this.audio) return;
    this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
  }

  setVolume(volume) {
    if (!this.audio) return;
    this.audio.volume = volume;
  }

  handleStoryEnd() {
    // Play drop sound after 500ms
    setTimeout(() => {
      if (this.dropSound) {
        this.dropSound.currentTime = 0;
        this.dropSound
          .play()
          .catch((e) => console.error("Error playing drop sound:", e));
      }

      // Go to the next story after 2.5s total (500ms + 2000ms)
      setTimeout(() => {
        this.nextStory();
      }, 2000);
    }, 500);
  }

  nextStory() {
    const nextIndex = (this.currentStoryIndex + 1) % this.stories.length;
    this.showStory(nextIndex, true);
  }

  previousStory() {
    const prevIndex =
      (this.currentStoryIndex - 1 + this.stories.length) % this.stories.length;
    this.showStory(prevIndex, true);
  }
} // End of MusedropsPlayer class

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const app = new MusedropsPlayer();
});

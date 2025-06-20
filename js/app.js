// Import mock stories
import { mockStories } from "./mock-stories.js";

class MusedropsPlayer {
  constructor() {
    this.app = document.getElementById('app');
    this.initialMode = document.getElementById('initial-mode');
    this.playerView = document.getElementById('player-view');
    this.storiesContainer = document.getElementById('stories-container');
    
    // Player elements
    this.progressFill = document.querySelector('.progress-fill');
    this.progressTimes = document.querySelectorAll('.progress-time');
    
    // Buttons
    this.rewindBtn = document.getElementById('rewind-btn');
    this.forwardBtn = document.getElementById('forward-btn');
    this.playPauseBtn = document.getElementById('play-pause-btn');
    this.likeBtn = document.querySelector('.like-btn');
    this.likeCount = document.querySelector('.like-count');
    
    // Audio
    this.audio = new Audio();
    this.dropSound = document.getElementById('drop-sound');
    
    // State
    this.stories = [];
    this.currentStoryIndex = 0;
    this.isPlaying = false;
    this.progressInterval = null;
    this.hasInteracted = false;
    
    // Initialize
    this.initEventListeners();
    this.loadStories();
  }

  async loadStories() {
    try {
      this.stories = mockStories;
      this.renderStories();
    } catch (error) {
      console.error("Error loading stories:", error);
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
    const storyEl = document.createElement('div');
    storyEl.className = 'story';
    storyEl.dataset.id = story.id;
    // The background image is set via CSS in the updateStoryInfo method
    return storyEl;
  }

  initEventListeners() {
    // Click anywhere on initial mode to start
    if (this.initialMode) {
      this.initialMode.addEventListener('click', (e) => this.handleStartButtonClick(e));
      this.initialMode.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          this.handleStartButtonClick(e);
        }
      });
      this.initialMode.tabIndex = 0;
      this.initialMode.setAttribute('role', 'button');
      this.initialMode.setAttribute('aria-label', 'Tap anywhere to start listening');
    }

    // Click anywhere on player to toggle play/pause
    if (this.playerView) {
      console.log('Adding click listener to playerView');
      this.playerView.addEventListener('click', (e) => {
        console.log('Player view clicked', e.target);
        
        // Check if click is on a button or interactive element
        if (e.target.closest('button, a, [role="button"], [contenteditable]')) {
          console.log('Click on interactive element, ignoring');
          return;
        }
        
        console.log('Toggling play/pause');
        this.togglePlayPause();
      }, true); // Use capture phase to ensure we catch the event
    }

    // Player controls
    if (this.rewindBtn) {
      this.rewindBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skipBackward();
      });
    }
    if (this.forwardBtn) {
      this.forwardBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.skipForward();
      });
    }
    if (this.playPauseBtn) {
      this.playPauseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.togglePlayPause();
      });
    }
  }

  handleStartButtonClick(e) {
    if (this.hasInteracted) return;
    this.hasInteracted = true;
    
    // Add animation class
    this.initialMode.classList.add('exiting');
    
    // Show player after animation
    setTimeout(() => {
      this.initialMode.remove();
      this.showPlayer();
    }, 500);
    
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  showPlayer() {
    console.log('showPlayer called');
    if (!this.playerView) {
      console.error('playerView element not found');
      return;
    }
    
    // Show the player view
    this.playerView.classList.remove('hidden');
    
    // Show the first story but don't auto-play yet
    this.showStory(0, false);
    
    // Add animation to initial mode
    if (this.initialMode) {
      console.log('Hiding initial mode');
      this.initialMode.style.transform = 'translateY(-100%)';
      this.initialMode.style.transition = 'transform 0.5s ease-in-out';
      
      // Remove initial mode from DOM after animation and start playback
      setTimeout(() => {
        if (this.initialMode && this.initialMode.parentNode) {
          this.initialMode.parentNode.removeChild(this.initialMode);
          console.log('Initial mode removed from DOM');
          
          // Now that initial mode is dismissed, start playback
          this.playCurrentStory();
        }
      }, 500);
    }
  }

  showStory(index, autoPlay = false) {
    if (index < 0 || index >= this.stories.length) return;
    
    console.log('Showing story at index:', index, 'autoPlay:', autoPlay);
    this.currentStoryIndex = index;
    const currentStory = this.stories[index];
    this.currentStory = currentStory;
    
    // Update active story in the UI
    const stories = document.querySelectorAll('.story');
    stories.forEach((story, i) => {
      if (i === index) {
        story.classList.add('active');
      } else {
        story.classList.remove('active');
      }
    });
    
    // Update story info in the UI
    this.updateStoryInfo(currentStory);
    
    // Handle audio loading
    if (this.audio) {
      // Pause current audio
      this.pause();
      
      // Set new audio source
      this.audio.src = currentStory.ttsAudioUrl;
      this.audio.load();
      
      // Only auto-play if explicitly requested
      if (autoPlay) {
        const playPromise = this.audio.play();
        
        if (playPromise !== undefined) {
          playPromise.catch(error => {
            console.log('Autoplay prevented, will wait for user interaction');
          });
        }
      }
    }
  }
  
  updateStoryInfo(story) {
    if (!story) return;
    
    const titleEl = document.querySelector('.story-title');
    const seriesEl = document.querySelector('.story-series');
    
    if (titleEl) titleEl.textContent = story.title;
    if (seriesEl) seriesEl.textContent = story.shows.name || '';
    
    // Update like count
    if (this.likeCount) {
      this.likeCount.textContent = story.likes?.[0]?.count || 0;
    }
    
    // Update story background image
    const storyEl = document.querySelector(`.story[data-id="${story.id}"]`);
    if (storyEl && story.shows.image_url) {
      storyEl.style.backgroundImage = `url(${story.shows.image_url})`;
    }
    
    this.updateProgress(0, story.duration || 0);
  }
  
  updateProgress(currentTime, duration) {
    if (!duration) return;
    
    const progress = Math.min(100, (currentTime / duration) * 100);
    
    if (this.progressFill) {
      this.progressFill.style.width = `${progress}%`;
    }
    
    // Update time display
    if (this.progressTimes && this.progressTimes.length >= 2) {
      this.progressTimes[0].textContent = this.formatTime(currentTime);
      this.progressTimes[1].textContent = this.formatTime(duration);
    }
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  playCurrentStory() {
    const currentStory = this.stories[this.currentStoryIndex];
    if (!currentStory) return;

    // Only set up new audio if needed
    if (!this.audio || this.audio.src !== currentStory.ttsAudioUrl) {
      this.audio = new Audio(currentStory.ttsAudioUrl);
      this.audio.preload = "auto";
      
      this.audio.oncanplay = () => {
        this.play();
      };

      this.audio.onended = () => this.handleStoryEnd();
      this.audio.onerror = (error) => {
        console.error("Audio error:", error);
        this.handleStoryEnd();
      };
    } else {
      // If audio is already loaded, just play it
      this.play();
    }
  }

  play() {
    if (!this.audio) return;
    
    this.audio.play().then(() => {
      this.isPlaying = true;
      this.updatePlayPauseButton();
      this.startProgressTracking();
    }).catch(error => {
      console.error("Error playing audio:", error);
    });
  }

  pause() {
    if (!this.audio) return;
    
    this.audio.pause();
    this.isPlaying = false;
    this.updatePlayPauseButton();
    this.stopProgressTracking();
  }

  togglePlayPause() {
    console.log('togglePlayPause called. Current state:', this.isPlaying ? 'playing' : 'paused');
    if (this.isPlaying) {
      console.log('Pausing playback');
      this.pause();
    } else {
      console.log('Starting playback');
      this.play();
    }
  }

  startProgressTracking() {
    this.stopProgressTracking();
    
    this.progressInterval = setInterval(() => {
      if (this.audio && this.audio.duration) {
        this.updateProgress(this.audio.currentTime, this.audio.duration);
      }
    }, 1000);
  }

  stopProgressTracking() {
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
      this.progressInterval = null;
    }
  }

  updatePlayPauseButton() {
    if (!this.playPauseBtn) return;
    
    const icon = this.playPauseBtn.querySelector('.material-icons-round');
    if (!icon) return;
    
    icon.textContent = this.isPlaying ? 'pause_circle' : 'play_circle';
  }

  skipForward() {
    const nextIndex = (this.currentStoryIndex + 1) % this.stories.length;
    this.showStory(nextIndex);
  }

  skipBackward() {
    const prevIndex = (this.currentStoryIndex - 1 + this.stories.length) % this.stories.length;
    this.showStory(prevIndex);
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
        this.dropSound.play().catch(e => console.error('Error playing drop sound:', e));
      }
      
      // Skip to next story after 2.5s total (500ms + 2000ms)
      setTimeout(() => {
        this.skipForward();
      }, 2000);
    }, 500);
  }
} // End of MusedropsPlayer class

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const app = new MusedropsPlayer();
});

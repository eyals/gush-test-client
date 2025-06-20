// Import mock stories
import { mockStories } from "./mock-stories.js";

class MusedropsPlayer {
  constructor() {
    // DOM Elements
    this.app = document.getElementById("app");
    this.initialMode = document.getElementById("initial-mode");
    this.playerView = document.getElementById("player-view");
    this.storiesContainer = document.getElementById("stories-container");
    this.progressFill = document.querySelector(".progress-fill");
    this.playPauseBtn = document.getElementById("play-pause-btn");
    this.rewindBtn = document.getElementById("rewind-btn");
    this.forwardBtn = document.getElementById("forward-btn");
    this.dropSound = document.getElementById("drop-sound");

    // State
    this.stories = [];
    this.currentStoryIndex = 0;
    this.isPlaying = false;
    this.audio = new Audio();
    this.progressInterval = null;
    this.swipeStartY = 0;
    this.isSwiping = false;
    this.hasInteracted = false;

    // Initialize
    this.initEventListeners();
    this.loadStories();
  }

  async loadStories() {
    try {
      // In a real app, this would fetch from Supabase
      this.stories = mockStories;
      this.renderStories();
      // Don't show player yet, wait for user interaction
    } catch (error) {
      console.error("Error loading stories:", error);
      // Show error state
    }
  }

  renderStories() {
    this.storiesContainer.innerHTML = "";

    this.stories.forEach((story, index) => {
      const storyEl = document.createElement("div");
      storyEl.className = "story";
      storyEl.dataset.index = index;
      storyEl.style.transform = `translateY(${index * 100}%)`;

      const img = document.createElement("img");
      img.src = story.shows.image_url;
      img.alt = story.title;
      img.className = "story-image";
      img.onerror = () => {
        console.error(`Failed to load image: ${story.shows.image_url}`);
        img.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"><rect width="100" height="100" fill="%23333"/><text x="50%" y="50%" font-family="sans-serif" font-size="12" text-anchor="middle" fill="white" dy=".3em">Image\nNot Found</text></svg>';
      };

      storyEl.appendChild(img);
      this.storiesContainer.appendChild(storyEl);
    });

    // Set initial story
    this.setCurrentStory(0);
  }

  // Initial mode touch handlers
  handleInitialTouchStart(e) {
    this.swipeStartY = e.touches[0].clientY;
  }

  handleInitialTouchMove(e) {
    if (!this.swipeStartY) return;
    
    const y = e.touches[0].clientY;
    const diff = this.swipeStartY - y;
    
    // Only respond to upward swipes
    if (diff > 10) {
      this.handleInitialSwipe();
      this.swipeStartY = null;
    }
  }

  handleInitialTouchEnd() {
    this.swipeStartY = null;
  }

  handleInitialSwipe() {
    // Hide initial mode
    this.initialMode.style.transform = 'translateY(-100%)';
    this.initialMode.style.transition = 'transform 0.5s ease-in-out';
    
    // Show player
    this.playerView.classList.remove("hidden");
    
    // Mark as interacted to prevent autoplay issues
    this.hasInteracted = true;
    
    // Start playing the first story
    this.setCurrentStory(0);
    this.playCurrentStory();
    
    // Remove initial mode from DOM after animation
    setTimeout(() => {
      this.initialMode.remove();
    }, 500);
  }

  showPlayer() {
    this.playerView.classList.remove("hidden");
    this.playCurrentStory();
  }

  setCurrentStory(index) {
    // Update UI
    const stories = document.querySelectorAll(".story");
    stories.forEach((story, i) => {
      const yOffset = (i - index) * 100;
      story.style.transform = `translateY(${yOffset}%)`;
    });

    // Update state
    this.currentStoryIndex = index;
    this.updateProgress(0);
  }

  playCurrentStory() {
    const currentStory = this.stories[this.currentStoryIndex];
    if (!currentStory) return;

    // Stop current audio
    this.audio.pause();
    clearInterval(this.progressInterval);

    // Set up new audio
    this.audio = new Audio(currentStory.ttsAudioUrl);
    this.audio.preload = "auto";

    // Error handling
    this.audio.onerror = (error) => {
      console.error('Error loading audio:', error);
      console.error('Audio source:', currentStory.ttsAudioUrl);
    };

    // Event listeners
    this.audio.oncanplay = () => {
      this.audio
        .play()
        .then(() => {
          this.isPlaying = true;
          this.updatePlayPauseButton();
          this.startProgressTracking();
        })
        .catch((err) => {
          console.error("Playback failed:", err);
        });
    };

    this.audio.onended = this.handleStoryEnd.bind(this);
    this.audio.onerror = (error) => {
      console.error("Audio error:", error);
      // Skip to next story on error
      this.handleStoryEnd();
    };
  }

  handleStoryEnd() {
    // Play drop sound (don't wait for it to finish)
    this.playDropSound();

    // After 2.5 seconds, go to next story (2s + 0.5s delay from drop sound)
    setTimeout(() => {
      this.nextStory();
    }, 2500);
  }

  playDropSound() {
    if (this.dropSound) {
      this.dropSound.currentTime = 0;
      this.dropSound
        .play()
        .catch((e) => console.log("Could not play drop sound:", e));
    }
  }

  nextStory() {
    const nextIndex = (this.currentStoryIndex + 1) % this.stories.length;
    this.setCurrentStory(nextIndex);
    this.playCurrentStory();
  }

  previousStory() {
    const prevIndex =
      (this.currentStoryIndex - 1 + this.stories.length) % this.stories.length;
    this.setCurrentStory(prevIndex);
    this.playCurrentStory();
  }

  togglePlayPause() {
    if (this.audio.paused) {
      this.audio.play().then(() => {
        this.isPlaying = true;
        this.updatePlayPauseButton();
        this.startProgressTracking();
      });
    } else {
      this.audio.pause();
      this.isPlaying = false;
      this.updatePlayPauseButton();
      clearInterval(this.progressInterval);
    }
  }

  skipForward() {
    this.audio.currentTime = Math.min(
      this.audio.currentTime + 10,
      this.audio.duration - 0.1
    );
    this.updateProgress((this.audio.currentTime / this.audio.duration) * 100);
  }

  skipBackward() {
    this.audio.currentTime = Math.max(0, this.audio.currentTime - 10);
    this.updateProgress((this.audio.currentTime / this.audio.duration) * 100);
  }

  startProgressTracking() {
    clearInterval(this.progressInterval);
    this.progressInterval = setInterval(() => {
      if (this.audio.duration) {
        const progress = (this.audio.currentTime / this.audio.duration) * 100;
        this.updateProgress(progress);
      }
    }, 100);
  }

  updateProgress(percent) {
    this.progressFill.style.width = `${percent}%`;
  }

  updatePlayPauseButton() {
    const playIcon = this.playPauseBtn.querySelector(".play-icon");
    const pauseIcon = this.playPauseBtn.querySelector(".pause-icon");

    if (this.isPlaying) {
      playIcon.classList.add("hidden");
      pauseIcon.classList.remove("hidden");
    } else {
      playIcon.classList.remove("hidden");
      pauseIcon.classList.add("hidden");
    }
  }

  // Touch event handlers for swipe
  handleTouchStart(e) {
    this.swipeStartY = e.touches[0].clientY;
    this.isSwiping = true;
    this.storiesContainer.style.transition = "none";
  }

  handleTouchMove(e) {
    if (!this.isSwiping) return;

    const y = e.touches[0].clientY;
    const deltaY = y - this.swipeStartY;

    // Prevent scrolling the page
    if (Math.abs(deltaY) > 10) {
      e.preventDefault();
    }

    // Move all stories
    const stories = document.querySelectorAll(".story");
    stories.forEach((story, index) => {
      const yOffset =
        (index - this.currentStoryIndex) * 100 +
        (deltaY / window.innerHeight) * 100;
      story.style.transform = `translateY(${yOffset}%)`;
    });
  }

  handleTouchEnd(e) {
    if (!this.isSwiping) return;
    this.isSwiping = false;
    this.storiesContainer.style.transition = "";

    const y = e.changedTouches[0].clientY;
    const deltaY = y - this.swipeStartY;
    const swipeThreshold = window.innerHeight * 0.1; // 10% of screen height

    // Determine if the swipe was significant enough
    if (Math.abs(deltaY) > swipeThreshold) {
      if (deltaY < 0) {
        // Swipe up - next story
        this.nextStory();
      } else {
        // Swipe down - previous story
        this.previousStory();
      }
    } else {
      // Return to current story
      this.setCurrentStory(this.currentStoryIndex);
    }
  }

  initEventListeners() {
    // Initial mode touch events
    this.initialMode.addEventListener("touchstart", (e) => this.handleInitialTouchStart(e));
    this.initialMode.addEventListener("touchmove", (e) => this.handleInitialTouchMove(e));
    this.initialMode.addEventListener("touchend", () => this.handleInitialTouchEnd());
    this.initialMode.addEventListener("touchcancel", () => this.handleInitialTouchEnd());

    // Player touch events
    this.storiesContainer.addEventListener("touchstart", (e) => this.handleTouchStart(e));
    this.storiesContainer.addEventListener("touchmove", (e) => this.handleTouchMove(e), { passive: false });
    this.storiesContainer.addEventListener("touchend", (e) => this.handleTouchEnd(e));
    this.storiesContainer.addEventListener("touchcancel", (e) => this.handleTouchEnd(e));

    // Button events
    this.playPauseBtn.addEventListener("click", () => this.togglePlayPause());
    this.rewindBtn.addEventListener("click", () => this.skipBackward());
    this.forwardBtn.addEventListener("click", () => this.skipForward());

    // Keyboard controls for testing
    document.addEventListener("keydown", (e) => {
      switch (e.key) {
        case " ":
        case "k":
          this.togglePlayPause();
          e.preventDefault();
          break;
        case "ArrowLeft":
          this.skipBackward();
          e.preventDefault();
          break;
        case "ArrowRight":
          this.skipForward();
          e.preventDefault();
          break;
        case "ArrowUp":
          this.nextStory();
          e.preventDefault();
          break;
        case "ArrowDown":
          this.previousStory();
          e.preventDefault();
          break;
      }
    });
  }
}

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Register service worker for PWA
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("ServiceWorker registration successful");
        })
        .catch((err) => {
          console.log("ServiceWorker registration failed: ", err);
        });
    });
  }

  // Start the app
  window.app = new MusedropsPlayer();
});

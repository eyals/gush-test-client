// Import Supabase client and fetch function
import { fetchStories } from "./supabase.js";
// Keep mock stories as fallback
import { mockStories } from "./mock-stories.js";

class MusedropsPlayer {
  constructor() {
    this.app = document.getElementById("app");
    this.initialMode = document.getElementById("initial-mode");
    this.playerView = document.getElementById("player-view");
    this.storiesContainer = document.getElementById("stories-container");
    this.playIndicator = document.querySelector(".play-indicator");
    this.isTouchDevice =
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0 ||
      navigator.msMaxTouchPoints > 0;

    // Player elements
    this.progressFill = document.querySelector(".progress-fill");
    this.progressTimes = document.querySelectorAll(".progress-time");

    // Buttons
    this.rewindBtn = document.getElementById("rewind-btn");
    this.forwardBtn = document.getElementById("forward-btn");

    this.likeBtn = document.querySelector(".like-btn");
    this.likeCount = document.querySelector(".like-count");

    // Audio
    this.audio = new Audio();
    this.dropSound = document.getElementById("drop-sound");

    // State
    this.stories = [];
    this.currentStoryIndex = 0;
    this.isPlaying = false;
    this.progressInterval = null;
    this.hasInteracted = false;
    this.touchStartY = 0;

    // Initialize
    this.initEventListeners();
    this.loadStories();
  }

  async loadStories() {
    try {
      // Try to fetch from Supabase first
      const stories = await fetchStories();
      this.stories = stories;
    } catch (error) {
      console.warn("Falling back to mock stories:", error);
      this.stories = mockStories;
    } finally {
      this.renderStories();
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
  }

  initEventListeners() {
    // Click anywhere on initial mode to start
    if (this.initialMode) {
      this.initialMode.addEventListener("click", (e) =>
        this.handleStartButtonClick(e)
      );
      this.initialMode.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.handleStartButtonClick(e);
        }
      });
      this.initialMode.tabIndex = 0;
      this.initialMode.setAttribute("role", "button");
      this.initialMode.setAttribute(
        "aria-label",
        "Tap anywhere to start listening"
      );
    }

    // Click anywhere on player to toggle play/pause
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
    }

    // Player controls
    if (this.rewindBtn) {
      this.rewindBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.skipBackward();
      });
    }
    if (this.forwardBtn) {
      this.forwardBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.skipForward();
      });
    }
  }

  handleStartButtonClick(e) {
    if (this.hasInteracted) return;
    this.hasInteracted = true;

    this.initialMode.classList.add("exiting");

    setTimeout(() => {
      this.initialMode.remove();
      this.showPlayer();
      this.play(); // Autoplay the first story
    }, 500);

    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
  }

  showPlayer() {
    console.log("showPlayer called");
    if (!this.playerView) {
      console.error("playerView element not found");
      return;
    }

    this.playerView.classList.remove("hidden");
    this.showStory(0, false);
  }

  showStory(index, autoPlay = false) {
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
      // If we're autoplaying, we want the state to remain "playing".
      // so we don't call the full pause() method which sets isPlaying = false.
      if (!autoPlay) {
        this.pause();
      } else {
        this.audio.pause(); // just pause the element
        this.stopProgressTracking(); // and stop the old timer
      }

      // Set new audio source
      this.audio.src = currentStory.ttsAudioUrl;
      this.audio.load();

      if (autoPlay) {
        this.play(); // this will set isPlaying=true and start the new timer
      }
    }
    this.updatePlayIndicator(!autoPlay);
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
  }

  togglePlayPause() {
    if (this.isPlaying) {
      this.pause();
    } else {
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

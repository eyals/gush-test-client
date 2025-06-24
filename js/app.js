// Import Supabase client and fetch function
import { fetchStories } from "./supabase.js";
// Keep mock stories as fallback
import { mockStories } from "./mock-stories.js";

class MusedropsPlayer {
  // Image transformation function
  transformImageUrl(imageUrl, size = "full") {
    if (!imageUrl) return this.getFallbackImageUrl(size);

    // Replace =/object/ with /render/image/
    let transformedUrl = imageUrl.replace("=/object/", "/render/image/");

    // Add transformation parameters based on size
    if (size === "full") {
      transformedUrl += "?resize=contain&quality=50&width=500";
    } else if (size === "smallThumb") {
      transformedUrl += "?resize=cover&quality=50&width=192&height=192";
    } else if (size === "largeThumb") {
      transformedUrl += "?resize=cover&quality=50&width=512&height=512";
    }

    return transformedUrl;
  }

  // Get fallback image URL with same transformation parameters
  getFallbackImageUrl(size = "full") {
    const baseUrl =
      "https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/media/static/default-show-image.png";
    let fallbackUrl = baseUrl.replace("=/object/", "/render/image/");

    // Add same transformation parameters as regular images
    if (size === "full") {
      fallbackUrl += "?resize=contain&quality=50&width=500";
    } else if (size === "smallThumb") {
      fallbackUrl += "?resize=cover&quality=50&width=192&height=192";
    } else if (size === "largeThumb") {
      fallbackUrl += "?resize=cover&quality=50&width=512&height=512";
    }

    return fallbackUrl;
  }

  // Set background image with fallback handling
  setImageWithFallback(element, imageUrl, size = "full") {
    if (!element) return;

    // If no image URL provided, use fallback immediately
    if (!imageUrl) {
      const fallbackUrl = this.getFallbackImageUrl(size);
      element.style.backgroundImage = `url(${fallbackUrl})`;
      return;
    }

    // Try to load the original image first
    const transformedUrl = this.transformImageUrl(imageUrl, size);
    const img = new Image();

    img.onload = () => {
      // Image loaded successfully, set it as background
      element.style.backgroundImage = `url(${transformedUrl})`;
    };

    img.onerror = () => {
      // Image failed to load, use fallback
      const fallbackUrl = this.getFallbackImageUrl(size);
      element.style.backgroundImage = `url(${fallbackUrl})`;
    };

    // Start loading the image
    img.src = transformedUrl;
  }

  constructor() {
    // Initialize state first
    this.isInitialized = false;
    this.isTransitioning = false;
    this.isSwitchingStories = false;
    this.touchStartX = null;
    this.stories = [];
    this.currentStoryIndex = 0;
    this.isPlaying = false;
    this.progressInterval = null;
    this.hasInteracted = false;
    this.audioMuted = false; // Universal master audio switch

    // Initialize audio
    this.audio = new Audio();
    this.dropSound = document.getElementById("drop-sound");
    this.backgroundMusic = document.getElementById("background-music");

    // Wait for DOM to be fully loaded
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.initialize());
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
      this.progressContainer = document.querySelector(".progress-container");

      // Buttons
      this.rewindBtn = document.getElementById("rewind-btn");
      this.forwardBtn = document.getElementById("forward-btn");
      this.likeBtn = document.querySelector(".like-btn");
      this.likeCount = document.querySelector(".like-count");

      // Check for required elements
      if (!this.initialMode || !this.playerView || !this.storiesContainer) {
        throw new Error("Required elements not found in DOM");
      }

      this.isTouchDevice =
        "ontouchstart" in window ||
        navigator.maxTouchPoints > 0 ||
        navigator.msMaxTouchPoints > 0;

      // Initialize the app
      this.initializeEventListeners();
      this.initializeAudio();
      this.loadStories();

      this.isInitialized = true;
      console.log("MusedropsPlayer initialized successfully");
    } catch (error) {
      console.error("Failed to initialize MusedropsPlayer:", error);
      this.showError("Failed to initialize player. Please refresh the page.");
    }
  }

  initializeAudio() {
    // Audio initialization
    this.initializeMediaSession();
    this.initializeBackgroundMusic();
  }

  initializeBackgroundMusic() {
    if (this.backgroundMusic) {
      // Background music volume settings
      this.highVol = 0.6;
      this.lowVol = 0.07;
      this.fadeStepLength = 100; // 100ms

      // Set initial volume to 60% when music starts alone
      this.backgroundMusic.volume = this.highVol;

      // Add event listeners for background music
      this.backgroundMusic.addEventListener("ended", () => {
        // This shouldn't fire due to loop attribute, but just in case
        if (this.backgroundMusic.src) {
          this.backgroundMusic.currentTime = 0;
          this.backgroundMusic
            .play()
            .catch((e) =>
              console.error("Error restarting background music:", e)
            );
        }
      });

      this.backgroundMusic.addEventListener("error", (e) => {
        console.error("Background music error:", e);
        console.error("Background music src:", this.backgroundMusic.src);
        console.error(
          "Background music error code:",
          this.backgroundMusic.error?.code
        );
        console.error(
          "Background music error message:",
          this.backgroundMusic.error?.message
        );
      });



    }
  }

  initializeMediaSession() {
    if ("mediaSession" in navigator) {
      // Set up action handlers for bluetooth/media controls
      navigator.mediaSession.setActionHandler("play", () => {
        this.play();
      });

      navigator.mediaSession.setActionHandler("pause", () => {
        this.pause();
      });

      navigator.mediaSession.setActionHandler("nexttrack", () => {
        this.nextStory();
      });

      navigator.mediaSession.setActionHandler("previoustrack", () => {
        this.previousStory();
      });
    }
  }

  showError(message) {
    console.error(message);
    const errorDiv = document.createElement("div");
    errorDiv.style.position = "fixed";
    errorDiv.style.bottom = "20px";
    errorDiv.style.left = "50%";
    errorDiv.style.transform = "translateX(-50%)";
    errorDiv.style.background = "rgba(255, 0, 0, 0.8)";
    errorDiv.style.color = "white";
    errorDiv.style.padding = "10px 20px";
    errorDiv.style.borderRadius = "5px";
    errorDiv.style.zIndex = "10000";
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
      this.initialMode.addEventListener("click", handleInitialTap, {
        passive: false,
      });
      this.initialMode.addEventListener("touchend", handleInitialTap, {
        passive: false,
      });

      // Make sure the element is interactive
      this.initialMode.style.cursor = "pointer";

      // Add debug button handler if it exists
      const debugButton = document.getElementById("debug-start");
      if (debugButton) {
        debugButton.addEventListener("click", handleInitialTap);
      }

      console.log("Event listeners initialized");
    } catch (error) {
      console.error("Error initializing event listeners:", error);
      this.showError("Error setting up player controls");
    }
    if (this.forwardBtn) {
      this.forwardBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.forwardBtn.classList.contains("disabled")) {
          return;
        }
        this.skipForward();
      });
    }
    if (this.rewindBtn) {
      this.rewindBtn.addEventListener("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (this.rewindBtn.classList.contains("disabled")) {
          return;
        }
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
        // Don't show play indicator if audio ended naturally or if we're switching stories
        if (!this.audio.ended && !this.isTransitioning && !this.isSwitchingStories) {
          this.updatePlayIndicator(true);
        }
      });
      this.audio.addEventListener(
        "timeupdate",
        this.handleTimeUpdate.bind(this)
      );
      this.audio.addEventListener(
        "durationchange",
        this.handleDurationChange.bind(this)
      );
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
        this.showError("No stories available. Using demo content.");
        this.stories = mockStories;
      }

      // Make sure we have at least one story
      if (!this.stories || this.stories.length === 0) {
        this.showError("No stories available");
        throw new Error("No stories available from any source");
      }
    } catch (error) {
      // If there's any error, use mock data
      this.showError("Loading stories. Using demo content.");
      this.stories = mockStories;
    } finally {
      // Always render whatever stories we have
      try {
        this.renderStories();
      } catch (renderError) {
        this.showError("Failed to load stories");
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
      // It's a tap, toggle play/pause unless it's on a button or progress controls
      const target = e.changedTouches ? e.changedTouches[0].target : e.target;
      if (!target.closest(".control-btn, .action-btn, .progress-container, .player-controls")) {
        this.togglePlayPause();
      } else {
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
        this.initialMode.style.pointerEvents = "none";
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
      console.error("Error in showPlayer:", error);
      this.showError("Error loading player");
      this.isTransitioning = false;
    }
  }

  finishShowingPlayer() {
    try {
      // Show the player and start with the first story
      this.playerView.classList.remove("hidden");
      this.showStory(0, true); // Auto-play the first story
    } catch (error) {
      console.error("Error finishing player show:", error);
      this.showError("Error initializing player");
    } finally {
      this.isTransitioning = false;
    }
  }

  async showStory(index, autoPlay = false) {
    if (index < 0 || index >= this.stories.length) return;

    // Set flag to prevent play indicator during story switch
    this.isSwitchingStories = true;

    this.currentStoryIndex = index;
    const currentStory = this.stories[index];
    this.currentStory = currentStory;

    // Disable progress bar when switching to new story
    this.disableProgressBar();

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

    // Handle background music
    await this.loadBackgroundMusic(currentStory);

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
        console.error("Error loading audio:", error);
        this.showError("Error loading audio");
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

    // Update story background image with fallback handling
    const storyEl = document.querySelector(`.story[data-id="${story.id}"]`);
    if (storyEl) {
      this.setImageWithFallback(storyEl, story.shows.image_url, "full");
    }

    this.updateProgress(0, story.duration || 0);

    // Update media session metadata for bluetooth controls
    this.updateMediaSessionMetadata(story);
  }

  updateMediaSessionMetadata(story) {
    if ("mediaSession" in navigator && story) {
      try {
        const showName = story.shows.name || "Stories";

        // Get artwork URLs with fallback support
        const smallThumbUrl = story.shows.image_url
          ? this.transformImageUrl(story.shows.image_url, "smallThumb")
          : this.getFallbackImageUrl("smallThumb");
        const largeThumbUrl = story.shows.image_url
          ? this.transformImageUrl(story.shows.image_url, "largeThumb")
          : this.getFallbackImageUrl("largeThumb");

        navigator.mediaSession.metadata = new MediaMetadata({
          title: story.title,
          artist: `Musedrops - ${showName}`,
          artwork: [
            {
              src: smallThumbUrl,
              sizes: "192x192",
              type: "image/jpeg",
            },
            {
              src: largeThumbUrl,
              sizes: "512x512",
              type: "image/jpeg",
            },
          ],
        });

        // Set duration explicitly for Samsung compatibility
        if (this.audio && this.audio.duration > 0) {
          navigator.mediaSession.metadata = new MediaMetadata({
            ...navigator.mediaSession.metadata,
            duration: this.audio.duration,
          });
        }
      } catch (error) {
        console.error("Error setting media session metadata:", error);
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
    if (
      "mediaSession" in navigator &&
      "setPositionState" in navigator.mediaSession
    ) {
      try {
        if (
          this.audio &&
          this.audio.duration > 0 &&
          !isNaN(this.audio.duration)
        ) {
          const position = Math.min(
            this.audio.currentTime || 0,
            this.audio.duration
          );
          navigator.mediaSession.setPositionState({
            duration: this.audio.duration,
            playbackRate: this.audio.playbackRate || 1.0,
            position: Math.max(0, position),
          });
        }
      } catch (error) {
        console.error("Error setting media session position state:", error);
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
      this.progressTimes[1].textContent =
        duration > 0 ? this.formatTime(duration) : "-:--";
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  }

  disableProgressBar() {
    if (this.progressContainer) {
      this.progressContainer.classList.add("disabled");
    }
    if (this.rewindBtn) {
      this.rewindBtn.classList.add("disabled");
    }
    if (this.forwardBtn) {
      this.forwardBtn.classList.add("disabled");
    }
  }

  enableProgressBar() {
    if (this.progressContainer) {
      this.progressContainer.classList.remove("disabled");
    }
    if (this.rewindBtn) {
      this.rewindBtn.classList.remove("disabled");
    }
    if (this.forwardBtn) {
      this.forwardBtn.classList.remove("disabled");
    }
  }

  async loadBackgroundMusic(story) {
    console.log(
      "Loading background music for story:",
      story.title,
      "music_url:",
      story.shows.music_url
    );

    if (!this.backgroundMusic || !story.shows.music_url) {
      console.log("No background music element or music_url, stopping music");
      // Stop background music if no music_url
      this.stopBackgroundMusic();
      return;
    }

    // If the music source is the same as current, don't reload
    // Use includes() because the browser might add the full URL
    if (
      this.backgroundMusic.src &&
      this.backgroundMusic.src.includes(story.shows.music_url)
    ) {
      console.log("Same music source, not reloading");
      return;
    }

    // Stop current background music
    this.stopBackgroundMusic();

    // Load new background music
    console.log("Setting background music source to:", story.shows.music_url);
    this.backgroundMusic.src = story.shows.music_url;

    return new Promise((resolve, reject) => {
      const onCanPlay = () => {
        this.backgroundMusic.removeEventListener("canplay", onCanPlay);
        this.backgroundMusic.removeEventListener("error", onError);
        resolve();
      };

      const onError = (e) => {
        console.error("Error loading background music:", e);
        this.backgroundMusic.removeEventListener("canplay", onCanPlay);
        this.backgroundMusic.removeEventListener("error", onError);
        reject(e);
      };

      this.backgroundMusic.addEventListener("canplay", onCanPlay);
      this.backgroundMusic.addEventListener("error", onError);
      this.backgroundMusic.load();
    }).catch((e) => {
      console.error("Failed to load background music, continuing without it");
    });
  }

  startBackgroundMusic() {
    console.log(
      "Attempting to start background music, src:",
      this.backgroundMusic?.src
    );
    
    // Check master audio switch
    if (this.audioMuted) {
      console.log("Audio is muted, not starting background music");
      return;
    }
    
    if (this.backgroundMusic && this.backgroundMusic.src) {
      this.backgroundMusic
        .play()
        .then(() => {
        })
        .catch((e) => {
          console.error("Error starting background music:", e);
          console.error("Error details:", e.name, e.message);
        });
    } else {
    }
  }

  pauseBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
    }
  }

  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.backgroundMusic.src = "";
      // Reset volume for next song
      this.backgroundMusic.volume = this.highVol;
    }
  }

  async play() {
    if (!this.audio) return;

    // Check master audio switch
    if (this.audioMuted) {
      console.log("Audio is muted, not playing");
      return;
    }

    console.log(
      "Play method called, currentStory:",
      this.currentStory?.title,
      "music_url:",
      this.currentStory?.shows?.music_url
    );
    console.log("Audio currentTime:", this.audio.currentTime);

    // Start background music first if available
    if (this.currentStory && this.currentStory.shows.music_url) {
      console.log("Starting background music...");
      const isResume = this.audio.currentTime > 0;

      if (isResume) {
        // When resuming, set to low volume and start music
        this.backgroundMusic.volume = this.lowVol;
        this.startBackgroundMusic();
      } else {
        // When starting fresh, use high volume and wait 2 seconds
        this.backgroundMusic.volume = this.highVol;
        this.startBackgroundMusic();
        console.log("Waiting 2 seconds before starting TTS...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log("2 second delay complete, starting TTS");
      }
    }

    this.audio
      .play()
      .then(() => {
        console.log("TTS started successfully");
        // Clear story switching flag now that audio is playing
        this.isSwitchingStories = false;
        // Enable progress bar when TTS starts
        this.enableProgressBar();
        // Lower background music volume when TTS starts
        if (this.backgroundMusic && !this.backgroundMusic.paused) {
          console.log("Fading background music down for TTS");
          this.fadeBackgroundMusic(this.highVol, this.lowVol, 500);
        }
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
    this.pauseBackgroundMusic();
    // No need to fade volume when pausing since music is stopped
    this.isPlaying = false;
    this.stopProgressTracking();

    // Show play indicator when manually paused (even if audio ended)
    this.updatePlayIndicator(true);

    // Only enable progress controls if audio has actual content to scrub through
    // and we're not in a transition state (like story ending)
    if (this.audio.duration > 0 && !this.audio.ended) {
      this.enableProgressBar();
    } else {
    }

    // Clear position state on Samsung devices to prevent stuck progress
    if (
      "mediaSession" in navigator &&
      "setPositionState" in navigator.mediaSession
    ) {
      try {
        navigator.mediaSession.setPositionState({
          duration: this.audio.duration || 0,
          playbackRate: 1.0, // Can't be 0, use 1.0 instead
          position: this.audio.currentTime || 0,
        });
      } catch (error) {
        console.error("Error clearing position state on pause:", error);
      }
    }
  }

  togglePlayPause() {
    if (this.isPlaying) {
      // Pause: Always allowed with master audio switch
      this.audioMuted = true;
      this.pause();
    } else {
      // Play: Handle different scenarios based on audio timeline
      this.audioMuted = false;
      
      // Always hide play indicator immediately when play is pressed for responsiveness
      this.updatePlayIndicator(false);
      
      if (this.audio.currentTime === 0) {
        // Before TTS starts - seek to beginning of intro sequence
        console.log("Play pressed before TTS starts - seeking to beginning");
        this.audio.currentTime = 0;
        this.play();
      } else if (this.audio.ended) {
        // After TTS ends - unmute and let timers run
        console.log("Play pressed after TTS ends - unmuting audio");
        // Audio is already muted, timers will continue
      } else {
        // During TTS - normal resume
        this.play();
      }
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
    console.log("Story ended, starting enhanced ending sequence");

    // Disable progress bar when story ends
    this.disableProgressBar();

    // Raise background music volume when TTS ends
    if (this.backgroundMusic && !this.backgroundMusic.paused) {
      console.log("Fading background music up at story end");
      this.fadeBackgroundMusic(this.lowVol, this.highVol, 800);
    }

    // Wait 2 seconds with background music at full volume
    setTimeout(() => {
      // Start fade out, and play drop sound when fade completes
      this.fadeOutAndStopBackgroundMusic(() => {
        // Wait 1 second after fade out completes, then play drop sound
        setTimeout(() => {
          if (this.dropSound && !this.audioMuted) {
            console.log("Playing drop sound after 1 second pause");
            this.dropSound.currentTime = 0;
            this.dropSound
              .play()
              .catch((e) => console.error("Error playing drop sound:", e));
          }

          // Wait 2 more seconds after drop sound, then start next story
          setTimeout(() => {
            console.log("Starting next story after drop sound delay");
            this.nextStory();
          }, 2000);
        }, 1000);
      });
    }, 2000);
  }

  fadeBackgroundMusic(startVol, endVol, duration, callback) {
    if (!this.backgroundMusic || this.backgroundMusic.paused) {
      if (callback) callback();
      return;
    }

    const volumeDiff = endVol - startVol;
    const fadeSteps = Math.ceil(duration / this.fadeStepLength);
    const volumeStep = volumeDiff / fadeSteps;
    let currentStep = 0;

    const fadeInterval = setInterval(() => {
      currentStep++;
      const newVolume = Math.max(
        0,
        Math.min(1, startVol + volumeStep * currentStep)
      );
      this.backgroundMusic.volume = newVolume;

      if (
        currentStep >= fadeSteps ||
        (volumeDiff > 0 && newVolume >= endVol) ||
        (volumeDiff < 0 && newVolume <= endVol)
      ) {
        clearInterval(fadeInterval);
        this.backgroundMusic.volume = endVol;
        if (callback) callback();
      }
    }, this.fadeStepLength);
  }

  fadeOutAndStopBackgroundMusic(callback) {
    if (!this.backgroundMusic || this.backgroundMusic.paused) {
      if (callback) callback();
      return;
    }

    // Fade from current volume (should be highVol) to 0 over 3 seconds
    this.fadeBackgroundMusic(this.highVol, 0, 3000, () => {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      this.backgroundMusic.volume = this.highVol; // Reset for next story
      console.log("Background music fade out and stop complete");
      if (callback) callback();
    });
  }

  nextStory() {
    this.stopBackgroundMusic();
    const nextIndex = (this.currentStoryIndex + 1) % this.stories.length;
    this.showStory(nextIndex, true);
  }

  previousStory() {
    this.stopBackgroundMusic();
    const prevIndex =
      (this.currentStoryIndex - 1 + this.stories.length) % this.stories.length;
    this.showStory(prevIndex, true);
  }
} // End of MusedropsPlayer class

// Initialize the app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  const app = new MusedropsPlayer();
});

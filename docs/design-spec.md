# Musedrops prototype - Design spec

## Layout and scrolling

- [Mock: Card Layout](https://www.figma.com/design/xyf8RM1uSJaN4uMlGiUnrB/Gush?node-id=727-4189&t=6oKkXXlrgrXBKRae-4)
- This main page is a vertical scroll of stories, similar to TikTok, but for audio.
- Each story is a card that contains an image and details about the story.
- Users can swipe to switch between stories. When tehy stop the swipe, it will snap to the next story in full screen.
- [Mock: Scrolling between stories](https://www.figma.com/design/xyf8RM1uSJaN4uMlGiUnrB/Gush?node-id=727-4264&t=6oKkXXlrgrXBKRae-4)

## Player

- The player is a component that is placed above the scroll. It does not scroll with the cards.
- It is hidden when the user is not in the player mode (on the initial mode).
- When the user scrolls, it is hidden, and then shown when the new story is in the viewport.
- Tapping anywhere on the screen that has no interaction, will toggle play/pause.
- When paused - a play button will be shown, but nothing else will change.
- [Mock: Player (paused)](https://www.figma.com/design/xyf8RM1uSJaN4uMlGiUnrB/Gush?node-id=762-3880&t=6oKkXXlrgrXBKRae-4)
- When starting to swipe, the audio does not pause. When swiping is finished, it will skip to the next story audio.
- When a story finished playing, two things happen:
  - After 500ms, [this short drop sound ](https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/media/static/drop.mp3) will play once in an invisible player
  - After 2 more seconds, the next story will start playing.
- The player also offers buttons to skip 10 seconds forward or backward.

## Initial mode

- [Mock: Initial mode](https://www.figma.com/design/xyf8RM1uSJaN4uMlGiUnrB/Gush?node-id=762-3911&t=6oKkXXlrgrXBKRae-4)
- When the page loads, it will show the brand and wait for the data to load.
- Browsers block autoplay, so this is a way to get users to interact and allow autoplay.
- This will be layed out as the first card on the list, but it will not play anything and will be removed once the user is done scrolling away from it, so that they can't scroll back.

## Other interactions

- There are no other interactions. The other elements in teh mocks, though they look interactive, will be static for now.

## Assets

- Story assets come from the data. For now, we will use mock data from `mock-stories.js`.
- Logo is on https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/media/static/md-logo-white.svg
- Drop sound effect between stories is on https://ifsdyucvpgshyglmoxkp.supabase.co/storage/v1/object/public/media/static/drop.mp3
- Fonts are all Google Font: Instrument Sans
- Icons are all material icons (rounded)

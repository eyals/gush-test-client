# Musedrops Player

A TikTok-style audio player for short audio stories, built with vanilla JavaScript and designed for mobile-first PWA experience.

## Features

- 📱 Mobile-first design with PWA support
- 🎧 Audio player with 10s skip forward/backward
- 🔄 Swipe gestures for navigation between stories
- ⚡ Offline support with service worker
- 🎨 Responsive design that works on all screen sizes

## Getting Started

### Prerequisites

- Node.js (v14 or later)
- Modern web browser (Chrome, Firefox, Safari, Edge)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/musedrops-player.git
   cd musedrops-player
   ```

2. Install dependencies (only needed for the development server):
   ```bash
   npm install
   ```

### Running the App

#### Development Mode

Start the local development server:

```bash
node server.js
```

Then open [http://localhost:6000](http://localhost:6000) in your browser.

#### Testing on Mobile

1. Make sure your computer and mobile device are on the same WiFi network
2. Find your computer's local IP address (run `ifconfig` on Mac/Linux or `ipconfig` on Windows)
3. On your mobile device, open: `http://YOUR_LOCAL_IP:6000`

### Deploying to Production

This project includes a GitHub Actions workflow that automatically deploys the app to GitHub Pages when changes are pushed to the `main` branch.

#### GitHub Pages Deployment

1. Ensure your repository is set up with GitHub Pages:

   - Go to your repository's Settings > Pages
   - Under "Build and deployment", select "GitHub Actions" as the source
   - The workflow is already configured in `.github/workflows/static.yml`

2. Push your changes to the `main` branch:

   ```bash
   git add .
   git commit -m "Update app"
   git push origin main
   ```

3. The workflow will automatically deploy your app to GitHub Pages
   - You can monitor the deployment in the "Actions" tab
   - Once complete, your app will be available at `https://<username>.github.io/<repository>`

#### Alternative Deployment Options

You can also deploy to other static hosting services:

- [Netlify](https://www.netlify.com/)
- [Vercel](https://vercel.com/)
- [Firebase Hosting](https://firebase.google.com/docs/hosting)

## Project Structure

```
musedrops-player/
├── css/
│   └── styles.css       # Main styles
├── js/
│   ├── app.js          # Main application logic
│   ├── mock-stories.js  # Sample stories data
│   └── supabase.js     # Supabase integration (stub)
├── index.html          # Main HTML file
├── manifest.json       # PWA manifest
├── server.js           # Development server
└── sw.js              # Service worker
```

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari 14+
- Edge (latest)
- iOS Safari 14+
- Chrome for Android

## License

MIT

## Acknowledgments

- [Supabase](https://supabase.com/) for the backend
- [Google Fonts](https://fonts.google.com/) for the typography
- [Material Icons](https://fonts.google.com/icons) for the icons

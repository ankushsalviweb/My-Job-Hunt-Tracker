# Job Hunt Tracker 2.0

> **Personal Job Hunt Tracker** - Track every opportunity, interaction & milestone

A modern, modular web application for managing your job search process with analytics, multiple views, and comprehensive tracking features.

![Analytics Dashboard](https://img.shields.io/badge/Analytics-Chart.js-blue)
![Build Tool](https://img.shields.io/badge/Build-Vite-purple)
![Styling](https://img.shields.io/badge/CSS-TailwindCSS-cyan)

## ✨ Features

- **4 View Modes**: Cards, Table, Kanban, Analytics
- **Smart Filtering**: By stage, type, location, result
- **Real-time Search**: Company, role, skills
- **Interaction Logging**: Track every call, email, interview
- **Analytics Dashboard**: Charts for stage distribution, success rate, timeline
- **Drag & Drop Kanban**: Visual pipeline management
- **Data Persistence**: All data saved locally

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start dev server
npm run dev
# Opens http://localhost:3000

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📊 8-Stage Pipeline

1. **Initial Contact** - HR/Vendor call
2. **Discussion** - Role, skills, salary discussion
3. **CV Screening** - Following up on status
4. **Shortlisted** - Selected for interview
5. **Interview Set** - Scheduled
6. **Awaiting Feedback** - Post-interview
7. **Further Rounds** - Additional interviews
8. **Final Result** - Outcome

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| Vite 5.x | Build tool & dev server |
| Chart.js 4.x | Analytics charts |
| TailwindCSS v4 | Styling (CDN) |
| Font Awesome 6.x | Icons |
| localStorage | Data persistence |

## 📁 Project Structure

```
src/
├── core/               # Business logic engine
│   ├── ApplicationEngine.js
│   ├── models/
│   ├── services/
│   ├── constants/
│   └── utils/
├── ui/                 # Presentation layer
│   ├── UIController.js
│   ├── views.js
│   └── analytics.js
└── styles/
    └── custom.css
```

## 🌐 Deployment

### Netlify (Recommended)

1. Push to GitHub
2. Connect repo to Netlify
3. Auto-deploys from `netlify.toml` config

Or manual:
```bash
npm run build
# Upload dist/ folder
```

### Other Hosts

The `dist/` folder works on:
- Vercel
- GitHub Pages
- Cloudflare Pages
- Any static host

## 📝 Usage

1. **Add Application**: Click "New Opportunity"
2. **Track Progress**: Drag cards in Kanban or update stage
3. **Log Interactions**: Record calls, emails, interviews
4. **View Analytics**: Switch to Analytics view for insights
5. **Filter & Search**: Find applications quickly

## 🔒 Privacy

All data stored locally in your browser (localStorage). No external servers, no tracking.

## 📄 License

Personal use project. Feel free to fork and customize!

## 🙏 Credits

Built with modern web technologies for efficient job hunting.

---

**Version**: 2.0  
**Status**: Production Ready ✅

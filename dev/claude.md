# claude.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Session Logic
At the beginning of each session claude will be instructed to read this file. Claude should first identify the session number by counting existing sessions in claude-context.md and announce "Beginning Session #X" where X is the next session number. Upon reading this file claude will get an understanding of the current project and get context for the rest of the files in the directory. Once this file has been reviewed claude should use this context to read the rest of the files in the directory and give the user an indication that they have completed all the tasks by stating "up to date on dev contents" and then provide a summary of the project status and proposed next steps based on the progress.md or any other relevant files in this directory.

When told to "log session" claude will announce "Logging Session #X" where X is the current session number, then review this file again, followed by the rest of the files in this directory and update them as appropriate based on what has been done either since the session started, or since the last "log session" was executed. Sessions should be added to claude-context.md as separate numbered journal entries (Session 1, Session 2, etc.). Each session entry should be completely separate and independent. Previous sessions should be retained by default - never modify or combine previous session entries.

When told to "wrap up" the session claude will announce "Wrapping up Session #X" where X is the current session number, then review this file again, followed by the rest of the files in this directory and update them as appropriate based on what was done that session. Sessions should be added to claude-context.md as separate numbered journal entries (Session 1, Session 2, etc.). Each session entry should be completely separate and independent. Previous sessions should be retained by default - never modify or combine previous session entries. Claude will suggest adding, committing, and pushing if appropriate. Claude will let the user know this is done and that we are ready to end the session.

## Development Folder Structure

This `dev/` directory contains project management and documentation files to support development workflow:

### `claude-context.md`
- **Purpose**: Store session information between Claude Code sessions
- **Usage**: Update before closing each session with key progress, decisions, and context. Sessions should be added as separate numbered journal entries (Session 1, Session 2, etc.). Each session entry should be completely separate and independent. Previous sessions should be retained by default - never modify or combine previous session entries.
- **Benefits**: Provides continuity for future sessions, maintains development history

### `progress.md`
- **Purpose**: Comprehensive project status tracking and roadmap
- **Usage**: Regular updates to component completion status, milestones, and goals
- **Benefits**: Clear visibility into project state, structured progress tracking

### `error-log.md`
- **Purpose**: Centralized error tracking and debugging information
- **Usage**: Populated by developer when error logs are too large for chat interface
- **Benefits**: Persistent error context, easier debugging across sessions

### `app-framework.md`
- **Purpose**: Technical documentation of application architecture and logic
- **Usage**: Document key technical decisions, algorithms, and implementation details
- **Benefits**: Reference for complex logic, onboarding documentation

### `claude.md`
- **Purpose**: Development guidance and project overview for Claude Code
- **Usage**: Instructions for consistent development approach and project context
- **Benefits**: Ensures Claude follows project conventions and understands architecture

## Project Overview

WBX (WebCash-Bitcoin Exchange) is a browser-based, non-custodial hybrid trading platform for WC/BTC pairs. It provides a simple interface for users to buy/sell WebCash at current market prices through automated matching with existing limit orders. The platform prioritizes user experience with one-click trading while maintaining security through non-custodial P2P settlements.

## Architecture

### Core Technologies
- **Frontend**: Vanilla JavaScript, HTML5, CSS3
- **Backend**: Supabase (PostgreSQL, Auth, Real-time subscriptions)
- **Authentication**: JWT via Supabase Auth
- **External APIs**: WebCash API for secret validation, Bitcoin API for transaction verification

### File Structure
```
webcash-bitcoin-exchange/
├── index.html              # Main application entry point
├── styles.css              # Application styles and responsive design
├── app.js                  # Core application logic and UI management
├── supabase-config.js      # Supabase client configuration
├── utils/
│   └── api-helpers.js      # WebCash and Bitcoin API integrations
├── dev/                    # Development documentation and framework
└── docs/                   # Technical framework and specifications
```

### Key Components
- **Authentication System**: Email/password sign-up/login with JWT tokens
- **Market Interface**: Real-time price display and one-click buy/sell functionality
- **Order Book**: Live order matching and display system
- **Settlement System**: Non-custodial P2P settlement process
- **Real-time Updates**: WebSocket subscriptions for live market data

## Development Commands

No build process required - static files served directly. For development:
- Serve files via local HTTP server (e.g., `python -m http.server` or Live Server extension)
- Configure Supabase project credentials in supabase-config.js
- No package.json - all dependencies loaded via CDN

## Deployment

Static file hosting on platforms like:
- Vercel
- Netlify 
- GitHub Pages
- Supabase hosting

Requirements:
- HTTPS for secure authentication
- Configure Supabase project settings
- Set up domain redirects if needed

## Key Development Considerations

- **Security**: All sensitive operations handled server-side via Supabase
- **Performance**: Minimal JavaScript bundle, efficient DOM updates
- **Scalability**: Serverless architecture handles traffic spikes
- **User Experience**: Mobile-first responsive design
- **Non-custodial**: No funds held on platform, P2P settlement only
- **Real-time**: Live market data via Supabase subscriptions

## Common Tasks

- **Add new market features**: Extend Market object in app.js
- **Modify UI components**: Update UI object methods and corresponding CSS
- **Database schema changes**: Update Supabase schema and data models
- **API integrations**: Extend WebCashAPI or BitcoinAPI in utils/api-helpers.js
- **Authentication flow**: Modify Auth object in app.js
- **Styling updates**: Edit styles.css for visual changes
- **Testing**: Manual testing in browser, validate with test accounts
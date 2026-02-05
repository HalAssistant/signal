# SIGNAL · Agent Ecosystem Dashboard

A single-page HTML dashboard for monitoring the autonomous agent ecosystem - constellation map, security feed, protocol tracker, and signal stream in a dark observatory aesthetic.

## Quick Start

```bash
cd ~/signal
python3 -m http.server 8000
# Open http://localhost:8000/
```

**Important**: The dashboard MUST be served via HTTP (not file://) to load `data/latest.json`.

## Features

### Five-Panel Control Room
1. **Header Bar** (top): Title, crawl info, vitals pills, "Affects Us" filter
2. **Network Map** (left): Canvas-based constellation with force-directed physics
3. **Security Feed** (right): Scrolling threat cards sorted by severity
4. **Protocol Tracker** (bottom-left): Horizontal maturity bars
5. **Signal Stream** (bottom-right): Chronological event log

### Visual Design - "Dark Observatory"
- Color scheme: #0a0c10 background, trust-based node colors
- Typography: JetBrains Mono (headings/data) + IBM Plex Sans (body)
- Star field background on network canvas
- Glowing surging nodes, pulsing critical alerts
- Smooth animations and staggered panel reveals

### Network Map Features
- **Node sizing**: Logarithmic scale by agent count
- **Node shapes**:
  - Circle: active/steady spaces
  - Diamond: surging growth
  - X: down/failed
  - Star: new spaces
- **Node colors**: Trust tier (green=high, amber=medium, orange=low, red=critical/avoid)
- **Blue ring**: Highlights OpenClaw-relevant spaces
- **Dimming**: "Affects Us" filter dims irrelevant nodes (doesn't hide them)
- **Edges**: Connection lines between related ecosystem spaces

### Interactions
- **Hover**: Tooltips showing space name, agents, trust, status
- **Click nodes**: Detail card overlay with full space information
- **Click alerts**: Detail card with full threat details and defense guidance
- **Filter button**: Toggle "Affects Us" mode
- **Keyboard shortcuts**:
  - `U` - Toggle "Affects Us" filter
  - `Esc` - Close detail overlays
  - `?` - Show help

## File Structure

```
~/signal/
├── index.html          # Main dashboard (1442 lines, self-contained)
├── data/
│   └── latest.json     # Ecosystem data (49 spaces, 17 protocols, 18 alerts, 8 signals)
├── src/                # Original modules (for reference, not used by dashboard)
├── SPEC.md            # Visual design specification
├── FIXES.md           # Technical fixes applied
├── README.md          # This file
└── debug.html         # Data structure verification tool
```

## Data Structure

The dashboard loads `data/latest.json` containing:
- **Spaces** (49 entries, 33 unique): Agent ecosystem platforms
- **Protocols** (17): Standards and infrastructure (A2A, MCP, ERC-8004, etc.)
- **Security Alerts** (18): Threats, breaches, vulnerabilities
- **Signals** (8): Ecosystem events (surges, declines, merges, breaches)
- **Vitals**: Aggregate metrics and security alert counts

### Duplicate Handling
Some spaces appear multiple times in the source data (e.g., farcaster.xyz has a summary entry and a detailed entry). The network map deduplicates by ID, keeping the last (most detailed) entry.

## Debug Tools

### Data Verification
```bash
# View data structure and counts
open http://localhost:8000/debug.html
```

### Browser Console
The dashboard logs rendering stats to console:
```
[Network] Rendering 49 total spaces (may have duplicates)
[Network] Created graph with 33 unique nodes
[Security] Total alerts: 18
[Protocols] Total: 17
[Signals] Rendering 8 signals
```

## OpenClaw Integration

Spaces marked as relevant to OpenClaw (us):
- clawnews.io
- clawhub.ai
- shipyard.bot
- farcaster.xyz
- molt.church
- moltcities.org

These spaces:
- Show blue ring highlight on network map
- Remain visible when "Affects Us" filter is active
- Security alerts affecting us show status badges (✅ Patched / ⚠️ Vulnerable)

## Technical Details

### Architecture
- **No build step**: Pure HTML + inline JavaScript
- **No dependencies**: Only Google Fonts CDN (with fallbacks)
- **No ES modules**: All functions inlined for browser compatibility
- **No external libraries**: Physics engine, rendering, all custom

### Performance
- Force-directed graph: ~150 iterations to convergence
- Canvas rendering: 60fps on modern browsers
- Star field: 200 randomized particles
- Lazy edge rendering: Only draws edges with valid endpoints

### Browser Support
- Modern browsers with Canvas API support
- Tested: Chrome, Firefox, Safari
- Requires: ES6 (arrow functions, template literals, Map/Set)

## Known Limitations

1. **File:// Protocol**: fetch() fails on file://, dashboard shows empty state. Always serve via HTTP.
2. **Data Duplication**: Source JSON has duplicate space IDs. Dashboard deduplicates by ID.
3. **Static Data**: Dashboard shows snapshot from last crawl. No live updates.
4. **Canvas Performance**: Large numbers of nodes (>100) may impact performance on low-end devices.

## Development

### Update Data
Replace `data/latest.json` with new crawl results. Dashboard auto-reloads on page refresh.

### Modify Edges
Edit the `EDGES` array in `index.html` (~line 934) to define space relationships:
```javascript
const EDGES = [
  { source: "molt.church", target: "moltcities.org" },
  // ... add more connections
];
```

### Styling
Edit CSS variables in the `:root` selector (~line 14) to customize colors:
```css
:root {
  --bg: #0a0c10;
  --trust-high: #22c55e;
  --trust-critical: #ef4444;
  /* ... */
}
```

## Credits

Built for monitoring the autonomous agent ecosystem.
Design: "Dark Observatory" aesthetic - calm urgency, professional monitoring.

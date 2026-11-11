# Reflection Room

> Single-screen plan-view calculator for first-order acoustic reflection points in rooms.

Reflection Room helps home studio owners, audio engineers, and DIY listeners calculate first reflection points on the four walls of a rectangular room to plan acoustic treatment. It transforms room dimensions, speaker positions, and listener position into wall reflection locations, path lengths, incidence angles, and arrival delays relative to direct sound.

![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat&logo=javascript&logoColor=black)

---

## Features

- **Geometric Mirror Method**: Real-time visual ray tracing and mirror-source calculations for wall reflections (Left, Right, Front, Rear).
- **Interactive Plan View**: Drag-and-drop source (speaker) and listener position markers with live updating.
- **Precise Input Controls**: Exact numerical inputs with millimeter/centimeter precision for room width, length, and positioning.
- **Acoustic Metrics**:
  - Direct path length vs. reflected path lengths.
  - Delay relative to direct sound ($\Delta t$ in milliseconds).
  - Exact wall contact coordinates and angles of incidence.
- **Export & Print**:
  - High-precision SVG export suitable for vector editing and floor plans.
  - Clean, dedicated print stylesheet for PDF export or hardware store visits.
- **Zero Dependencies**: Pure HTML5, modern vanilla CSS, and JavaScript. No build step or server required.

---

## Getting Started

No build tooling or package installation is needed.

1. Clone or download this repository:
   ```bash
   git clone https://github.com/<your-username>/reflection-room.git
   cd reflection-room
   ```
2. Open `index.html` directly in any modern web browser:
   - On Windows: double-click `index.html` or run `start index.html`
   - On macOS: `open index.html`
   - On Linux: `xdg-open index.html`

Or serve it locally using any static web server:
```bash
# Python 3
python -m http.server 8000

# or npx serve
npx serve .
```

---

## Design Principles

- **Geometry First**: Every calculated number corresponds to a visible ray, point, or dimension.
- **Drafting-Table Aesthetic**: Crisp, technical, calm, and distraction-free interface.
- **One Screen, No Wizard**: All controls, plan views, and results are visible simultaneously.
- **Accessible (WCAG 2.2 AA)**: Full keyboard navigation, visible focus indicators, color-independent markers, and high contrast.

---

## License

MIT

# reflection-room

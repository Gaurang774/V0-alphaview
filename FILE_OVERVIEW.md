# AlphaView: Project File Overview

This document provides a comprehensive explanation of each file and folder in the AlphaView codebase, organized by their role in the application.

## 📁 Root Directory

| File | Purpose |
| :--- | :--- |
| `FILE_OVERVIEW.md` | **(This File)** A detailed map of the project's source code and configuration. |
| `README.md` | The main entry point for developers, including setup instructions and project vision. |
| `PROJECT_DETAILS.md` | Background information on the project's goals and architecture. |
| `AlphaView_Features_Detailed.md` | A deep dive into the specific features implemented in AlphaView. |
| `package.json` | Defines project dependencies, scripts (like `npm run dev`), and metadata. |
| `tsconfig.json` | Configuration for TypeScript, ensuring type safety and modern JS features. |
| `next.config.ts` | Custom configuration for the Next.js framework. |
| `postcss.config.mjs` | Configuration for PostCSS, used for styling. |
| `.env.local` | Local environment variables (e.g., API keys).        |

---

## 📁 `pages/`
*The core routing system of the application. Each file corresponds to a URL path.*

| File | Path | Purpose |
| :--- | :--- | :--- |
| `index.tsx` | `/` | **Home Page**: Features the hero section, protein search, and high-level project intro. |
| `explorer.tsx` | `/explorer` | **Main Workspace**: The high-tech interface where 3D protein models are viewed and analyzed. |
| `docs.tsx` | `/docs` | **Documentation Hub**: Educational content about proteins and how to use AlphaView. |
| `about.tsx` | `/about` | Information about the AlphaView team and mission. |
| `_app.tsx` | N/A | Global wrapper that initializes the application state and styles. |
| `_document.tsx` | N/A | Customizes the HTML structure (e.g., adding fonts from Google). |

---

## 📁 `components/`
*Reusable UI building blocks and core logic filters.*

| Component | Purpose |
| :--- | :--- |
| `ProteinViewer.tsx` | **Core 3D Engine**: Integrates MolStar for high-performance protein rendering and interaction. |
| `GestureController.tsx` | **Touchless Interface**: Uses MediaPipe for hand tracking, allowing users to control the 3D model with gestures. |
| `ProteinAnalysisPanel.tsx` | **AI Sidebar**: Powers the "Selection Analysis" and "AlphaBot AI" using Groq's LLMs for educational insights. |
| `ConfidenceInsights.tsx` | **Data Viz**: Displays pLDDT confidence scores (reliability) of the AlphaFold models. |
| `DNAViewer.tsx` | **MolStar DNA**: A specialized 3D viewer for the DNA structure shown on the landing page. |
| `DNAAnimation.tsx` | **Canvas Animation**: A lightweight, pre-rendered frame interpolation for the dashboard's DNA visual. |
| `OnboardingTour.tsx` | **Interactive Guide**: Walks new users through the explorer's features. |
| `V0Badge.tsx` | A subtle branding element for the platform. |

---

## 📁 `public/` & `styles/`
*Static assets and global styling.*

| Folder/File | Purpose |
| :--- | :--- |
| `public/logo.png` | The official AlphaView project logo. |
| `public/S/` | Contains the frame sequence used by `DNAAnimation.tsx`. |
| `styles/globals.css` | The master stylesheet defining the "Glassmorphism" and "Cyberpunk" aesthetics. |

---

## 📁 `api/` (inside `pages/`)
*Server-side logic and integrations.*

| File | Purpose |
| :--- | :--- |
| `pages/api/` | Currently hosts lightweight endpoints for proxying or fetching backend resources safely. |

# AlphaView - Project Documentation

## 1. Project Overview
AlphaView is a next-generation protein structure visualization platform that combines professional-grade 3D rendering with AI-powered analysis and novel interaction methods. It is designed to make structural biology accessible to students and researchers alike.

## 2. Technology Stack
- **Framework**: Next.js 15 (React 19)
- **Styling**: Tailwind CSS v4, Lucide React (Icons), Framer Motion (Animations)
- **3D Engine**: Mol* (`molstar`)
- **AI Integration**: Groq API (Llama 3 70B models)
- **Computer Vision**: Google MediaPipe (Hand Tracking)
- **State Management**: React Hooks & Context

## 3. Project Structure
```
root/
├── components/
│   ├── ConfidenceInsights.tsx   # pLDDT score distribution & visualization
│   ├── DNAAnimation.tsx         # Background aesthetic animations
│   ├── DNAViewer.tsx            # 3D DNA model for landing page
│   ├── GestureController.tsx    # MediaPipe hand tracking logic
│   ├── OnboardingTour.tsx       # Interactive user guide
│   ├── ProteinAnalysisPanel.tsx # AI Chat, Voice Interface, Analysis
│   └── ProteinViewer.tsx        # Mol* wrapper & visualization logic
├── pages/
│   ├── _app.tsx                 # Global layout & styles
│   ├── about.tsx                # Project background information
│   ├── docs.tsx                 # Documentation page
│   ├── explorer.tsx             # Main application controller
│   └── index.tsx                # Landing page with search
├── public/                      # Static assets
├── styles/                      # Global CSS
└── package.json                 # Dependencies
```

## 4. Key Features & Functions

### 4.1. Intelligent 3D Visualization (`Explorer` + `ProteinViewer`)
- **Smart Resolution**: Automatically resolves UniProt IDs, Accession numbers, or protein names to 3D structures.
- **Mol* Integration**: Custom-tuned renderer with Ambient Occlusion, Bloom, and Outline post-processing.
- **Visual Protocols**:
    - **Standard**: Default cartoon representation.
    - **Breakdown**: Color-coded by chain ID.
    - **Confidence**: Heatmap visualization of AlphaFold pLDDT scores (Blue = High, Red = Low).
    - **Detailed**: Atomic ball-and-stick view for close inspection.

### 4.2. AI-Powered Analysis (`ProteinAnalysisPanel`)
- **Contextual Intelligence**: Uses Groq (Llama 3) to generate structural summaries (Identity, Function, Reliability).
- **Selection Awareness**: Clicking a residue sends specific context to the AI for targeted explanation.
- **Voice Interface**:
    - **Speech-to-Text**: Ask questions naturally via microphone.
    - **Text-to-Speech**: AI reads responses aloud.
    - **Mute Control**: Dedicated toggle to silence AI voice output.

### 4.3. Gesture Control (`GestureController`)
- **Hand Tracking**: Uses webcam & MediaPipe to detect hand landmarks.
- **Interactions**:
    - **Rotate**: One finger extended.
    - **Pan**: Two fingers extended.
    - **Zoom**: Pinch gesture (Thumb + Index).
    - **Reset**: Open palm.

### 4.4. Structural Confidence (`ConfidenceInsights`)
- **pLDDT Visualization**: Real-time graph showing the reliability of the predicted structure.
- **Filtering**: Option to hide low-confidence regions (`pLDDT < 70`) to focus on reliable core structures.

## 5. UI/UX Design

### 🎨 UI Development
The dashboard interface was initially scaffolded using v0 to rapidly prototype layout and component structure. The exported components were then refactored and integrated with Mol* visualization and AI systems.

### 5.1. Design Language
- **Aesthetic**: Deep Space / Sci-Fi.
- **Palette**: Slate-900/950 backgrounds, Blue-500 accents, White text.
- **Materials**: Heavy use of Glassmorphism (`backdrop-blur`, translucent backgrounds) and thin borders (`border-white/10`).

### 5.2. Layouts
- **Landing Page**: Immersive 3D DNA background, central search bar with regex validation, featured protein cards.
- **Explorer Dashboard**:
    - **Viewport**: 100% height 3D canvas.
    - **Sidebar (Left)**: AI Analysis chat & structural info.
    - **Overlay (Top)**: Visual Protocol toggles (Advanced mode).
    - **Overlay (Bottom)**: Navigation hints & Confidence graph.
    - **Refinement**: Floating information cards appear on selection.

## 6. Detailed Logic Breakdown

### Protein Viewer (`ProteinViewer.tsx`)
- **API**: Exposes `rotate`, `pan`, `zoom`, `reset`, `highlightRegion` via `useImperativeHandle`.
- **Optimization**: Debounced rendering requests and optimized post-processing capabilities.

### Gesture Controller (`GestureController.tsx`)
- **Smoothing**: Applies exponential smoothing to hand coordinates to prevent camera jitter.
- **State Machine**: Tracks "Hand State" (Open, Closed, Pointing) to trigger distinct camera modes.

### Explorer Controller (`explorer.tsx`)
- **Orchestration**: Manages the loading state lifecycle (Metadata -> Structure -> Analysis).
- **Caching**: Implements `localStorage` caching for PDB data and AI responses to reduce API costs and load times.

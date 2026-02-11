# AlphaView: Detailed Technical Documentation

This document provides a comprehensive overview of every function, module, and logic block within the AlphaView project. It serves as a blueprints for the system's architecture and behavioral mapping.

## 1. Core Architecture Overview
AlphaView is built on **Next.js 15**, utilizing a hybrid architecture of 3D rendering (**Mol***), AI-driven analysis (**Groq/Llama 3**), and computer vision (**MediaPipe**).

---

## 2. Page Logic (`pages/`)

### `explorer.tsx` (The Brain)
Orchestrates the state and data flow between the 3D viewer, metadata services, and AI panels.

- **`resolveAndFetch()`**:
    - **Logic**: Performs a 3-stage resolution:
        1. **Identity**: Searches UniProt for PDB/Accession IDs if not provided directly.
        2. **Metadata**: Fetches protein name, organism, length, and functional annotations.
        3. **Structure**: Decides between direct AlphaFold PDB download or API-based URL resolution.
    - **Optimization**: Uses a split-loading state (`metaLoading` vs `pdbLoading`) to show the UI panels before the heavy 3D model is ready.
    - **Caching**: Implements a 24-hour expiration policy for both PDB data and metadata in `localStorage`.
- **`handleGesture(type, data)`**:
    - **Logic**: A bridge function that receives signals from `GestureController` and maps them to imperative commands in the `viewerRef`.
- **`handleBotAction(action)`**:
    - **Logic**: A "Bot-to-Viewer" bridge. Maps AI-generated command tags (e.g., `SHOW_HELICES`) to structural visual changes.
- **`handleCopyLink()`**:
    - **Logic**: Generates a shareable URL containing the current UniProt ID.

### `index.tsx` (Landing/Portal)
- **`handleSearch(e)`**: Validates input and routes the user to the `/explorer` page with the correct query parameters.

---

## 3. 3D Visualization Module (`components/ProteinViewer.tsx`)

This component wraps the **Mol* Library** and provides a high-level imperative API via `useImperativeHandle`.

### Imperative API (External Controls)
- **`rotate(x, y)`**: Uses trigonometric calculations (`cos/sin`) to orbit the camera around the protein target based on normalized coordinates.
- **`pan(x, y)`**: Calculates the camera's "Right" and "Up" vectors to move the structural target in screen-space.
- **`zoom(delta)`**: Implements a smooth, logarithmic-style radius scaling to prevent "vanishing" when zooming in too far.
- **`reset()`**: Recalculates the bounding box of the entire structure and recenters the camera.
- **`setRepresentation(mode)`**: 
    - **Breakdown**: Segments the protein by Chain ID.
    - **Confidence**: Colors the protein using the pLDDT (Blue to Red) scale.
    - **Detailed**: Enters Atomic/Spacefill mode for bond-level inspection.
- **`setConfidenceFilter(hideLow)`**: Uses **MolScript** queries to filter out atoms where `B_factor < 70`.
- **`highlightRegion(type)`**: Focuses the camera on specific secondary structures (Helix/Sheet/Loop) using `lociHighlights`.
- **`pick(x, y)`**: Simulates a pointer event on the underlying canvas to trigger standard Mol* selection logic at specific coordinates.

### Internal Logic
- **`init()`**: Sets up the React 18 plugin UI, configures background colors, and initializes post-processing (SSAO Occlusion, Outline, Bloom).
- **`loadStructure(plugin, data)`**: Parses PDB strings, applies the initial pLDDT theme, and automatically calculates the average confidence statistics.
- **Selection Listener**: Subscribes to `plugin.behaviors.interaction.click` to extract residue labels, detect secondary structure types, and provide visual camera focus on click.

---

## 4. AI & Insights Module (`components/ProteinAnalysisPanel.tsx`)

### AI Core
- **`fetchAnalysis()`**: 
    - **Logic**: Sends a grounded prompt to **Groq**. Constraints include a strict 4-pillar JSON format (Identity, Function, Visuals, Reliability).
    - **Cache v2**: Uses a specialized validation step to ensure outdated AI responses (which might cause blank fields) are invalidated.
- **Selection Inspector**: A debounced `useEffect` that triggers a specific AI analysis of the currently clicked residue/region.
- **`handleSendMessage()`**: A dual-purpose chat handler.
    1. **Dialogue**: General conversational Q&A about the protein.
    2. **Action Triggering**: Detects intent to change vision (e.g., "show sheets") and emits Action Tags.

### Voice Engine
- **`toggleListening()`**: Initializes `webkitSpeechRecognition`.
- **`speak(text)`**: Uses `SpeechSynthesisUtterance` to read AI responses back to the user.
- **Conversational Context**: Pre-pends the currently selected residue's data to the user's voice query for better "Deictic" resolution (e.g., "What is *this*?" becomes "Explain residue Lysine 124...").

---

## 5. Experimental Interaction (`components/GestureController.tsx`)

### Internal Logic
- **`setupMediaPipe()`**: Dynamically loads `hands.js` and `camera_utils.js` from Google CDN to keep the project bundle lightweight.
- **`onResults(results)`**: The primary callback from MediaPipe. 
    1. Translates hand landmarks into visual canvas paths.
    2. Conducts "Multi-hand Zoom" detection (Hand 1 to Hand 2 distance).
    3. Triggers "Selection/Click" when the Thumb Tip and Index Tip distance falls below a dynamic threshold.
- **`isExtended(landmarks, tip, mid)`**:
    - **Logic**: A geometric helper that compares the distance from the wrist to the finger tip vs. the wrist to the knuckle. Returns true if the finger is straight.
- **`toggleCamera()`**: Manages the webcam hardware lifecycle and the MediaPipe `Camera` utility loop.
- **Smoothing Engine**: Uses a weighted average (`smooth * alpha + last * (1-alpha)`) to translate raw pixel deltas into jitter-free 3D camera transitions.

### CV Pipeline
- **`setupMediaPipe()`**: Initializes the `Hands` tracker with `LANDMARK_OPTIMIZED` settings.
- **`processFrame()`**: The main animation loop. Reads the webcam canvas, runs inference, and extracts handedness and landmarks.

### Gesture Detection Logic
- **`detectGestures(landmarks)`**:
    - **Rotate**: Triggered when exactly one finger (Index) is extended. Returns normalized movement deltas.
    - **Zoom**: Detected via the "Pinch" distance (Thumb Tip to Index Tip).
    - **Pan**: Triggered when Two fingers (Index + Middle) are extended.
    - **Reset**: Detected when a full "Open Palm" (all fingers extended) is held for >500ms.

---

## 6. Utilities & Guidance

### `components/OnboardingTour.tsx`
- **`steps[]`**: A configuration-driven array containing the 4 key educational phases.
- **`localStorage('av_tour_seen')`**: Ensures the tour only appears for new users.

### `components/ConfidenceInsights.tsx`
- **`sections[]`**: A declarative array mapping pLDDT ranges (90+, 70-90, <70) to colors and descriptions.
- **Logic**: Formats the `avg` score to fixed precision and applies conditional styling (Emerald for Reliable, Amber for Flexible).

---

## 7. Data Flow Map
1. **User Input** -> UniProt Search API.
2. **UniProt ID** -> AlphaFold Database (PDB download).
3. **PDB Data** -> Mol* Rendering Engine.
4. **Residue Indices** -> Groq AI Analysis (Contextual grounding).
5. **Camera Delta** <- Gesture Controller (MediaPipe vision).

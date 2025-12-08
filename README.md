# Wireframe AI: Text-to-CAD Jewelry Engine

Wireframe is an enterprise-grade, AI-powered CAD tool that turns natural language descriptions into manufacturable 3D jewelry models. It bridges the gap between generative AI and parametric engineering, allowing studios to scale design workflows without sacrificing precision.

## What Currently Works

The system is fully operational with a scalable 3-tier architecture.

### **1. Core User Experience**

  - **AI Design Chat:** Users can type natural language prompts (e.g., *"Platinum solitaire ring with a 1.5ct oval diamond"*).
  - **Real-time 3D Preview:** Generated models are rendered instantly in an interactive 3D viewer within the chat interface.
  - **File Attachments:** Users can attach reference images or existing mesh files to their prompts.
  - **Production Export:** One-click download for binary **STL** files ready for 3D printing.
  - **Interactive Studio:** A dedicated workspace mode to inspect geometry and tweak visualization settings (Wireframe/Render modes).

### **2. Backend & Infrastructure**

  - **Scalable Orchestration:** Requests are managed via **Google Cloud Tasks**, ensuring the system never crashes under heavy load (supports thousands of concurrent jobs).
  - **AI Parameter Extraction:** Uses **Google Gemini 1.5 Flash** to intelligently parse text into precise engineering parameters (Ring Size, Band Width, Prong Count).
  - **Parametric Geometry Engine:** A dedicated Node.js worker generates watertight, valid 3D meshes using Constructive Solid Geometry (CSG) algorithms.
  - **Hybrid Database:**
      - **Hot Storage (Firestore):** Real-time job tracking and chat history.
      - **Cold Storage (PostgreSQL):** Long-term archival of completed CAD models using **Firebase Data Connect**.

### **3. Authentication & Security**

  - **Full Auth System:** Sign up/Sign in via Email or Google.
  - **Secure History:** Users can only access their own designs.
  - **Session Management:** Sidebar history with "Sign Out" functionality.
  - **Data Cleanup:** Secure "Delete Chat" feature that scrubs both frontend logs and backend database records.

-----

## Key Features

### **Generative Design Engine**

  * **Semantic Understanding:** The AI understands jewelry-specific terminology (e.g., "Gallery Rail", "Pavé", "Bezel").
  * **Smart Defaults:** Automatically infers missing dimensions based on industry standards (e.g., standard band thickness for gold vs. platinum).
  * **Validation:** Ensures generated parameters are within manufacturable limits before attempting to build geometry.

### **Professional UI/UX**

  * **Mac-OS Style Dock:** A floating navigation dock with magnification effects.
  * **Ambient Aesthetics:** Dark-mode interface with pulsating, non-distracting background effects.
  * **Fluid Animations:** Powered by Framer Motion for smooth transitions between chat, loading states, and 3D views.

-----

## Architecture

The project follows a **3-Tier Asynchronous Architecture** designed for high availability.

### **1. Frontend (The Client)**

  * **Tech:** React, Vite, Tailwind CSS, Three.js.
  * **Role:** Handles user intent. It never generates geometry locally; it only listens for updates via Firestore snapshots, keeping the client lightweight.

### **2. Orchestrator (The Manager)**

  * **Tech:** Firebase Cloud Functions (Gen 2).
  * **Role:** Validates requests and dispatches them to a **Cloud Task Queue**. It isolates the heavy lifting from the API layer, preventing timeouts.

### **3. The Engine (The Worker)**

  * **Tech:** Node.js container on Google Cloud Run.
  * **Role:**
    1.  **Thinking:** Calls Gemini AI to interpret the prompt.
    2.  **Building:** Executes parametric code (JSCAD) to build binary geometry.
    3.  **Saving:** Uploads assets to Cloud Storage and syncs metadata to PostgreSQL.

-----

## Tech Stack

| Component | Technology |
| :--- | :--- |
| **Frontend** | React 19, TypeScript, Vite, Framer Motion |
| **Styling** | Tailwind CSS v4, Lucide Icons |
| **3D Rendering** | Three.js, React Three Fiber, OGL |
| **Backend Logic** | Firebase Cloud Functions (Node.js) |
| **Queue System** | Google Cloud Tasks |
| **Compute** | Google Cloud Run (Dockerized Worker) |
| **Database** | Firestore (NoSQL) + PostgreSQL (SQL via Data Connect) |
| **AI Model** | Google Gemini 1.5 Flash |
| **CAD Kernel** | OpenJSCAD (Constructive Solid Geometry) |

-----

## Deployment

The project includes a unified `deploy.sh` script that handles the entire DevOps pipeline:

1.  Builds and deploys the **CAD Worker** container to Cloud Run.
2.  Captures the new Service URL automatically.
3.  Updates Cloud Function environment variables.
4.  Deploys Security Rules, Database Schemas, and Backend Functions in the correct order.


```bash
./deploy.sh
```
# Implementation Methodology

## TSX Web Application Generation Pipeline

Our system implements an automated pipeline for generating interactive educational web applications from domain-specific topics. The workflow begins with topic selection, where a subject matter expert identifies a learning domain (e.g., "Dynamic Programming" or "Virtual Memory Management"). This topic is passed to a large language model (LLM) to generate a structured prompt specification defining pedagogical objectives, visualization requirements, module structure (landing page plus 5-6 interactive modules), and implementation constraints.

The prompt is then processed by our code generation pipeline, which scaffolds a Vite-based React + TypeScript project structure and submits the prompt to Google's Gemini 2.0 Flash model (temperature=0.2, max_output_tokens=8192) to generate a monolithic `src/App.tsx` file containing the complete application. Each generated application follows a consistent architecture: a landing page with animated hero visualization, followed by a dashboard with sidebar navigation, main content area, and inspector panel, implementing all specified modules with interactive visualizations and educational challenges.

The generated applications are self-contained Vite projects that are built into static assets using batch automation. A portal generation script scans the output directory and creates a unified `index.html` portal page with search functionality and direct links to all applications, serving as a centralized entry point for accessing the generated visualizations.


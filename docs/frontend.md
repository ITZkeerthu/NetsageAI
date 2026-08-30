# NetSage Frontend Documentation

## Overview
The frontend is built using Next.js (App Router), React, and Tailwind CSS. It serves as the primary interface for students to input their networking symptoms, topology details, and CLI command outputs.

## Project Structure
- `app/`: Next.js App Router pages and layouts.
- `components/`: Reusable React components (Evidence collection, Diagnosis display, Chat UI).
- `lib/`: Utility functions, API clients, and constants.
- `hooks/`: Custom React hooks for state management (TanStack Query).

## Key Workflows
1. **Case Creation**: User provides a symptom and network topology.
2. **Evidence Collection**: User pastes `show` command outputs for specific devices.
3. **Diagnosis Viewer**: Displays the AI-generated root cause, confidence, and OSI layer, with clickable references to the submitted evidence.
4. **Human Review**: UI for reviewing and accepting/editing/rejecting the AI's diagnosis.

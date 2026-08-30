# NetSage Backend Documentation

## Overview
The backend is built using FastAPI (Python). It acts as the core orchestrator connecting the frontend to the intelligent components (Rule Engine, RAG Pipeline, and LLM).

## Project Structure
- `main.py`: Entry point for the FastAPI server and route definitions.
- `database.py`: Database connection management and SQLAlchemy configuration.
- `models.py`: SQLAlchemy ORM models (Users, Cases, Evidence, Diagnoses).
- `llm_service.py`: Service to interact with the NVIDIA API (`moonshotai/kimi-k3`) for LLM reasoning.
- `parsers/`: (To be implemented) Regex and TextFSM parsers for converting raw CLI output to structured data.
- `rules/`: (To be implemented) Deterministic Python rules to evaluate parsed evidence.

## Core Services
1. **Case Management**: API to manage troubleshooting sessions.
2. **Evidence Parsing**: Normalizes raw CLI outputs.
3. **Rule Evaluation**: Applies deterministic networking rules against the parsed evidence.
4. **Diagnosis Generation**: Fuses rule findings, user context, and RAG knowledge into a prompt for the NVIDIA LLM.

# NetSage AI 🌐🤖

NetSage AI is an intelligent, agentic network troubleshooting platform designed to assist network engineers and students in diagnosing and resolving complex networking issues (such as those encountered in Cisco Packet Tracer or real-world routing/switching environments). 

It leverages a robust **FastAPI** backend, a **Next.js** frontend, and the powerful **NVIDIA Nemotron LLM** to provide deep, context-aware diagnostics and progressive chat-based troubleshooting.

---

## 🏗️ System Architecture

### Backend (`/backend`)
The backend is a high-performance REST API built with **FastAPI**.
- **Database**: SQLite with **SQLAlchemy** ORM (`models.py`, `database.py`).
- **Endpoints**: 
  - `POST /api/v1/cases` - Creates a new troubleshooting case (moves existing ones to `on-hold`).
  - `POST /api/v1/diagnose` - Ingests network symptoms and raw CLI output (evidence), forwarding them to the LLM.
  - `POST /api/v1/cases/{case_id}/chat` - Handles progressive troubleshooting.
- **LLM Engine**: Integrates with the **NVIDIA Nemotron-3.5-Lightning** model via `llm_service.py` to deduce the root cause, pinpoint the OSI layer, and suggest exact CLI fixes.

### Frontend (`/frontend-next`)
The frontend is a modern web application built with **Next.js 15 (App Router)**.
- **Styling**: **Tailwind CSS v4** for a sleek, dark-mode terminal-inspired UI.
- **Markdown Parsing**: Utilizes `react-markdown` and `@tailwindcss/typography` to beautifully render LLM responses, code snippets, and troubleshooting steps.
- **Features**: Dashboard to view cases, form to create new cases with evidence, and a real-time Chat Interface for progressive help.

---

## 🚀 Key Features

1. **Automated Root Cause Analysis**: Paste a symptom (e.g., *"OSPF stuck in INIT"*) and raw CLI evidence (e.g., `show ip ospf neighbor`). NetSage AI will instantly diagnose the problem and provide the exact commands to fix it.
2. **Progressive Chat Troubleshooting**: If the initial fix doesn't work, you can chat with the AI. The AI remembers the entire context of the case and guides you step-by-step.
3. **Smart Status Management**: 
   - New cases are marked as `ongoing`.
   - Creating a new case automatically puts older ongoing cases `on-hold`.
   - Once the user confirms the issue is fixed in the chat (e.g., typing *"it is resolved"*), the system automatically updates the case to `resolved` and gracefully ends the diagnostic session.

---

## 🛠️ Installation & Setup

### Prerequisites
- Python 3.10+
- Node.js 18+
- An NVIDIA API Key

### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```
*Note: Ensure your `NVIDIA_API_KEY` is correctly set in `llm_service.py`.*

Run the FastAPI server:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### 2. Frontend Setup
```bash
cd frontend-next
npm install
```

Run the Next.js development server:
```bash
npm run dev
```

The application will be available at [http://localhost:3000](http://localhost:3000).

---

## 📂 Project Structure

```text
NetsageAI/
│
├── backend/
│   ├── main.py             # FastAPI entry point & API routes
│   ├── models.py           # SQLAlchemy Database Models (Case, Diagnosis, CaseMessage)
│   ├── database.py         # SQLite connection setup
│   └── llm_service.py      # NVIDIA API integrations and prompt engineering
│
├── frontend-next/
│   ├── src/app/
│   │   ├── page.tsx        # Dashboard (View all cases)
│   │   ├── cases/new/      # Form to submit a new network issue
│   │   └── cases/[id]/     # Case details & Progressive Chat UI
│   ├── src/lib/api.ts      # Fetch wrappers for the FastAPI backend
│   └── tailwind/postcss    # Tailwind v4 configuration
│
└── README.md
```

---

## 💡 Usage Example

1. Navigate to **New Case**.
2. **Symptom**: *PC1 cannot ping the default gateway.*
3. **Evidence**: Paste the output of `show ip interface brief`.
4. Click **Diagnose**. NetSage AI will analyze the output, notice the interface is `administratively down`, and suggest running `no shutdown`.
5. If you still have issues, use the **Progressive Troubleshooting Chat** at the bottom of the case page to ask follow-up questions!

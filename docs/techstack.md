# NetSage Technology Stack

## Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui
- **State/Fetching**: TanStack Query (React Query)
- **Package Manager**: npm

## Backend
- **Framework**: FastAPI
- **Language**: Python 3.12+
- **Server**: Uvicorn
- **ORM**: SQLAlchemy
- **Database**: PostgreSQL (currently using SQLite for local MVP)
- **Background Tasks**: Celery + Redis (Planned for document scraping and async heavy processing)

## Artificial Intelligence & Data Pipeline
- **LLM API**: NVIDIA API (`moonshotai/kimi-k3` model) for advanced networking reasoning
- **Vector Database**: Qdrant (for RAG context and embedding storage)
- **Scraping / Crawling**: DuckDuckGo API integration combined with BeautifulSoup/Trafilatura for ingesting Cisco documentation on the fly.
- **Data Parsing**: Python regex & TextFSM for parsing Cisco `show` command outputs.

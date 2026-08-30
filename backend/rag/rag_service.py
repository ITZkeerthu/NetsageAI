from rag.crawler import search_cisco_docs, scrape_url
from rag.vector_db import ingest_document, search_knowledge, init_db
import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from llm_service import generate_search_queries

def get_context_for_query(symptom: str, auto_ingest: bool = True) -> str:
    """
    Primary function to get context for the LLM. 
    1. Search local vector DB with the raw symptom.
    2. If results are poor, invoke the LLM Search Agent to generate optimized keywords.
    3. Crawl DuckDuckGo with those keywords, ingest, and search again.
    """
    init_db()
    
    # 1. Search local vector database
    results = search_knowledge(symptom, limit=3)
    
    if not results and auto_ingest:
        print(f"No local knowledge found. Invoking Web Scraper Agent...")
        
        # 2. Agent Layer: Ask LLM for the best search queries
        queries = generate_search_queries(symptom)
        print(f"Agent generated queries: {queries}")
        
        # 3. Crawl DuckDuckGo with the optimized queries
        for q in queries:
            print(f"Executing search for: '{q}'")
            # Determine if it's a Packet Tracer query to target the learning network
            target_pt = "packet tracer" in q.lower() or "packet tracer" in symptom.lower()
            
            web_results = search_cisco_docs(q, max_results=2, target_packet_tracer=target_pt)
            
            for wr in web_results:
                print(f"Scraping: {wr['title']}")
                content = scrape_url(wr['url'])
                if content:
                    ingest_document(wr['url'], wr['title'], content)
                
        # Search again after ingestion
        results = search_knowledge(symptom, limit=3)

    if not results:
        return "No relevant networking documentation found."
        
    context_str = "Retrieved Networking Knowledge:\n\n"
    for r in results:
        context_str += f"Source: {r['title']} ({r['url']})\n"
        context_str += f"Content: {r['content']}\n\n"
        
    return context_str

if __name__ == "__main__":
    print("Testing Web Scraper Agent Pipeline...")
    context = get_context_for_query("OSPF neighbor stuck in EXSTART in Packet Tracer")
    print(context)


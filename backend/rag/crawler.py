import trafilatura
from duckduckgo_search import DDGS
import time

def search_cisco_docs(query: str, max_results: int = 3, target_packet_tracer: bool = False):
    """
    Search DuckDuckGo specifically targeting Cisco documentation or forums.
    """
    if target_packet_tracer:
        # Search the learning network forums where PT bugs are discussed
        search_query = f"{query} \"Packet Tracer\" site:learningnetwork.cisco.com"
    else:
        # Search official Cisco docs
        search_query = f"{query} site:cisco.com"
        
    results = []
    
    with DDGS() as ddgs:
        search_results = ddgs.text(search_query, max_results=max_results)
        for r in search_results:
            results.append({
                "title": r.get("title"),
                "url": r.get("href"),
                "snippet": r.get("body")
            })
    return results

def scrape_url(url: str) -> str:
    """
    Downloads and extracts the main text content of a webpage.
    """
    try:
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            text = trafilatura.extract(downloaded, include_links=False, include_images=False, include_formatting=True)
            return text
        return ""
    except Exception as e:
        print(f"Error scraping {url}: {e}")
        return ""

if __name__ == "__main__":
    print("Testing DDG Search...")
    results = search_cisco_docs("show interfaces trunk", max_results=1)
    if results:
        print(f"Found: {results[0]['title']} ({results[0]['url']})")
        print("Scraping content...")
        content = scrape_url(results[0]['url'])
        print(f"Content extracted: {len(content)} characters.")
        print(content[:500])

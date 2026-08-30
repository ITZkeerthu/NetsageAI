from crawler import search_cisco_docs, scrape_url

print("Testing DuckDuckGo search for Packet Tracer...")
results = search_cisco_docs("Packet Tracer OSPF neighbor stuck in EXSTART", max_results=1)

if results:
    print(f"\nFound Article: {results[0]['title']}")
    print(f"URL: {results[0]['url']}\n")
    
    print("Scraping content...")
    content = scrape_url(results[0]['url'])
    print(f"Extracted {len(content)} characters of clean text.\n")
    print("Snippet:")
    print(content[:500] + "...")
else:
    print("No results found.")

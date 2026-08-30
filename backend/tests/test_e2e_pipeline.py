import requests
import json
import time
from concurrent.futures import ThreadPoolExecutor

BASE_URL = "http://localhost:8000/api/v1"

# 10 realistic troubleshooting scenarios
CASES = [
    {
        "symptom": "PC1 cannot ping the default gateway.",
        "evidence": '''
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     192.168.10.1    YES NVRAM  administratively down down
GigabitEthernet0/1     unassigned      YES NVRAM  administratively down down
'''
    },
    {
        "symptom": "OSPF neighbor is stuck in INIT state.",
        "evidence": "Neighbor 10.0.0.2 is stuck in INIT state. No hello packets received."
    },
    {
        "symptom": "VLAN 20 hosts cannot communicate with VLAN 30 hosts.",
        "evidence": '''
VLAN Name                             Status    Ports
---- -------------------------------- --------- -------------------------------
1    default                          active    Gi0/1, Gi0/2
20   HR                               active    
30   Engineering                      active    
'''
    },
    {
        "symptom": "BGP session keeps flapping.",
        "evidence": "BGP state = Active. Hold time expired. No route to peer."
    },
    {
        "symptom": "Cannot reach the internet from the local LAN.",
        "evidence": '''
C       192.168.1.0/24 is directly connected, GigabitEthernet0/0
L       192.168.1.1/32 is directly connected, GigabitEthernet0/0
'''
    },
    {
        "symptom": "Spanning Tree Protocol blocked port issue.",
        "evidence": "Interface Gi0/1 is in BLK state. Root bridge is 00:11:22:33:44:55."
    },
    {
        "symptom": "DHCP clients are not getting IP addresses.",
        "evidence": "IP helper-address is not configured on the gateway interface."
    },
    {
        "symptom": "Packet Tracer OSPF route not showing in routing table.",
        "evidence": "OSPF process 1 running, but show ip route ospf is empty."
    },
    {
        "symptom": "Inter-VLAN routing is failing on Router on a Stick.",
        "evidence": "Encapsulation dot1Q is missing on sub-interfaces."
    },
    {
        "symptom": "Port security err-disabled a switchport.",
        "evidence": "Port Gi0/1 status is err-disabled. Violation count: 1."
    }
]

def process_case(case_data):
    print(f"[*] Processing Case: {case_data['symptom']}")
    try:
        # Step 1: Create Case
        create_res = requests.post(f"{BASE_URL}/cases", json={
            "title": case_data["symptom"][:30] + "...",
            "symptom": case_data["symptom"]
        }, timeout=10)
        
        if create_res.status_code != 200:
            print(f"[!] Failed to create case: {create_res.text}")
            return
            
        case_id = create_res.json()["case_id"]
        print(f"[+] Created Case ID: {case_id}")
        
        # Step 2: Request Diagnosis (E2E Pipeline)
        start_time = time.time()
        diag_res = requests.post(f"{BASE_URL}/diagnose?case_id={case_id}", json={
            "symptom": case_data["symptom"],
            "evidence": case_data["evidence"]
        }, timeout=120)  # Nemotron can take a while
        
        elapsed = time.time() - start_time
        
        if diag_res.status_code != 200:
            print(f"[!] Failed diagnosis for {case_id}: {diag_res.text}")
            return
            
        diagnosis = diag_res.json()["diagnosis"]
        print(f"[SUCCESS] {case_id} diagnosed in {elapsed:.1f}s | Cause: {diagnosis.get('root_cause', 'Unknown')[:60]}...")
        
    except Exception as e:
        print(f"[ERROR] Exception processing {case_data['symptom'][:20]}: {e}")

if __name__ == "__main__":
    print(f"Starting E2E pipeline test with {len(CASES)} cases...")
    
    # Run sequentially so we don't hit LLM rate limits for this test
    for case in CASES:
        process_case(case)
        print("-" * 40)
        time.sleep(2) # brief pause between cases
        
    print("Test complete. Check the Next.js Dashboard to view all 10 cases!")

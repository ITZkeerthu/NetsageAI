from typing import List, Dict, Any

class Rule:
    def __init__(self, id: str, name: str, category: str):
        self.id = id
        self.name = name
        self.category = category

    def evaluate(self, case_context: Dict[str, Any], structured_evidence: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Evaluate the rule against the evidence. 
        Returns a dict if rule triggers, else None.
        """
        raise NotImplementedError

class InterfaceDownRule(Rule):
    def __init__(self):
        super().__init__(
            id="NET-002",
            name="Interface Administratively Down",
            category="Layer 1"
        )
        
    def evaluate(self, case_context: Dict[str, Any], structured_evidence: List[Dict[str, Any]]) -> Dict[str, Any]:
        findings = []
        for evidence in structured_evidence:
            if evidence.get("command") == "show ip interface brief":
                for interface in evidence.get("data", []):
                    if interface.get("STATUS") == "administratively down":
                        findings.append(f"Interface {interface.get('INTERFACE')} is administratively down.")
        
        if findings:
            return {
                "rule_id": self.id,
                "finding": " ".join(findings),
                "confidence": 1.0
            }
        return None

class GatewayOutsideSubnetRule(Rule):
    def __init__(self):
        super().__init__(
            id="NET-001",
            name="Gateway Outside Subnet",
            category="Layer 3"
        )
        
    def evaluate(self, case_context: Dict[str, Any], structured_evidence: List[Dict[str, Any]]) -> Dict[str, Any]:
        # Implementation for subnet math using ipaddress module
        import ipaddress
        topology = case_context.get("topology", {}).get("nodes", [])
        findings = []
        
        for node in topology:
            if node.get("type") == "pc" and node.get("ip") and node.get("mask") and node.get("gateway"):
                try:
                    network = ipaddress.IPv4Network(f"{node['ip']}/{node['mask']}", strict=False)
                    gateway = ipaddress.IPv4Address(node['gateway'])
                    if gateway not in network:
                        findings.append(f"Gateway {gateway} is outside the subnet of PC {node.get('hostname', node['ip'])} ({network}).")
                except ValueError:
                    continue
                    
        if findings:
            return {
                "rule_id": self.id,
                "finding": " ".join(findings),
                "confidence": 1.0
            }
        return None

class RuleEngine:
    def __init__(self):
        self.rules = [
            InterfaceDownRule(),
            GatewayOutsideSubnetRule()
        ]

    def evaluate_all(self, case_context: Dict[str, Any], structured_evidence: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        results = []
        for rule in self.rules:
            result = rule.evaluate(case_context, structured_evidence)
            if result:
                results.append(result)
        return results

if __name__ == "__main__":
    engine = RuleEngine()
    case_ctx = {
        "topology": {
            "nodes": [
                {"type": "pc", "hostname": "PC1", "ip": "192.168.10.50", "mask": "255.255.255.0", "gateway": "192.168.20.1"}
            ]
        }
    }
    evidence = [
        {
            "command": "show ip interface brief",
            "data": [
                {"INTERFACE": "GigabitEthernet0/1", "STATUS": "administratively down"}
            ]
        }
    ]
    
    findings = engine.evaluate_all(case_ctx, evidence)
    print("Rule Findings:")
    for f in findings:
        print(f)

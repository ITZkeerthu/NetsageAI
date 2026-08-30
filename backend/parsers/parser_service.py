import textfsm
import os
from typing import List, Dict, Any

TEMPLATES_DIR = os.path.join(os.path.dirname(__file__), "templates")

def parse_command(command: str, raw_output: str) -> List[Dict[str, Any]]:
    """
    Parses Cisco CLI command output into structured data using TextFSM templates.
    """
    # Normalize command name to match template files
    cmd_normalized = command.lower().strip().replace(" ", "_")
    template_filename = f"cisco_ios_{cmd_normalized}.textfsm"
    template_path = os.path.join(TEMPLATES_DIR, template_filename)

    if not os.path.exists(template_path):
        return {"error": f"No parser template found for command: {command}"}

    try:
        with open(template_path, "r") as template_file:
            fsm = textfsm.TextFSM(template_file)
            result = fsm.ParseText(raw_output)
            
            # Map the parsed list of lists back into a list of dictionaries using the header
            structured_data = [dict(zip(fsm.header, row)) for row in result]
            return structured_data
    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    # Test parser
    sample_output = '''
Interface              IP-Address      OK? Method Status                Protocol
GigabitEthernet0/0     192.168.10.1    YES NVRAM  up                    up      
GigabitEthernet0/1     unassigned      YES NVRAM  administratively down down    
'''
    print(parse_command("show ip interface brief", sample_output))

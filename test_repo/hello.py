import sys
import json
import subprocess

# Run bonzai-tree and capture output
result = subprocess.run(
    ["npx", "bonzai-tree@dev", "-b"],
    capture_output=True,
    text=True
)

# Parse issues from output (non-empty lines)
issues = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]

print(f"issues: {result}")

if issues:
    response = {
        "continue": False,  # Block stopping
        "stopReason": "⚠️ BONZAI BURN FOUND ISSUES:\n" + "\n".join(f"• {i}" for i in issues)
    }
    print(json.dumps(response))
    
    sys.exit(2)  # Block the stop
else:
    print(f"result: {result.stdout}")
    subprocess.run(["say", "task complete"])
    sys.exit(0)  # Allow stop
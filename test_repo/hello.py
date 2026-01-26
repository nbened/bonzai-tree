import sys
import json
import subprocess

# Run bonzai-burn and capture output
result = subprocess.run(
    ["npx", "bonzai-burn", "-b"],
    capture_output=True,
    text=True
)

# Parse issues from output (non-empty lines)
issues = [line.strip() for line in result.stdout.strip().split('\n') if line.strip()]

if issues:
    response = {
        "continue": False,  # Block stopping
        "stopReason": "⚠️ BONZAI BURN FOUND ISSUES:\n" + "\n".join(f"• {i}" for i in issues)
    }
    print(json.dumps(response))
    sys.exit(2)  # Block the stop
else:
    sys.exit(0)  # Allow stop
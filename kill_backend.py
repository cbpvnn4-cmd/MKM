import subprocess
import sys

pid = 26736
try:
    # Kill the process
    subprocess.run(['taskkill', '/F', '/PID', str(pid)], check=True, capture_output=True)
    print(f"Successfully killed process {pid}")
except subprocess.CalledProcessError as e:
    print(f"Error killing process: {e}")
    sys.exit(1)

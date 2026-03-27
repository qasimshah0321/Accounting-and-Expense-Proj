import paramiko
import os

host = '176.9.63.151'
port = 22
user = 'candydada'
password = 'Blista1214@@'

LOCAL_DIST = r'D:\E Drive\Code Generation\projects\Accounting and Expense Proj\backend\dist'
REMOTE_BASE = '/home/candydada/public_html/zeropoint/dist'

print("Connecting to server...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=20)
sftp = client.open_sftp()

uploaded = 0
errors = 0

for root, dirs, files in os.walk(LOCAL_DIST):
    rel_root = os.path.relpath(root, LOCAL_DIST).replace('\\', '/')
    if rel_root == '.':
        remote_dir = REMOTE_BASE
    else:
        remote_dir = REMOTE_BASE + '/' + rel_root

    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        try:
            sftp.mkdir(remote_dir)
            print(f"  mkdir {remote_dir}")
        except Exception as e:
            print(f"  ERROR mkdir {remote_dir}: {e}")

    for fname in files:
        local_path = os.path.join(root, fname)
        remote_path = remote_dir + '/' + fname
        try:
            sftp.put(local_path, remote_path)
            uploaded += 1
            if fname.endswith('.sql') or fname == 'server.js' or fname == 'app.js':
                print(f"  uploaded: {rel_root}/{fname}")
        except Exception as e:
            print(f"  ERROR {fname}: {e}")
            errors += 1

print(f"\nUploaded {uploaded} files, {errors} errors")

# Restart the Node.js app
print("\nRestarting Node.js app...")
stdin, stdout, stderr = client.exec_command('touch /home/candydada/public_html/zeropoint/tmp/restart.txt')
stdout.channel.recv_exit_status()
print("  restart.txt touched (Passenger restart)")

stdin, stdout, stderr = client.exec_command('pkill -f "node dist/server" 2>/dev/null; sleep 1; echo killed')
out = stdout.read().decode().strip()
print(f"  process kill: {out}")

# Wait and check if server comes back
import time
time.sleep(5)
stdin, stdout, stderr = client.exec_command('tail -5 /home/candydada/public_html/zeropoint/server.log 2>/dev/null')
log = stdout.read().decode().strip()
print(f"\nServer log after restart:\n{log}")

sftp.close()
client.close()
print("\nDeploy complete!")

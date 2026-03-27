import paramiko
import os

host = '176.9.63.151'
port = 22
user = 'candydada'
password = 'Blista1214@@'

LOCAL_OUT = r'D:\E Drive\Code Generation\projects\Accounting and Expense Proj\nextjs-accounting-app\out'
REMOTE_BASE = '/home/candydada/public_html'

print("Connecting to server...")
client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=20)
sftp = client.open_sftp()

def ensure_remote_dir(path):
    try:
        sftp.stat(path)
    except FileNotFoundError:
        # Create parent first
        parent = '/'.join(path.split('/')[:-1])
        if parent and parent != path:
            ensure_remote_dir(parent)
        try:
            sftp.mkdir(path)
        except Exception as e:
            pass  # Might already exist

uploaded = 0
errors = 0

for root, dirs, files in os.walk(LOCAL_OUT):
    rel_root = os.path.relpath(root, LOCAL_OUT).replace('\\', '/')
    if rel_root == '.':
        remote_dir = REMOTE_BASE
    else:
        remote_dir = REMOTE_BASE + '/' + rel_root

    ensure_remote_dir(remote_dir)

    for fname in files:
        local_path = os.path.join(root, fname)
        remote_path = remote_dir + '/' + fname
        try:
            sftp.put(local_path, remote_path)
            uploaded += 1
            if not fname.endswith('.js') or 'chunk' not in fname:
                print(f"  uploaded: {rel_root}/{fname}")
        except Exception as e:
            print(f"  ERROR {fname}: {e}")
            errors += 1

print(f"\nUploaded {uploaded} files, {errors} errors")
sftp.close()
client.close()
print("Frontend deploy complete!")

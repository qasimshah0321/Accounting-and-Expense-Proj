import paramiko
import os

host = '176.9.63.151'
user = 'candydada'
password = 'Blista1214@@'

LOCAL_DIST = r'D:\E Drive\Code Generation\projects\Accounting and Expense Proj\backend\dist'
REMOTE_BASE = '/home/candydada/public_html/zeropoint/dist'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, 22, username=user, password=password, timeout=20)
sftp = client.open_sftp()

uploaded = 0
errors = 0

for root, dirs, files in os.walk(LOCAL_DIST):
    rel = os.path.relpath(root, LOCAL_DIST).replace('\\', '/')
    remote_dir = REMOTE_BASE if rel == '.' else REMOTE_BASE + '/' + rel

    try:
        sftp.stat(remote_dir)
    except FileNotFoundError:
        try:
            sftp.mkdir(remote_dir)
        except Exception:
            pass

    for fname in files:
        local_path = os.path.join(root, fname)
        remote_path = remote_dir + '/' + fname
        try:
            sftp.put(local_path, remote_path)
            uploaded += 1
        except Exception as e:
            print(f'ERROR {fname}: {e}')
            errors += 1

print(f'Uploaded {uploaded} files, {errors} errors')
sftp.close()

stdin, stdout, stderr = client.exec_command(
    'touch /home/candydada/public_html/zeropoint/tmp/restart.txt; '
    'pkill -f "node dist/server" 2>/dev/null; echo restarted'
)
stdout.channel.recv_exit_status()
print('Server restarted')
client.close()
print('Done')

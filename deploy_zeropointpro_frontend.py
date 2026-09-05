from ftplib import FTP
import os

HOST = 'srv.apiwachat.com'
USER = 'zeropointpro'
PASSWORD = 'j].SDNsAnLFl2Tft'

LOCAL_OUT = r'D:\E Drive\Code Generation\projects\Accounting and Expense Proj\nextjs-accounting-app\out'
REMOTE_BASE = 'public_html'

print('Connecting to', HOST)
ftp = FTP()
ftp.connect(HOST, 21, timeout=30)
ftp.login(USER, PASSWORD)

existing_dirs = set()

def ensure_remote_dir(path):
    if path in existing_dirs or path in ('', '.'):
        return
    parent = '/'.join(path.split('/')[:-1])
    if parent:
        ensure_remote_dir(parent)
    try:
        ftp.mkd(path)
    except Exception:
        pass
    existing_dirs.add(path)

uploaded = 0
errors = 0

for root, dirs, files in os.walk(LOCAL_OUT):
    rel = os.path.relpath(root, LOCAL_OUT).replace('\\', '/')
    remote_dir = REMOTE_BASE if rel == '.' else f'{REMOTE_BASE}/{rel}'
    ensure_remote_dir(remote_dir)

    for fname in files:
        local_path = os.path.join(root, fname)
        remote_path = f'{remote_dir}/{fname}'
        try:
            with open(local_path, 'rb') as f:
                ftp.storbinary(f'STOR {remote_path}', f)
            uploaded += 1
        except Exception as e:
            print(f'  ERROR {remote_path}: {e}')
            errors += 1

print(f'\nUploaded {uploaded} files, {errors} errors')
ftp.quit()
print('Frontend deploy complete! (static export, no restart needed)')

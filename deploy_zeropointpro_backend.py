from ftplib import FTP
from io import BytesIO
import os

HOST = 'srv.apiwachat.com'
USER = 'zeropointpro'
PASSWORD = 'j].SDNsAnLFl2Tft'

LOCAL_DIST = r'D:\E Drive\Code Generation\projects\Accounting and Expense Proj\backend\dist'
LOCAL_PKG = r'D:\E Drive\Code Generation\projects\Accounting and Expense Proj\backend\package.json'
LOCAL_PKG_LOCK = r'D:\E Drive\Code Generation\projects\Accounting and Expense Proj\backend\package-lock.json'
LOCAL_ENV = r'D:\E Drive\Code Generation\projects\Accounting and Expense Proj\backend\.env.production'
REMOTE_BASE = 'Backend'

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

for root, dirs, files in os.walk(LOCAL_DIST):
    rel = os.path.relpath(root, LOCAL_DIST).replace('\\', '/')
    remote_dir = f'{REMOTE_BASE}/dist' if rel == '.' else f'{REMOTE_BASE}/dist/{rel}'
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

# cPanel's "Backend" app is configured with startup file "app.js" (not dist/server.js).
# Rather than requiring a cPanel UI change, make app.js itself boot the real compiled server.
try:
    ftp.storbinary(f'STOR {REMOTE_BASE}/app.js', BytesIO(b"require('./dist/server.js');\n"))
    print(f'  uploaded: {REMOTE_BASE}/app.js (shim -> dist/server.js)')
    uploaded += 1
except Exception as e:
    print(f'  ERROR app.js shim: {e}')
    errors += 1

for local_path, remote_name in [
    (LOCAL_PKG, 'package.json'),
    (LOCAL_PKG_LOCK, 'package-lock.json'),
    (LOCAL_ENV, '.env'),
]:
    if not os.path.exists(local_path):
        print(f'  SKIP (not found): {local_path}')
        continue
    remote_path = f'{REMOTE_BASE}/{remote_name}'
    try:
        with open(local_path, 'rb') as f:
            ftp.storbinary(f'STOR {remote_path}', f)
        uploaded += 1
        print(f'  uploaded: {remote_path}')
    except Exception as e:
        print(f'  ERROR {remote_path}: {e}')
        errors += 1

print(f'\nUploaded {uploaded} files, {errors} errors')

# Trigger a Passenger restart (no shell access on this account, so this is
# the only remote-restart mechanism available: Passenger watches this file's mtime)
try:
    ftp.storbinary(f'STOR {REMOTE_BASE}/tmp/restart.txt', BytesIO(b''))
    print('Touched Backend/tmp/restart.txt (Passenger restart triggered)')
except Exception as e:
    print(f'  Could not touch restart.txt: {e}')

ftp.quit()
print('\nBackend deploy complete!')
print('NOTE: if package.json changed (new/updated dependencies), you must also click')
print('"Run NPM Install" for the Backend app in cPanel > Setup Node.js App before it will start correctly.')

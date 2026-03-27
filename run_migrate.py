import paramiko, time

host = '176.9.63.151'
port = 22
user = 'candydada'
password = 'Blista1214@@'

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=15)

# Find node binary
stdin, stdout, stderr = client.exec_command('find /home/candydada/nodevenv -name "node" 2>/dev/null | head -3')
node_paths = stdout.read().decode().strip().split('\n')
print(f"Found node binaries: {node_paths}")

node_bin = node_paths[0] if node_paths and node_paths[0] else None
if not node_bin:
    # Try common paths
    for p in [
        '/home/candydada/nodevenv/public_html/zeropoint/18/bin/node',
        '/home/candydada/nodevenv/public_html/zeropoint/20/bin/node',
    ]:
        stdin, stdout, stderr = client.exec_command(f'test -f {p} && echo yes || echo no')
        if stdout.read().decode().strip() == 'yes':
            node_bin = p
            break

print(f"Using node: {node_bin}")

# Run migrations
if node_bin:
    cmd = f'cd /home/candydada/public_html/zeropoint && {node_bin} dist/database/migrate.js 2>&1'
    print(f"\nRunning: {cmd}")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=60)
    stdout.channel.recv_exit_status()
    out = stdout.read().decode().strip()
    print(f"Output:\n{out}")

    # Also check DB to verify
    print("\nVerifying migrations in DB...")
    setup_cnf = 'cat > /tmp/my_check.cnf << \'EOF\'\n[client]\nuser=candydada_candydata\npassword=v$bEIpET&b,f=rcA\nhost=127.0.0.1\ndatabase=candydada_ERP\nEOF'
    client.exec_command(setup_cnf)[1].channel.recv_exit_status()

    stdin, stdout, stderr = client.exec_command('mysql --defaults-file=/tmp/my_check.cnf -e "SELECT filename FROM schema_migrations ORDER BY id DESC LIMIT 6;"')
    print(stdout.read().decode().strip())

    # Kill and let LiteSpeed restart
    print("\nRestarting app via LiteSpeed...")
    client.exec_command('kill $(pgrep lsnode) 2>/dev/null || true')
    time.sleep(3)
    stdin, stdout, stderr = client.exec_command('pgrep lsnode && echo "running" || echo "stopped (will restart automatically)"')
    print(f"Process state: {stdout.read().decode().strip()}")

client.close()
print("\nDone!")

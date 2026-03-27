import paramiko

host = '176.9.63.151'
port = 22
user = 'candydada'
password = 'Blista1214@@'
db_pass = "v$bEIpET&b,f=rcA"

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
client.connect(host, port=port, username=user, password=password, timeout=15)

# Use .my.cnf approach - write a temp cnf file and use it
setup_cnf = f"""cat > /tmp/my_check.cnf << 'CNFEOF'
[client]
user=candydada_candydata
password={db_pass}
host=127.0.0.1
database=candydada_ERP
CNFEOF
"""
client.exec_command(setup_cnf)[1].channel.recv_exit_status()

cmds = [
    "mysql --defaults-file=/tmp/my_check.cnf -e \"SELECT filename, applied_at FROM schema_migrations ORDER BY id DESC LIMIT 5;\"",
    "mysql --defaults-file=/tmp/my_check.cnf -e \"SHOW COLUMNS FROM vendors;\" | awk '{print $1}' | grep -E 'contact_person|mobile|fax|website|tax_id|payment_method|vendor_type|vendor_group'",
]

for cmd in cmds:
    stdin, stdout, stderr = client.exec_command(cmd)
    out = stdout.read().decode().strip()
    err = stderr.read().decode().strip()
    print(f"\n--- Result ---\n{out or err or '(empty)'}")

# Cleanup
client.exec_command('rm -f /tmp/my_check.cnf')
client.close()

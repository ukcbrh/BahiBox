import sys

with open('src/db/database.types.ts', 'r') as f:
    content = f.read()

target = """// Database schema wrapper type"""
replacement = """export interface PlatformSetting {
  id: string;
  setting_key: string;
  setting_value: string;
  description: string | null;
  updated_by: string | null;
  updated_at: string;
}

// Database schema wrapper type"""

if target in content:
    content = content.replace(target, replacement)
else:
    print("Failed to add interface")
    sys.exit(1)

table_target = """      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> };"""
table_replacement = """      audit_logs: { Row: AuditLog; Insert: Partial<AuditLog>; Update: Partial<AuditLog> };
      platform_settings: { Row: PlatformSetting; Insert: Partial<PlatformSetting>; Update: Partial<PlatformSetting> };"""

if table_target in content:
    content = content.replace(table_target, table_replacement)
else:
    print("Failed to add to Tables")
    sys.exit(1)

with open('src/db/database.types.ts', 'w') as f:
    f.write(content)

print("Updated database.types.ts")

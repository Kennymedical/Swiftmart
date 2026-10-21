const fs = require('fs');
const file = 'app/admin/security/SecurityAlertsClientView.tsx';
let content = fs.readFileSync(file, 'utf8');

// We use regex to find the AlertActions component and inject alertType
const regex = /<AlertActions\s+alertId=\{alert\.id\}\s+acknowledged=\{Boolean\(alert\.acknowledged_at\)\}\s+resolved=\{Boolean\(alert\.resolved\)\}\s*\/>/;

const replacement = `<AlertActions
              alertType={alert.alert_type}
              alertId={alert.id}
              acknowledged={Boolean(alert.acknowledged_at)}
              resolved={Boolean(alert.resolved)}
            />`;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log('✅ Successfully injected alertType prop!');
} else {
  // Fallback just in case the formatting is slightly different
  let lines = content.split('\n');
  let fixed = false;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('<AlertActions')) {
      lines[i] = lines[i].replace('<AlertActions', '<AlertActions alertType={alert.alert_type}');
      fixed = true;
      break;
    }
  }
  if (fixed) {
    fs.writeFileSync(file, lines.join('\n'));
    console.log('✅ Successfully injected alertType prop (fallback method)!');
  } else {
    console.log('❌ Could not find <AlertActions> in the file.');
  }
}

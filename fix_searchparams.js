const fs = require('fs');

const files = [
  'app/(auth)/login/page.tsx',
  'app/wallet/history/page.tsx',
  'app/wallet/send/page.tsx',
  'app/admin/security/page.tsx',
  'app/products/page.tsx'
];

files.forEach(file => {
  if (!fs.existsSync(file)) return;
  let content = fs.readFileSync(file, 'utf8');

  // 1. Change the type signature to Promise
  // Matches: searchParams?: { ... } or searchParams: { ... }
  content = content.replace(
    /searchParams(\??):\s*\{[^}]+\}/g,
    'searchParams: Promise<{ [key: string]: string | string[] | undefined }>'
  );

  // 2. Insert await inside the function
  // We find the main export function and inject the await
  const funcRegex = /(export\s+default\s+async\s+function\s+\w+\s*\([^)]*\)\s*\{)/;
  if (content.match(funcRegex)) {
    content = content.replace(funcRegex, `$1\n  const resolvedSearchParams = await searchParams;\n`);
  }

  // 3. Replace usages of `searchParams?.` and `searchParams.` with `resolvedSearchParams`
  // We only do this to avoid breaking the type definition we just wrote.
  content = content.replace(/searchParams\?\./g, 'resolvedSearchParams?.');
  content = content.replace(/searchParams\./g, 'resolvedSearchParams.');
  
  // 4. Handle cases where it's accessed as `searchParams` directly (e.g. passed as prop)
  // We'll skip this for now unless the build fails, to avoid over-complicating.

  fs.writeFileSync(file, content);
  console.log(`✅ Fixed searchParams in ${file}`);
});

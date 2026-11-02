#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const brandFilePath = path.join(rootDir, 'ui', 'brand.tsx');

if (!fs.existsSync(brandFilePath)) {
  console.error('[Brand Script] Error: ui/brand.tsx not found');
  process.exit(1);
}

const brandContent = fs.readFileSync(brandFilePath, 'utf8');
const match = brandContent.match(/appName:\s*['"`]([^'"`]+)['"`]/);
if (!match || !match[1]) {
  console.error('[Brand Script] Error: Could not parse appName from ui/brand.tsx');
  process.exit(1);
}

const appName = match[1].trim();
const slug = appName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');

console.log(`[Brand Script] Syncing brand name "${appName}" (slug: ${slug})...`);

// 1. Update package.json
const pkgPath = path.join(rootDir, 'package.json');
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  pkg.name = slug;
  fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  console.log(`  ✓ Updated package.json name -> "${slug}"`);
}

// 2. Update capacitor.config.ts
const capPath = path.join(rootDir, 'capacitor.config.ts');
if (fs.existsSync(capPath)) {
  let cap = fs.readFileSync(capPath, 'utf8');
  cap = cap.replace(/appName:\s*['"`][^'"`]+['"`]/, `appName: '${appName}'`);
  fs.writeFileSync(capPath, cap);
  console.log(`  ✓ Updated capacitor.config.ts appName -> "${appName}"`);
}

console.log(`[Brand Script] Success! Brand synced across package.json and capacitor.config.ts.`);

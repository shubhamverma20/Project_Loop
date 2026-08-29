const fs = require('fs');

let layout = fs.readFileSync('src/app/(dashboard)/layout.tsx', 'utf8');
layout = layout.replace('import { useState } from "react"\n', '');
layout = layout.replace('const router = useRouter()\n', '');
layout = layout.replace('import { usePathname, useRouter } from "next/navigation"', 'import { usePathname } from "next/navigation"');
fs.writeFileSync('src/app/(dashboard)/layout.tsx', layout);

let sources = fs.readFileSync('src/app/(dashboard)/sources/page.tsx', 'utf8');
sources = sources.replace('const { data: sources, error } = await getSources()', 'const { data: sources } = await getSources()');
fs.writeFileSync('src/app/(dashboard)/sources/page.tsx', sources);

let themes = fs.readFileSync('src/app/(dashboard)/themes/page.tsx', 'utf8');
themes = themes.replace('const [isShrinking, setIsShrinking]', 'const [, setIsShrinking]');
fs.writeFileSync('src/app/(dashboard)/themes/page.tsx', themes);

let auth = fs.readFileSync('src/app/actions/auth.ts', 'utf8');
auth = auth.replace('prevState: any,', 'prevState: unknown,');
fs.writeFileSync('src/app/actions/auth.ts', auth);

let ingest = fs.readFileSync('src/app/actions/ingestion.ts', 'utf8');
ingest = ingest.replace('prevState: any,', 'prevState: unknown,');
ingest = ingest.replace('catch (error: any)', 'catch (error: unknown)');
fs.writeFileSync('src/app/actions/ingestion.ts', ingest);

let login = fs.readFileSync('src/app/login/page.tsx', 'utf8');
login = login.replace(/Don't/g, "Don&apos;t");
fs.writeFileSync('src/app/login/page.tsx', login);

let signup = fs.readFileSync('src/app/signup/page.tsx', 'utf8');
signup = signup.replace('catch (err: any)', 'catch (err: unknown)');
fs.writeFileSync('src/app/signup/page.tsx', signup);

let csv = fs.readFileSync('src/components/CsvUploader.tsx', 'utf8');
csv = csv.replace('catch (err) {', 'catch (_err) {');
fs.writeFileSync('src/components/CsvUploader.tsx', csv);

let nadts = fs.readFileSync('src/next-auth.d.ts', 'utf8');
nadts = nadts.replace('import NextAuth, { DefaultSession } from "next-auth"\n', 'import { DefaultSession } from "next-auth"\n');
nadts = nadts.replace('import { JWT } from "next-auth/jwt"\n', '');
fs.writeFileSync('src/next-auth.d.ts', nadts);

console.log('Lint fixes applied.');

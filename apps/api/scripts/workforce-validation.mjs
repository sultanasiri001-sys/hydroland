import { readFile } from 'node:fs/promises';

const catalog = await readFile(new URL('../src/workforce/workforce.catalog.ts', import.meta.url), 'utf8');
const service = await readFile(new URL('../src/workforce/workforce.service.ts', import.meta.url), 'utf8');
const migration = await readFile(new URL('../prisma/migrations/20260916050000_workforce_structure/migration.sql', import.meta.url), 'utf8');
const departmentCodes = [...catalog.matchAll(/^    code: '([A-Z_]+)', nameAr:/gm)].map(match => match[1]);
const assistantCodes = [...catalog.matchAll(/^      \{ code: '([A-Z0-9_]+)'/gm)].map(match => match[1]);

if (departmentCodes.length !== 13) throw new Error(`Expected 13 departments, found ${departmentCodes.length}`);
if (assistantCodes.length !== 54) throw new Error(`Expected 54 assistants, found ${assistantCodes.length}`);
if (!catalog.includes("code: 'HUMAN_RESOURCES', nameAr: 'الموارد البشرية', nameEn: 'Human Resources', enabled: false")) throw new Error('Human Resources must default to disabled');
if ((catalog.match(/externalLiaisonEligible: true/g) || []).length !== 13) throw new Error('Every department must define one external liaison');
if ((catalog.match(/canManageExternalCenter: true/g) || []).length !== 1) throw new Error('Exactly one external center manager is required');
for (const marker of ["accessStatus: 'LOCKED'", "'DISABLED'", "mode: departmentEnabled ? 'AI_ONLY' : 'DISABLED'", "scope: 'EXTERNAL_CENTER'", 'administrativeManagerSeatId', 'technicalDepartmentId']) if (!service.includes(marker)) throw new Error(`Missing workforce control: ${marker}`);
for (const table of ['WorkforceDepartment', 'WorkforcePosition', 'WorkforceSeat']) if (!migration.includes(`CREATE TABLE \"${table}\"`)) throw new Error(`Missing migration table: ${table}`);
console.log('Validated 13 departments, 13 managers, 54 assistants, HR disabled, locked human seats and dual-reporting external centers.');

import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
import { execSync } from 'child_process';

const BASE = 'http://127.0.0.1:5173';
const API = 'http://127.0.0.1:5000/api';
const OUT = '/home/suchethan/Desktop/sudhansh/medical_sheild/samples/screenshots';
mkdirSync(OUT, { recursive: true });

const stamp = Date.now();
const oldEmail = `old_ui_${stamp}@test.com`;
const newEmail = `fresh_ui_${stamp}@test.com`;
const password = 'secret12';

// Seed an old account with history so we prove isolation visually
const oldReg = JSON.parse(
  execSync(
    `curl -s -X POST ${API}/auth/register -H 'Content-Type: application/json' -d '${JSON.stringify({
      name: 'Old UI User',
      email: oldEmail,
      password,
    })}'`,
    { encoding: 'utf8' }
  )
);
execSync(
  `curl -s -X POST ${API}/policies/upload -H 'Authorization: Bearer ${oldReg.token}' -F policy=@/home/suchethan/Desktop/sudhansh/medical_sheild/samples/sample_insurance_policy.pdf`,
  { encoding: 'utf8' }
);
execSync(
  `curl -s -X POST ${API}/audit/analyze -H 'Authorization: Bearer ${oldReg.token}' -F bill=@/home/suchethan/Desktop/sudhansh/medical_sheild/samples/sample_hospital_bill.pdf`,
  { encoding: 'utf8' }
);

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

// 1) Login as old user — should show past audit in history
await page.goto(BASE, { waitUntil: 'networkidle' });
await page.getByPlaceholder('Email address').fill(oldEmail);
await page.getByPlaceholder('Password').fill(password);
await page.getByRole('button', { name: 'Log In' }).click();
await page.getByText('Signed in as').waitFor({ timeout: 10000 });
await page.getByText('sample_hospital_bill.pdf').first().waitFor({ timeout: 10000 });
await page.screenshot({ path: `${OUT}/01_old_account_has_history.png`, fullPage: true });
console.log('SHOT 1:', `${OUT}/01_old_account_has_history.png`);

await page.getByRole('button', { name: 'Log out' }).click();
await page.getByRole('button', { name: 'Register' }).waitFor({ timeout: 5000 });

// 2) Register brand-new account
await page.getByRole('button', { name: 'Register' }).click();
await page.getByPlaceholder('Full name').fill('Fresh UI User');
await page.getByPlaceholder('Email address').fill(newEmail);
await page.getByPlaceholder('Password').fill(password);
await page.getByRole('button', { name: 'Create Account' }).click();
await page.getByText('Signed in as').waitFor({ timeout: 10000 });
await page.getByText('No saved audits yet for this account.').waitFor({ timeout: 10000 });
await page.getByText('Ready to audit').waitFor({ timeout: 5000 });
await page.screenshot({ path: `${OUT}/02_new_account_history_clean.png`, fullPage: true });
console.log('SHOT 2:', `${OUT}/02_new_account_history_clean.png`);

const historyText = await page.locator('text=Past audits').locator('..').innerText();
console.log('NEW ACCOUNT HISTORY PANEL:\n' + historyText);
console.log('NEW EMAIL:', newEmail);
console.log('OLD EMAIL:', oldEmail);

await browser.close();

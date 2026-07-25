import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const OUT = process.env.SHOTS_DIR ?? "./screenshots";
mkdirSync(OUT, { recursive: true });

const targets = process.argv.slice(2);
const pages = targets.length
  ? targets.map((t) => {
      const [name, path, ...rest] = t.split("|");
      return { name, path, width: Number(rest[0] ?? 1440), full: rest[1] !== "viewport" };
    })
  : [{ name: "home", path: "/", width: 1440, full: true }];

const browser = await chromium.launch();
const errors = [];

for (const target of pages) {
  const context = await browser.newContext({
    viewport: { width: target.width, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`[${target.name}] console: ${msg.text()}`);
  });
  page.on("pageerror", (err) => errors.push(`[${target.name}] pageerror: ${err.message}`));

  try {
    const response = await page.goto(`http://127.0.0.1:3000${target.path}`, {
      waitUntil: "networkidle",
      timeout: 45000,
    });
    // let fonts settle so text metrics are final
    await page.waitForTimeout(700);
    await page.screenshot({
      path: `${OUT}/${target.name}.png`,
      fullPage: target.full,
    });
    console.log(`${target.name.padEnd(22)} ${response?.status()}  ${target.path}`);
  } catch (err) {
    console.log(`${target.name.padEnd(22)} FAILED  ${err.message.split("\n")[0]}`);
  }
  await context.close();
}

await browser.close();
if (errors.length) {
  console.log("\n─── browser errors ───");
  for (const e of [...new Set(errors)]) console.log(" ", e);
} else {
  console.log("\nno browser errors");
}

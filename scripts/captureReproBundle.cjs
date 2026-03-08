const fs = require('fs/promises');
const path = require('path');
const { chromium } = require('playwright');

function toBufferLike(value) {
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (Array.isArray(value)) {
    return Buffer.from(value);
  }
  if (value && Array.isArray(value.data)) {
    return Buffer.from(value.data);
  }
  throw new Error('Unexpected snapshot payload format');
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });

  await page.goto('http://127.0.0.1:3000', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  const capture = await page.evaluate(async () => {
    const controlsRaw = localStorage.getItem('e-life-controls-v1');
    const parsed = controlsRaw ? JSON.parse(controlsRaw) : {};
    const controls = parsed?.controls ?? parsed ?? {};

    const captured = await new Promise((resolve, reject) => {
      window.dispatchEvent(new CustomEvent('captureReproBundle', {
        detail: {
          resolve,
          reject,
        },
      }));
    });

    return {
      controls,
      captured,
    };
  });

  await browser.close();

  const snapshot = capture.captured.snapshot;
  const screenshotDataUrl = capture.captured.screenshotDataUrl;

  const stateBytes = toBufferLike(snapshot.state);
  const forceBytes = toBufferLike(snapshot.force);
  const velocityBytes = toBufferLike(snapshot.velocity);
  const wellsBytes = toBufferLike(snapshot.wells);

  const bundle = {
    schema: 'e-life-repro-v1',
    exportedAt: new Date().toISOString(),
    controls: capture.controls,
    handleOpacity: 0.9,
    screenshotDataUrl,
    snapshot: {
      width: snapshot.width,
      height: snapshot.height,
      stateBase64: stateBytes.toString('base64'),
      forceBase64: forceBytes.toString('base64'),
      velocityBase64: velocityBytes.toString('base64'),
      wellsBase64: wellsBytes.toString('base64'),
    },
  };

  const outputDir = path.join(process.cwd(), 'docs', 'repro');
  await fs.mkdir(outputDir, { recursive: true });

  const jsonPath = path.join(outputDir, 'readme-repro-bundle.json');
  await fs.writeFile(jsonPath, JSON.stringify(bundle, null, 2), 'utf8');

  const pngPath = path.join(outputDir, 'readme-repro-screenshot.png');
  const base64 = screenshotDataUrl.split(',')[1] ?? '';
  await fs.writeFile(pngPath, Buffer.from(base64, 'base64'));

  const settingsPath = path.join(outputDir, 'readme-settings.json');
  await fs.writeFile(
    settingsPath,
    JSON.stringify(
      {
        schema: 'e-life-controls-v1',
        exportedAt: bundle.exportedAt,
        controls: bundle.controls,
      },
      null,
      2
    ),
    'utf8'
  );

  process.stdout.write(`Generated:\n- ${jsonPath}\n- ${pngPath}\n- ${settingsPath}\n`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

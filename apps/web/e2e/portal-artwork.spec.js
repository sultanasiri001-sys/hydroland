import { test, expect } from '@playwright/test';

test('visitor hero and brand artwork load as decodable images', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.HydrolandWorkspaceUI));
  const artwork = await page.evaluate(async () => {
    const urls = new Set();
    for (const node of document.querySelectorAll('.landing-hero, .brand-mark')) {
      for (const match of getComputedStyle(node).backgroundImage.matchAll(/url\("([^"]+)"\)/g)) {
        urls.add(match[1]);
      }
    }
    return Promise.all([...urls].map(async url => {
      const image = new Image();
      image.src = url;
      await image.decode();
      return { url, width: image.naturalWidth, height: image.naturalHeight };
    }));
  });
  expect(artwork.length).toBeGreaterThanOrEqual(2);
  for (const image of artwork) {
    expect(image.width, image.url).toBeGreaterThan(0);
    expect(image.height, image.url).toBeGreaterThan(0);
  }
});

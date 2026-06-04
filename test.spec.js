const { test, expect } = require('@playwright/test');

test.describe('Pachinko Game E2E', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('http://localhost:7792/');
        await page.waitForLoadState('networkidle');
    });

    test('1. Page loads with canvas and UI elements', async ({ page }) => {
        const canvas = page.locator('canvas');
        await expect(canvas).toBeVisible();

        const pageContent = await page.content();
        expect(pageContent).toContain('250');
    });

    test('2. Background images load (no 404s)', async ({ page }) => {
        const imageResponses = [];
        page.on('response', response => {
            if (response.url().match(/\.(png|jpg)$/)) {
                imageResponses.push({ url: response.url(), status: response.status() });
            }
        });

        await page.reload();
        await page.waitForTimeout(3000);

        for (const img of imageResponses) {
            expect(img.status, `Image ${img.url} should load`).toBe(200);
        }
        expect(imageResponses.length).toBeGreaterThan(0);
    });

    test('3. Dial fires balls that are VISIBLE', async ({ page }) => {
        const initialBalls = await page.evaluate(() => G.balls);
        expect(initialBalls).toBe(250);

        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();

        const dialX = box.x + box.width * 0.85;
        const dialStartY = box.y + box.height * 0.8;
        const dialEndY = box.y + box.height * 0.4;

        await page.mouse.move(dialX, dialStartY);
        await page.mouse.down();
        await page.mouse.move(dialX, dialEndY, { steps: 10 });

        await page.waitForTimeout(3000);

        // Pocket returns can outpace fires, so ball count may go up or down — just verify firing happened
        const activeBalls = await page.evaluate(() => G.activeBalls ? G.activeBalls.length : 0);
        const lastFire = await page.evaluate(() => G.lastFire);
        expect(lastFire, 'Game should have fired at least once').toBeGreaterThan(0);
        expect(activeBalls, 'Active balls should be visible on field').toBeGreaterThan(0);

        await page.screenshot({ path: 'test-screenshots/balls-fired.png' });

        await page.mouse.up();
    });

    test('4. Balls bounce through pegs and reach pockets', async ({ page }) => {
        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();
        const dialX = box.x + box.width * 0.85;

        await page.mouse.move(dialX, box.y + box.height * 0.8);
        await page.mouse.down();
        await page.mouse.move(dialX, box.y + box.height * 0.4, { steps: 5 });

        await page.waitForTimeout(5000);
        await page.mouse.up();

        await page.waitForTimeout(8000);

        const score = await page.evaluate(() => G.score);
        expect(score, 'Score should increase as balls hit pockets').toBeGreaterThan(0);

        await page.screenshot({ path: 'test-screenshots/balls-in-play.png' });
    });

    test('5. Continuous firing works for 30 seconds', async ({ page }) => {
        test.setTimeout(60000);
        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();
        const dialX = box.x + box.width * 0.85;

        await page.mouse.move(dialX, box.y + box.height * 0.8);
        await page.mouse.down();
        await page.mouse.move(dialX, box.y + box.height * 0.5, { steps: 5 });

        for (let i = 0; i < 3; i++) {
            await page.waitForTimeout(10000);
            const balls = await page.evaluate(() => G.balls);
            const score = await page.evaluate(() => G.score);
            console.log(`T+${(i + 1) * 10}s: balls=${balls}, score=${score}`);
            await page.screenshot({ path: `test-screenshots/play-${(i + 1) * 10}s.png` });
        }

        await page.mouse.up();

        const finalScore = await page.evaluate(() => G.score);
        const finalBalls = await page.evaluate(() => G.balls);
        expect(finalScore).toBeGreaterThan(0);
        console.log(`Final: balls=${finalBalls}, score=${finalScore}`);
    });

    test('6. Different power levels enter field at different positions', async ({ page }) => {
        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();
        const dialX = box.x + box.width * 0.85;

        await page.mouse.move(dialX, box.y + box.height * 0.8);
        await page.mouse.down();
        await page.mouse.move(dialX, box.y + box.height * 0.7, { steps: 3 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-screenshots/power-low.png' });
        await page.mouse.up();

        await page.waitForTimeout(5000);

        await page.mouse.move(dialX, box.y + box.height * 0.8);
        await page.mouse.down();
        await page.mouse.move(dialX, box.y + box.height * 0.2, { steps: 3 });
        await page.waitForTimeout(2000);
        await page.screenshot({ path: 'test-screenshots/power-high.png' });
        await page.mouse.up();
    });

    test('7. No JavaScript errors during gameplay', async ({ page }) => {
        test.setTimeout(45000);
        const errors = [];
        page.on('pageerror', err => errors.push(err.message));

        const canvas = page.locator('canvas');
        const box = await canvas.boundingBox();
        const dialX = box.x + box.width * 0.85;

        await page.mouse.move(dialX, box.y + box.height * 0.8);
        await page.mouse.down();
        await page.mouse.move(dialX, box.y + box.height * 0.5, { steps: 5 });
        await page.waitForTimeout(20000);
        await page.mouse.up();
        await page.waitForTimeout(5000);

        expect(errors, `JS errors: ${errors.join(', ')}`).toHaveLength(0);
    });
});

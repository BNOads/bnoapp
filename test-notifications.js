import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const ARTIFACTS_DIR = '/Users/jpconfins/.gemini/antigravity/brain/bc993d1b-3d03-444f-8489-b30ab11d4ddb';

async function run() {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login
    await page.goto('http://localhost:8080/');
    await page.fill('input[type="email"]', 'bruno@bnoads.com');
    await page.fill('input[type="password"]', 'Bruno@123'); // Assuming standard testing password
    await page.click('button:has-text("Entrar")');
    await page.waitForURL('http://localhost:8080/');
    await page.waitForTimeout(3000);

    // Check Header Icon
    const headerScreenshot = path.join(ARTIFACTS_DIR, `media__${Date.now()}_header.png`);
    await page.screenshot({ path: headerScreenshot });
    console.log(`Saved header screenshot to ${headerScreenshot}`);

    // Navigate to Notifications
    await page.goto('http://localhost:8080/notificacoes');
    await page.waitForTimeout(3000);

    // Capture unread notifications
    const pageScreenshot = path.join(ARTIFACTS_DIR, `media__${Date.now()}_notificacoes_page.png`);
    await page.screenshot({ path: pageScreenshot });
    console.log(`Saved page screenshot to ${pageScreenshot}`);

    // Find and click an unread notification to open details
    // Then click Resend Error
    const notificationItems = await page.locator('.p-4.cursor-pointer').all();
    if (notificationItems.length > 0) {
        await notificationItems[0].click();
        await page.waitForTimeout(1000);

        const detailsScreenshot = path.join(ARTIFACTS_DIR, `media__${Date.now()}_notificacoes_details.png`);
        await page.screenshot({ path: detailsScreenshot });
        console.log(`Saved details screenshot to ${detailsScreenshot}`);

        // Open Resend Modal
        const resendButton = await page.locator('button:has-text("Reenviar Aviso")').first();
        if (await resendButton.isVisible()) {
            await resendButton.click();
            await page.waitForTimeout(1000);

            const modalScreenshot = path.join(ARTIFACTS_DIR, `media__${Date.now()}_resend_modal.png`);
            await page.screenshot({ path: modalScreenshot });
            console.log(`Saved modal screenshot to ${modalScreenshot}`);
        } else {
            console.log("Resend button not visible");
        }
    } else {
        console.log("No notifications found");
    }

    await browser.close();
}

run().catch(console.error);

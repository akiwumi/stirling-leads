import { chromium } from "playwright";

const baseUrl = process.env.BASE_URL || "http://127.0.0.1:3000";

const publicRoutes = [
  { path: "/", mustInclude: "Stirling Market Leads" },
  { path: "/contact", mustInclude: "Contact Stirling" },
  { path: "/privacy-policy", mustInclude: "Privacy Policy and Terms & Conditions" },
  { path: "/register", mustInclude: "Start your 3-day trial" },
  { path: "/reset-password", mustInclude: "Reset password" },
  { path: "/login", mustInclude: "Find the right leads." },
];

const protectedRoutes = [
  "/dashboard",
  "/dashboard/contact",
  "/welcome",
];

const footerLinks = [
  { label: "Contact", href: "/contact", mustInclude: "Contact Stirling" },
  { label: "Privacy Policy", href: "/privacy-policy", mustInclude: "Privacy Policy and Terms & Conditions" },
  { label: "Terms of Service", href: "/privacy-policy#terms", mustInclude: "Terms and Conditions" },
];

function fail(message) {
  throw new Error(message);
}

async function assertPublicRoute(page, route) {
  await page.goto(`${baseUrl}${route.path}`, { waitUntil: "networkidle", timeout: 30000 });

  if (page.url() !== `${baseUrl}${route.path}`) {
    fail(`Public route ${route.path} redirected unexpectedly to ${page.url()}`);
  }

  const bodyText = await page.locator("body").innerText();

  if (!bodyText.includes(route.mustInclude)) {
    fail(`Public route ${route.path} missing expected text: ${route.mustInclude}`);
  }
}

async function assertProtectedRedirect(page, path) {
  await page.goto(`${baseUrl}${path}`, { waitUntil: "networkidle", timeout: 30000 });

  const url = new URL(page.url());

  if (url.pathname !== "/login") {
    fail(`Protected route ${path} should redirect to /login but landed on ${page.url()}`);
  }
}

async function assertFooterLinks(page) {
  await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 30000 });
  await page.locator("footer").scrollIntoViewIfNeeded();

  for (const linkCheck of footerLinks) {
    const link = page.getByRole("link", { name: linkCheck.label }).last();
    const href = await link.getAttribute("href");

    if (href !== linkCheck.href) {
      fail(`Footer link ${linkCheck.label} should point to ${linkCheck.href} but found ${href}`);
    }

    await link.click();
    await page.waitForLoadState("networkidle");

    const bodyText = await page.locator("body").innerText();

    if (!bodyText.includes(linkCheck.mustInclude)) {
      fail(`Footer link ${linkCheck.label} landed on unexpected content`);
    }

    await page.goto(`${baseUrl}/`, { waitUntil: "networkidle", timeout: 30000 });
    await page.locator("footer").scrollIntoViewIfNeeded();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1200 } });

  try {
    for (const route of publicRoutes) {
      await assertPublicRoute(page, route);
    }

    for (const path of protectedRoutes) {
      await assertProtectedRedirect(page, path);
    }

    await assertFooterLinks(page);

    console.log(`Smoke test passed for ${baseUrl}`);
    console.log(`Public routes: ${publicRoutes.length}`);
    console.log(`Protected routes: ${protectedRoutes.length}`);
    console.log(`Footer links: ${footerLinks.length}`);
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("Smoke test failed.");
  console.error(error.message);
  process.exit(1);
});

import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer-core';
import { stringify } from 'csv-stringify/sync';

const getChromePath = () => {
  return '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
};

export async function POST(req) {
  const { city, category } = await req.json();

  let browser;
  try {
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(category)}+in+${encodeURIComponent(city)}`;
    
    browser = await puppeteer.launch({
      executablePath: getChromePath(),
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    console.log('Loading Google Maps...');
    await page.goto(mapsUrl, { 
      waitUntil: 'networkidle2', 
      timeout: 30000 
    });

    // Wait for maps to load
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Scroll multiple times to load more results
    console.log('Scrolling to load more businesses...');
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]');
        if (feed) {
          feed.scrollTop = feed.scrollHeight;
        } else {
          window.scrollTo(0, document.body.scrollHeight);
        }
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Extract business names
    const businessNames = await page.evaluate(() => {
      const names = new Set();
      const nameElements = document.querySelectorAll('.fontHeadlineSmall');
      
      nameElements.forEach(element => {
        const name = element.textContent?.trim();
        if (name && name.length > 2) {
          names.add(name);
        }
      });
      
      return Array.from(names).slice(0, 100); // Limit to 100
    });

    console.log(`Found ${businessNames.length} unique business names`);

    // Create simple CSV with just names
    const leads = businessNames.map(name => ({
      'Business Name': name,
      'City': city,
      'Category': category,
      'Search Query': `"${name}" "${city}" website`
    }));

    const csv = stringify(leads, {
      header: true,
      columns: ["Business Name", "City", "Category", "Search Query"],
    });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="businesses-${category}-${city}.csv"`,
      },
    });

  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json(
      { error: 'Failed: ' + error.message },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
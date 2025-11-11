// app/api/business-names/route.js
import { NextResponse } from 'next/server';
import puppeteer from 'puppeteer';
import { stringify } from 'csv-stringify/sync';

export async function POST(req) {
  const { city, category } = await req.json();

  // Validate input
  if (!city || !category) {
    return NextResponse.json(
      { error: 'City and category are required' },
      { status: 400 }
    );
  }

  let browser;
  try {
    const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(category)}+in+${encodeURIComponent(city)}`;
    
    console.log('🚀 Launching browser on Railway with Node.js 22...');
    
    // Node.js 22 compatible Puppeteer configuration
    browser = await puppeteer.launch({
      headless: 'new', // Use new headless mode
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--single-process',
        '--max-old-space-size=512'
      ]
    });

    const page = await browser.newPage();
    
    // Set realistic viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Set modern user agent
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
    
    // Set request timeout
    await page.setDefaultTimeout(30000);
    
    console.log(`📍 Loading Google Maps for ${category} in ${city}...`);
    
    await page.goto(mapsUrl, { 
      waitUntil: 'domcontentloaded', 
      timeout: 30000 
    });

    // Wait for initial load
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Scroll to load more results
    console.log('📜 Scrolling to load more businesses...');
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => {
        const feed = document.querySelector('[role="feed"]');
        if (feed) {
          feed.scrollTop = feed.scrollHeight;
        }
      });
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Extract business names with better error handling
    const businessNames = await page.evaluate(() => {
      try {
        const names = new Set();
        
        // Multiple selectors for better compatibility
        const selectors = [
          '.fontHeadlineSmall',
          '.qBF1Pd',
          '[role="heading"]',
          '[aria-level="3"]'
        ];
        
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const name = element.textContent?.trim();
            if (name && name.length > 2 && name.length < 100) {
              names.add(name);
            }
          }
          if (names.size >= 50) break; // Stop if we have enough
        }
        
        return Array.from(names).slice(0, 50);
      } catch (error) {
        console.error('Error in page evaluation:', error);
        return [];
      }
    });

    console.log(`✅ Found ${businessNames.length} business names`);

    // Create CSV
    const leads = businessNames.map(name => ({
      'Business Name': name,
      'City': city,
      'Category': category,
      'Search Help': `Search: "${name} official website ${city}"`
    }));

    // If no businesses found, provide helpful message
    if (leads.length === 0) {
      leads.push({
        'Business Name': 'No businesses found - try different search terms',
        'City': city,
        'Category': category,
        'Search Help': `Try: "restaurants in ${city}" or "cafes ${city}"`
      });
    }

    const csv = stringify(leads, {
      header: true,
      columns: ["Business Name", "City", "Category", "Search Help"],
    });

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="businesses-${category}-${city}.csv"`,
      },
    });

  } catch (error) {
    console.error('❌ Railway Error:', error);
    return NextResponse.json(
      { error: `Scraping failed: ${error.message}. Try different search terms.` },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
      console.log('🔚 Browser closed');
    }
  }
}
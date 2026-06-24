const Tesseract = require('tesseract.js');
const path = require('path');

/**
 * Parse a receipt image using Tesseract OCR and extract line items.
 * Returns structured JSON: { items: [{ name, price, quantity }], rawText }
 */
const parseReceiptImage = async (imagePath) => {
  console.log(`[OCR] Processing image: ${imagePath}`);

  const { data: { text } } = await Tesseract.recognize(imagePath, 'eng', {
    logger: (m) => {
      if (m.status === 'recognizing text') {
        process.stdout.write(`\r[OCR] Progress: ${Math.round(m.progress * 100)}%`);
      }
    },
  });

  console.log('\n[OCR] Text extraction complete. Parsing items...');
  const items = parseOcrText(text);

  return { items, rawText: text };
};

/**
 * Parse raw OCR text into structured line items.
 * Handles common receipt formats with price patterns.
 */
const parseOcrText = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items = [];

  // Price patterns: "₹99.00", "Rs 99", "99.00", "99"
  const priceRegex = /(?:₹|Rs\.?\s*)?(\d{1,5}(?:[.,]\d{1,2})?)\s*$/;
  // Quantity pattern: "2x", "x2", "(2)"
  const qtyRegex = /^(\d+)\s*[xX×]\s+(.+)|(.+)\s+[xX×]\s*(\d+)$/;

  for (const line of lines) {
    // Skip header/footer lines
    if (/^(total|subtotal|tax|gst|tip|service|bill|table|order|date|time|thank|welcome|invoice|receipt)/i.test(line)) {
      continue;
    }

    const priceMatch = line.match(priceRegex);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1].replace(',', '.'));
    if (isNaN(price) || price <= 0 || price > 99999) continue;

    // Extract item name (everything before the price)
    let name = line.replace(priceRegex, '').trim();

    // Handle quantity
    let quantity = 1;
    const qtyMatch = name.match(qtyRegex);
    if (qtyMatch) {
      quantity = parseInt(qtyMatch[1] || qtyMatch[4]);
      name = (qtyMatch[2] || qtyMatch[3] || '').trim();
    }

    if (name.length < 2) continue;

    items.push({
      name: name.replace(/[^a-zA-Z0-9\s\-&]/g, '').trim(),
      price: parseFloat((price / (quantity || 1)).toFixed(2)),
      quantity: quantity || 1,
      isVeg: true, // Default; user will tag in frontend
    });
  }

  return items;
};

module.exports = { parseReceiptImage };

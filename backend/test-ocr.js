const text = `
HOUSE BREADa MUDDLE YOUR D 1        455.00
SIGNATURE LAMB KOOBIDEH    2      1,690.00
CARB & FISH CAKES          2      1,490.00
AUBERGINE DOLMAS           1        545.00
DIET COKE                  1        225.00
TONIC                      1        225.00
SUNSHINE                   1        350.00
HONEYDEW ICE TEA           1        250.00
FRESH CATCH FISH SKEWERS E 1        795.00
BARBEQUED SPICED CHICKEN E 1        625.00
Crispy Prawns              1      1,050.00
SEAFOOD MEDLEY PLANCHAS    1        745.00
OLD MONK CHOCOLATE TART    1        425.00
Food Taxable Total :        8,870.00
Service Charge 10% :          887.00
2.5% SGST on Food Taxable :    243.92
2.5% CGST on Food Taxable :    243.92
Bill Total :                10,245.00
`;

const parseOcrText = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const items = [];
  let tax = 0;
  let tip = 0;

  for (let line of lines) {
    line = line.replace(/(\d)[,\s]+(\d{3}(?:\.\d{1,2})?(?!\d))/g, '$1$2');

    const isTax = /gst|tax|vat|cess/i.test(line);
    const isTip = /tip|service\s*charge/i.test(line);
    const isTotal = /total|subtotal|amount|due|balance|cash|bill/i.test(line);

    if (isTotal && !isTax && !isTip) {
      continue;
    }

    const priceMatch = line.match(/(?:₹|Rs\.?\s*|-|:)?\s*(\d{1,5}(?:\.\d{1,2})?)\s*$/);
    if (!priceMatch) continue;

    const price = parseFloat(priceMatch[1]);
    if (isNaN(price) || price <= 0 || price > 99999) continue;

    if (isTax) {
      tax += price;
      continue;
    }
    if (isTip) {
      tip += price;
      continue;
    }

    let remaining = line.slice(0, priceMatch.index).trim();
    remaining = remaining.replace(/[:\-]+$/, '').trim();

    let quantity = 1;
    let name = remaining;

    const trailingQtyMatch = remaining.match(/\s+(\d+)\s*$/);
    const prefixQtyMatch = remaining.match(/^(\d+)\s*[xX×-]?\s+(.+)/);

    if (trailingQtyMatch) {
      quantity = parseInt(trailingQtyMatch[1], 10);
      name = remaining.slice(0, trailingQtyMatch.index).trim();
    } else if (prefixQtyMatch) {
      quantity = parseInt(prefixQtyMatch[1], 10);
      name = prefixQtyMatch[2].trim();
    }

    if (name.length < 2) continue;
    
    name = name.replace(/[^a-zA-Z0-9\s\-&]/g, '').trim();
    if (/^\d{2}\s*[a-zA-Z]{3}\s*\d{2,4}$/.test(name)) continue;

    items.push({
      name,
      price: parseFloat((price / (quantity || 1)).toFixed(2)),
      quantity: quantity || 1,
      isVeg: true, 
    });
  }

  return { items, tax: parseFloat(tax.toFixed(2)), tip: parseFloat(tip.toFixed(2)) };
};

console.log(JSON.stringify(parseOcrText(text), null, 2));

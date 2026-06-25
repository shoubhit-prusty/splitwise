const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

/**
 * Parse a receipt image using Google Gemini AI and extract line items.
 * Returns structured JSON: { items: [{ name, price, quantity }], tax, tip, rawText }
 */
const parseReceiptImage = async (imagePath) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error('Please add GEMINI_API_KEY to your backend/.env file to use AI receipt scanning.');
  }

  console.log(`[OCR] Processing image with Gemini AI: ${imagePath}`);

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const imageBytes = fs.readFileSync(imagePath).toString("base64");
  
  const ext = path.extname(imagePath).toLowerCase();
  let mimeType = 'image/jpeg';
  if (ext === '.png') mimeType = 'image/png';
  else if (ext === '.webp') mimeType = 'image/webp';
  else if (ext === '.heic') mimeType = 'image/heic';

  const prompt = `
    Analyze this restaurant receipt. Extract all line items, tax, and tip.
    Return ONLY a valid JSON object matching this schema exactly, nothing else. No markdown formatting, no backticks, no comments:
    {
      "items": [
        {
          "name": "string (name of the food/drink)",
          "price": number (the UNIT price for a SINGLE item of this row. If the receipt only shows the total price for multiple items, you MUST divide the total by the quantity to get the unit price),
          "quantity": number (quantity of this item, default to 1),
          "isVeg": boolean (guess true if vegetarian, false if meat/seafood)
        }
      ],
      "tax": number (total sum of all taxes like SGST, CGST, VAT, etc.),
      "tip": number (total sum of all service charges or tips)
    }
    
    CRITICAL INSTRUCTION: Your output MUST be ONLY valid, parsable JSON. Do NOT wrap it in \`\`\`json or \`\`\`.
  `;

  let response;
  try {
    response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [
          { text: prompt },
          { inlineData: { mimeType, data: imageBytes } }
        ]}
      ]
    });
  } catch (apiError) {
    console.error("Gemini API Error:", apiError);
    if (apiError.message && apiError.message.includes('503')) {
      throw new Error("Google's AI is currently experiencing high demand. Please try uploading the receipt again in a few moments.");
    }
    throw new Error("Failed to connect to AI server. Please try again.");
  }

  const text = response.text;
  let parsedData;
  try {
    const jsonStr = text.replace(/^```(?:json)?\n?/g, '').replace(/```\n?$/g, '').trim();
    parsedData = JSON.parse(jsonStr);
  } catch (error) {
    console.error("Failed to parse Gemini output:", text);
    throw new Error("AI failed to extract receipt properly. Please try a clearer image.");
  }

  return { 
    items: parsedData.items || [], 
    tax: parsedData.tax || 0, 
    tip: parsedData.tip || 0, 
    rawText: "Parsed with Google Gemini AI" 
  };
};

module.exports = { parseReceiptImage };

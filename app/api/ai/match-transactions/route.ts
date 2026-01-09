import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { bankRows, pendingTransactions } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are a financial reconciliation expert. I have two lists:
      1. Bank Statement Rows: ${JSON.stringify(bankRows)}
      2. Pending System Transactions: ${JSON.stringify(pendingTransactions)}

      Match the bank rows to the system transactions. A match is likely if:
      - The UTR number in the bank row (often in description) matches the system transaction's utr_no.
      - The amount matches exactly.
      - The dates are close.

      Return a JSON array of objects with this structure:
      [
        {
          "transaction_id": "system_tx_uuid",
          "bank_row_index": 0,
          "confidence": 0.95,
          "reason": "Exact UTR and amount match"
        }
      ]

      Only return the JSON array, no other text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    const jsonString = text.replace(/```json|```/g, "").trim();
    const matches = JSON.parse(jsonString);

    return NextResponse.json(matches);
  } catch (error) {
    console.error("AI Matching Error:", error);
    return NextResponse.json({ error: "Failed to match transactions" }, { status: 500 });
  }
}

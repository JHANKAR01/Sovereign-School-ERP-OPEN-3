import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function POST(req: Request) {
  try {
    const { headers, targetSchema } = await req.json();

    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const prompt = `
      You are an expert data engineer. I have a messy CSV file with these headers: ${JSON.stringify(headers)}.
      I need to map these headers to my database schema: ${JSON.stringify(targetSchema)}.
      
      Return a JSON object where keys are the target schema fields and values are the corresponding CSV headers.
      If a field cannot be mapped, use null.
      
      Example Output:
      {
        "full_name": "Student Name",
        "father_name": "Dad's Name",
        "admission_number": "Enrollment ID"
      }
      
      Only return the JSON object, no other text.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean the response text in case Gemini adds markdown code blocks
    const jsonString = text.replace(/```json|```/g, "").trim();
    const mapping = JSON.parse(jsonString);

    return NextResponse.json(mapping);
  } catch (error) {
    console.error("AI Mapping Error:", error);
    return NextResponse.json({ error: "Failed to map columns" }, { status: 500 });
  }
}

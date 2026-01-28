
import { GoogleGenAI, Type } from "@google/genai";
import { AppState, Category } from "../types.ts";

// Safe access to environment variables
const getApiKey = () => {
  try {
    return process.env.API_KEY || "";
  } catch (e) {
    return "";
  }
};

const addReminderSchema = {
  name: "add_reminder",
  description: "Adds a new reminder or task for the user.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: "Short title of the reminder" },
      dueDate: { type: Type.STRING, description: "Due date in YYYY-MM-DD HH:MM format" },
      priority: { type: Type.STRING, enum: ["low", "medium", "high"], description: "Urgency level" }
    },
    required: ["title", "dueDate"]
  }
};

const addExpenseSchema = {
  name: "add_expense",
  description: "Records a money expenditure.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      amount: { type: Type.NUMBER, description: "Amount spent in INR" },
      description: { type: Type.STRING, description: "What was the money spent on?" },
      category: { type: Type.STRING, enum: Object.values(Category), description: "Expenditure category" }
    },
    required: ["amount", "description"]
  }
};

const updateMemorySchema = {
  name: "update_memory",
  description: "Saves a personal fact about the user for future reference.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      fact: { type: Type.STRING, description: "A snippet of information about the user" }
    },
    required: ["fact"]
  }
};

export class AivenoService {
  async chat(message: string, appState: AppState, onAction: (action: any) => void) {
    const ai = new GoogleGenAI({ apiKey: getApiKey() });
    
    const memoryContext = `
      User Name: ${appState.memory.name}
      Key Facts: ${appState.memory.keyFacts.join(", ")}
      Current State:
      - Reminders: ${JSON.stringify(appState.reminders)}
      - Recent Expenses: ${JSON.stringify(appState.expenses.slice(-5))}
      - Important Docs: ${JSON.stringify(appState.documents)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: message,
      config: {
        systemInstruction: `
          You are Aiveno, a smart, friendly, and reliable personal life assistant for Indian users.
          Be caring, human-like, and practical. Help with reminders, planning, goals, expenses, and documents.
          Tone: Supportive, smart, and trustworthy.
          Indian Context: Use INR (₹) and Indian date formats (DD/MM/YYYY) in text.
          Current User Context: ${memoryContext}
          
          If the user wants to set a reminder or log an expense, use the available tools.
        `,
        tools: [{ functionDeclarations: [addReminderSchema, addExpenseSchema, updateMemorySchema] }]
      }
    });

    if (response.functionCalls && response.functionCalls.length > 0) {
      for (const call of response.functionCalls) {
        onAction(call);
      }
      return "I've updated that for you! Anything else I can help with?";
    }

    return response.text || "I'm here to help. Could you please rephrase that?";
  }
}

export const aiveno = new AivenoService();

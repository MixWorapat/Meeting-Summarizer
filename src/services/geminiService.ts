import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export interface MeetingDetails {
  topic: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  attendees: string[];
  agenda: string[];
  notes: string;
}

export async function extractMeetingDetails(
  fileData: string,
  mimeType: string,
  additionalDetails: string
): Promise<MeetingDetails> {
  const prompt = `
    Extract meeting details from the provided document (PDF or Image).
    ${additionalDetails ? `Additional context from the user: ${additionalDetails}` : ''}
    
    Please extract the following information and format it as JSON. 
    IMPORTANT: Please provide the extracted information and summaries in Thai language (ภาษาไทย).
    
    - topic: The main topic or title of the meeting.
    - date: The date of the meeting in YYYY-MM-DD format.
    - startTime: The start time in HH:mm format (24-hour).
    - endTime: The end time in HH:mm format (24-hour). If not specified, estimate 1 hour after start time.
    - location: The physical location, room, or online meeting link (e.g., Zoom, Webex, Google Meet).
    - attendees: A list of people, roles, or departments invited to the meeting.
    - agenda: A list of topics or agenda items to be discussed.
    - notes: Any other important remarks, preparations needed, or notes.
    
    If any information is missing from the document, try to infer it or leave it as an empty string (or empty array).
    Ensure the output is strictly valid JSON matching the requested schema.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        {
          inlineData: {
            data: fileData,
            mimeType: mimeType,
          },
        },
        {
          text: prompt,
        },
      ],
    },
    config: {
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW,
      },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          topic: { type: Type.STRING, description: "Meeting topic or title" },
          date: { type: Type.STRING, description: "Meeting date in YYYY-MM-DD format" },
          startTime: { type: Type.STRING, description: "Start time in HH:mm format" },
          endTime: { type: Type.STRING, description: "End time in HH:mm format" },
          location: { type: Type.STRING, description: "Location or meeting link" },
          attendees: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of attendees",
          },
          agenda: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of meeting agendas",
          },
          notes: { type: Type.STRING, description: "Any other important notes" },
        },
        required: [
          "topic",
          "date",
          "startTime",
          "endTime",
          "location",
          "attendees",
          "agenda",
          "notes",
        ],
      },
    },
  });

  const jsonStr = response.text?.trim() || "{}";
  try {
    return JSON.parse(jsonStr) as MeetingDetails;
  } catch (e) {
    console.error("Failed to parse JSON from Gemini:", jsonStr);
    throw new Error("Failed to parse meeting details.");
  }
}

/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		if (request.method == "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": "*", // allows the POST request for the API to come from anywhere, which in practice will be the frontend application. Needed for CORS.
          "Access-Control-Allow-Methods": "POST", // this Worker will only serve POST requests, since we need to send the request body (document.body.innerText)
          "Access-Control-Allow-Headers": "Content-Type" // calls send application/json content-types.
        }
      })
    }

    if (request.method !== "POST") {
      return new Response(`Method ${request.method} not allowed`, {
        status: 405
      });
    }

    let text = ""
    let url = ""

    try {
      const body = await request.json() as { text?: string; url?: string };
      text = body.text ?? "";
      url = body.url ?? "";

      if (!text) {
        return new Response(
          JSON.stringify({ error: "Missing text field" }),
          { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
        );
      }
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", details: String(err) }),
        { status: 400, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      );
    }

    const response = await fetch("https://generativelanguage.googleapis.com/v1beta/interactions", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY
      },
      body: JSON.stringify({
        model: "gemini-3.1-flash-lite",
        input: `Extract booking details from this confirmation page text into a structured JSON format. Fill any missing fields with appropriate default values. Return only the JSON object, no markdown, no explanation. Page URL: ${url} Content: ${text}`,
        response_format: {
          type: "text",
          mime_type: "application/json",
          schema: {
            type: "object",
            properties: {
              decision: {
                anyOf: [
                  {
                    type: "object",
                    title: "Flights",
                    description: "Details for content containing one or more flight bookings (outbound, return, or connections)",
                    properties: {
                      type: { type: "string", enum: ["flights"] },
                      flights: {
                        type: "array",
                        description: "List of all flights extracted from the confirmation text",
                        items: {
                          type: "object",
                          properties: {
                            origin: { type: "string", description: "The 3-letter IATA airport code for the departure airport (e.g., MIA)" },
                            destination: { type: "string", description: "The 3-letter IATA airport code for the arrival airport (e.g., LAX)" },
                            airline: { type: "string", description: "The name of the airline" },
                            departureTime: { type: "string", description: "The local departure time and date as written on the page, in 24-hour HH:MM format with the date, e.g. 2026-07-12T22:00:00 (no timezone/Z suffix — this is local time at the origin airport, not UTC)" },
                            arrivalTime: { type: "string", description: "The local arrival time and date as written on the page, in 24-hour HH:MM format with the date, e.g. 2026-07-13T13:05:00 (no timezone/Z suffix — this is local time at the destination airport, not UTC)" },
                          },
                          required: ["airline", "departureTime", "arrivalTime", "origin", "destination"]
                        }
                      }
                    },
                    required: ["type", "flights"]
                  },
                  {
                    type: "object",
                    title: "Stay",
                    description: "Details for content marked as hotel/stay booking details",
                    properties: {
                      type: { type: "string", enum: ["stay"] },
                      name: { type: "string", description: "The name of the hotel/stay" },
                      checkIn: { type: "string", description: "The local check-in date and time as written on the page, in 24-hour HH:MM format with the date, e.g. 2026-07-12T15:00:00 (no timezone/Z suffix — this is local time at the hotel, not UTC)" },
                      checkOut: { type: "string", description: "The local check-out date and time as written on the page, in 24-hour HH:MM format with the date, e.g. 2026-07-13T11:00:00 (no timezone/Z suffix — this is local time at the hotel, not UTC)" },
                      city: { type: "string", description: "The isolated city name where the hotel is located (e.g., Barcelona)" },
                      country: { type: "string", description: "The isolated country name where the hotel is located (e.g., Spain)" },
                    },
                    required: ["type", "name", "checkIn", "checkOut", "city", "country"]
                  },
                  {
                    type: "object",
                    title: "Irrelevant or Invalid",
                    description: "Use this option if the page lacks explicit flight/hotel booking confirmation data. NOTE, pages with incomplete booking data do NOT apply to this category. This is explicitly for sites that do not align with the functionality of this API, such as news articles, blogs, or other unrelated content.",
                    properties: {
                      type: { type: "string", enum: ["invalid"] },
                      success: { type: "boolean", description: "Must always be false for invalid or unrelated pages." },
                      reason: { type: "string", description: "A short, user-friendly explanation of why the page data is invalid (e.g., 'This page looks like a news article, not a booking confirmation. DON'T say the words flight or hotel here, just say booking.')" }
                    },
                    required: ["type", "success", "reason"]
                  }
                ]
              }
            },
            required: ["decision"]
          }
        }
      })
    })

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: "Gemini API error", details: errorText }),
        { status: response.status, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } }
      )
    }
    
    const data = await response.json() as any
    console.log("Gemini API Response:", JSON.stringify(data));
    const result = data.output_text || data.steps?.find((s: any) => s.type === "model_output")?.content?.[0]?.text

    if (!result) {
      return new Response(
        JSON.stringify({ error: "Empty response from Gemini", raw: data }),
        { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } } // 502 Bad Gateway
      )
    }

    let parsed
    try {
      parsed = JSON.parse(result.replace(/```json|```/g, "").trim()) // gets rid of any triple backticks that Gemini may have added to the response, and trims whitespace. Also transforms the string into a JSON.
    } catch {
      return new Response(
        JSON.stringify({ error: "Gemini returned malformed JSON", raw: result }),
        { status: 502, headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" } } // 502 Bad Gateway
      )
    }

    if (parsed.decision) {
      parsed.decision.confirmationLink = url // adds the original URL to the parsed decision object, so that the frontend can use it to link back to the confirmation page if needed.
    }

    return new Response(JSON.stringify(parsed), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    })
	},
}

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

    let text = "";

    try {
      const body = await request.json() as { text?: string };
      text = body.text ?? "";

      if (!text) {
        return new Response(
          JSON.stringify({ error: "Missing text field" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (err) {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body", details: String(err) }),
        { status: 400, headers: { "Content-Type": "application/json" } }
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
        input: `Extract booking details from this confirmation page text into a structured JSON format. Fill any missing fields with appropriate default values. Return only the JSON object, no markdown, no explanation. Content: ${text}`,
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
                      flights: {
                        type: "array",
                        description: "List of all flights extracted from the confirmation text",
                        items: {
                          type: "object",
                          properties: {
                            origin: { type: "string", description: "The 3-letter IATA airport code for the departure airport (e.g., MIA)" },
                            destination: { type: "string", description: "The 3-letter IATA airport code for the arrival airport (e.g., LAX)" },
                            airline: { type: "string", description: "The name of the airline" },
                            departureTime: { type: "string", description: "The departure time, must be in ISO 8601 format" },
                            arrivalTime: { type: "string", description: "The arrival time, must be in ISO 8601 format" },
                          },
                          required: ["airline", "departureTime", "arrivalTime", "origin", "destination"]
                        }
                      }
                    }
                  },
                  {
                    type: "object",
                    title: "Stay",
                    description: "Details for content marked as hotel/stay booking details",
                    properties: {
                      name: { type: "string", description: "The name of the hotel/stay" },
                      checkIn: { 
                        type: "string", 
                        description: "The check-in date and time in ISO 8601 format (e.g., YYYY-MM-DDTHH:MM:SSZ)" 
                      },
                      checkOut: { 
                        type: "string", 
                        description: "The check-out date and time in ISO 8601 format (e.g., YYYY-MM-DDTHH:MM:SSZ)" 
                      },
                      city: { 
                        type: "string", 
                        description: "The isolated city name where the hotel is located (e.g., Barcelona)" 
                      },
                      country: { 
                        type: "string", 
                        description: "The isolated country name where the hotel is located (e.g., Spain)" 
                      },
                    },
                    required: ["name", "checkIn", "checkOut", "city", "country"]
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
        { status: response.status, headers: { "Content-Type": "application/json" } }
      )
    }
    
    const data = await response.json() as any
    console.log("Gemini API Response:", JSON.stringify(data));
    const result = data.output_text || data.steps?.find((s: any) => s.type === "model_output")?.content?.[0]?.text
    return new Response(result.replace(/```json|```/g, "").trim(), { // this trims any leading or trailing whitespace and gets rid of the ai markdown that sometimes gets tacked on
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    })
	},
}

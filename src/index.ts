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
        model: "gemini-3.5-flash",
        input: `Extract booking details from this confirmation page text. Return ONLY a valid JSON object, no markdown, no explanation. Use null for any missing fields.
          If this is a flight confirmation:
          {
            "type": "flight",
            "origin": "IATA code",
            "destination": "IATA code",
            "airline": "airline name",
            "flightNumber": "e.g. AA1234",
            "departureTime": "ISO 8601 datetime",
            "arrivalTime": "ISO 8601 datetime"
          }

          If this is a hotel/accommodation confirmation:
          {
            "type": "stay",
            "name": "property name",
            "location": "city, country",
            "checkIn": "ISO 8601 datetime",
            "checkOut": "ISO 8601 datetime",
            "guests": 1
          }

          Page text:
          ${text}`
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
    const result = data.output_text || data.steps?.[0]?.content?.[0]?.text // path to the model response, straight from the Interactions API docs
    return new Response(result.replace(/```json|```/g, "").trim(), { // this trims any leading or trailing whitespace and gets rid of the ai markdown that sometimes gets tacked on
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    })
	},
}

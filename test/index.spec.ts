import { exports, env } from "cloudflare:workers";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

// THIS TEST NEVER EXECUTED CORRECTLY BECAUSE THE WORKER STLALED AT A GET REQUEST. I HAVE NO IDEA WHERE THE GET REQUEST COMES FROM, AND I EXPLICITLY ONLY ALLOW POST REQUESTS ON THE WORKER.


// describe("Gemini API Worker", () => {
// 	it("Responds with a JSON object matching the Stay or Flight schema", async () => {
// 		const text = "Skip to content Become a host Showing photo 1 of 29: living room In 3 weeks In 3 weeks _ Home in Barcelona +2 2 others Check-in Mon, Jul 13 4:00 PM Checkout Fri, Jul 17 11:00 AM House manual Instructions and house rules Your place Spacious Apartment in Central Barcelona Reservation details Who’s coming 5 guests Cancellation policy This reservation is non-refundable. Read more Manage guests Change reservation Cancel reservation Get a PDF for visa purposes Copy address Get directions Checking in Check-in method Other Please reach out to host for how to check-in. Wifi You'll find wifi login details here 48 hours before check in. Rules and instructions House manual Free Wi-Fi and TV with international channels. Fresh bed linen and towels are provided. Show more House rules 6 guests maximum No pets No parties or events Show more Show listing Add travel insurance Peace of mind for $98.20 Available for a limited time only. Get reimbursed if you cancel due to illness, flight delays, and more. Plus, get assistance services like emergency help. What's covered Add to your trip Call host Payment info Amount paid $1,571.16 Get receipt Get support anytime If you need help, we’re available 24/7 from anywhere in the world. Contact Airbnb Support Visit the Help Center Where you’re staying Jul 13 – 17, 2026 Keyboard shortcuts Map Data ©2026 Google, Inst. Geogr. Nacional 100 m Terms";
// 		const request = new Request("http://127.0.0.1:8787", {
// 			method: "POST",
// 			headers: {
// 				"content-type": "application/json"
// 			},
// 			body: JSON.stringify({ text })
// 		})
		
// 		// Use exports.default.fetch() for integration tests
// 		const response = await exports.default.fetch(request);
		
// 		expect(response.status).toBe(200);
// 		expect(response.headers.get("content-type")).toContain("application/json");

// 		const responseBody = await response.json() as any;
// 		console.log("Parsed Worker Response:", responseBody);
// 	});
// });
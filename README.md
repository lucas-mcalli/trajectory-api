# trajectory-api

Cloudflare Worker that powers the AI Autofill feature in [Trajectory](https://github.com/lucas-mcalli/trajectory). Receives page text and URL from the extension, sends it to the Gemini API, and returns structured booking data (flights or stays).

---

## How it works

1. The Trajectory extension extracts the text content of the current page and sends it to this worker via POST request
2. The worker forwards it to the Gemini API with a structured output schema
3. Gemini returns a typed `decision` object — either a flight booking, stay booking, or an invalid/irrelevant page signal
4. The worker attaches the original page URL as `confirmationLink` and returns the result to the extension

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### Installation

```bash
git clone https://github.com/lucas-mcalli/trajectory-api.git
cd trajectory-api
pnpm install
```

### Environment variables

Add your Gemini API key as a Cloudflare Worker secret:

```bash
wrangler secret put GEMINI_API_KEY
```

Get a free Gemini API key at [aistudio.google.com](https://aistudio.google.com).

### Development

```bash
pnpm dev
```

The worker will be available at `http://localhost:8787`.

### Deployment

```bash
npx wrangler deploy
```

After deploying, copy the worker URL from the Wrangler output and update the fetch call in the Trajectory extension to point to your deployment.

---

## API

### `POST /`

Extracts booking details from a page.

**Request body:**

```json
{
  "text": "...page text content...",
  "url": "https://www.airbnb.com/..."
}
```

**Response — flight:**

```json
{
  "decision": {
    "type": "flights",
    "flights": [
      {
        "airline": "easyJet",
        "origin": "CDG",
        "destination": "SPU",
        "departureTime": "2026-07-21T18:25:00",
        "arrivalTime": "2026-07-21T20:30:00"
      }
    ],
    "confirmationLink": "https://..."
  }
}
```

**Response — stay:**

```json
{
  "decision": {
    "type": "stay",
    "name": "Sunshine Apartment Bacvice",
    "checkIn": "2026-07-21T14:00:00",
    "checkOut": "2026-07-25T10:00:00",
    "city": "Split",
    "country": "Croatia",
    "confirmationLink": "https://..."
  }
}
```

**Response — invalid:**

```json
{
  "decision": {
    "type": "invalid",
    "success": false,
    "reason": "This page looks like a news article, not a booking confirmation."
  }
}
```

---

## Known Limitations

- The Gemini free tier has a limit of 500 requests per day. This may need to be expanded for heavier usage.
- Autofill will not work on pages that require authentication or load content dynamically after the initial page load.

---

## License

MIT

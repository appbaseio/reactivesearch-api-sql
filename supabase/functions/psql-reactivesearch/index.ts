// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { ReactiveSearch } from "./lib/esm/index.js"
import postgres from 'https://esm.sh/postgres'

const databaseURL: string = Deno.env.get("DB_URL") || 'postgresql://localhost:5432'
const openAIApiKey: string = Deno.env.get("OPENAI_API_KEY") || ''
const client = postgres(databaseURL);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey',
}


serve(async (req) => {
  const {url, method } = req
  const reqBody = await req.json()
  
  console.log(url);

  // This is needed if you're planning to invoke your function from a browser.
  if (method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (url.endsWith("/_reactivesearch") && method == "POST") {
    try {
			const ref = new ReactiveSearch({
				databaseName: "",
				client: client,
        openAIApiKey: openAIApiKey,
			});

			try {
				const data = await ref.query(reqBody.query);
        return new Response(
          JSON.stringify(data),
          { headers: { "Content-Type": "application/json" } }
        )
			} catch (err) {
				return new Response(
          JSON.stringify({
            error: {
              status: `Internal server error`,
              code: 500,
              message: err.message,
            },
          }),
          { headers: { "Content-Type": "application/json" } }
        );
			}
		} catch (error) {
			return new Response(JSON.stringify(
        {
          error: {
            message: error.message,
            code: 400,
            status: `Bad Request`,
          },
        }
      ),
      { headers: { "Content-Type": "application/json" } },
      );
		}
  } else if (url.endsWith("/_reactivesearch/validate") && method == "POST") {
    try {
			const ref = new ReactiveSearch({
				databaseName: "",
				client: client,
				openAIApiKey: openAIApiKey
			});

      const data = ref.translate(reqBody.query);
			return new Response(
        JSON.stringify(data),
        { headers: { "Content-Type": "application/json" } },
      )
		} catch (error) {
			return new Response(
        JSON.stringify({
          error: {
            message: error.message,
            code: 400,
            status: `Bad Request`,
          },
        }),
        { headers: { "Content-Type": "application/json" } },
      );
		}
  }

  return new Response(
    JSON.stringify({error: {
      message: "Something went wrong!",
      code: 500,
      status: "Internal Server Error"
    }}),
    { headers: { "Content-Type": "application/json" } },
  )
})

// To invoke:
// curl -i --location --request POST 'http://localhost:54321/functions/v1/' \
//   --header 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0' \
//   --header 'Content-Type: application/json' \
//   --data '{"name":"Functions"}'


export default {
  async fetch(request, env) {

    const origin = request.headers.get("Origin") || "";

    if (origin !== env.ALLOWED_ORIGIN) {
      return new Response("Forbidden", {
        status: 403
      });
    }

    const headers = {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    if (request.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { status: 405, headers }
      );
    }

    if (!env.OPENAI_API_KEY) {
      return new Response(
        JSON.stringify({ error: "API key missing" }),
        { status: 500, headers }
      );
    }

    try {
      const body = await request.json();

      if (
        !Array.isArray(body.messages) ||
        body.messages.length < 1 ||
        body.messages.length > 16
      ) {
        return new Response(
          JSON.stringify({ error: "Invalid messages" }),
          { status: 400, headers }
        );
      }

      const messages = body.messages.map(m => {
        if (
          !["user", "assistant"].includes(m.role) ||
          typeof m.content !== "string"
        ) {
          throw new Error("Invalid message");
        }

        return {
          role: m.role,
          content: m.content.slice(0, 6000)
        };
      });

      const result = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: env.OPENAI_MODEL || "gpt-6-astra",
            instructions:
              "أنت BRAVE AI مساعد ذكي ومحترف. أجب بالعربية عند مخاطبتك بالعربية. كن واضحاً ومفيداً ومنظماً ولا تخترع المعلومات.",
            input: messages.map(m => ({
              role: m.role,
              content: [{
                type: "input_text",
                text: m.content
              }]
            })),
            max_output_tokens: 1200
          })
        }
      );

      const data = await result.json();

      if (!result.ok) {
        return new Response(
          JSON.stringify({
            error: data.error?.message || "AI service error"
          }),
          { status: result.status, headers }
        );
      }

      const reply = (data.output || [])
        .filter(item => item.type === "message")
        .flatMap(item => item.content || [])
        .filter(item => item.type === "output_text")
        .map(item => item.text)
        .join("\n");

      return new Response(
        JSON.stringify({ reply }),
        { status: 200, headers }
      );

    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers }
      );
    }
  }
};

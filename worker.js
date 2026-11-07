
export default {
  async fetch(request, env) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    };

    const json = (data, status = 200) =>
      new Response(JSON.stringify(data), {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== "POST") {
      return json({ error: "Use POST for chat requests." }, 405);
    }

    if (!env.OPENAI_API_KEY) {
      return json({ error: "The AI key is not configured yet." }, 500);
    }

    try {
      const body = await request.json();
      const system = typeof body.system === "string" ? body.system : "";
      const messages = Array.isArray(body.messages) ? body.messages : [];

      const input = messages
        .filter(m =>
          m &&
          ["user", "assistant"].includes(m.role) &&
          typeof m.content === "string"
        )
        .slice(-30)
        .map(m => ({
          role: m.role,
          content: m.content
        }));

      if (!input.length) {
        return json({ error: "No chat messages were provided." }, 400);
      }

      const aiResponse = await fetch(
        "https://api.openai.com/v1/responses",
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            model: "gpt-6-luna",
            instructions: system || "You are voidAI, a helpful AI assistant.",
            input,
            max_output_tokens: 2000
          })
        }
      );

      const result = await aiResponse.json();

      if (!aiResponse.ok) {
        return json({
          error: result.error?.message || "The AI request failed."
        }, aiResponse.status);
      }

      const reply = result.output_text || "";

      return json({
        reply,
        message: reply,
        output_text: reply
      });
    } catch (error) {
      return json({ error: "Server error: " + error.message }, 500);
    }
  }
};

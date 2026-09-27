import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface LeadData {
  name?: string;
  email?: string;
  interest?: string;
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;

const SYSTEM_PROMPT = `You are "Jacques", the passionate, knowledgeable, and delightfully warm AI Assistant for Golden Crust Bakery in Seaside District.
You speak like a master artisan baker who has flour on their apron and truly loves bread, pastry, and community.

=== GOLDEN CRUST BAKERY CONTEXT ===
- Heritage: Founded in 1998 (28 years baking!) with a secondhand deck oven and a stubborn belief: "Bread deserves time."
- Location: 214 Harbor Lane, Seaside District (corner of Harbor & 2nd, with a sunny outdoor dog-friendly patio).
- Hours: Monday–Saturday 7:00 AM – 6:00 PM, Sunday 8:00 AM – 2:00 PM.
- Contact: Phone (555) 014-2288 | Email: hello@goldencrust.example
- Reviews: 4.9★ with over 2,300 local reviews. We supply 12 local specialty cafés and cater weddings across the county.
- Our Starter: "Old Jacques", our wild sourdough mother culture nurtured daily since 1998.

=== MENU & SIGNATURE SPECIALTIES ===
1. Country Sourdough ($6.50 / loaf)
   - 48-hour slow cold fermentation with heritage wild starter. Stone-baked daily on stone hearth deck ovens.
   - Ingredients: Just organic unbleached flour, water, sea salt, and wild starter. 100% naturally vegan!
   - Taste & Texture: Blistered, crackling deep amber crust, custard-like open crumb with an earthy, complex lactic tang.
   - Digestion note: The 48-hour fermentation naturally pre-digests gluten and breaks down phytic acid; many people with mild gluten sensitivities find it much easier on their digestion (not certified for celiac).

2. Butter Croissant ($3.75)
   - Laminated over 3 whole days using imported French cultured butter (84% butterfat).
   - Hundreds of paper-thin crisp layers, golden honeycomb interior, rich hazelnut-butter aroma.

3. Chocolate Celebration Cake ($42.00 / 8-inch, serves 8-12)
   - 3 decadent layers of Valrhona dark chocolate sponge, brown butter ganache, and Madagascar vanilla buttercream.
   - Includes custom hand-piped messages, fresh seasonal berries, or edible local farm flowers.
   - Ordering note: Requires 48–72 hours advance notice so our pastry chef can decorate it by hand.

4. Cinnamon Morning Bun ($4.25)
   - Fluffy, buttery brioche dough rolled with organic Ceylon cinnamon and brown sugar, topped with real vanilla bean glaze.
   - Best warm! Fresh out of the oven every morning at 7:00 AM and 10:30 AM.

5. Parisian Baguette ($3.50)
   - Traditional French poolish method, 24-hr fermentation. Thin crackling crust, cream-colored open crumb with wheat sweetness.

6. Sea Salt Dark Chocolate Cookies ($12.00 / 6-pack)
   - Nutty brown butter, 70% bittersweet Valrhona chocolate puddles, sprinkled with flaky Maldon sea salt.

=== COFFEE & DRINKS ===
- Full espresso bar featuring locally roasted beans. Oat milk, almond milk, and whole milk available.
- Cold brew on tap, ceremonial matcha lattes, and loose-leaf herbal teas.

=== DIETARY & ALLERGIES ===
- Vegan: Country Sourdough, Parisian Baguette, Olive Ciabatta, and our house Vegan Oat Scone are 100% plant-based.
- Gluten-free: We bake almond flour fudge brownies and flourless chocolate tortes in a sanitized morning prep block. We are NOT a certified celiac-free facility because we mill flour in-house.
- Nuts: Almonds, pecans, and walnuts are used in certain pastries and are strictly labeled.

=== CATERING, EVENTS & WHOLESALE ===
- Catering: Morning pastry boxes, artisan sandwich lunch platters (served on fresh focaccia/baguettes), and 96oz coffee traveler boxes. Minimum 15 guests; 72 hours notice.
- Weddings: Custom 2-tier and 3-tier rustic cakes and dessert dessert grazing tables. Tasting appointments available on Tuesdays & Thursdays.
- Wholesale: Daily delivery to 12 partner cafés across the county.

=== YOUR PERSONALITY & BEHAVIOR ===
- Talk naturally, warmly, and concisely (1–3 sentences per response). You are a real conversationalist, not a FAQ robot!
- Talk about the aroma, the crumb, the oven heat, and baking methods with genuine enthusiasm.
- If someone asks something off-topic (e.g., life advice, coding, history), humorously relate it back to baking or answer with charming neighborhood hospitality.
- If the visitor wants to order, get a cake quote, or cater an event, answer their questions enthusiastically and ask for their name and email so the kitchen can confirm or hold items.
- Whenever a name and/or email address is provided by the user, extract it and append this hidden tag at the very end of your response:
<!--LEAD:{"name":"...","email":"...","interest":"..."}-->
Only include fields actually mentioned. If both name and email are present, the system will automatically dispatch the lead to the bakery webhook.`;

class LeadTagFilter {
  private buffer = "";
  private inTag = false;
  private extractedTag = "";

  process(chunk: string): string {
    this.buffer += chunk;
    let output = "";

    while (this.buffer.length > 0) {
      if (!this.inTag) {
        const tagStart = this.buffer.indexOf("<!--");
        if (tagStart === -1) {
          const partialMatch = this.buffer.match(/<!?-?-?$/);
          if (partialMatch && partialMatch.index !== undefined) {
            output += this.buffer.slice(0, partialMatch.index);
            this.buffer = this.buffer.slice(partialMatch.index);
            break;
          } else {
            output += this.buffer;
            this.buffer = "";
            break;
          }
        } else {
          output += this.buffer.slice(0, tagStart);
          this.buffer = this.buffer.slice(tagStart);
          this.inTag = true;
        }
      } else {
        const tagEnd = this.buffer.indexOf("-->");
        if (tagEnd === -1) {
          break;
        } else {
          this.extractedTag += this.buffer.slice(0, tagEnd + 3);
          this.buffer = this.buffer.slice(tagEnd + 3);
          this.inTag = false;
        }
      }
    }
    return output;
  }

  flush(): string {
    if (this.buffer && !this.buffer.startsWith("<!--LEAD:")) {
      const out = this.buffer;
      this.buffer = "";
      return out;
    }
    return "";
  }

  getExtractedTag(): string {
    return this.extractedTag;
  }
}

function extractLeadFromTagOrText(
  rawText: string,
  currentLead: LeadData = {}
): { lead: LeadData; isComplete: boolean } {
  const lead: LeadData = { ...currentLead };
  const leadTagMatch = rawText.match(/<!--LEAD:(.*?)-->/);
  if (leadTagMatch) {
    try {
      const parsed = JSON.parse(leadTagMatch[1]);
      if (parsed.name && typeof parsed.name === "string") lead.name = parsed.name.trim();
      if (parsed.email && typeof parsed.email === "string") lead.email = parsed.email.trim().toLowerCase();
      if (parsed.interest && typeof parsed.interest === "string") lead.interest = parsed.interest.trim();
    } catch {
      /* ignore */
    }
  }

  const emailMatch = rawText.match(EMAIL_RE);
  if (emailMatch && !lead.email) {
    lead.email = emailMatch[0].toLowerCase();
  }

  const isComplete = Boolean(lead.name && lead.name.length >= 2 && lead.email && EMAIL_RE.test(lead.email));
  return { lead, isComplete };
}

async function* parseGeminiSSE(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const jsonStr = trimmed.slice(5).trim();
      try {
        const parsed = JSON.parse(jsonStr);
        const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) yield text;
      } catch {
        /* ignore parse errors in SSE line */
      }
    }
  }
}

async function* streamLocalResponse(text: string) {
  const words = text.split(" ");
  for (let i = 0; i < words.length; i++) {
    yield (i === 0 ? "" : " ") + words[i];
    await new Promise((r) => setTimeout(r, 20));
  }
}

function localSmartBakeryResponse(
  messages: ChatMessage[],
  currentLead: LeadData = {}
): { reply: string; lead: LeadData; isComplete: boolean } {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
  const lower = lastUserMsg.toLowerCase();
  const lead: LeadData = { ...currentLead };

  const emailMatch = lastUserMsg.match(EMAIL_RE);
  if (emailMatch) {
    lead.email = emailMatch[0].toLowerCase();
  }

  const nameMatch = lastUserMsg.match(/(?:my name is|i am|i'm|call me|this is)\s+([A-Za-zÀ-ÿ\s]{2,25})/i);
  if (nameMatch) {
    lead.name = nameMatch[1].trim();
  } else if (!lead.name && !emailMatch && lastUserMsg.split(" ").length <= 3 && lastUserMsg.length > 1 && !/menu|cake|bread|hour|where|price|sourdough|croissant/i.test(lastUserMsg)) {
    lead.name = lastUserMsg.trim();
  }

  let reply = "";

  if (lead.email && lead.name) {
    reply = `Wonderful, ${lead.name}! 🥖 I've saved your details and sent them straight to our baking team at ${lead.email}. We'll follow up shortly about ${lead.interest || "your bakery order"}. Can I help you with anything else today?`;
  } else if (lower.includes("order:") && lower.includes("total")) {
    lead.interest = lastUserMsg;
    reply = `I have your fresh order ready for our deck ovens! What's your name and best email address so we can send your pickup confirmation?`;
  } else if (lower.includes("sourdough") || lower.includes("starter") || lower.includes("ferment")) {
    lead.interest = lead.interest || "Country Sourdough";
    reply = `Our Country Sourdough ($6.50) is fermented for 48 hours with 'Old Jacques', our wild starter nurtured since 1998! Just organic flour, water, and sea salt—crispy blistered crust, airy crumb, and 100% naturally vegan. Would you like us to set a loaf aside for you?`;
  } else if (lower.includes("gluten") || lower.includes("celiac") || lower.includes("sensitive")) {
    reply = `Our 48-hour fermented sourdough is naturally low in complex fructans, so many with mild gluten sensitivities digest it easily! For strict gluten-free diets, we bake daily almond flour dark chocolate brownies in a dedicated station.`;
  } else if (lower.includes("cake") || lower.includes("birthday") || lower.includes("celebrat")) {
    lead.interest = lead.interest || "Celebration Cake";
    reply = `Our Chocolate Celebration Cake ($42.00) is made with Valrhona dark chocolate and custom hand-piped lettering or fresh berries! We just need 48 hours notice. What date are you celebrating, and what name & email should we use for your quote?`;
  } else if (lower.includes("croissant") || lower.includes("pastry") || lower.includes("morning bun")) {
    lead.interest = lead.interest || "Viennoiserie & Pastries";
    reply = `Our Butter Croissants ($3.75) are laminated over three days with 84% French cultured butter for hundreds of whisper-thin flaky layers. Pair one with a warm Ceylon Cinnamon Morning Bun ($4.25)!`;
  } else if (lower.includes("coffee") || lower.includes("drink") || lower.includes("tea") || lower.includes("latte")) {
    reply = `We pull espresso from locally roasted beans daily, plus oat milk lattes, cold brew on tap, and organic teas. It pairs heavenly with a fresh morning bun!`;
  } else if (lower.includes("hour") || lower.includes("open") || lower.includes("close") || lower.includes("time") || lower.includes("when")) {
    reply = `We're baking early every day! 📍 Mon–Sat 7:00–18:00 and Sun 8:00–14:00 at 214 Harbor Lane in the Seaside District. Warm croissants come out right at 7:00 AM!`;
  } else if (lower.includes("cater") || lower.includes("wholesale") || lower.includes("wedding") || lower.includes("party")) {
    lead.interest = lead.interest || "Catering & Events";
    reply = `We cater office breakfasts, weddings, and parties with custom pastry boxes and sandwich platters (15+ guests). What date is your event, and what's your name and email so we can send our catering guide?`;
  } else if (lower.includes("dog") || lower.includes("pet") || lower.includes("patio")) {
    reply = `Yes! We love dogs! Our sun patio on Harbor Lane is fully dog-friendly, and we keep water bowls and fresh spent-grain dog biscuits right by the entrance. 🐾`;
  } else if (lower.includes("recommend") || lower.includes("favorite") || lower.includes("best") || lower.includes("suggest")) {
    reply = `If it's your first time, you must try our Country Sourdough ($6.50) fresh from the stone hearth, or treat yourself to a Butter Croissant ($3.75) and Ceylon Cinnamon Morning Bun ($4.25) with a fresh latte!`;
  } else if (lower.includes("reheat") || lower.includes("warm") || lower.includes("store") || lower.includes("freeze")) {
    reply = `For sourdough or croissants, pop them in a 350°F (175°C) oven for 4–5 minutes—the crust turns crackling crisp again! You can also freeze sliced sourdough in an airtight bag for up to 3 months.`;
  } else if (lower.includes("baguette")) {
    reply = `Our Parisian Baguette ($3.50) uses a traditional 24-hr French poolish method for a crackly golden crust and open, cream-colored crumb. They come out hot at 7:00 AM!`;
  } else if (lower.includes("cookie") || lower.includes("chocolate chunk") || lower.includes("treat")) {
    reply = `Our Sea Salt Choc Cookies ($12.00 / 6-pack) feature nutty browned butter, molten pools of 70% Valrhona dark chocolate, and crunchy flakes of Maldon sea salt. They're irresistible!`;
  } else if (lower.includes("who") || lower.includes("founder") || lower.includes("story") || lower.includes("about")) {
    reply = `Golden Crust started in 1998 right here in Seaside District with a secondhand deck oven and a passion for slow fermentation. 28 years later, we still ferment every loaf for 48 hours and know our regulars by name!`;
  } else if (lead.name && !lead.email) {
    reply = `Delighted to meet you, ${lead.name}! What's the best email address to send your bakery confirmation and weekly specials?`;
  } else if (lower.includes("hi") || lower.includes("hello") || lower.includes("hey") || lower.includes("good morning")) {
    reply = `Good day and welcome to Golden Crust! 👋 The deck ovens are hot and we've got fresh sourdough, flaky croissants, and morning buns. What can I get started for you?`;
  } else {
    reply = `I'd love to help you with that! We craft stone-baked sourdough, French viennoiserie, and custom celebration cakes right here on Harbor Lane. What's your name and email so we can take care of your request?`;
  }

  const isComplete = Boolean(lead.name && lead.name.length >= 2 && lead.email && EMAIL_RE.test(lead.email));
  return { reply, lead, isComplete };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { messages = [], leadData = {} } = body as {
      messages: ChatMessage[];
      leadData?: LeadData;
    };

    const geminiKey = process.env.GEMINI_API_KEY;
    const encoder = new TextEncoder();

    // Prepare stream response
    const stream = new ReadableStream({
      async start(controller) {
        const sendToken = (text: string) => {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "token", text })}\n\n`)
          );
        };

        const sendDone = (
          provider: string,
          model: string,
          lead: LeadData,
          isComplete: boolean
        ) => {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "done",
                provider,
                model,
                lead,
                isComplete,
              })}\n\n`
            )
          );
        };

        const tagFilter = new LeadTagFilter();
        let fullRawText = "";
        let streamSuccess = false;

        if (geminiKey) {
          const modelsToTry = [
            "gemini-3.8-flash",
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite",
          ];

          for (const model of modelsToTry) {
            try {
              const geminiContents = messages
                .filter((m) => m.role === "user" || m.role === "assistant")
                .map((m) => ({
                  role: m.role === "assistant" ? "model" : "user",
                  parts: [{ text: m.content }],
                }));

              const res = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiKey}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    system_instruction: {
                      parts: [{ text: SYSTEM_PROMPT }],
                    },
                    contents: geminiContents,
                    generationConfig: {
                      temperature: 0.75,
                      maxOutputTokens: 350,
                    },
                  }),
                }
              );

              if (res.ok && res.body) {
                for await (const chunk of parseGeminiSSE(res.body)) {
                  fullRawText += chunk;
                  const displayChunk = tagFilter.process(chunk);
                  if (displayChunk) {
                    sendToken(displayChunk);
                  }
                }

                const remainder = tagFilter.flush();
                if (remainder) sendToken(remainder);

                const completeTag = tagFilter.getExtractedTag() || fullRawText;
                const { lead, isComplete } = extractLeadFromTagOrText(completeTag, leadData);

                sendDone("gemini", model, lead, isComplete);
                streamSuccess = true;
                break;
              } else {
                console.warn(`Gemini model ${model} stream error status:`, res.status);
              }
            } catch (err) {
              console.warn(`Gemini model ${model} stream failed:`, err);
            }
          }
        }

        // Fallback to local smart stream if Gemini was unavailable or not configured
        if (!streamSuccess) {
          const { reply, lead, isComplete } = localSmartBakeryResponse(messages, leadData);
          for await (const word of streamLocalResponse(reply)) {
            sendToken(word);
          }
          sendDone("local-smart", "bakery-knowledge-v1", lead, isComplete);
        }

        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Chat route streaming error:", error);
    return NextResponse.json(
      {
        reply: "Welcome to Golden Crust Bakery! Our ovens are hot with fresh sourdough and flaky croissants. How can we help you today?",
        provider: "fallback",
        model: "safe-fallback",
        lead: {},
        isComplete: false,
      },
      { status: 200 }
    );
  }
}

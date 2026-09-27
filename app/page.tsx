"use client";

import { useState } from "react";
import CopySnippet from "./components/CopySnippet";

declare global {
  interface Window {
    GoldenCrustChat?: {
      open: (interest?: string) => void;
      close: () => void;
    };
  }
}

const SNIPPET = `<script src="/chatbot-snippet.js" data-key="demo"></script>`;

interface Product {
  id: string;
  name: string;
  desc: string;
  price: number;
  emoji: string;
}

const PRODUCTS: Product[] = [
  { id: "sourdough", name: "Country Sourdough", desc: "48-hour fermented, stone-baked daily", price: 6.5, emoji: "🍞" },
  { id: "croissant", name: "Butter Croissant", desc: "Laminated over 3 days, French butter", price: 3.75, emoji: "🥐" },
  { id: "choc-cake", name: "Chocolate Celebration Cake", desc: "Custom messages & decorations", price: 42.0, emoji: "🍰" },
  { id: "cinnamon", name: "Cinnamon Morning Bun", desc: "Brioche, Ceylon cinnamon, vanilla glaze", price: 4.25, emoji: "🥮" },
  { id: "baguette", name: "Parisian Baguette", desc: "Crackling crust, open crumb", price: 3.5, emoji: "🥖" },
  { id: "cookies", name: "Sea Salt Choc Cookies (6)", desc: "Brown butter, dark chocolate chunks", price: 12.0, emoji: "🍪" },
];

interface CartLine {
  product: Product;
  qty: number;
}

const NAV = [
  { label: "Menu", href: "#menu" },
  { label: "About", href: "#about" },
  { label: "Reviews", href: "#reviews" },
  { label: "Contact", href: "#contact" },
  { label: "Integration", href: "#integration" },
];

export default function DemoSite() {
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutNote, setCheckoutNote] = useState<string | null>(null);

  const addToCart = (product: Product) => {
    setCart((c) => {
      const line = c.find((l) => l.product.id === product.id);
      if (line) {
        return c.map((l) =>
          l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l
        );
      }
      return [...c, { product, qty: 1 }];
    });
  };

  const removeFromCart = (id: string) => {
    setCart((c) => c.filter((l) => l.product.id !== id));
  };

  const count = cart.reduce((n, l) => n + l.qty, 0);
  const total = cart.reduce((n, l) => n + l.qty * l.product.price, 0);

  const openChat = (interest?: string) => {
    if (window.GoldenCrustChat) {
      window.GoldenCrustChat.open(interest);
    } else {
      // Fallback: open the standalone widget page if the snippet failed to load.
      window.open("/widget", "_blank", "width=400,height=620");
    }
  };

  const checkoutViaChat = () => {
    if (cart.length === 0) return;
    const summary =
      "Order: " +
      cart.map((l) => `${l.qty}× ${l.product.name}`).join(", ") +
      ` (total $${total.toFixed(2)})`;
    setCartOpen(false);
    setCheckoutNote("Opening chat to complete your order…");
    window.setTimeout(() => setCheckoutNote(null), 3500);
    openChat(summary);
  };

  return (
    <div className="min-h-screen">
      {/* ---------- nav ---------- */}
      <header className="sticky top-0 z-40 border-b border-amber-200/60 bg-amber-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="#top" className="flex items-center gap-2">
            <span className="text-2xl">🥖</span>
            <span className="font-serif text-xl font-bold text-amber-900">
              Golden Crust Bakery
            </span>
          </a>
          <nav className="hidden items-center gap-6 text-sm font-medium text-stone-700 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="hover:text-amber-700">
                {n.label}
              </a>
            ))}
            <a
              href="/dashboard"
              className="rounded-full bg-stone-900 px-3 py-1.5 text-white hover:bg-stone-700"
            >
              Dashboard
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openChat()}
              className="hidden rounded-full bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700 sm:block"
            >
              Chat with us
            </button>
            <button
              onClick={() => setCartOpen((o) => !o)}
              aria-label="Open cart"
              className="relative rounded-full border border-amber-300 bg-white px-4 py-2 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              🛒 Cart
              {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-600 text-[11px] font-bold text-white">
                  {count}
                </span>
              )}
            </button>
          </div>
        </div>
        {cartOpen && (
          <div className="absolute right-4 top-full z-50 mt-1 w-80 rounded-xl border border-amber-200 bg-white p-4 shadow-xl">
            <p className="mb-2 font-semibold text-stone-800">Your order</p>
            {cart.length === 0 ? (
              <p className="text-sm text-stone-500">
                Your cart is empty — add something delicious from the menu.
              </p>
            ) : (
              <>
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {cart.map((l) => (
                    <li
                      key={l.product.id}
                      className="flex items-center justify-between text-sm"
                    >
                      <span>
                        {l.qty}× {l.product.name}
                      </span>
                      <span className="flex items-center gap-2">
                        <span className="font-medium">
                          ${(l.qty * l.product.price).toFixed(2)}
                        </span>
                        <button
                          onClick={() => removeFromCart(l.product.id)}
                          aria-label={`Remove ${l.product.name}`}
                          className="text-stone-400 hover:text-red-600"
                        >
                          ✕
                        </button>
                      </span>
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-stone-200 pt-2 font-semibold">
                  <span>Total</span>
                  <span className="font-serif text-base text-amber-900">${total.toFixed(2)}</span>
                </div>
                <button
                  onClick={checkoutViaChat}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-amber-600 to-amber-700 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow hover:from-amber-700 hover:to-amber-800 transition-all active:scale-95"
                >
                  <span>🛒</span>
                  <span>Checkout via Chatbot →</span>
                </button>
                <p className="mt-1.5 text-center text-[11px] text-stone-500">
                  Transfers order to chatbot &amp; submits to webhook
                </p>
              </>
            )}
          </div>
        )}
      </header>

      {checkoutNote && (
        <div className="fixed left-1/2 top-20 z-50 -translate-x-1/2 rounded-full bg-stone-900 px-5 py-2.5 text-sm text-white shadow-lg">
          {checkoutNote}
        </div>
      )}

      {/* ---------- hero ---------- */}
      <section id="top" className="bg-gradient-to-b from-amber-100 to-amber-50">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <p className="mb-3 inline-block rounded-full bg-amber-200/70 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-amber-900">
              Baked fresh every morning
            </p>
            <h1 className="font-serif text-4xl font-bold leading-tight text-amber-950 md:text-5xl">
              Real bread. Real butter. Zero shortcuts.
            </h1>
            <p className="mt-4 max-w-md text-stone-600">
              A neighborhood bakery crafting sourdough, viennoiserie and custom
              celebration cakes since 1998. Order ahead for pickup, or chat with
              us about catering and wholesale.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a
                href="#menu"
                className="rounded-full bg-amber-600 px-6 py-3 text-sm font-semibold text-white hover:bg-amber-700"
              >
                Browse the menu
              </a>
              <button
                onClick={() => openChat()}
                className="rounded-full border border-amber-600 px-6 py-3 text-sm font-semibold text-amber-800 hover:bg-amber-100"
              >
                💬 Chat with us
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { emoji: "🥐", label: "Viennoiserie" },
              { emoji: "🍰", label: "Custom cakes" },
              { emoji: "🥖", label: "Artisan breads" },
              { emoji: "🍪", label: "Cookies & treats" },
            ].map((c) => (
              <div
                key={c.label}
                className="flex flex-col items-center justify-center rounded-2xl bg-white p-8 shadow-sm"
              >
                <span className="text-5xl">{c.emoji}</span>
                <span className="mt-2 text-sm font-medium text-stone-600">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- menu ---------- */}
      <section id="menu" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="font-serif text-3xl font-bold text-amber-950">Today&apos;s menu</h2>
        <p className="mt-2 text-stone-600">
          Add items to your cart, then check out through the chat widget — the
          same one any visitor sees.
        </p>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PRODUCTS.map((p) => (
            <div
              key={p.id}
              className="flex flex-col rounded-2xl border border-amber-200/60 bg-white p-5 shadow-sm"
            >
              <span className="text-4xl">{p.emoji}</span>
              <h3 className="mt-3 font-semibold text-stone-900">{p.name}</h3>
              <p className="mt-1 flex-1 text-sm text-stone-500">{p.desc}</p>
              <div className="mt-4 flex items-center justify-between gap-2">
                <span className="font-serif text-xl font-bold text-amber-800">
                  ${p.price.toFixed(2)}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => openChat(`I'd like to order the ${p.name} ($${p.price.toFixed(2)})`)}
                    title={`Inquire or order ${p.name} via chat`}
                    className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-900 transition-colors hover:bg-amber-100"
                  >
                    💬 Chat
                  </button>
                  <button
                    onClick={() => addToCart(p)}
                    className="rounded-full bg-amber-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-amber-700"
                  >
                    Add to order
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- about ---------- */}
      <section id="about" className="scroll-mt-20 bg-white">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl font-bold text-amber-950">Our story</h2>
            <p className="mt-4 text-stone-600">
              Golden Crust started in 1998 with a secondhand deck oven and a
              stubborn belief: bread deserves time. Twenty-eight years later we
              still ferment every loaf for 48 hours, laminate every croissant
              over three days, and decorate every celebration cake by hand.
            </p>
            <p className="mt-3 text-stone-600">
              We supply twelve local cafés, cater weddings across the county,
              and — most importantly — we know most of our regulars by name.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { n: "28", l: "years baking" },
              { n: "12", l: "café partners" },
              { n: "4.9★", l: "2,300+ reviews" },
            ].map((s) => (
              <div
                key={s.l}
                className="flex flex-col items-center justify-center rounded-2xl bg-amber-50 p-6 text-center"
              >
                <span className="font-serif text-3xl font-bold text-amber-800">{s.n}</span>
                <span className="mt-1 text-xs text-stone-500">{s.l}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- reviews ---------- */}
      <section id="reviews" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="font-serif text-3xl font-bold text-amber-950">What neighbors say</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            { q: "The sourdough ruined supermarket bread for me forever. Worth every penny.", a: "Maya R., regular since 2015" },
            { q: "They made our wedding cake exactly like the sketch — guests still talk about it.", a: "Daniel & Priya K." },
            { q: "Ordered catering for 80 people through their chat. Flawless.", a: "Sofia L., office manager" },
          ].map((t) => (
            <figure key={t.a} className="rounded-2xl border border-amber-200/60 bg-white p-5 shadow-sm">
              <blockquote className="text-stone-700">“{t.q}”</blockquote>
              <figcaption className="mt-3 text-sm font-medium text-amber-800">— {t.a}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* ---------- contact ---------- */}
      <section id="contact" className="scroll-mt-20 bg-amber-900 text-amber-50">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 md:grid-cols-2">
          <div>
            <h2 className="font-serif text-3xl font-bold">Visit us</h2>
            <ul className="mt-4 space-y-2 text-amber-100">
              <li>📍 214 Harbor Lane, Seaside District</li>
              <li>🕖 Mon–Sat 7:00–18:00 · Sun 8:00–14:00</li>
              <li>📞 (555) 014-2288</li>
              <li>✉️ hello@goldencrust.example</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-amber-800/60 p-6">
            <h3 className="font-semibold">Prefer to message us?</h3>
            <p className="mt-1 text-sm text-amber-200">
              The chat bubble in the bottom-right corner collects your name,
              email and what you&apos;re after — then sends it straight to our
              system.
            </p>
            <button
              onClick={() => openChat()}
              className="mt-4 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
            >
              💬 Start a chat
            </button>
          </div>
        </div>
      </section>

      {/* ---------- integration ---------- */}
      <section id="integration" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-16">
        <h2 className="font-serif text-3xl font-bold text-amber-950">
          How this was integrated
        </h2>
        <p className="mt-2 max-w-2xl text-stone-600">
          The chat widget on this page was added with a single line of code —
          no frameworks, no build step, no dependencies. It works on any
          website: paste the snippet and the widget loads itself.
        </p>

        <div className="mt-6">
          <CopySnippet code={SNIPPET} />
        </div>

        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            {
              t: "1. Paste the snippet",
              d: "One <script> tag before </body>. The loader reads its own data-key, injects the widget iframe, and exposes window.GoldenCrustChat.open() for buttons like “Checkout via chat”.",
            },
            {
              t: "2. Widget collects the lead",
              d: "A guided conversation asks for name, validates the email format, and captures what the visitor is interested in — with retry handling if the network fails.",
            },
            {
              t: "3. Webhook receives JSON",
              d: "On completion the widget POSTs { name, email, interest, source, timestamp } to /api/webhook, which validates, stores, and logs every hit — verifiable in the dashboard.",
            },
          ].map((s) => (
            <div key={s.t} className="rounded-2xl border border-amber-200/60 bg-white p-5 shadow-sm">
              <h3 className="font-semibold text-stone-900">{s.t}</h3>
              <p className="mt-2 text-sm text-stone-600">{s.d}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap gap-3">
          <a
            href="/dashboard"
            className="rounded-full bg-stone-900 px-6 py-3 text-sm font-semibold text-white hover:bg-stone-700"
          >
            Open the integration dashboard →
          </a>
          <a
            href="/widget"
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-stone-300 bg-white px-6 py-3 text-sm font-semibold text-stone-700 hover:bg-stone-100"
          >
            Preview the widget standalone
          </a>
        </div>
      </section>

      {/* ---------- footer ---------- */}
      <footer className="border-t border-amber-200/60 bg-amber-50">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-sm text-stone-500 md:flex-row">
          <span>© 2026 Golden Crust Bakery — demo site for a chatbot integration prototype.</span>
          <span className="flex gap-4">
            <a href="#menu" className="hover:text-amber-700">Menu</a>
            <a href="#integration" className="hover:text-amber-700">Integration</a>
            <a href="/dashboard" className="hover:text-amber-700">Dashboard</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

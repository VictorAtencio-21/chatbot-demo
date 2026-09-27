/*
 * Golden Crust Bakery — Chatbot embed snippet
 *
 * Usage (paste anywhere before </body>):
 *   <script src="/chatbot-snippet.js" data-key="demo"></script>
 *
 * Optional attributes:
 *   data-key         Site identifier, forwarded to the widget (default: "demo")
 *   data-widget-url  Full URL of the widget page (default: <origin>/widget?key=...)
 *
 * How it works:
 *  - Injects a fixed-position iframe that loads the chat widget. Nothing else
 *    is required on the host page — no frameworks, no dependencies.
 *  - The widget notifies this loader via postMessage when the chat panel
 *    opens/closes, and the loader resizes the iframe accordingly so the
 *    collapsed launcher never blocks page content.
 *  - Exposes window.GoldenCrustChat.open(interest?) / .close() so the host
 *    site can open the chat programmatically (e.g. a "Checkout via chat"
 *    button).
 */
(function () {
  "use strict";

  // Prevent duplicate execution
  if (window.__gcChatLoaded) return;

  // CRITICAL: Never execute inside an iframe (prevents recursive duplicate buttons)
  try {
    if (window.self !== window.top) return;
  } catch {
    return;
  }

  // Never execute on the standalone widget page
  if (window.location.pathname.startsWith("/widget")) return;

  window.__gcChatLoaded = true;

  function findScriptTag() {
    if (document.currentScript) return document.currentScript;
    var scripts = document.getElementsByTagName("script");
    for (var i = scripts.length - 1; i >= 0; i--) {
      var src = scripts[i].getAttribute("src") || "";
      if (src.indexOf("chatbot-snippet.js") !== -1) return scripts[i];
    }
    return null;
  }

  var tag = findScriptTag();
  var siteKey = (tag && tag.getAttribute("data-key")) || "demo";
  var widgetUrl =
    (tag && tag.getAttribute("data-widget-url")) ||
    window.location.origin + "/widget?key=" + encodeURIComponent(siteKey);

  var CLOSED = { w: "80px", h: "80px", radius: "0", shadow: "none" };
  var OPEN = {
    w: "min(400px, calc(100vw - 40px))",
    h: "min(620px, calc(100dvh - 110px))",
    radius: "20px",
    shadow: "0 24px 64px rgba(0, 0, 0, 0.25)",
  };

  var iframe = document.createElement("iframe");
  iframe.src = widgetUrl;
  iframe.title = "Chat with Golden Crust Bakery";
  iframe.setAttribute("aria-label", "Open the chat widget");

  var s = iframe.style;
  s.position = "fixed";
  s.bottom = "20px";
  s.right = "20px";
  s.width = CLOSED.w;
  s.height = CLOSED.h;
  s.border = "0";
  s.borderRadius = CLOSED.radius;
  s.overflow = "hidden";
  s.background = "transparent";
  s.zIndex = "2147483000";
  s.transition =
    "width 0.25s ease, height 0.25s ease, box-shadow 0.25s ease, border-radius 0.25s ease";

  function applySize(size) {
    s.width = size.w;
    s.height = size.h;
    s.borderRadius = size.radius;
    s.boxShadow = size.shadow;
  }

  function setOpen(open) {
    applySize(open ? OPEN : CLOSED);
  }

  function postToWidget(message) {
    try {
      iframe.contentWindow.postMessage(message, "*");
    } catch (e) {
      /* iframe not ready yet — the retry below covers it */
    }
  }

  // The widget tells us when its panel opens/closes so we can resize.
  window.addEventListener("message", function (event) {
    var data = event.data;
    if (!data || data.source !== "gc-chat-widget") return;
    if (data.event === "open") setOpen(true);
    else if (data.event === "close") setOpen(false);
  });

  // Public API for the host page.
  window.GoldenCrustChat = {
    open: function (interest) {
      setOpen(true);
      var msg = {
        source: "gc-chat-snippet",
        event: "open-panel",
        interest: interest || null,
      };
      postToWidget(msg);
      // Retry once in case the iframe was still loading.
      setTimeout(function () {
        postToWidget(msg);
      }, 700);
    },
    close: function () {
      postToWidget({ source: "gc-chat-snippet", event: "close-panel" });
      setOpen(false);
    },
  };

  function mount() {
    if (document.body) {
      document.body.appendChild(iframe);
    } else {
      // Snippet placed in <head>: wait for the body.
      document.addEventListener("DOMContentLoaded", function () {
        document.body.appendChild(iframe);
      });
    }
  }
  mount();
})();

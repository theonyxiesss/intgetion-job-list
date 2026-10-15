/**
 * First document inside Telegram (D426). Phone clients often deliver
 * `initData` only after `WebApp.ready()`, and an HTTP redirect drops the
 * hash. Call ready, keep the signed string, then the real page can sign in.
 */
export const TELEGRAM_WEB_APP_BOOT_SCRIPT =
  '(function(){var n=0;function pull(){try{var h=location.hash||"";if(h.indexOf("tgWebAppData")!==-1)sessionStorage.setItem("tg_web_app_hash",h);var w=window.Telegram&&window.Telegram.WebApp;if(w&&typeof w.ready==="function")w.ready();if(w&&w.initData)sessionStorage.setItem("tg_web_app_init",w.initData);}catch(e){}}function tick(){pull();if(++n<50)setTimeout(tick,100);}tick();})();';

/**
 * Bounce used when the first URL would be replaced by an HTTP redirect
 * (`/en`, and the root while a locale redirect is still possible). Waits up
 * to 5s for the phone bridge, then moves with the hash still attached.
 */
export const TELEGRAM_MINI_APP_BOUNCE_SCRIPT =
  '(function(){function stash(){try{var h=location.hash||"";if(h.indexOf("tgWebAppData")!==-1)sessionStorage.setItem("tg_web_app_hash",h);var w=window.Telegram&&window.Telegram.WebApp;if(w&&typeof w.ready==="function")w.ready();if(w&&w.initData)sessionStorage.setItem("tg_web_app_init",w.initData);}catch(e){}}function go(){stash();var l="en";try{var g=navigator.language||"";if(/^ru\\b/i.test(g))l="ru";else if(/^es\\b/i.test(g))l="es";}catch(e){}var s=location.search;s+=(s?"&":"?")+"tgb=1";location.replace((l==="en"?"/":"/"+l)+s+location.hash);}var n=0;function tick(){stash();var w=window.Telegram&&window.Telegram.WebApp;var ready=(location.hash||"").indexOf("tgWebAppData")!==-1||!!(w&&w.initData);if(ready||n++>=50)go();else setTimeout(tick,100);}tick();})();';

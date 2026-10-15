import { localePath } from "@/i18n/paths";

/** Set before the first automatic Mini App sign-in, so a missed cookie cannot loop. */
export const MINI_APP_POST_KEY = "tg_mini_post";

/** Where a successful in-Telegram sign-in lands. `tgb=1` skips the bounce. */
export function miniAppContinuePath(locale: string): string {
  return `${localePath(locale)}?tgb=1`;
}

/**
 * First document inside Telegram (D426). Phone clients often deliver
 * `initData` only after `WebApp.ready()`, and an HTTP redirect drops the
 * hash. Call ready, keep the signed string, then the real page can sign in.
 */
export const TELEGRAM_WEB_APP_BOOT_SCRIPT =
  '(function(){var n=0;function pull(){try{var h=location.hash||"";if(h.indexOf("tgWebAppData")!==-1)sessionStorage.setItem("tg_web_app_hash",h);var w=window.Telegram&&window.Telegram.WebApp;if(w&&typeof w.ready==="function")w.ready();if(w&&w.initData)sessionStorage.setItem("tg_web_app_init",w.initData);}catch(e){}}function tick(){pull();if(++n<50)setTimeout(tick,100);}tick();})();';

/**
 * First page Telegram opened (`/` or `/en`). On an iPhone the signed account
 * exists only on this document. Post it here, before any navigation, so the
 * session cookie is set by a real page load (D427). If Telegram did not pass
 * an account, leave for the locale page as a guest.
 */
export const TELEGRAM_MINI_APP_BOUNCE_SCRIPT = `(function(){function read(){var init="";try{var h=location.hash||"";if(h.indexOf("tgWebAppData")!==-1){sessionStorage.setItem("tg_web_app_hash",h);var body=h.replace(/^#/,"");var q=body.indexOf("?");if(q>=0)body=body.slice(q+1);init=new URLSearchParams(body).get("tgWebAppData")||"";}var w=window.Telegram&&window.Telegram.WebApp;if(w&&typeof w.ready==="function")w.ready();if(w&&w.initData){sessionStorage.setItem("tg_web_app_init",w.initData);init=w.initData;}if(!init)init=sessionStorage.getItem("tg_web_app_init")||"";}catch(e){}return init;}function locale(){var l="en";try{var g=navigator.language||"";if(/^ru\\b/i.test(g))l="ru";else if(/^es\\b/i.test(g))l="es";}catch(e){}return l;}function framed(){try{if(!window.parent||window===window.parent)return "0";var list=location.ancestorOrigins;if(list){for(var i=0;i<list.length;i++){var host=new URL(list[i]).hostname;if(host==="web.telegram.org"||/\\.telegram\\.org$/i.test(host))return "1";}}if(document.referrer){var host2=new URL(document.referrer).hostname;if(host2==="web.telegram.org"||/\\.telegram\\.org$/i.test(host2))return "1";}}catch(e){}return "0";}function post(init){try{if(sessionStorage.getItem("${MINI_APP_POST_KEY}")==="1")return false;sessionStorage.setItem("${MINI_APP_POST_KEY}","1");}catch(e){}var f=document.createElement("form");f.method="POST";f.action="/api/auth/telegram/miniapp";function field(n,v){var i=document.createElement("input");i.type="hidden";i.name=n;i.value=v;f.appendChild(i);}field("initData",init);field("locale",locale());field("framed",framed());(document.body||document.documentElement).appendChild(f);f.submit();return true;}function guest(){var l=locale();var s=location.search||"";s+=(s?"&":"?")+"tgb=1";location.replace((l==="en"?"/":"/"+l)+s+(location.hash||""));}var n=0;function tick(){var init=read();if(init){if(!post(init))guest();return;}if(n++>=50)guest();else setTimeout(tick,100);}tick();})();`;

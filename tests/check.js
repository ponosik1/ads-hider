const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");

const dir = __dirname;
const html = fs.readFileSync(path.join(dir, "ad.html"), "utf8");
const code = fs.readFileSync(path.join(dir, "..", "content.js"), "utf8");

const dom = new JSDOM(html, { url: "https://yandex.ru/search/?text=test", runScripts: "dangerously" });
const doc = dom.window.document;

const script = doc.createElement("script");
script.textContent = code;
doc.body.appendChild(script);

const hidden = (id) => {
  const el = doc.getElementById(id);
  return !!el && el.hasAttribute("data-ad-hidden");
};

const actual = {
  ad1: hidden("ad1"),
  ad2: hidden("ad2"),
  organic1: hidden("organic1"),
  listUntouched: !doc.getElementById("serp").hasAttribute("data-ad-hidden"),
};
const expected = { ad1: true, ad2: true, organic1: false, listUntouched: true };
console.log(JSON.stringify(actual));
if (JSON.stringify(actual) !== JSON.stringify(expected)) {
  console.log("FAIL: ожидалось", JSON.stringify(expected));
  process.exit(1);
}
console.log("OK: реклама скрыта, обычный результат и список на месте");

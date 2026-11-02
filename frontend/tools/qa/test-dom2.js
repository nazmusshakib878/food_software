const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const html = fs.readFileSync('index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost/' });
const scripts = ['js/data.js', 'js/store.js', 'js/pos.js', 'js/admin.js', 'js/app.js'];
let scriptContent = '';
for (const script of scripts) {
  scriptContent += fs.readFileSync(script, 'utf8') + '\n';
}
try {
  dom.window.eval(scriptContent);
  dom.window.eval('document.dispatchEvent(new window.Event("DOMContentLoaded"));');
  console.log('Success, no runtime errors on DOMContentLoaded.');
} catch (err) {
  console.error('RUNTIME ERROR:', err.stack);
}

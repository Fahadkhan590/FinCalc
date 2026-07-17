const fs = require('fs');
const path = require('path');

const files = [
  'index.html',
  'faq.html',
  'privacy.html',
  'terms.html',
  'about.html'
];

const dir = __dirname;

files.forEach(file => {
  const fp = path.join(dir, file);
  let c = fs.readFileSync(fp, 'utf8');
  let count = 0;

  // Fix label contrast: text-slate-400 mb-2 → text-slate-300 mb-2 (input labels)
  const before1 = c.split('text-slate-400 mb-2').length - 1;
  c = c.split('text-slate-400 mb-2').join('text-slate-300 mb-2');
  count += before1;

  // Fix subtext/desc p tags with text-slate-500 → text-slate-300
  const before2 = c.split('text-slate-500').length - 1;
  c = c.split('text-slate-500').join('text-slate-300');
  count += before2;

  // Fix "text-slate-400 text-xs sm:text-sm mt-1" in tool descriptions → text-slate-300
  // (already handled by the mb-2 above for labels, catch remaining)

  fs.writeFileSync(fp, c, 'utf8');
  console.log(file + ': ' + count + ' replacements');
});

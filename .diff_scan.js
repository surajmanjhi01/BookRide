const { execSync } = require('child_process');
const fs = require('fs');
const buf = execSync('git --no-pager diff');
const s = buf.toString('utf8');
const lines = s.split(/\r?\n/);
let bad = 0;
const badLines = [];
for (const l of lines) {
  if (/^\+/.test(l)) {
    const st = l.slice(1);
    if (st.includes('\uFFFD') || /Ã|â€|Å¸|ðŸ|Γ|∩┐|├░/.test(st)) {
      bad++;
      if (badLines.length < 15) badLines.push(JSON.stringify(l.slice(0, 110)));
    }
  }
}
const totalPlus = lines.filter((l) => /^\+/.test(l)).length;
let out = `bad + lines: ${bad} / total + lines: ${totalPlus}\n`;
badLines.forEach((b) => { out += '  ' + b + '\n'; });
const totalMinus = lines.filter((l) => /^-/.test(l) && !/^---/.test(l)).length;
out += `total - lines: ${totalMinus}\n`;
fs.writeFileSync('.diff_scan_result.txt', out);
console.log('done');
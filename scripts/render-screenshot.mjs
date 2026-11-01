import { spawn } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = resolve(root, 'scripts/.compass-screenshot.html');
const pngPath = resolve(root, 'src/img/compass-screenshot.png');

function normalize(degrees) {
  const wrapped = ((degrees % 360) + 360) % 360;
  return wrapped === 0 ? 0 : wrapped;
}

function point(degrees, radius) {
  const radians = (normalize(degrees) * Math.PI) / 180;
  return { x: radius * Math.sin(radians), y: -radius * Math.cos(radians) };
}

function shortest(from, to) {
  let delta = normalize(to) - normalize(from);
  if (delta > 180) {
    delta -= 360;
  } else if (delta <= -180) {
    delta += 360;
  }
  return delta;
}

function arc(from, to, radius) {
  const delta = shortest(from, to);
  if (Math.abs(delta) < 0.4) {
    return '';
  }
  const start = point(from, radius);
  const end = point(to, radius);
  const sweep = delta > 0 ? 1 : 0;
  const n = (value) => value.toFixed(3);
  return `M ${n(start.x)} ${n(start.y)} A ${radius} ${radius} 0 0 ${sweep} ${n(end.x)} ${n(end.y)}`;
}

const labels = [
  ['N', 0, true],
  ['NE', 45, false],
  ['E', 90, true],
  ['SE', 135, false],
  ['S', 180, true],
  ['SW', 225, false],
  ['W', 270, true],
  ['NW', 315, false],
];

const trail = [168, 184, 202.5];
const needle = 202.5;
const ticks = Array.from({ length: 36 }, (_, index) => {
  const degrees = index * 10;
  const major = degrees % 30 === 0;
  const outer = point(degrees, 90);
  const inner = point(degrees, major ? 79 : 84.5);
  return `<line x1="${inner.x}" y1="${inner.y}" x2="${outer.x}" y2="${outer.y}" stroke="${major ? 'rgb(204, 204, 220)' : 'rgba(204, 204, 220, 0.61)'}" stroke-width="${major ? 1.6 : 0.8}" stroke-linecap="round"/>`;
}).join('');

const labelSvg = labels
  .map(([text, degrees, cardinal]) => {
    const at = point(degrees, 64);
    const fill = text === 'N' ? '#d10e5c' : 'rgb(204, 204, 220)';
    return `<text x="${at.x}" y="${at.y}" text-anchor="middle" dominant-baseline="central" fill="${fill}" opacity="${cardinal ? 1 : 0.75}" font-size="${cardinal ? 12 : 8}" font-weight="${cardinal ? 700 : 500}" font-family="Inter, Helvetica, Arial, sans-serif">${text}</text>`;
  })
  .join('');

const arcs = trail
  .slice(1)
  .map((degrees, index) => arc(trail[index], degrees, 76))
  .filter(Boolean)
  .map(
    (path) =>
      `<path d="${path}" fill="none" stroke="#3d71d9" stroke-opacity="0.35" stroke-width="1.4" stroke-linecap="round"/>`
  )
  .join('');

const dots = trail
  .map((degrees, index) => {
    const at = point(degrees, 76);
    const opacity = 0.18 + (0.67 * index) / (trail.length - 1);
    return `<circle cx="${at.x}" cy="${at.y}" r="1.7" fill="#3d71d9" fill-opacity="${opacity}"/>`;
  })
  .join('');

const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      html, body { margin: 0; width: 480px; height: 520px; background: #111217; overflow: hidden; }
      .panel {
        width: 480px;
        height: 520px;
        margin: 0;
        background: #181b1f;
        border: 1px solid rgba(204, 204, 220, 0.12);
        border-radius: 2px;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        font-family: Inter, Helvetica, Arial, sans-serif;
        color: rgb(204, 204, 220);
      }
      .bearing { font-size: 18px; font-weight: 500; }
      .detail { font-size: 12px; color: rgba(204, 204, 220, 0.65); }
    </style>
  </head>
  <body>
    <div class="panel">
      <svg width="360" height="360" viewBox="-100 -100 200 200" aria-label="Wind from 202.5 degrees SSW">
        <circle r="96" fill="#22252b"/>
        <circle r="90" fill="#181b1f" stroke="rgba(204, 204, 220, 0.12)" stroke-width="1"/>
        ${ticks}
        ${labelSvg}
        <g>${arcs}${dots}</g>
        <g transform="rotate(${needle})">
          <polygon points="-3.2,8 0,30 3.2,8" fill="rgba(204, 204, 220, 0.65)"/>
          <polygon points="0,-82 -5.4,10 0,3 5.4,10" fill="#3d71d9"/>
          <circle r="3" fill="#181b1f" stroke="#3d71d9" stroke-width="1.2"/>
        </g>
        <g>
          <circle r="22" fill="#181b1f" stroke="rgba(204, 204, 220, 0.2)" stroke-width="1"/>
          <text y="-2" text-anchor="middle" dominant-baseline="central" fill="rgb(204, 204, 220)" font-size="10" font-weight="600" font-family="Inter, Helvetica, Arial, sans-serif">12.4</text>
          <text y="9" text-anchor="middle" dominant-baseline="central" fill="rgba(204, 204, 220, 0.65)" font-size="6" font-family="Inter, Helvetica, Arial, sans-serif">mph</text>
        </g>
      </svg>
      <div class="bearing">202.5° SSW</div>
      <div class="detail">from</div>
    </div>
  </body>
</html>`;

mkdirSync(dirname(htmlPath), { recursive: true });
writeFileSync(htmlPath, html);

const chrome = process.env.CHROME || 'google-chrome';
const child = spawn(
  chrome,
  [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--user-data-dir=${resolve(root, 'scripts/.chrome-profile')}`,
    `--screenshot=${pngPath}`,
    '--window-size=480,520',
    htmlPath,
  ],
  { stdio: 'inherit' }
);

const killer = setTimeout(() => {
  child.kill('SIGKILL');
}, 15000);

child.on('exit', (code) => {
  clearTimeout(killer);
  rmSync(htmlPath, { force: true });
  rmSync(resolve(root, 'scripts/.chrome-profile'), { recursive: true, force: true });
  process.exit(code === 0 || code === null ? 0 : code);
});

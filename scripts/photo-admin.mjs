// Local page to set the city of each photo. Usage: node --env-file=.env scripts/photo-admin.mjs
// Opens http://localhost:4322 and saves to src/data/photos.json. Commit the file when done.
import { createServer } from 'node:http';
import { readFile, readdir, writeFile } from 'node:fs/promises';

const photosUrl = (process.env.PHOTOS_URL ?? '').replace(/\/$/, '');
if (!photosUrl) throw new Error('PHOTOS_URL is not set.');

const manifestPath = 'src/data/photos.json';
const trips = {};
for (const file of await readdir('itineraries')) {
  const data = JSON.parse(await readFile(`itineraries/${file}`, 'utf8'));
  if (data.slug) trips[data.slug] = data.cities.map((city) => city.name);
}

const page = `<!doctype html><meta charset="utf-8"><title>Photo cities</title>
<style>body{font:14px sans-serif;margin:1rem}.g{display:flex;flex-wrap:wrap;gap:8px}
figure{margin:0;width:200px}img{width:200px;height:140px;object-fit:cover}
select{width:100%}.sel{outline:3px solid #c0392b}</style>
<h1>Photo cities</h1><p>Click photos to select them, pick a city to set it, then Save.</p>
<select id="bulk"></select> <button id="set">Set city on selected</button>
<button id="save">Save</button> <span id="msg"></span>
<div id="app"></div>
<script>
const photosUrl=${JSON.stringify(photosUrl)};
const trips=${JSON.stringify(trips)};
let data;
const bulk=document.getElementById('bulk');
const slugs=()=>Object.keys(data);
function render(){
  const app=document.getElementById('app');app.innerHTML='';
  for(const slug of slugs()){
    const h=document.createElement('h2');h.textContent=slug;app.append(h);
    const g=document.createElement('div');g.className='g';app.append(g);
    for(const p of data[slug]){
      const f=document.createElement('figure');
      f.innerHTML='<img loading="lazy" src="'+photosUrl+'/thumbs/'+slug+'/'+encodeURIComponent(p.name)+'.webp"><figcaption>'+p.name+'</figcaption>';
      const s=document.createElement('select');
      for(const c of ['',...trips[slug]]){const o=new Option(c||'(none)',c);s.add(o)}
      s.value=p.city||'';
      s.onchange=()=>{if(s.value)p.city=s.value;else delete p.city};
      f.append(s);f.querySelector('img').onclick=()=>f.classList.toggle('sel');
      f._p=p;f._s=s;g.append(f);
    }
  }
}
document.getElementById('set').onclick=()=>{
  for(const f of document.querySelectorAll('figure.sel')){f._p.city=bulk.value;f._s.value=bulk.value;f.classList.remove('sel')}
};
document.getElementById('save').onclick=async()=>{
  const r=await fetch('/save',{method:'POST',body:JSON.stringify(data)});
  document.getElementById('msg').textContent=r.ok?'Saved':'Error';
};
fetch('/data').then(r=>r.json()).then(d=>{
  data=d;
  for(const c of new Set(Object.values(trips).flat()))bulk.add(new Option(c,c));
  render();
});
</script>`;

createServer(async (req, res) => {
  if (req.url === '/data') {
    res.setHeader('content-type', 'application/json');
    res.end(await readFile(manifestPath, 'utf8'));
  } else if (req.url === '/save' && req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    await writeFile(manifestPath, `${JSON.stringify(JSON.parse(body), null, 2)}\n`);
    res.end('ok');
  } else {
    res.setHeader('content-type', 'text/html');
    res.end(page);
  }
}).listen(4322, '127.0.0.1', () => console.log('http://localhost:4322'));

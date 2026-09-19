const fs=require('node:fs');
const path=require('node:path');

const root=process.cwd();
const contract=JSON.parse(fs.readFileSync(path.join(root,'docs','openapi.json'),'utf8'));
const missing=[];
for(const file of fs.readdirSync(path.join(root,'routes')).filter(name=>name.endsWith('.js'))){
  const source=fs.readFileSync(path.join(root,'routes',file),'utf8');
  const prefix=file==='auth.routes.js'?'/auth':'';
  const route=/\b(?:router|r|publicRouter|privateRouter)\.(get|post|put|patch|delete)\(\s*['"]([^'"]+)/gs;
  for(const match of source.matchAll(route)){
    const endpoint=`${prefix}${match[2]}`.replace(/:([A-Za-z0-9_]+)/g,'{$1}');
    if(!contract.paths[endpoint]?.[match[1]])missing.push(`${match[1].toUpperCase()} ${endpoint}`);
  }
}
if(missing.length){console.error(`OpenAPI is missing ${missing.length} route operation(s):\n- ${missing.join('\n- ')}`);process.exit(1);}
console.log('OpenAPI documents every statically declared route operation.');

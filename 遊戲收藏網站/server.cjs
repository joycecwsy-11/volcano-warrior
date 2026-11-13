const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');

const saves=path.resolve(process.env.ARCADE_DATA_DIR || path.join(__dirname,'data'));
fs.mkdirSync(saves,{recursive:true});
const games=new Set(['volcano','mahjong']);
const files=new Set(['index.html','volcano.html','mahjong.html','sync.js']);
function send(res,status,value){
 res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});
 res.end(JSON.stringify(value));
}
http.createServer(async(req,res)=>{
 try{
  const route=new URL(req.url,'http://localhost').pathname;
  const method=req.method;
  if(route==='/api/link' && method==='POST'){
   const code=crypto.randomBytes(32).toString('hex');
   fs.mkdirSync(path.join(saves,code));
   return send(res,201,{code});
  }
  if(route.startsWith('/api/')){
   const code=(req.headers.authorization||'').match(/^Bearer ([a-f0-9]{64})$/)?.[1];
   if(!code||!fs.existsSync(path.join(saves,code)))return send(res,401,{error:'invalid link'});
   if(route==='/api/link'&&method==='GET')return send(res,200,{linked:true});
   const game=route.slice(5);
   if(!games.has(game))return send(res,404,{error:'unknown game'});
   const file=path.join(saves,code,game+'.json');
   if(method==='GET')return send(res,200,fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{revision:0,state:null});
   if(method!=='PUT')return send(res,405,{error:'method'});
   const chunks=[];
   let size=0;
   for await(const chunk of req){
    size+=chunk.length;
    if(size>65536){send(res,413,{error:'too large'});return}
    chunks.push(chunk);
   }
   let update;
   try{update=JSON.parse(Buffer.concat(chunks))}catch{return send(res,400,{error:'invalid JSON'})}
   if(!update?.state||typeof update.state!=='object'||!Number.isSafeInteger(update.revision))return send(res,400,{error:'invalid save'});
   const current=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')).revision:0;
   if(update.revision!==current)return send(res,409,{error:'newer save exists'});
   const revision=current+1;
   fs.writeFileSync(file+'.tmp',JSON.stringify({revision,state:update.state}));
   fs.renameSync(file+'.tmp',file);
   return send(res,200,{revision});
  }
  const name=route==='/'?'index.html':route.slice(1);
  if(method!=='GET'||!files.has(name))return send(res,404,{error:'not found'});
  res.writeHead(200,{'Content-Type':name.endsWith('.js')?'text/javascript; charset=utf-8':'text/html; charset=utf-8'});
  res.end(fs.readFileSync(path.join(__dirname,'public',name)));
 }catch{if(!res.headersSent)send(res,500,{error:'server error'});else res.end()}
}).listen(Number(process.env.PORT||8080),'0.0.0.0',()=>console.log('Arcade listening'));

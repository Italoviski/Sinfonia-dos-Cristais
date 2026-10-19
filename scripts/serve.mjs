import http from 'node:http';
import {createReadStream} from 'node:fs';
import {stat,realpath} from 'node:fs/promises';
import {resolve,dirname,extname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=await realpath(resolve(dirname(fileURLToPath(import.meta.url)),'..'));
const port=Number(process.env.PORT||8080);
if(!Number.isInteger(port)||port<1||port>65535)throw Error('Porta inválida.');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.jpeg':'image/jpeg','.mp3':'audio/mpeg','.mp4':'video/mp4','.woff2':'font/woff2'};
const server=http.createServer(async(req,res)=>{
 try{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405).end();return;}
  let path=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(path==='/')path='/index.html';
  if(!/^\/(?:index\.html$|(?:assets|css|js|data)\/)/.test(path)){res.writeHead(404).end();return;}
  const file=await realpath(resolve(root,'.'+path));if(!file.startsWith(root+sep)){res.writeHead(403).end();return;}
  const info=await stat(file);if(!info.isFile()){res.writeHead(404).end();return;}
  let start=0,end=info.size-1,status=200;
  if(req.headers.range){const match=/^bytes=(\d+)-(\d*)$/.exec(req.headers.range);if(!match){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}start=Number(match[1]);end=match[2]?Math.min(Number(match[2]),end):end;if(start>end||start>=info.size){res.writeHead(416,{'Content-Range':`bytes */${info.size}`}).end();return;}status=206;res.setHeader('Content-Range',`bytes ${start}-${end}/${info.size}`);}
  res.writeHead(status,{'Content-Type':mime[extname(file)]||'application/octet-stream','Content-Length':end-start+1,'Accept-Ranges':'bytes','X-Content-Type-Options':'nosniff','Cache-Control':'no-cache'});
  if(req.method==='HEAD'){res.end();return;}const stream=createReadStream(file,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
 }catch{if(!res.headersSent)res.writeHead(404);res.end();}
});
server.listen(port,'127.0.0.1',()=>console.log(`Crystal Math Mania: http://127.0.0.1:${port}`));
server.on('error',error=>{console.error(`Não foi possível abrir o jogo: ${error.message}`);process.exitCode=1;});

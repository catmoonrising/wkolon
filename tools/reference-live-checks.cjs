// Use a real network outage: Firefox's simulated offline switch can leave worker traffic online.
const {firefox,chromium}=require('playwright');
const path=require('node:path');
const root=path.resolve(__dirname,'..'),base=process.argv[3]||'https://catmoonrising.github.io/wkolon/';
const engine=process.argv[2]==='chromium'?chromium:firefox;
const http=require('node:http'),net=require('node:net');
let online=true;const sockets=new Set();
const proxy=http.createServer((req,res)=>res.writeHead(503).end());
proxy.on('connect',(req,client,head)=>{
 if(!online){client.end('HTTP/1.1 503 Offline\r\n\r\n');return;}
 const target=new URL('https://'+req.url),remote=net.connect(Number(target.port)||443,target.hostname);
 for(const socket of [client,remote]){sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{client.destroy();remote.destroy();});}
 remote.once('connect',()=>{client.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)remote.write(head);client.pipe(remote);remote.pipe(client);});
});
(async()=>{await new Promise(r=>proxy.listen(0,'127.0.0.1',r));const browser=await engine.launch({headless:true,proxy:{server:`http://127.0.0.1:${proxy.address().port}`}});try{await require('./reference-library-checks.cjs')(browser,base,root,{offline:()=>{online=false;for(const socket of sockets)socket.destroy();},online:()=>{online=true;}});}finally{await browser.close();for(const socket of sockets)socket.destroy();await new Promise(r=>proxy.close(r));}})().catch(e=>{console.error(e);process.exitCode=1;});

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {layoutFeatureGraph,featureEdgePath,featureCrossings} from '../src/feature-layout.js';

test('branch layout reduces crossings with mixed-size prerequisite boxes and preserves boundaries',()=>{
 const node=(key,rank,parents=[])=>({key,rank,parents:parents.map(key=>({key}))});
 const nodes=[node('Acute',0),node('Improved',1,['Acute']),node('Keen',1,['Acute']),node('Trained',1),node('Reset',2,['Improved','Trained']),node('Weak',2,['Keen']),node('Uncanny',2,['Improved']),node('Uncanny II',3,['Uncanny'])];
 const sizes=new Map(nodes.map((n,i)=>[n.key,{width:80+i*19,height:n.key==='Trained'?24:40}]));
 const result=layoutFeatureGraph(nodes,sizes);assert.equal(result.crossings,0);
 for(const [key,p] of result.positions){
  assert.equal(p.width,sizes.get(key).width);assert.equal(p.height,sizes.get(key).height);
  assert(p.x>=0&&p.y>=0&&p.x+p.width<=result.width&&p.y+p.height<=result.height);
  for(const [other,q] of result.positions)if(other!==key)assert(p.x+p.width<=q.x||q.x+q.width<=p.x||p.y+p.height<=q.y||q.y+q.height<=p.y);
 }
 for(const e of result.edges){const a=result.positions.get(e.from),b=result.positions.get(e.to);assert(a.x+a.width<b.x);}
 const ordered=[...result.positions].filter(([key])=>nodes.find(n=>n.key===key).rank===1).sort((a,b)=>a[1].y-b[1].y).map(([key])=>key);
 assert(Math.abs(ordered.indexOf('Improved')-ordered.indexOf('Trained'))===1);
});

test('arrow shaft ends at the exact arrowhead tip, with each card’s actual width',()=>{
 const a={x:20,width:113,center:80},b={x:240,width:175,center:160},edge=featureEdgePath(a,b);
 assert(edge.shaft.startsWith('M133,80 '));assert(edge.shaft.endsWith('236,160'));
 assert(edge.head.includes(' L236,160 '));
 const short=featureEdgePath({...a,exitX:205},b);assert(short.shaft.startsWith('M133,80 H205 C'));
 const empty=layoutFeatureGraph([],new Map());assert.equal(empty.positions.size,0);assert(empty.width>0&&empty.height>0);
});

test('disconnected branches align in separate bands instead of crossing unrelated options',()=>{
 const nodes=[{key:'unrelated',rank:0,parents:[]},{key:'short',rank:0,parents:[]},{key:'wide',rank:0,parents:[]},{key:'first',rank:1,parents:[{key:'short'}]},{key:'second',rank:1,parents:[{key:'wide'}]}];
 const sizes=new Map(nodes.map(n=>[n.key,{width:n.key==='wide'?250:90,height:40}]));
 const {positions}=layoutFeatureGraph(nodes,sizes);
 assert.equal(positions.get('short').center,positions.get('first').center);
 assert.equal(positions.get('wide').center,positions.get('second').center);
 assert(positions.get('unrelated').y>positions.get('wide').y);
 assert(positions.get('first').x<positions.get('second').x);
 assert(positions.get('short').exitX<positions.get('first').x);
});

test('long prerequisite routes reserve intermediate rows and avoid all intervening cards',()=>{
 const node=(key,rank,parents=[])=>({key,rank,parents:parents.map(key=>({key}))});
 const nodes=[node('root',0),node('middle',1,['root']),node('next',2,['middle']),node('end',3,['root','next'])];
 const sizes=new Map(nodes.map(n=>[n.key,{width:n.key==='middle'?260:90,height:40}]));
 const graph=layoutFeatureGraph(nodes,sizes);
 assert.equal(graph.positions.size,nodes.length);assert.equal(graph.edges.length,4);
 const long=graph.edges.find(e=>e.from==='root'&&e.to==='end');assert.equal(long.via.length,2);
 for(const edge of graph.edges){
  const path=featureEdgePath(graph.positions.get(edge.from),graph.positions.get(edge.to),edge.via);
  for(let i=1;i<path.points.length;i++){
   const a=path.points[i-1],b=path.points[i];
   for(let t=0;t<=1;t+=.1){const x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    for(const [key,p] of graph.positions)assert(!(x>p.x+.1&&x<p.x+p.width-.1&&y>p.y+.1&&y<p.y+p.height-.1),`${edge.from}→${edge.to} crosses ${key}`);
   }
  }
  assert(path.shaft.endsWith(`${graph.positions.get(edge.to).x-4},${graph.positions.get(edge.to).center}`));
 }
});

test('ranged feat joins center on their prerequisites and keep every curve within 45 degrees',()=>{
 const node=(key,rank,parents=[])=>({key,rank,parents:parents.map(key=>({key}))});
 const nodes=[node('BAB 2',0),node('Point-Blank Shot',0),node('Careful Shot',1,['BAB 2','Point-Blank Shot']),node('Far Shot',1,['Point-Blank Shot']),node('Precise Shot',1,['Point-Blank Shot']),node('Deadeye BAB 4',1),node('Sniper BAB 4',1),node('Deadeye',2,['Careful Shot','Point-Blank Shot','Deadeye BAB 4']),node('Sniper',2,['Precise Shot','Point-Blank Shot','Sniper BAB 4'])];
 const sizes=new Map(nodes.map(n=>[n.key,{width:n.key.includes('BAB')?130:n.key==='Point-Blank Shot'?225:180,height:n.key.includes('BAB')?38:54}]));
 const graph=layoutFeatureGraph(nodes,sizes);
 assert(graph.positions.get('Deadeye').y>20);
 assert(graph.positions.get('Sniper').center>graph.positions.get('Precise Shot').center);
 for(const edge of graph.edges){
  const path=featureEdgePath(graph.positions.get(edge.from),graph.positions.get(edge.to),edge.via);
  for(let i=1;i<path.points.length;i++){
   const a=path.points[i-1],b=path.points[i];
   assert(b.x>=a.x,`${edge.from}→${edge.to} doubles back`);
   assert(Math.abs(b.y-a.y)<=b.x-a.x+1e-8,`${edge.from}→${edge.to} exceeds 45 degrees`);
  }
 }
 // Layout does not change the source data or depend on prior render/zoom state.
 assert.deepEqual(layoutFeatureGraph(nodes,sizes),graph);
});

test('curved crossings get one underpass; shared branches, joins and separated paths stay intact',()=>{
 const pos=(x,center)=>({x,width:40,center,exitX:x+48});
 const edge=(from,to,a,b)=>({from,to,path:featureEdgePath(a,b)});
 const a=edge('a','d',pos(0,20),pos(200,120)),b=edge('b','c',pos(0,120),pos(200,20));
 const hits=featureCrossings([a,b]);assert.equal(hits.length,1);assert.equal(hits[0].under,0);assert.equal(hits[0].over,1);
 assert(Math.abs(hits[0].y-70)<.3);assert(hits[0].x>48&&hits[0].x<196);
 assert.deepEqual(featureCrossings([a,{...b,from:'a'}]),[]);
 assert.deepEqual(featureCrossings([a,{...b,to:'d'}]),[]);
 assert.deepEqual(featureCrossings([a,edge('b','c',pos(0,200),pos(200,300))]),[]);
 const flat=edge('e','f',pos(0,70),pos(200,70));assert.equal(featureCrossings([a,flat]).length,1);
 assert.deepEqual(featureCrossings([flat,{...flat,from:'g',to:'h'}]),[]);
});

test('crossing detection preserves vertical and backward segment intersections',()=>{
 const edge=(from,to,points)=>({from,to,path:{points}});
 const a=edge('a','aa',[{x:0,y:0},{x:100,y:100}]),b=edge('b','bb',[{x:100,y:0},{x:0,y:100}]),c=edge('c','cc',[{x:50,y:-100},{x:50,y:200}]);
 const hits=featureCrossings([a,b,c]);assert.equal(hits.length,3);for(const hit of hits){assert.equal(hit.x,50);assert.equal(hit.y,50);}assert.deepEqual(hits.map(h=>[h.under,h.over]),[[0,1],[0,2],[1,2]]);
});

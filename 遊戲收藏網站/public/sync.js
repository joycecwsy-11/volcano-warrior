window.connectGame=async function(id){
 const status=document.getElementById('save-status');
 const code=localStorage.getItem('arcade-key');
 const localKey='arcade-save-'+(code||'guest')+'-'+id;
 const headers={Authorization:'Bearer '+code,'Content-Type':'application/json'};
 const endpoint='./api/'+id;
 let record;
 try{record=JSON.parse(localStorage.getItem(localKey))}catch{}
 record ||= {revision:0,state:null,dirty:false};
 let blocked=false, queue=Promise.resolve();
 function persist(){localStorage.setItem(localKey,JSON.stringify(record))}
 async function push(){
  if(!code||blocked||!record.dirty)return;
  const state=record.state;
  try{
   const res=await fetch(endpoint,{method:'PUT',headers,body:JSON.stringify({revision:record.revision,state})});
   if(res.status===409){blocked=true;status.textContent='另一台裝置有較新進度。返回首頁再開啟遊戲以載入。';return}
   if(!res.ok)throw Error();
   record.revision=(await res.json()).revision;
   record.dirty=record.state!==state;
   persist();
   status.textContent=record.dirty?'同步中…':'已同步';
  }catch{status.textContent='已存於此裝置，連線後會再同步。'}
 }
 if(code){
  try{
   const res=await fetch(endpoint,{headers});
   if(!res.ok)throw Error();
   const remote=await res.json();
   if(!record.dirty||remote.revision!==record.revision){
    record={...remote,dirty:false};
    persist();
   }
   await push();
   if(!record.dirty)status.textContent='已連結同步';
  }catch{status.textContent='離線，進度先存於此裝置。'}
 }else status.textContent='進度儲存在此裝置。可回首頁連結同步碼。';
 window.addEventListener('online',()=>{queue=queue.then(push)});
 return {state:record.state,save(state){
  if(blocked)return;
  record.state=JSON.parse(JSON.stringify(state));record.dirty=!!code;persist();
  queue=queue.then(push);
 }};
};

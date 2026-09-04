// Plain inline script, no chunk dependency on purpose. When the service
// worker is wedged (Safari kills the old worker on an update mid-navigation),
// every chunk request hangs, so a React button never becomes clickable. The
// HTML for this page is precached and served by the worker's own cache, and
// this script runs the moment it parses. It clears the worker and its caches
// only; OPFS, and with it every chat, is never touched.
const REPAIR_SCRIPT = `(function(){
  function repair(next){
    var jobs=[];
    try{ if(self.caches){ jobs.push(caches.keys().then(function(ks){ return Promise.all(ks.map(function(k){ return caches.delete(k) })) })) } }catch(e){}
    try{ if(navigator.serviceWorker){ jobs.push(navigator.serviceWorker.getRegistrations().then(function(rs){ return Promise.all(rs.map(function(r){ return r.unregister() })) })) } }catch(e){}
    try{ localStorage.setItem("uno-repair-at", String(Date.now())) }catch(e){}
    var go=function(){ location.replace(next) };
    Promise.all(jobs).then(go, go);
    setTimeout(go, 4000);
  }
  window.__unoRepair = repair;
  var b=document.getElementById("uno-repair");
  if(b){ b.addEventListener("click", function(){
    var here=location.pathname;
    repair(/\\/offline$/.test(here) ? here.replace(/\\/offline$/, "/chat") : here);
  }) }
})();`;

export function InlineRepairScript(props: { auto?: string }) {
  const code = props.auto
    ? `${REPAIR_SCRIPT}window.__unoRepair(${JSON.stringify(props.auto)});`
    : REPAIR_SCRIPT;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}

/* Sales Analytics: CSV/JSON import, IndexedDB persistence, filtering, deletion and export. */
const DB_NAME = "SalesAnalyticsDB";
const STORE = "sales";
let db;
let allRecords = [];
let revenueChart, productChart;
const $ = id => document.getElementById(id);
const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(n || 0);

function openDatabase(){
  return new Promise((resolve,reject)=>{
    const request=indexedDB.open(DB_NAME,1);
    request.onupgradeneeded=()=>{const d=request.result;if(!d.objectStoreNames.contains(STORE))d.createObjectStore(STORE,{keyPath:"id",autoIncrement:true});};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error);
  });
}
function transaction(mode,action){
  return new Promise((resolve,reject)=>{
    const tx=db.transaction(STORE,mode), store=tx.objectStore(STORE);
    let result;
    try{result=action(store);}catch(e){reject(e);return;}
    tx.oncomplete=()=>resolve(result?.result);
    tx.onerror=()=>reject(tx.error);
    tx.onabort=()=>reject(tx.error);
  });
}
async function loadRecords(){allRecords=await transaction("readonly",s=>s.getAll());render();}
function normalize(row){
  const get=(...keys)=>{for(const k of keys){const found=Object.keys(row).find(x=>x.trim().toLowerCase().replace(/[ -]/g,"_")===k);if(found!==undefined)return row[found];}return "";};
  const date=String(get("date","sale_date","order_date")).trim();
  const product=String(get("product","product_name","item")).trim();
  const customer=String(get("customer","customer_name","client")).trim()||"—";
  const quantity=Number(get("quantity","qty","units"));
  const unit_price=Number(get("unit_price","price","selling_price"));
  if(!date||!product||!Number.isFinite(quantity)||quantity<=0||!Number.isFinite(unit_price)||unit_price<0)throw Error("Each row needs a date, product, positive quantity and valid unit_price.");
  if(Number.isNaN(Date.parse(date)))throw Error("Invalid date: "+date);
  return {date:date.slice(0,10),product,customer,quantity,unit_price,total:quantity*unit_price};
}
function parseCSV(text){
  const rows=[];let row=[],field="",quoted=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'&&quoted&&text[i+1]==='"'){field+='"';i++;}else if(c==='"'){quoted=!quoted;}else if(c===','&&!quoted){row.push(field);field="";}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(field);if(row.some(v=>v.trim()))rows.push(row);row=[];field="";}else field+=c;}
  row.push(field);if(row.some(v=>v.trim()))rows.push(row);
  if(rows.length<2)throw Error("CSV must contain a header row and at least one data row.");
  const headers=rows.shift().map(h=>h.trim().toLowerCase().replace(/[ -]/g,"_"));
  return rows.map(cols=>Object.fromEntries(headers.map((h,i)=>[h,(cols[i]??"").trim()])));
}
async function importFile(file){
  const raw=await file.text();let data;
  if(file.name.toLowerCase().endsWith(".json"))data=JSON.parse(raw);
  else data=parseCSV(raw);
  if(!Array.isArray(data)||!data.length)throw Error("The file has no data rows.");
  const clean=data.map(normalize);
  await transaction("readwrite",s=>clean.forEach(r=>s.add(r)));
  await loadRecords();notify(`${clean.length} record(s) imported successfully.`);
}
function filtered(){
  const from=$("fromDate").value,to=$("toDate").value,q=$("searchInput").value.trim().toLowerCase();
  return allRecords.filter(r=>(!from||r.date>=from)&&(!to||r.date<=to)&&(!q||r.product.toLowerCase().includes(q)||r.customer.toLowerCase().includes(q)));
}
function render(){
  const records=filtered(), revenue=records.reduce((s,r)=>s+r.total,0),units=records.reduce((s,r)=>s+r.quantity,0);
  $("revenue").textContent=money(revenue);$("units").textContent=units.toLocaleString("en-IN");$("orders").textContent=records.length.toLocaleString("en-IN");$("average").textContent=money(records.length?revenue/records.length:0);
  $("recordCount").textContent=`${records.length} of ${allRecords.length} record(s)`;
  const body=$("recordsBody");
  if(!records.length){body.innerHTML='<tr><td colspan="7" class="empty-row">No matching records. Upload a CSV or JSON file to get started.</td></tr>';}
  else body.innerHTML=records.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.id-a.id).map(r=>`<tr><td>${escapeHTML(r.date)}</td><td><strong>${escapeHTML(r.product)}</strong></td><td>${escapeHTML(r.customer)}</td><td>${r.quantity}</td><td>${money(r.unit_price)}</td><td><strong>${money(r.total)}</strong></td><td><button class="delete-row" data-id="${r.id}" title="Delete this record">Delete</button></td></tr>`).join("");
  drawCharts(records);
}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
function drawCharts(records){
  const byDate={},byProduct={};records.forEach(r=>{byDate[r.date]=(byDate[r.date]||0)+r.total;byProduct[r.product]=(byProduct[r.product]||0)+r.total;});
  const dates=Object.keys(byDate).sort(),products=Object.entries(byProduct).sort((a,b)=>b[1]-a[1]).slice(0,7);
  $("revenueEmpty").style.display=dates.length?"none":"flex";$("productEmpty").style.display=products.length?"none":"flex";
  if(revenueChart)revenueChart.destroy();if(productChart)productChart.destroy();
  if(!window.Chart)return;
  revenueChart=new Chart($("revenueChart"),{type:"line",data:{labels:dates,datasets:[{data:dates.map(d=>byDate[d]),borderColor:"#7064dc",backgroundColor:"rgba(112,100,220,.10)",fill:true,tension:.35,pointRadius:3,pointBackgroundColor:"#7064dc"}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:"#8b95a5",maxTicksLimit:7}},y:{beginAtZero:true,grid:{color:"#eff1f5"},ticks:{color:"#8b95a5",callback:v=>"₹"+Number(v).toLocaleString("en-IN")}}}}});
  productChart=new Chart($("productChart"),{type:"doughnut",data:{labels:products.map(p=>p[0]),datasets:[{data:products.map(p=>p[1]),backgroundColor:["#7064dc","#52a4d9","#50b995","#f0b35c","#e47f9b","#8b9bb4","#b18ad8"],borderWidth:0,hoverOffset:5}]},options:{responsive:true,maintainAspectRatio:false,cutout:"68%",plugins:{legend:{position:"bottom",labels:{boxWidth:9,usePointStyle:true,padding:13,font:{size:10}}}}}});
}
function notify(message){const t=$("toast");t.textContent=message;t.classList.add("show");clearTimeout(notify.timer);notify.timer=setTimeout(()=>t.classList.remove("show"),2800);}
$("fileInput").addEventListener("change",async e=>{const file=e.target.files[0];if(!file)return;try{await importFile(file);}catch(err){notify("Import failed: "+err.message);}finally{e.target.value="";}});
$("recordsBody").addEventListener("click",async e=>{const btn=e.target.closest("[data-id]");if(!btn)return;const id=Number(btn.dataset.id);if(!confirm("Delete this sales record?"))return;await transaction("readwrite",s=>s.delete(id));await loadRecords();notify("Record deleted.");});
$("deleteAllBtn").addEventListener("click",async()=>{if(!allRecords.length){notify("There are no records to delete.");return;}if(!confirm(`Permanently delete all ${allRecords.length} records from this browser?`))return;await transaction("readwrite",s=>s.clear());await loadRecords();notify("All records deleted.");});
["fromDate","toDate","searchInput"].forEach(id=>$(id).addEventListener(id==="searchInput"?"input":"change",render));
$("resetFilters").addEventListener("click",()=>{$("fromDate").value="";$("toDate").value="";$("searchInput").value="";render();});
$("exportBtn").addEventListener("click",()=>{const records=filtered();if(!records.length){notify("No records to export.");return;}const headers=["date","product","customer","quantity","unit_price","total"];const csv=[headers.join(","),...records.map(r=>headers.map(h=>`"${String(r[h]??"").replace(/"/g,'""')}"`).join(","))].join("\r\n");const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="sales-records.csv";a.click();URL.revokeObjectURL(a.href);notify("CSV export created.");});
(async()=>{try{db=await openDatabase();await loadRecords();}catch(e){notify("Database could not be opened: "+e.message);}})();

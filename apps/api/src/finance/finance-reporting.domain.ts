export type FinanceReportEntry={centerOrgUnitId:string;serviceCode:string;businessDate:string;revenueMinor:number;expenseMinor:number;collectionMinor:number;receivableMinor:number};

export function buildFinanceReport(input:{fromDate:string;toDate:string;centerOrgUnitId?:string;serviceCode?:string;entries:FinanceReportEntry[]}){
  const from=parseDate(input.fromDate,'FINANCE_REPORT_FROM_DATE_INVALID');
  const to=parseDate(input.toDate,'FINANCE_REPORT_TO_DATE_INVALID');
  if(from>to)throw new Error('FINANCE_REPORT_DATE_RANGE_INVALID');
  const rows=input.entries.filter(e=>{
    const d=parseDate(e.businessDate,'FINANCE_REPORT_ENTRY_DATE_INVALID');
    validateEntry(e);
    return d>=from&&d<=to&&(!input.centerOrgUnitId||e.centerOrgUnitId===input.centerOrgUnitId)&&(!input.serviceCode||e.serviceCode===input.serviceCode);
  });
  const totals=rows.reduce((a,e)=>({revenueMinor:a.revenueMinor+e.revenueMinor,expenseMinor:a.expenseMinor+e.expenseMinor,collectionMinor:a.collectionMinor+e.collectionMinor,receivableMinor:a.receivableMinor+e.receivableMinor}),{revenueMinor:0,expenseMinor:0,collectionMinor:0,receivableMinor:0});
  return {fromDate:input.fromDate,toDate:input.toDate,centerOrgUnitId:input.centerOrgUnitId??null,serviceCode:input.serviceCode??null,rowCount:rows.length,...totals,netMinor:totals.revenueMinor-totals.expenseMinor};
}

export function groupFinanceReport(entries:FinanceReportEntry[],dimension:'CENTER'|'SERVICE'){
  const grouped=new Map<string,{revenueMinor:number;expenseMinor:number;collectionMinor:number;receivableMinor:number}>();
  for(const e of entries){validateEntry(e);parseDate(e.businessDate,'FINANCE_REPORT_ENTRY_DATE_INVALID');const key=dimension==='CENTER'?e.centerOrgUnitId:e.serviceCode;if(!key)throw new Error('FINANCE_REPORT_DIMENSION_KEY_REQUIRED');const x=grouped.get(key)??{revenueMinor:0,expenseMinor:0,collectionMinor:0,receivableMinor:0};x.revenueMinor+=e.revenueMinor;x.expenseMinor+=e.expenseMinor;x.collectionMinor+=e.collectionMinor;x.receivableMinor+=e.receivableMinor;grouped.set(key,x);}
  return [...grouped.entries()].map(([key,v])=>({key,...v,netMinor:v.revenueMinor-v.expenseMinor})).sort((a,b)=>a.key.localeCompare(b.key));
}

function validateEntry(e:FinanceReportEntry){if(!e.centerOrgUnitId||!e.serviceCode)throw new Error('FINANCE_REPORT_DIMENSION_KEY_REQUIRED');for(const v of [e.revenueMinor,e.expenseMinor,e.collectionMinor,e.receivableMinor])if(!Number.isSafeInteger(v)||v<0)throw new Error('FINANCE_REPORT_VALUE_INVALID');}
function parseDate(value:string,code:string){if(!/^\d{4}-\d{2}-\d{2}$/.test(value))throw new Error(code);const d=new Date(`${value}T00:00:00.000Z`);if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==value)throw new Error(code);return d;}

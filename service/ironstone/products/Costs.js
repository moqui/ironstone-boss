// App routing is local to this invocation, including nested catalog reads.
function run(op,parameters){
const requestedRoot=parameters.appRoot||'Products'
// Products mounts for the native, capability-checked standard-estimate services.
const policy=()=>ec.resource.script('component://mr-mantle/service/mantle/product/CostPolicy.js'),call=(n,p={})=>policy().call(n,p),S='mantle.product.CostServices.'
function context(p){

 const shared=call('ironstone.products.CatalogServices.get#SharedContext',{appRoot:p.appRoot});if(!shared.capabilities.read)throw new Error('Catalog read access is required')
 const a=policy().capabilities(),out={appRoot:shared.appRoot,costAccess:a,standardCostRows:[],componentRows:[],costHistoryRows:[],findings:[],costMessage:a.read?'':'Standard-cost read authority is required.',costDraft:{quantity:1,quantityUomId:'OTH_ea',priceUomId:ec.user.userAccount?.currencyUomId||'USD'},componentDraft:{quantity:1,rateAmount:0,quantityUomId:'OTH_ea',componentTypeEnumId:'PccMaterial'}}
 if(!a.read)return out
 let d=null;if(p.productStandardCostId){d=call(S+'get#ProductStandardCost',p);if(p.productId&&p.productId!==d.standardCost.productId)throw new Error('Estimate does not belong to this product')}
 const s=policy().scope(Object.assign({},p,d?.standardCost||{}));out.organizationPartyId=s.organizationPartyId;out.productId=d?.standardCost.productId||p.productId||null
 const product=out.productId?policy().product(out.productId,s):null;if(product)out.costDraft.quantityUomId=product.amountUomId||'OTH_ea';out.componentDraft.quantityUomId=out.costDraft.quantityUomId
 Object.assign(out,call(S+'find#ProductStandardCosts',Object.assign({},p,{organizationPartyId:s.organizationPartyId,productId:out.productId,includeHistory:p.includeHistory!==false})))
 out.facilityOptions=policy().rows('mantle.facility.Facility',{ownerPartyId:s.organizationPartyId}).map(r=>({value:r.facilityId,label:r.facilityName||r.facilityId}))
 const units=new Set(['OTH_ea','TF_hr','TF_min','LEN_m','WT_kg',product?.amountUomId,d?.standardCost.quantityUomId,...(d?.componentRows||[]).map(r=>r.quantityUomId)].filter(Boolean));out.unitOptions=policy().rows('moqui.basic.Uom').filter(r=>units.has(r.uomId)).map(r=>({value:r.uomId,label:r.description||r.uomId}))
 out.currencyOptions=policy().rows('moqui.basic.Uom',{uomTypeEnumId:'UT_CURRENCY_MEASURE'}).map(r=>({value:r.uomId,label:r.uomId}));out.componentTypes=policy().rows('moqui.basic.Enumeration',{enumTypeId:'ProductCostComponentType'}).filter(r=>r.enumId!=='PccOverheadPercent').map(r=>({value:r.enumId,label:r.description||r.enumId}))
 if(!out.componentTypes.length)out.componentTypes=['Material','Labor','Machine','Overhead','Outside'].map(t=>({value:'Pcc'+t,label:t}))
 const date=v=>v?ec.l10n.format(new Date(policy().ms(v)),'yyyy-MM-dd HH:mm:ss'):''
 if(d){Object.assign(out,d);out.costDraft=Object.assign({},d.standardCost,{changeReason:''});out.findings=JSON.parse(d.standardCost.findingsJson||'[]');const component=d.componentRows.find(r=>r.productStandardCostComponentId===p.selectedComponentId);if(component)out.componentDraft=Object.assign({},component,{changeReason:''})}
 const unitText=id=>id?policy().one('moqui.basic.Uom',{uomId:id})?.abbreviation||id:''
 out.standardCostRows=out.standardCostRows.map(r=>Object.assign({},r,{fromDateText:r.fromDate?date(r.fromDate):'Draft',thruDateText:date(r.thruDate),unitText:unitText(r.quantityUomId)}));out.componentRows=out.componentRows.map(r=>Object.assign({},r,{componentTypeText:policy().one('moqui.basic.Enumeration',{enumId:r.componentTypeEnumId})?.description||r.componentTypeEnumId,unitText:unitText(r.quantityUomId)}));return out
}
function native(op,p){const out=call(S+op,p);if(out.standardCost)out.productStandardCostId=out.standardCost.productStandardCostId;return out}
function execute(op,p){p=Object.assign({},p);for(const f of ['productStandardCostId','productStandardCostComponentId','facilityId','productBomId','expectedRevision'])if(['null','undefined',''].includes(p[f]))p[f]=null
 if(op==='context')return context(p);if(op==='history'){
 const c=context(p);if(!c.costAccess.read)return c
 const result=Object.assign(c,native('get#ProductCostHistory',Object.assign({},p,{organizationPartyId:c.organizationPartyId}))),groups={}
 result.costHistoryRows=result.costHistoryRows.map(r=>Object.assign({},r,{dateText:r.date?ec.l10n.format(new Date(policy().ms(r.date)),'yyyy-MM-dd HH:mm:ss'):'',unitText:policy().one('moqui.basic.Uom',{uomId:r.quantityUomId})?.abbreviation||r.quantityUomId}))
 for(const row of result.costHistoryRows){if(row.unitCost==null||!row.date)continue;const key=[row.productId,row.priceUomId,row.quantityUomId].join(' · ');(groups[key]||(groups[key]=[])).push(row)}
 const json=v=>JSON.stringify(v).replace(/'/g,'\\u0027').replace(/</g,'\\u003c'),colors=['primary','secondary','accent']
 result.costCharts=Object.entries(groups).map(([title,facts])=>{const labels=[...new Set(facts.map(r=>r.dateText))].sort(),bases=[...new Set(facts.map(r=>r.basis))],series=bases.map((basis,i)=>({label:basis,colorKey:colors[i%colors.length],data:labels.map(date=>{const row=facts.find(r=>r.dateText===date&&r.basis===basis);return row?toDecimal(row.unitCost).toNumber():null})}));return{title:title.split(' · ').slice(0,2).concat(facts[0].unitText).join(' · '),labelsJson:json(labels),seriesJson:json(series)}});return result
 }
 if(op==='rollup'){const c=context(p);if(!c.costAccess.read||!p.calculationId)return Object.assign(c,{calculationId:null,complete:false});const result=native('get#ProductCostRollup',p);return Object.assign(c,result,result.request,{asOfDate:result.request.asOfDate?ec.l10n.format(new Date(policy().ms(result.request.asOfDate)),'yyyy-MM-dd HH:mm:ss'):null})}
 const ops={store:'store#ProductStandardCost',component:'store#StandardCostComponent',clone:'clone#ProductStandardCost',approve:'approve#ProductStandardCost',preview:'preview#ProductCostRollup',save:'save#ProductCostRollup',print:'get#StandardCostPrint'};if(!ops[op])throw new Error('Unknown cost operation');return native(ops[op],p)
}
return execute(op,parameters)
}
;({execute:run})

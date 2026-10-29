// App routing is local to this invocation, including nested catalog reads.
function run(op,parameters){
const requestedRoot=parameters.appRoot||'Products'
// Products context for supplier offers. The native price policy remains the writer and amount guard.
const C='ironstone.products.CatalogServices.',S='ironstone.products.SupplierServices.',P='mantle.product.'
const find=(n,p={})=>ec.entity.find(n).condition(p).disableAuthz(),one=(n,p)=>find(n,p).one(),rows=(n,p)=>Array.from(find(n,p).list())
const call=(n,p={})=>{const out=ec.service.sync().name(n).parameters(Object.assign({appRoot:requestedRoot},p)).disableAuthz().call()||{};if(ec.message.hasError())throw new Error(ec.message.getErrorsString());return out}
const ms=v=>v==null||v===''?null:Number.isFinite(Number(String(v)))?Number(String(v)):Date.parse(String(v))
const active=(r,at)=>(ms(r.fromDate)??-Infinity)<=at&&(ms(r.thruDate)??Infinity)>at
const price=(op,p)=>ec.resource.script('component://mr-boss/service/ironstone/products/Prices.js').execute(op,p)
function scope(p,write=false){
 const a=call(C+'get#SharedContext',{appRoot:p.appRoot}),organizationPartyId=p.organizationPartyId||a.activeOrganizationPartyId||a.organizationPartyIds[0]
 if(!(write?a.capabilities.supplierPriceEdit:a.capabilities.supplierPriceRead))throw new Error('Supplier-price authority is required')

 if(!organizationPartyId||!one('mantle.party.PartyRole',{partyId:organizationPartyId,roleTypeId:'OrgInternal'})||!a.capabilities.systemAdmin&&!a.organizationPartyIds.includes(organizationPartyId))throw new Error('Choose an available internal buying organization')
 return Object.assign({},a,{organizationPartyId})
}
function partyVisible(r,a){return !!r&&(!r.privateOwnerUserId||r.privateOwnerUserId===ec.user.userId)&&(a.capabilities.systemAdmin||a.ownerPartyIds.includes(r.ownerPartyId)||a.organizationPartyIds.includes(r.partyId))}
function supplier(id,a){
 const r=one('mantle.party.Party',{partyId:id})
 if(!partyVisible(r,a)||r.disabled==='Y'||!one('mantle.party.PartyRole',{partyId:id,roleTypeId:'Supplier'})||one('mantle.party.PartyRole',{partyId:id,roleTypeId:'OrgInternal'}))throw new Error('Supplier is not available')
 return r
}
function product(id){const out=call(C+'get#CatalogRecord',{recordId:id,checkOnly:true});if(!out.record)throw new Error('Product is not available');return out.record}
function offers(p){
 const a=scope(p),at=p.asOfDate==null?ms(ec.user.nowTimestamp):ms(p.asOfDate)
 if(!Number.isFinite(at))throw new Error('Choose a valid offer date')
 if(p.vendorPartyId)supplier(p.vendorPartyId,a)
 const selected=p.productId?[product(p.productId).productId]:null
 // Pack offers retain their own priced product. No dimensional unit is invented for a pack.
 if(selected)for(const edge of rows(P+'ProductAssoc',{toProductId:p.productId,productAssocTypeEnumId:'PatPackagingFor'}).filter(r=>active(r,at)))if(call(C+'get#CatalogRecord',{recordId:edge.productId,checkOnly:true}).record)selected.push(edge.productId)
 const all=[],ids=selected?[...new Set(selected)]:[...new Set(rows(P+'ProductPrice',{customerPartyId:a.organizationPartyId}).map(r=>r.productId))]
 for(const productId of ids){
  if(!call(C+'get#CatalogRecord',{recordId:productId,checkOnly:true}).record)continue
  ec.message.pushErrors()
  try{
   const got=call(P+'PriceServices.find#ProductPrices',{productId,direction:'purchase',asOfDate:p.asOfDate,includeHistory:p.includeHistory})
   for(const r of got.productPriceList||[]){
    if(r.customerPartyId!==a.organizationPartyId||r.priceTypeEnumId==='PptAverage'||p.vendorPartyId&&r.vendorPartyId!==p.vendorPartyId||p.priceUomId&&r.priceUomId!==p.priceUomId||p.preferredOrderEnumId&&r.preferredOrderEnumId!==p.preferredOrderEnumId||p.supplierItemCode&&!String(r.otherPartyItemId||'').toLowerCase().includes(String(p.supplierItemCode).toLowerCase()))continue
    try {
    supplier(r.vendorPartyId,a)
    // Format only the native policy's readable rows.
    const data=r.getMap?r.getMap():Object.assign({},r),pack=rows(P+'ProductAssoc',{productId:r.productId,productAssocTypeEnumId:'PatPackagingFor'}).find(row=>active(row,at)&&call(C+'get#CatalogRecord',{recordId:row.toProductId,checkOnly:true}).record)
    Object.assign(data,{organizationPartyId:a.organizationPartyId,productName:product(r.productId).productName,supplierName:one('mantle.party.Organization',{partyId:r.vendorPartyId})?.organizationName||r.vendorPartyId,buyerName:one('mantle.party.Organization',{partyId:r.customerPartyId})?.organizationName||r.customerPartyId,packProductId:pack?r.productId:null,baseProductId:pack?.toProductId||null,packSize:pack?.quantity||r.quantityIncluded||null,packQuantityUomId:pack?(pack.quantityUomId||product(pack.toProductId).amountUomId||null):null,canEdit:a.capabilities.supplierPriceEdit,canCorrect:find('mantle.order.OrderItem',{productPriceId:r.productPriceId}).count()===0,state:ms(r.fromDate)>ms(ec.user.nowTimestamp)?'Scheduled':ms(r.thruDate)!=null&&ms(r.thruDate)<=ms(ec.user.nowTimestamp)?'Ended':'Effective'})
    for(const k of ['fromDate','thruDate'])data[k+'Text']=r[k]?ec.l10n.format(new Date(ms(r[k])),'yyyy-MM-dd HH:mm:ss'):''
    for(const k of ['price','minQuantity','quantityIncrement','quantityIncluded','standardLeadTimeDays','packSize'])if(data[k]!=null)data[k]=String(data[k])
    all.push(data)
    }catch(e){ec.logger.error('Supplier offer '+r.productPriceId+' failed: '+e)}
   }
  }catch(e){ec.logger.error('Supplier offers for product '+productId+' failed: '+e)}finally{ec.message.clearErrors();ec.message.popErrors()}
 }
 all.sort((x,y)=>String(p.groupBy==='product'?x.productId:x.vendorPartyId).localeCompare(String(p.groupBy==='product'?y.productId:y.vendorPartyId))||String(x.productId).localeCompare(String(y.productId))||ms(y.fromDate)-ms(x.fromDate))
 const pageSize=Math.max(1,Math.min(100,Number(p.pageSize||25))),pageIndex=Math.max(0,Math.min(Math.max(0,Math.ceil(all.length/pageSize)-1),Number(p.pageIndex||0)))
 return{appRoot:a.appRoot,organizationPartyId:a.organizationPartyId,offerRows:all.slice(pageIndex*pageSize,(pageIndex+1)*pageSize),offerRowsCount:all.length,pageIndex,pageSize,canSupplierPriceEdit:a.capabilities.supplierPriceEdit}
}
function options(p){const a=scope(p),out=price('options',{}),enums=t=>rows('moqui.basic.Enumeration',{enumTypeId:t}).map(r=>({value:r.enumId,label:r.description||r.enumId}));out.priceOptions.types=out.priceOptions.types.filter(r=>r.value!=='PptAverage');out.priceOptions.organizations=out.priceOptions.organizations.filter(r=>a.capabilities.systemAdmin||a.organizationPartyIds.includes(r.value));out.pricingDefaults=call(P+'PriceServices.get#PricingSettings',{organizationPartyId:a.organizationPartyId}).settings;return Object.assign(out,{organizationPartyId:a.organizationPartyId,preferenceOptions:enums('SupplierPreferredOrder'),ratingOptions:enums('SupplierRatingType'),appRoot:a.appRoot})}
function write(op,p){
 const a=scope(p,true),old=p.productPriceId?one(P+'ProductPrice',{productPriceId:p.productPriceId}):null
 if(p.productPriceId&&!old)throw new Error('Supplier offer is not available')
 const buyer=old?.customerPartyId||p.customerPartyId||a.organizationPartyId,vendor=old?.vendorPartyId||p.vendorPartyId
 if(buyer!==a.organizationPartyId||p.customerPartyId&&p.customerPartyId!==buyer||p.vendorPartyId&&old&&p.vendorPartyId!==vendor)throw new Error('Offer is outside the fixed supplier and buyer scope')
 supplier(vendor,a);if(old&&ec.resource.script('component://mr-mantle/service/mantle/product/PricePolicy.js').execute('direction',old)!=='purchase')throw new Error('Only supplier offers belong here')
 return price(op,Object.assign({},p,{customerPartyId:buyer,vendorPartyId:vendor}))
}
function detail(p){
 const a=scope(p),party=supplier(p.vendorPartyId||p.partyId,a),contacts=call('ironstone.commons.ContactServices.get#ContactRecord',{partyId:party.partyId})
 return{appRoot:a.appRoot,organizationPartyId:a.organizationPartyId,vendorPartyId:party.partyId,supplier:{partyId:party.partyId,supplierName:one('mantle.party.Organization',{partyId:party.partyId})?.organizationName||party.partyId,ownerPartyId:party.ownerPartyId,canEditContact:!!contacts.access?.canEdit},contactRows:contacts.contactMechList||[],addressRows:contacts.addressList||[],roleRows:rows('mantle.party.PartyRole',{partyId:party.partyId}).map(r=>({roleTypeId:r.roleTypeId})),relatedContacts:(contacts.relationshipList||[]).filter(r=>partyVisible(one('mantle.party.Party',{partyId:r.otherPartyId||r.partyId}),a))}
}
function execute(op,p){if(op==='offers')return offers(p);if(op==='options')return options(p);if(op==='detail')return detail(p);return write(op,p)}
return execute(op,parameters)
}
;({execute:run})

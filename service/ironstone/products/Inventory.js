// App routing is local to this invocation, including nested catalog reads.
function run(op,parameters){
const requestedRoot=parameters.appRoot||'Products'
// Products view of Warehouse-owned inventory and policy. Quantities are scoped before they enter a response.
const C='ironstone.products.CatalogServices.',P='mantle.product.',F='mantle.facility.',W=F+'WarehousePolicyServices.'
const find=(n,p={})=>ec.entity.find(n).condition(p).disableAuthz(),one=(n,p)=>find(n,p).one(),rows=(n,p)=>Array.from(find(n,p).list())
const call=(n,p={})=>{const out=ec.service.sync().name(n).parameters(Object.assign({appRoot:requestedRoot},p)).disableAuthz().call()||{};if(ec.message.hasError())throw new Error(ec.message.getErrorsString());return out}
const map=r=>r?.getMap?r.getMap():Object.assign({},r||{}),ms=v=>v==null||v===''?null:Number.isFinite(Number(String(v)))?Number(String(v)):Date.parse(String(v)),dec=v=>toDecimal(v??0)
const fieldLabels={lotRequired:'Lot required',serialRequired:'Serial required',expiryBlock:'Block expired stock',serialPattern:'Serial pattern',lotPattern:'Lot pattern',shelfLifeDays:'Shelf life in days',nearExpiryDays:'Near-expiry warning days',minimumRemainingShelfLifeDays:'Minimum remaining shelf life'}
function context(p){
 const a=call(C+'get#SharedContext',{appRoot:p.appRoot}),product=call(C+'get#CatalogRecord',{recordId:p.productId,checkOnly:true}).record
 if(!product)throw new Error('Product is not available')

 let facilities=rows(F+'Facility').filter(r=>(a.capabilities.systemAdmin||a.ownerPartyIds.includes(r.ownerPartyId))&&one('mantle.party.PartyRole',{partyId:r.ownerPartyId,roleTypeId:'OrgInternal'}))
 if(p.organizationPartyId&&!p.facilityId)facilities=facilities.filter(r=>r.ownerPartyId===p.organizationPartyId)
 const facility=p.facilityId?facilities.find(r=>r.facilityId===p.facilityId):facilities.find(r=>r.facilityTypeEnumId==='FcTpWarehouse')||facilities[0]
 if(p.facilityId&&!facility)throw new Error('Facility is not available')
 const organizationPartyId=facility?.ownerPartyId||p.organizationPartyId||a.activeOrganizationPartyId||a.organizationPartyIds[0]
 if(organizationPartyId&&!a.capabilities.systemAdmin&&!a.ownerPartyIds.includes(organizationPartyId))throw new Error('Stock organization is not available')
 return{appRoot:a.appRoot,product:map(product),productId:p.productId,stockable:['PtAsset','PtDigitalAsset','PtAssetUse','PtPickAssembly'].includes(product.productTypeEnumId),facility:facility?map(facility):null,facilityId:facility?.facilityId||null,organizationPartyId,facilityOptions:facilities.map(r=>({value:r.facilityId,label:(r.facilityName||r.facilityId)+' · '+r.ownerPartyId})),canPlan:!!(a.capabilities.stockPlan||a.capabilities.stockManage),costRead:!!a.capabilities.costRead}
}
function stock(p){
 const c=context(p),checkedAt=ms(ec.user.nowTimestamp)
 if(!c.stockable||!c.facility)return Object.assign(c,{stockRows:[],totals:null,checkedAt,summaryMessage:!c.stockable?'This product does not carry stock.':'No authorized stock facility is available.'})
 const assets=rows(P+'asset.Asset',{productId:c.productId,facilityId:c.facilityId,ownerPartyId:c.organizationPartyId}),available=call(P+'AssetServices.get#AvailableInventory',{productId:c.productId,facilityId:c.facilityId,vendorPartyId:c.organizationPartyId,ownerPartyIdList:[c.organizationPartyId]}).availableToPromiseTotal
 let onHand=dec(0),held=dec(0),availableStatusOnHand=dec(0),reserved=dec(0)
 for(const row of assets){onHand=onHand.add(row.quantityOnHandTotal||0);if(row.statusId==='AstQuarantine')held=held.add(row.quantityOnHandTotal||0);if(row.statusId==='AstAvailable')availableStatusOnHand=availableStatusOnHand.add(row.quantityOnHandTotal||0)}
 if(assets.length)for(const row of Array.from(find(P+'issuance.AssetReservation').condition('assetId','in',assets.map(r=>r.assetId)).list())){const quantity=dec(row.quantityNotIssued??row.quantity).subtract(row.quantityNotAvailable||0);if(quantity.compare(0)>0)reserved=reserved.add(quantity)}
 const totals={onHand:String(onHand),reserved:String(reserved),available:String(available||0),held:String(held),availableStatusOnHand:String(availableStatusOnHand)},stockRows=[Object.assign({},totals,{productId:c.productId,facilityId:c.facilityId,facilityName:c.facility.facilityName||c.facilityId,ownerPartyId:c.organizationPartyId,quantityUomId:c.product.amountUomId,quantityUomText:one('moqui.basic.Uom',{uomId:c.product.amountUomId})?.description||c.product.amountUomId})]
 return Object.assign(c,{stockRows,totals,checkedAt,summaryMessage:c.product.productTypeEnumId==='PtPickAssembly'?'Kit availability includes assemblies possible from components.':'Availability follows the facility’s order-pool rules. Held stock is separate from available stock.'})
}
function projection(p){
 const c=context(p),now=ms(ec.user.nowTimestamp),projectionRows=[]
 if(!c.stockable||!c.facility)return Object.assign(c,{projectionRows,projectionAvailable:false,projectionMessage:'Choose an authorized stock facility.'})
 if(!ec.search.isAvailable())return Object.assign(c,{projectionRows,projectionAvailable:false,projectionMessage:'Search is unavailable; demand and supply projection cannot be read.'})
 const current=stock(p);let fresh=true,failed=false
 for(const days of [7,14,30]){ec.message.pushErrors();try{
  const horizon=new Date(now+days*86400000).toISOString(),out=call(P+'InventoryReportServices.get#InventoryProjectedInfo',{productIdList:[c.productId],facilityId:c.facilityId,organizationPartyId:c.organizationPartyId,estThruDate:horizon}),info=out.infoByProductId?.[c.productId]
  if(!info)continue
  const matches=dec(info.quantityOnHandTotalSum).compare(current.totals.availableStatusOnHand)===0;fresh=fresh&&matches
  projectionRows.push({horizonText:ec.l10n.format(new Date(now+days*86400000),'yyyy-MM-dd'),demand:info.orderNotReserved,consume:info.estRunConsumeRemaining,produce:info.estRunProduceRemaining,incoming:info.prodEstQuantitySum,projected:info.totalProjected,freshness:matches?'Stock quantity agrees':'Stock quantity differs'})
 }catch(e){failed=true;ec.logger.error('Stock projection '+c.productId+' at '+c.facilityId+' horizon '+days+' failed: '+e)}finally{ec.message.clearErrors();ec.message.popErrors()}}
 return Object.assign(c,{projectionRows,projectionAvailable:projectionRows.length>0,projectionMessage:!projectionRows.length?'No indexed projection is available for this product, facility and owner.':failed||!fresh?'Projection may be stale or incomplete. Current stock remains available on Summary.':'Indexed sales demand, production consumption and supply. Stock quantity was checked against current records; projected dates are not promises.'})
}
function policy(p){
 const c=context(p);if(!c.facility||!c.stockable)return Object.assign(c,{facilityPolicy:{},locationPolicies:[],locationOptions:[],trackingSettings:{},trackingHistory:[],trackingSources:[],policyMessage:'Choose a stockable product and authorized facility.'})
 const facility=call(F+'FacilityServices.get#ProductFacilityPolicy',{productId:c.productId,facilityId:c.facilityId}),resolved=call(W+'resolve#WarehousePolicy',{organizationPartyId:c.organizationPartyId,productId:c.productId,facilityId:c.facilityId,asOfDate:p.asOfDate}),trackingScope=p.trackingScope==='organization'?'organization':'facility',edited=trackingScope==='facility'?resolved:call(W+'resolve#WarehousePolicy',{organizationPartyId:c.organizationPartyId,productId:c.productId,asOfDate:p.asOfDate})
 const trackingSettings=Object.assign({productId:c.productId,facilityId:c.facilityId,organizationPartyId:c.organizationPartyId,trackingScope},edited.configuredPolicy)
 trackingSettings.facilityId=c.facilityId;trackingSettings.productId=c.productId;trackingSettings.trackingScope=trackingScope
 for(const field of Object.keys(fieldLabels))if(trackingSettings[field]==null)trackingSettings[field]=''
 trackingSettings.expectedFromDate=edited.configuredPolicy.fromDate||null;trackingSettings.changeReason=''
 facility.facilityPolicy=Object.assign({productId:c.productId,facilityId:c.facilityId},facility.facilityPolicy);facility.facilityPolicy.changeReason='';facility.facilityPolicy.reorderMethodText=one('moqui.basic.Enumeration',{enumId:facility.facilityPolicy.reorderMethodEnumId})?.description||'';facility.facilityPolicy.abcClassText=one('moqui.basic.Enumeration',{enumId:facility.facilityPolicy.abcClassEnumId})?.description||'';for(const key of ['minimumStock','maximumStock','reorderQuantity','daysToShip'])if(facility.facilityPolicy[key]!=null)facility.facilityPolicy[key]=String(facility.facilityPolicy[key]);for(const row of facility.locationPolicies)for(const key of ['minimumStock','moveQuantity'])if(row[key]!=null)row[key]=String(row[key]);
 const enums=type=>rows('moqui.basic.Enumeration',{enumTypeId:type}).map(r=>({value:r.enumId,label:r.description||r.enumId}))
 return Object.assign(c,facility,{trackingScope,trackingSettings,trackingSources:resolved.sourceRows.map(r=>({fieldLabel:fieldLabels[r.field],valueText:r.value==null?'Not set':r.value==='Y'?'Yes':r.value==='N'?'No':String(r.value),sourceText:r.source||r.organizationPartyId+' · '+(r.facilityId==='_NA_'?'all facilities':r.facilityId)+' · '+(r.productId==='_NA_'?'all products':r.productId),fromDateText:r.fromDate?ec.l10n.format(new Date(ms(r.fromDate)),'yyyy-MM-dd HH:mm:ss'):''})),trackingHistory:edited.history.map(r=>Object.assign({},r,{lotText:r.lotRequired==null?'Inherit':r.lotRequired==='Y'?'Yes':'No',serialText:r.serialRequired==null?'Inherit':r.serialRequired==='Y'?'Yes':'No',fromDateText:ec.l10n.format(new Date(ms(r.fromDate)),'yyyy-MM-dd HH:mm:ss'),thruDateText:r.thruDate?ec.l10n.format(new Date(ms(r.thruDate)),'yyyy-MM-dd HH:mm:ss'):''})),locationOptions:rows(F+'FacilityLocation',{facilityId:c.facilityId}).map(r=>({value:r.locationSeqId,label:[r.locationSeqId,r.areaId,r.aisleId,r.sectionId].filter(Boolean).join(' · ')})),abcOptions:enums('AbcClass'),reorderOptions:enums('ReorderMethod'),policyMessage:'Tracking changes start a dated policy. Empty exception fields inherit from broader scopes; an inherited expiry prohibition remains in force.'})
}
function storeFacility(p){const c=context(p);if(!c.canPlan)throw new Error('Warehouse stock-planner or manager authority is required');return call(F+'FacilityServices.store#ProductFacilityPolicy',Object.assign({},p,{productId:c.productId,facilityId:c.facilityId,organizationPartyId:c.organizationPartyId}))}
function storeTracking(p){const c=context(p);if(!c.canPlan)throw new Error('Warehouse stock-planner or manager authority is required');return call(W+'store#TrackingPolicy',Object.assign({},p,{productId:c.productId,organizationPartyId:c.organizationPartyId,facilityId:p.trackingScope==='organization'?null:c.facilityId,fromDate:p.effectiveFromDate||p.fromDate||null}))}
function execute(op,p){return({context,stock,projection,policy,storeFacility,storeTracking})[op](p)}
return execute(op,parameters)
}
;({execute:run})

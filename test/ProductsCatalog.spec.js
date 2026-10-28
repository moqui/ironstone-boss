// P2: actual user capabilities stay in force even with artifact authorization disabled for a local service call.
const C='ironstone.products.CatalogServices.'
const S='ironstone.products.SettingsServices.'
function as(user,body) { login(user); const was=ec.artifactExecution.disableAuthz();try{return body()}finally{ec.message.clearErrors();if(!was)ec.artifactExecution.enableAuthz();login('john.doe')} }
function invoke(name,p) {
    try {const out=ec.service.sync().name(name).parameters(p||{}).disableAuthz().call()||{};const error=ec.message.getErrorsString();ec.message.clearErrors();return Object.assign({},out,{error})}
    catch(e){ec.message.clearErrors();return {error:String(e.message||e)}}
}
const product=(id,type='PtAsset')=>invoke(C+'store#Product',{productId:id,productName:'P2 '+id,productTypeEnumId:type,ownerPartyId:'ORG_ZIZI_SERVICES',createOnly:true})
feature('an editor creates a draft, fills activation requirements, and transitions with an audited lifecycle', {
    when(){return as('catalog.catalog.edit',()=>{
        const created=product('PRD_P2_LIFE')
        const cleared=invoke(C+'store#Product',{productId:created.productId,amountUomId:''})
        const refused=invoke(C+'transition#ProductStatus',{productId:created.productId,statusId:'PrdActive'})
        const filled=invoke(C+'store#Product',{productId:created.productId,amountUomId:'OTH_ea'})
        const active=invoke(C+'transition#ProductStatus',{productId:created.productId,statusId:'PrdActive'})
        const detail=invoke(C+'get#ProductDetail',{productId:created.productId})
        return {created,cleared,refused,filled,active,detail}
    })},
    then({created,cleared,refused,filled,active,detail}){
        created.error==''
        cleared.error==''
        refused.error.includes('amountUomId')
        filled.error==''
        active.error==''
        detail.detail.product.statusId=='PrdActive'
        detail.detail.historyRows.some(row=>row.changedFieldName==='statusId' && row.newValueText==='PrdActive')
    },
})
feature('identifier uniqueness and customer item codes use guarded stores and authorized search',{
    when(){return as('catalog.catalog.edit',()=>{
        const a=product('PRD_P2_IDA'),b=product('PRD_P2_IDB')
        const id=invoke(C+'store#CatalogRow',{kind:'identifier',productId:a.productId,productIdTypeEnumId:'PidtSku',idValue:'P2-UNIQUE'})
        const collision=invoke(C+'store#CatalogRow',{kind:'identifier',productId:b.productId,productIdTypeEnumId:'PidtOther',idValue:'P2-UNIQUE'})
        const party=invoke(C+'store#CatalogRow',{kind:'party',productId:a.productId,partyId:'ORG_ZIZI_SERVICES',roleTypeId:'Customer',otherPartyItemId:'CUSTOMER-P2-CODE'})
        const found=invoke(C+'find#Products',{partyItemId:'CUSTOMER-P2-CODE'})
        return {a,b,id,collision,party,found}
    })},
    then({a,b,id,collision,party,found}){
        a.error==''
        b.error==''
        id.error==''
        collision.error.includes('already assigned')
        party.error==''
        found.productList.map(row=>row.productId)==['PRD_P2_IDA']
    },
})
feature('kit writes reject cycles and invalid quantities and retain all three components',{
    when(){return as('catalog.catalog.edit',()=>{
        product('PRD_P2_KITA','PtPickAssembly');product('PRD_P2_KITB','PtPickAssembly')
        const parts=['DEMO_SA_1','DEMO_SA_2','DEMO_RM_1'].map(toProductId=>invoke(C+'store#CatalogRow',{kind:'kit',productId:'PRD_P2_KITA',toProductId,quantity:2}))
        const zero=invoke(C+'store#CatalogRow',{kind:'kit',productId:'PRD_P2_KITA',toProductId:'PRD_P2_KITB',quantity:0})
        const forward=invoke(C+'store#CatalogRow',{kind:'kit',productId:'PRD_P2_KITA',toProductId:'PRD_P2_KITB',quantity:1})
        const cycle=invoke(C+'store#CatalogRow',{kind:'kit',productId:'PRD_P2_KITB',toProductId:'PRD_P2_KITA',quantity:1})
        const detail=invoke(C+'get#ProductDetail',{productId:'PRD_P2_KITA'})
        return {parts,zero,forward,cycle,detail}
    })},
    then({parts,zero,forward,cycle,detail}){
        parts.every(row=>row.error=='')
        zero.error.includes('positive')
        forward.error==''
        cycle.error.includes('cycle')
        detail.detail.kitRows.length==4
        detail.detail.kitAvailable!=null
    },
})
feature('bulk category applies a fixed ID selection independently and reports a foreign owner by ID',{
    when(){return as('catalog.catalog.edit',()=>invoke(C+'bulk#Products',{productIds:['BOSS_PRD_OWN','BOSS_PRD_OTHER'],kind:'category',productCategoryId:'BOSS_PRD_CAT'}))},
    then({results,successCount,failedCount,error}){
        error==''
        successCount==1
        failedCount==1
        results.find(row=>row.status==='error').productId=='BOSS_PRD_OTHER'
    },
})
feature('clone copies modern dimensions without external identifiers or status and deletion preserves used masters',{
    when(){return as('catalog.catalog.edit',()=>{
        product('PRD_P2_CLONE')
        const dimension=invoke(C+'store#CatalogRow',{kind:'dimension',productId:'PRD_P2_CLONE',uomDimensionTypeId:'Height',uomId:'LEN_m',value:2})
        const cloned=invoke(C+'clone#Product',{baseProductId:'PRD_P2_CLONE',productId:'PRD_P2_COPIED',copyDimensions:true})
        const detail=invoke(C+'get#ProductDetail',{productId:'PRD_P2_COPIED'})
        const deleted=invoke(C+'delete#UnusedDraft',{productId:'PRD_P2_COPIED'})
        const active=invoke(C+'delete#UnusedDraft',{productId:'PRD_P2_LIFE'})
        return {dimension,cloned,detail,deleted,active}
    })},
    then({dimension,cloned,detail,deleted,active}){
        dimension.error==''
        cloned.error==''
        detail.detail.product.statusId=='PrdDraft'
        detail.detail.dimensionRows.length==1
        deleted.error==''
        active.error.includes('unused drafts')
    },
})
feature('catalog settings are structured revisions, reject stale edits and require the administrator grant',{
    when(){
        const admin=as('catalog.admin',()=>{
            const current=invoke(S+'get#CatalogSettings',{organizationPartyId:'ORG_ZIZI_SERVICES'})
            const next=invoke(S+'store#CatalogSettings',{organizationPartyId:'ORG_ZIZI_SERVICES',expectedVersion:current.versionSeqId,settings:{requiredFields:['productName','productTypeEnumId','amountUomId'],allowCostSelfApproval:false}})
            const stale=invoke(S+'store#CatalogSettings',{organizationPartyId:'ORG_ZIZI_SERVICES',expectedVersion:current.versionSeqId,settings:{idPolicy:'manual'}})
            return {current,next,stale}
        })
        const editor=as('catalog.catalog.edit',()=>invoke(S+'store#CatalogSettings',{organizationPartyId:'ORG_ZIZI_SERVICES',expectedVersion:0,settings:{}}))
        const reader=as('catalog.reader',()=>invoke(C+'store#Product',{productId:'BOSS_PRD_OWN',productName:'refused'}))
        return {admin,editor,reader}
    },
    then({admin,editor,reader}){
        admin.next.error==''
        admin.next.versionSeqId==admin.current.versionSeqId+1
        admin.stale.error.includes('changed')
        editor.error.includes('not available')
        reader.error.includes('Catalog editor')
    },
})

feature('clone preserves scoped IDs and independently copied document bytes, meters and maintenance references',{
 when(){return as('catalog.catalog.edit',()=>{
  const created=invoke(C+'store#Product',{productId:'PRD_P2_EQUIPMENT',productName:'Equipment template',productTypeEnumId:'PtAsset',assetTypeEnumId:'AstTpEquipment',ownerPartyId:'ORG_ZIZI_SERVICES',createOnly:true})
  const scoped=invoke(C+'store#CatalogRow',{kind:'otherIdentifier',productId:created.productId,productIdTypeEnumId:'PidtOther',idValue:'P2-SCOPED'})
  const content=invoke(C+'store#ProductContent',{productId:created.productId,productContentTypeEnumId:'PcntDescription',contentText:'Independent clone document'})
  const meter=invoke(C+'store#CatalogRow',{kind:'meter',productId:created.productId,productMeterTypeId:'PdMtrOdometer',meterUomId:'LEN_km',meterName:'Distance'})
  const maintenance=invoke(C+'store#CatalogRow',{kind:'maintenance',productId:created.productId,description:'Inspect',intervalQuantity:100,intervalUomId:'LEN_km',intervalProductMeterId:meter.productMeterId})
  const cloned=invoke(C+'clone#Product',{baseProductId:created.productId,productId:'PRD_P2_EQUIPMENT_COPY',copyIdentifiers:true,copyContent:true,copyEquipment:true})
  const detail=invoke(C+'get#ProductDetail',{productId:cloned.productId}).detail
  const original=invoke(C+'get#ProductDetail',{productId:created.productId}).detail
  return {created,scoped,content,meter,maintenance,cloned,detail,original,text:detail?.contentRows[0]?ec.resource.getLocationReference(detail.contentRows[0].contentLocation).getText():null}
 })},then({created,scoped,content,meter,maintenance,cloned,detail,original,text}){
  [created,scoped,content,meter,maintenance,cloned].every(out=>out.error=='')
  detail.otherIdentifierRows.length==1
  detail.otherIdentifierRows[0].idValue!='P2-SCOPED'
  detail.meterRows.length==1
  detail.maintenanceRows[0].intervalProductMeterId==detail.meterRows[0].productMeterId
  detail.contentRows[0].contentLocation!=original.contentRows[0].contentLocation
  text=='Independent clone document'
 },
})

feature('active distinguishing identity, forged child IDs and supplier-only item codes stay protected',{
 when(){
  const fixture=as('john.doe',()=>{
   call('create#mantle.product.ProductParty',{productId:'BOSS_PRD_OWN',partyId:'ZiddlemanInc',roleTypeId:'Supplier',fromDate:Date.now()-1000,otherPartyItemId:'P2-SUPPLIER-ONLY'})
   const own=call('create#mantle.product.ProductUomDimension',{productId:'BOSS_PRD_OTHER',uomDimensionTypeId:'Height',uomId:'LEN_m',value:1})
   return own.productUomDimensionId
  })
  const editor=as('catalog.catalog.edit',()=>({
   dimension:invoke(C+'store#CatalogRow',{kind:'dimension',productId:'BOSS_PRD_OWN',productUomDimensionId:fixture,uomDimensionTypeId:'Height',uomId:'LEN_m',value:2}),
   feature:invoke(C+'store#CatalogRow',{kind:'feature',productId:'BOSS_PRD_OWN',productFeatureId:'SizeSmall',applTypeEnumId:'PfatDistinguishing'}),
  }))
  const reader=as('catalog.reader',()=>({found:invoke(C+'find#Products',{partyItemId:'P2-SUPPLIER-ONLY'}),detail:invoke(C+'get#ProductDetail',{productId:'BOSS_PRD_OWN'})}))
  const indexed=as('john.doe',()=>call('mantle.product.ProductServices.get#ProductManualDocumentData',{dataDocumentId:'MantleProduct',document:{productId:'BOSS_PRD_OWN',ownerPartyId:'ORG_ZIZI_SERVICES',parties:[{otherPartyItemId:'P2-SUPPLIER-ONLY'}]}}).document)
  return {editor,reader,indexed}
 },then({editor,reader,indexed}){
  editor.dimension.error.includes('not on this product')
  editor.feature.error.includes('Distinguishing feature identity')
  reader.found.productList==[]
  !reader.detail.detail.partyRows.some(row=>row.otherPartyItemId=='P2-SUPPLIER-ONLY')
  !indexed.parties.some(row=>row.otherPartyItemId=='P2-SUPPLIER-ONLY')
  indexed.parties.some(row=>row.otherPartyItemId=='SERVICES-PART-01')
 },
})

feature('typed content copies an authorized drive file and refuses server paths and inaccessible drives',{
 when(){return as('catalog.catalog.edit',()=>{
  const drive=call('org.moqui.impl.FileServices.get#UserDrives').personalDriveId
  call('org.moqui.impl.FileServices.upload#Resource',{driveId:drive,file:uploadedFile('catalog-source.txt','Authorized catalog source')})
  const copied=invoke(C+'store#ProductContent',{productId:'BOSS_PRD_OWN',productContentTypeEnumId:'PcntDescription',sourceDriveId:drive,sourcePath:'catalog-source.txt'})
  const row=copied.productContentId?ec.entity.find('mantle.product.ProductContent').condition({productContentId:copied.productContentId}).one():null
  return {
   copied,text:row?ec.resource.getLocationReference(row.contentLocation).getText():null,
   raw:invoke(C+'store#ProductContent',{productId:'BOSS_PRD_OWN',productContentTypeEnumId:'PcntDescription',contentLocation:'file:///tmp/private.txt'}),
   hidden:invoke(C+'store#ProductContent',{productId:'BOSS_PRD_OWN',productContentTypeEnumId:'PcntDescription',sourceDriveId:'NO_SUCH_DRIVE',sourcePath:'private.txt'})
  }
 })},then({copied,text,raw,hidden}){copied.error=='';text=='Authorized catalog source';raw.error.includes('authorized drive');hidden.error!=''},
})

// The catalog owner/capability boundary, exercised with authorization both on and disabled (internal callbacks).
const CATALOG = 'ironstone.products.CatalogServices.'
function asCatalog(user, run, enabled = true) {
    login(user)
    const disabled = ec.artifactExecution.authzDisabled()
    if (enabled && disabled) ec.artifactExecution.enableAuthz()
    if (!enabled && !disabled) ec.artifactExecution.disableAuthz()
    try { return run() } finally {
        ec.message.clearErrors()
        if (disabled) ec.artifactExecution.disableAuthz()
        else ec.artifactExecution.enableAuthz()
        login('john.doe')
    }
}
function access(id, need = 'read', extra = {}) {
    return call(CATALOG + 'get#CatalogRecord', Object.assign({recordId: id, need, checkOnly: true}, extra))
}
feature('a reader sees shared and own products, with no writes or other-organization records', {
    when() {
        return asCatalog('catalog.reader', () => ({own: access('BOSS_PRD_OWN'), other: access('BOSS_PRD_OTHER'),
            shared: access('DEMO_SA_1'), edit: access('BOSS_PRD_OWN', 'catalogEdit'),
            list: call(CATALOG + 'find#Products', {text: 'catalog sample'}),
            price: call(CATALOG + 'get#CatalogAccess').capabilities}))
    },
    then({own, other, shared, edit, list, price}) {
        own.record.productId == 'BOSS_PRD_OWN'
        own.canWrite == false
        other.record == null
        other.canRead == false
        shared.record.ownerPartyId == '_NA_'
        edit.record == null
        list.productList.map(row => row.productId) == ['BOSS_PRD_OWN']
        price.priceRead == false
        price.supplierPriceRead == false
        price.costRead == false
        price.marginRead == false
    },
})
feature('editor authority composes with ownership and shared writes require system authority', {
    when() {
        const editor = asCatalog('catalog.catalog.edit', () => ({own: access('BOSS_PRD_OWN', 'catalogEdit'),
            other: access('BOSS_PRD_OTHER', 'catalogEdit'), shared: access('DEMO_SA_1', 'catalogEdit'),
            price: access('BOSS_PRD_OWN', 'priceEdit')}))
        const admin = access('DEMO_SA_1', 'catalogEdit')
        return {editor, admin}
    },
    then({editor, admin}) {
        editor.own.canWrite == true
        editor.own.record.productId == 'BOSS_PRD_OWN'
        editor.other.record == null
        editor.shared.record == null
        editor.price.record == null
        admin.canWrite == true
    },
})
feature('an internal callback and forged user context cannot widen the actual membership scope', {
    when() {
        return asCatalog('catalog.reader', () => {
            ec.user.context.filterOrgIds = ['ORG_ZIZI_RETAIL']
            ec.user.context.activeOrgId = 'ORG_ZIZI_RETAIL'
            ec.artifactExecution.disableAuthz()
            return {other: access('BOSS_PRD_OTHER'), own: access('BOSS_PRD_OWN'),
                arbitrary: access('EX_JOHN_DOE', 'read', {recordEntityName: 'moqui.security.UserAccount'}),
                files: call('mantle.party.CommunicationServices.get#RecordLinkInfo', {
                    recordEntityName: 'mantle.product.Product', recordId: 'BOSS_PRD_OTHER', checkOnly: true})}
        })
    },
    then({other, own, arbitrary, files}) {
        other.record == null
        own.record.productId == 'BOSS_PRD_OWN'
        arbitrary.record == null
        files.recordVisible == false
    },
})
feature('exact identifiers and record links reveal only authorized catalog records', {
    when() {
        return asCatalog('catalog.reader', () => ({
            own: call(CATALOG + 'search#ProductIds', {text: 'BOSS-OWN-CODE'}).rows,
            other: call(CATALOG + 'search#ProductIds', {text: 'BOSS-OTHER-CODE'}).rows,
            link: call('ironstone.commons.PaletteServices.get#RecordLink', {docType: 'MantleProduct', id: 'BOSS_PRD_OWN'}),
            hidden: call('ironstone.commons.PaletteServices.get#RecordLink', {docType: 'MantleProduct', id: 'BOSS_PRD_OTHER'}),
            category: call('ironstone.commons.PaletteServices.get#RecordLink', {recordEntityName: 'mantle.product.category.ProductCategory', id: 'BOSS_PRD_CAT'})
        }))
    },
    then({own, other, link, hidden, category}) {
        own.length == 1
        own[0].url == '/qapps/Products/Products/Product360?productId=BOSS_PRD_OWN'
        other == []
        link.url == own[0].url
        hidden.url == null
        category.url == '/qapps/Products/Categories/CategoryDetail?productCategoryId=BOSS_PRD_CAT'
    },
})
feature('price grants never imply supplier or cost access', {
    when() { return asCatalog('catalog.price.edit', () => call(CATALOG + 'get#CatalogAccess').capabilities) },
    then(capabilities) {
        capabilities.priceRead == true
        capabilities.priceEdit == true
        capabilities.catalogEdit == false
        capabilities.supplierPriceRead == false
        capabilities.costRead == false
        capabilities.marginRead == false
    },
})

feature('catalog file writes require the editor grant through Products and Commons shared mounts', {
    when() {
        const mount = (app, transition, parameters, method) => {
            const result = ec.screen.makeTest().rootScreen('component://mr-boss/screen/' + app + '.xml')
                .render('RecordFiles/' + transition, Object.assign({recordEntity: 'mantle.product.Product', recordId: 'BOSS_PRD_OWN'}, parameters), method)
            let data = null
            try { data = JSON.parse(result.output) } catch (err) {}
            const out = {data, errors: result.errorMessages.join(' | '), text: String(result.output)}
            ec.message.clearErrors()
            return out
        }
        const reader = asCatalog('catalog.reader', () => ({
            files: mount('Products', 'filesData', {}, 'get'),
            upload: mount('Products', 'upload', {contentFile: uploadedFile('reader-refused.txt', 'refused')}, 'post'),
            commons: mount('Commons', 'upload', {contentFile: uploadedFile('reader-refused.txt', 'refused')}, 'post')
        }))
        const editor = asCatalog('catalog.catalog.edit', () => mount('Products', 'filesData', {}, 'get'))
        return {reader, editor}
    },
    then({reader, editor}) {
        reader.files.data.visible == true
        reader.files.data.canUpload == false
        reader.upload.errors != '' || reader.upload.data?.errors != null
        reader.commons.errors != '' || reader.commons.data?.errors != null
        editor.data.canUpload == true
    },
})

feature('P2 catalog projections and writers keep grants and owner checks with authorization disabled', {
 when(){return asCatalog('catalog.reader',()=>{
  const denied=[]
  for(const [noun,params] of [['store#Product',{productId:'BOSS_PRD_OWN',productName:'Denied'}],['transition#ProductStatus',{productId:'BOSS_PRD_OWN',statusId:'PrdDiscontinued'}],['store#CatalogRow',{kind:'identifier',productId:'BOSS_PRD_OWN',productIdTypeEnumId:'PidtSku',idValue:'DENIED'}],['store#ProductContent',{productId:'BOSS_PRD_OWN',productContentTypeEnumId:'PcntDescription',contentText:'Denied'}],['clone#Product',{baseProductId:'BOSS_PRD_OWN',productId:'DENIED_CLONE'}],['delete#UnusedDraft',{productId:'BOSS_PRD_DRAFT'}]]) {
   try {call(CATALOG+noun,params);denied.push(ec.message.hasError())}catch(e){denied.push(true)}finally{ec.message.clearErrors()}
  }
  const detail=call(CATALOG+'get#ProductDetail',{productId:'BOSS_PRD_OWN'}).detail
  const palette=call(CATALOG+'search#Catalog',{text:'BOSS-OTHER-CODE'})
  let hidden=false
  try {call(CATALOG+'get#ProductDetail',{productId:'BOSS_PRD_OTHER'});hidden=ec.message.hasError()}catch(e){hidden=true}finally{ec.message.clearErrors()}
  return {denied,detail,palette,hidden}
 },false)},then({denied,detail,palette,hidden}){
  denied==[true,true,true,true,true,true]
  detail.canEdit==false
  detail.connectionRows==[]
  detail.priceRows==null
  detail.costRows==null
  palette.rows==[]
  hidden==true
 },
})

feature('P3 feature/group links and shared record callbacks enforce the real owner with authorization disabled',{
 when(){
  asCatalog('john.doe',()=>{
   call('store#mantle.product.feature.ProductFeature',{productFeatureId:'BOSS_ACCESS_OTHER_FEATURE',description:'Hidden access feature',productFeatureTypeEnumId:'PftColor',ownerPartyId:'ORG_ZIZI_RETAIL'})
   call('store#mantle.product.feature.ProductFeatureGroup',{productFeatureGroupId:'BOSS_ACCESS_OTHER_GROUP',description:'Hidden access group',ownerPartyId:'ORG_ZIZI_RETAIL'})
  },false)
  return asCatalog('catalog.reader',()=>({
   feature:call('ironstone.commons.PaletteServices.get#RecordLink',{recordEntityName:'mantle.product.feature.ProductFeature',id:'BOSS_PRD_FEATURE'}),
   group:call('ironstone.commons.PaletteServices.get#RecordLink',{recordEntityName:'mantle.product.feature.ProductFeatureGroup',id:'BOSS_PRD_GROUP'}),
   hidden:call('ironstone.commons.PaletteServices.get#RecordLink',{recordEntityName:'mantle.product.feature.ProductFeatureGroup',id:'BOSS_ACCESS_OTHER_GROUP'}),
   callback:call('mantle.party.CommunicationServices.get#RecordLinkInfo',{recordEntityName:'mantle.product.feature.ProductFeatureGroup',recordId:'BOSS_ACCESS_OTHER_GROUP',checkOnly:true})
  }),false)
 },then({feature,group,hidden,callback}){
  feature.url=='/qapps/Products/Features/FeatureDetail?productFeatureId=BOSS_PRD_FEATURE'
  group.url=='/qapps/Products/Features/FeatureGroups/FeatureGroupDetail?productFeatureGroupId=BOSS_PRD_GROUP'
  hidden.url==null
  callback.recordVisible==false
 },
})
feature('P3 tags use the same authorized product filter and taxonomy writes require the editor grant',{
 when(){return asCatalog('catalog.reader',()=>{
  const products=call(CATALOG+'find#Products',{tagIds:['BOSS_PRD_TAG']}).productList
  let denied=false
  try{call('ironstone.products.CategoryServices.store#Category',{productCategoryId:'BOSS_PRD_CAT',categoryName:'Denied'});denied=ec.message.hasError()}catch(e){denied=true}finally{ec.message.clearErrors()}
  return {products,denied}
 },false)},then({products,denied}){products.map(row=>row.productId)==['BOSS_PRD_OWN'];denied==true},
})
feature('P4 variant service and screen entry points refuse readers and other owners',{
 when(){return asCatalog('catalog.reader',()=>{
  const failures=[]
  for(const name of ['preview#VariantProducts','create#VariantProducts','start#VariantBatch']){let denied=false;try{call('ironstone.products.VariantServices.'+name,{productId:'BOSS_PRD_VIRT',selectedFeatureSets:[]});denied=ec.message.hasError()}catch(e){denied=true}finally{ec.message.clearErrors()}if(!denied)failures.push(name)}
  return {failures}
 },false)},then({failures}){failures.length==0},
})
feature('P5a price projections and writes retain their direction boundary inside internal callbacks',{
 when(){const read=asCatalog('catalog.price.read',()=>call(CATALOG+'find#ProductPrices',{productId:'BOSS_PRD_OWN'}),false);const supplier=asCatalog('catalog.supplier.price.read',()=>call(CATALOG+'find#ProductPrices',{productId:'BOSS_PRD_OWN'}),false);const denied=asCatalog('catalog.reader',()=>{let rejected=false;try{call(CATALOG+'store#ProductPrice',{productId:'BOSS_PRD_OWN',vendorPartyId:'ORG_ZIZI_SERVICES',priceTypeEnumId:'PptCurrent',priceUomId:'USD',price:1})}catch(e){rejected=true}finally{ec.message.clearErrors()}return rejected},false);return{read,supplier,denied}},then({read,supplier,denied}){read.priceRows.every(r=>r.direction==='sales');!JSON.stringify(read).includes('SERV-SUPPLY-01');supplier.priceRows.every(r=>r.direction==='purchase');denied==true},
})

feature('P6 supplier services and shared mounts refuse sales-only editors even through internal callbacks',{
 when(){return asCatalog('catalog.price.edit',()=>{const failures=[];for(const [name,args] of [['find#SupplierPrices',{}],['get#SupplierDetail',{vendorPartyId:'BOSS_PRD_SUPPLIER'}],['store#SupplierPrice',{productId:'BOSS_PRD_OWN',vendorPartyId:'BOSS_PRD_SUPPLIER',price:1,priceUomId:'USD'}]]){let refused=false;try{call('ironstone.products.SupplierServices.'+name,args);refused=ec.message.hasError()}catch(e){refused=true}finally{ec.message.clearErrors()}if(!refused)failures.push(name)}return{failures}},false)},then({failures}){failures.length==0},
})

feature('P7 stock policy remains Warehouse-controlled through Products shared callbacks',{
 when(){return asCatalog('catalog.catalog.edit',()=>{const refused=[];for(const name of ['store#FacilityPolicy','store#TrackingPolicy']){try{call('ironstone.products.InventoryServices.'+name,{productId:'BOSS_PRD_OWN',facilityId:'BOSS_PRD_WH',minimumStock:1,lotRequired:'Y',changeReason:'Refused'});refused.push(ec.message.hasError())}catch(e){refused.push(true)}finally{ec.message.clearErrors()}}return{refused}},false)},then({refused}){refused==[true,true]},
})

feature('method reads and writes require Manufacturing roles independently of all Products grants',{
 when(){return asCatalog('catalog.admin',()=>{const failures=[];for(const name of ['store#Bom','store#BomItem','release#BomDraft','get#BomExplosion','store#Routing','store#RoutingOperation','release#RoutingDraft','store#WorkCenter','store#WorkCenterRate']){let refused=false;try{call('ironstone.products.MethodServices.'+name,{productId:'BOSS_PRD_OWN',componentProductId:'BOSS_PRD_OWN',changeReason:'Guard probe'});refused=ec.message.hasError()}catch(e){refused=true}finally{ec.message.clearErrors()}if(!refused)failures.push(name)}return{failures}},false)},then({failures}){failures.length==0},
})

feature('cost services enforce their own grant with artifact authorization #enabled',{
 where:[{enabled:true},{enabled:false}],when({enabled}){
 const probe=user=>asCatalog(user,()=>{const r=call('ironstone.products.CostServices.get#CostContext',{productId:'BOSS_PRD_OWN'});return{read:r.costAccess.read,count:r.standardCostRows.length}},enabled)
 return{plain:probe('catalog.reader'),read:probe('catalog.cost.read'),admin:probe('catalog.admin')}
 },then({plain,read,admin}){plain.read==false;plain.count==0;read.read==true;read.count>=1;admin.read==true},
})

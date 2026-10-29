const C='ironstone.products.CatalogServices.'
function as(user,on,run){login(user);if(on)ec.artifactExecution.enableAuthz();else ec.artifactExecution.disableAuthz();try{return run()}finally{ec.message.clearErrors();ec.artifactExecution.disableAuthz();login('john.doe')}}
function refused(name,p){try{call(name,p);return ec.message.hasError()}catch(e){return true}finally{ec.message.clearErrors()}}
spec({cleanup(){ec.message.clearErrors();ec.artifactExecution.enableAuthz()}})
feature('shared catalog routing derives the Products context and grants with authz #enabled',{
 where:[{enabled:true},{enabled:false}],when({enabled}){return as('catalog.reader',enabled,()=>call(C+'get#SharedContext',{appRoot:'Products',capabilities:{costRead:true},ownerPartyIds:['ORG_ZIZI_RETAIL'],productTabs:['Forged'],includeConnections:true}))},
 then(r){r.appRoot=='Products';r.sharedLinks['Products/Product360']=='//Products/Products/Product360';r.printBase=='/apps/Products';r.productTabs.includes('Summary');!r.productTabs.includes('Forged');r.capabilities.costRead==false;!r.ownerPartyIds.includes('ORG_ZIZI_RETAIL');!r.connectionTypes.includes('Invoices');!r.connectionTypes.includes('Orders');!r.connectionTypes.includes('Shipments')},
})
feature('unimplemented app contexts are rejected at every shared controller with authz #enabled',{
 where:[{enabled:true},{enabled:false}],when({enabled}){return as('catalog.admin',enabled,()=>{
  const names=[C+'get#SharedContext',C+'get#CatalogRecord',C+'get#ProductDetail',C+'get#PriceOptions','ironstone.products.SupplierServices.find#SupplierPrices','ironstone.products.PriceListServices.find#ProductPriceLists','ironstone.products.InventoryServices.get#InventorySummary','ironstone.products.MethodServices.get#MethodContext','ironstone.products.CostServices.get#CostContext','ironstone.products.DocumentServices.get#DocumentContext','ironstone.products.ProductToolsServices.get#ToolsContext','ironstone.products.CheckServices.get#CheckContext','ironstone.products.ImportServices.get#ImportContext']
  return {failures:names.filter(n=>!refused(n,{appRoot:'Warehouse',recordId:'BOSS_PRD_OWN',productId:'BOSS_PRD_OWN'}))}
 })},then({failures}){if(failures.length)log.warn('Accepted unexpected app root: '+failures.join(', '));failures==[]},
})
feature('connection visibility follows actual root authorizations rather than an app group name',{
 when(){
  const userId=ec.entity.find('moqui.security.UserAccount').condition('username','catalog.reader').disableAuthz().one().userId,fromDate='2000-01-01T00:00:00Z'
  ec.artifactExecution.disableAuthz()
  call('store#moqui.security.UserGroup',{userGroupId:'CATALOG_CONNECTION_TEST',description:'Connection root grant test'})
  call('store#moqui.security.ArtifactGroup',{artifactGroupId:'CATALOG_CONNECTION_TEST',description:'Connection root grant test'})
  call('store#moqui.security.ArtifactGroupMember',{artifactGroupId:'CATALOG_CONNECTION_TEST',artifactName:'component://mr-boss/screen/Warehouse.xml',artifactTypeEnumId:'AT_XML_SCREEN',authzActionEnumId:'AUTHZA_VIEW',nameIsPattern:'N'})
  call('store#moqui.security.ArtifactAuthz',{artifactAuthzId:'CATALOG_CONNECTION_TEST',userGroupId:'CATALOG_CONNECTION_TEST',artifactGroupId:'CATALOG_CONNECTION_TEST',authzTypeEnumId:'AUTHZT_ALLOW',authzActionEnumId:'AUTHZA_VIEW',inheritAuthz:'Y'})
  call('store#moqui.security.UserGroupMember',{userId,userGroupId:'CATALOG_CONNECTION_TEST',fromDate})
  let allowed
  try{allowed=as('catalog.reader',false,()=>call(C+'get#SharedContext',{includeConnections:true}).connectionTypes)}finally{ec.entity.find('moqui.security.UserGroupMember').condition({userId,userGroupId:'CATALOG_CONNECTION_TEST',fromDate}).disableAuthz().deleteAll()}
  return{allowed,after:as('catalog.reader',false,()=>call(C+'get#SharedContext',{includeConnections:true}).connectionTypes)}
 },then({allowed,after}){allowed.includes('Shipments');!allowed.includes('Invoices');!after.includes('Shipments')},
})
feature('Product360 keeps its tab and link context when a request supplies forged routing metadata in #mode',{
 where:[{mode:'qvt'},{mode:'html'},{mode:'tui'}],when({mode}){return as('catalog.reader',false,()=>ec.screen.makeTest().rootScreen('component://mr-boss/screen/Products.xml').renderMode(mode).withStaticData().render('Products/Product360/Summary',{productId:'BOSS_PRD_OWN',product360Tabs:['Costs'],sharedLinks:{'Products/Product360':'//Accounting/Bad'}},null))},
 then(r){r.status==200;r.errorMessages.length==0;const rendered=r.mode==='tui'?JSON.stringify(JSON.parse(r.output).c):r.output;!rendered.includes('//Accounting/Bad');!/Error rendering|Exception in render/.test(r.output)},
})

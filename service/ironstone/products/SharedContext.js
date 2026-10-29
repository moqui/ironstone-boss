// App routing and launcher capabilities for shared catalog mounts. Domain permissions are checked again in Mantle.
// Another app adds an authorized branch here, its Product360 tab names, route overrides, and its shared screen mounts.
const call=(n,p={})=>ec.service.sync().name(n).parameters(p).call()||{}
const productTabs=['Summary','Features','Categories','Identifiers','Dimensions','Documents','Associations','Parties','KitComponents','Connections','History','Equipment','Prices','Suppliers','Stock','BOM','Costs','Packaging']
const paths=["Categories/CategoryDetail", "DocumentDetail/datasheet", "Documents", "Features/FeatureDetail", "InventoryValuation", "Prices/CostHistory", "Prices/CostRollup", "Prices/PriceExplain", "Prices/PriceHistory", "Prices/PriceLists/PriceListDetail", "Prices/StandardCosts", "ProductImport", "Products/BulkPrice", "Products/Product360", "Products/VariantBuilder", "SupplierPrices/Supplier360", "Suppliers/Supplier360", "Translations", "Units/Labels"]
// Read the user's root grants directly: inherited screen authorization and disabled authz cannot grant another launcher.
function mayOpen(app){
 if(!ec.user.userId||ec.user.hasPermission('PROJECT_CLIENT'))return false
 if(ec.user.isInGroup('ADMIN'))return true
 const root='component://mr-boss/screen/'+app+'.xml',groups=Array.from(ec.user.getUserGroupIdSet()||[])
 const grants=Array.from(ec.entity.find('moqui.security.ArtifactAuthzCheckView').condition('userGroupId','in',groups).condition('artifactTypeEnumId','AT_XML_SCREEN').condition('authzActionEnumId','in',['AUTHZA_ALL','AUTHZA_VIEW']).disableAuthz().list()).filter(r=>r.nameIsPattern==='Y'?new RegExp('^(?:'+r.artifactName+')$').test(root):r.artifactName===root)
 return grants.some(r=>['AUTHZT_ALLOW','AUTHZT_ALWAYS'].includes(r.authzTypeEnumId))&&!grants.some(r=>r.authzTypeEnumId==='AUTHZT_DENY')
}
function context(p){
 const appRoot=p.appRoot||ec.context.appRoot||'Products';if(appRoot!=='Products')throw new Error('Shared catalog context is not available')
 const a=call('ironstone.products.CatalogServices.get#CatalogAccess'),read=!!a.capabilities?.read,sharedLinks=Object.fromEntries(paths.map(path=>[path,'//'+appRoot+'/'+path]));sharedLinks['']='//'+appRoot
 return Object.assign({},a,{appRoot,linkBase:'//'+appRoot,webBase:'/qapps/'+appRoot,printBase:'/apps/'+appRoot,sharedLinks,productTabs:read?productTabs:[],connectionTypes:read&&p.includeConnections?Object.entries({Orders:['Sales','Purchasing'],Invoices:['Accounting'],Shipments:['Warehouse'],Production:['Manufacturing'],Requests:['Commons','Projects'],Agreements:['Sales','Purchasing']}).filter(([,apps])=>apps.some(mayOpen)).map(([kind])=>kind):[],ownerPartyIds:read?a.ownerPartyIds:[],organizationPartyIds:read?a.organizationPartyIds:[],activeOrganizationPartyId:read?a.activeOrganizationPartyId:null})
}
;({execute:(op,p)=>{if(op!=='context')throw new Error('Unknown shared context action');return context(p)}})

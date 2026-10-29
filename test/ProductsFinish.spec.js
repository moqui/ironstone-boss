const ROOT='component://mr-boss/screen/Products.xml'
function as(user,on,run){login(user);if(on)ec.artifactExecution.enableAuthz();else ec.artifactExecution.disableAuthz();try{return run()}finally{ec.message.clearErrors();ec.artifactExecution.disableAuthz();login('john.doe')}}
function render(path,params,mode='html'){return ec.screen.makeTest().rootScreen(ROOT).renderMode(mode).withStaticData().render(path,Object.assign({lastStandalone:'-2'},params),null)}
function denied(name,params){try{call(name,params);return ec.message.hasError()}catch(e){return true}finally{ec.message.clearErrors()}}
spec({cleanup(){ec.message.clearErrors();ec.artifactExecution.enableAuthz()}})
feature('product and taxonomy CSV exports contain the same owner-scoped rows as the catalog',{
 when(){return as('catalog.reader',true,()=>({products:render('Products/List',{text:'catalog sample'},'csv'),categories:render('Categories/List',{},'csv'),features:render('Features/List',{},'csv')}))},then({products,categories,features}){for(const r of [products,categories,features]){r.status==200;r.errorMessages.length==0;!r.output.includes('Retail catalog sample')};products.output.includes('BOSS_PRD_OWN');!products.output.includes('BOSS_PRD_OTHER')},
})
feature('resolved price output and supplier exports keep direction and owner scope with authz #enabled',{
 where:[{enabled:true},{enabled:false}],when({enabled}){return as('catalog.price.read',enabled,()=>({prices:render('Prices/PriceLists/PriceListDetail',{priceListId:'BOSS_PRICE_LIST',productIds:'BOSS_PRD_OWN,BOSS_PRD_OTHER',quantity:2,runEffectivePrices:true},'csv'),supplierDenied:denied('mantle.product.PriceServices.get#EffectivePriceList',{priceListId:'BOSS_PRICE_LIST',productIds:['BOSS_PRD_OWN'],vendorPartyId:'BOSS_PRD_SUPPLIER'})}))},then({prices,supplierDenied}){prices.errorMessages.length==0;prices.output.includes('BOSS_PRD_OWN');!prices.output.includes('BOSS_PRD_OTHER');!prices.output.includes('SERV-SUPPLY-01');prices.output.includes('13.5');supplierDenied==true},
})
feature('Products alone refuses financial outputs, posting and unsupported contexts with authz #enabled',{
 where:[{enabled:true},{enabled:false}],when({enabled}){return as('catalog.reader',enabled,()=>{
 const context=call('ironstone.products.CatalogServices.get#ProductDetail',{productId:'BOSS_PRD_OWN'}).detail,cost=call('ironstone.products.CostServices.get#CostContext',{productId:'BOSS_PRD_OWN'}),failures=[]
 for(const [name,args] of [['mantle.product.PriceServices.get#EffectivePriceList',{priceListId:'BOSS_PRICE_LIST'}],['mantle.product.CostServices.get#ProductStandardCost',{productStandardCostId:'BOSS_COST_SAMPLE'}],['mantle.ledger.AssetBookServices.post#Revaluation',{productId:'BOSS_PRD_OWN',productStandardCostId:'BOSS_COST_SAMPLE',operationKey:'DENIED'}],['ironstone.products.ImportServices.get#ImportContext',{appRoot:'Accounting'}]])if(!denied(name,args))failures.push(name)
 return{context,cost,failures,search:call('ironstone.products.CatalogServices.search#Catalog',{text:'BOSS-OTHER-CODE'})}
 })},then({context,cost,failures,search}){context.connectionRows==[];context.priceRows==null;cost.costAccess.read==false;cost.standardCostRows==[];failures==[];search.rows==[]},
})
feature('resolved list and explanation output render in #mode without edit forms in the printable trace',{
 where:[{mode:'html-print'},{mode:'tui'},{mode:'qvt'}],when({mode}){return as('catalog.price.read',true,()=>({list:render('Prices/PriceLists/PriceListDetail',{priceListId:'BOSS_PRICE_LIST',productIds:'BOSS_PRD_OWN',runEffectivePrices:true},mode),trace:render('Prices/PriceExplain',{productId:'BOSS_PRD_OWN',organizationPartyId:'ORG_ZIZI_SERVICES'},mode)}))},then({list,trace,mode}){list.errorMessages.length==0;trace.errorMessages.length==0;if(mode!=='qvt')list.output.includes('BOSS_PRD_OWN');!trace.output.includes('SERV-SUPPLY-01');if(mode==='html-print')!trace.output.includes('ExplainContextControls')},
})

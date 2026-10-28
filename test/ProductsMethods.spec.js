const M='ironstone.products.MethodServices.'
function as(user,fn){login(user);ec.artifactExecution.disableAuthz();try{return fn()}finally{ec.message.clearErrors();login('john.doe')}}
function invoke(n,p){try{const out=call(n,p)||{},error=ec.message.getErrorsString();ec.message.clearErrors();return Object.assign({},out,{error})}catch(e){ec.message.clearErrors();return{error:String(e.message||e)}}}
spec({dependsOn:['ProductsMethodFixtures'],cleanup(){ec.message.clearErrors();ec.artifactExecution.enableAuthz()}})
feature('Products method contexts fix the product and omit money from engineer responses',{
 when(){return as('catalog.method',()=>{const c=call(M+'get#MethodContext',{productId:'DEMO_1_1'}),e=call(M+'get#BomExplosion',{productId:'DEMO_1_1',quantity:2}),r=call(M+'get#RoutingDetail',{productId:'DEMO_1_1'});return{c,e,r,cross:invoke(M+'get#MethodContext',{productId:'BOSS_PRD_OWN',productBomId:c.productBomId}),foreign:invoke(M+'get#MethodContext',{productId:'BOSS_PRD_OWN'})}})},then({c,e,r,cross,foreign}){c.methodAccess.edit==true;c.methodAccess.costRead==false;c.releaseHistory.length==2;e.complete==true;e.explosionRows.length>0;r.releasedOperationRows.length==1;!JSON.stringify({c,e,r}).includes('rateAmount');!JSON.stringify({c,e,r}).includes('actualCost');cross.error.includes('does not belong');foreign.error.includes('not available')},
})
feature('Products administrators retain all Products grants without method, resource or stock writes',{
 when(){return as('catalog.admin',()=>({context:call(M+'get#MethodContext',{productId:'BOSS_PRD_OWN'}),write:invoke(M+'store#Bom',{productId:'BOSS_PRD_OWN',changeReason:'Refused'}),rate:invoke(M+'store#WorkCenterRate',{productId:'BOSS_PRD_OWN',facilityId:'ZIRET_WH',rateAmount:999,changeReason:'Refused'})}))},then({context,write,rate}){context.methodAccess.read==false;context.bomRows.length==0;write.error.includes('Manufacturing');rate.error.includes('Manufacturing')},
})
const paths=['BOM','BOM/BillOfMaterialsExplosion','BOM/BillOfMaterialsCompare','BOM/WhereUsed','BOM/RoutingDetail']
feature('Manufacturing owned #path renders in Products without a Manufacturing launcher in #mode',{
 where:paths.flatMap(path=>['qvt','html','tui'].map(mode=>({path,mode}))),expect({path,mode}){const result=as('catalog.method.walk',()=>{const c=call(M+'get#MethodContext',{productId:'DEMO_1_1'});return ec.screen.makeTest().rootScreen('component://mr-boss/screen/Products.xml').renderMode(mode).withStaticData().render('Products/Product360/'+path,{productId:'DEMO_1_1',leftDate:new Date(Number(String(c.releaseHistory[1].fromDate))).toISOString(),rightDate:new Date(Number(String(c.releaseHistory[0].fromDate))).toISOString(),lastStandalone:'-2'},null)});if(result.errorMessages.length)log.warn(result.errorMessages.join(' | '));result.status==200;result.errorMessages.length==0;!/Error rendering|Exception in render/.test(result.output);!result.output.includes('actualCost')},
})
feature('parent screen actions never replace submitted BOM or routing optimistic tokens',{
 when(){return as('catalog.method.walk',()=>{
 const c=call(M+'get#MethodContext',{productId:'DEMO_1_1'}),route=call(M+'get#RoutingDetail',{productId:'DEMO_1_1'}),out=[]
 for(const [path,parameters]of [['Overview/saveHeader',{productBomId:c.productBomId,bomName:'Refused stale method'}],['RoutingDetail/saveOperation',{workEffortId:route.workEffortId,workEffortName:'Refused stale operation'}]]){ec.message.clearErrors();const rendered=ec.screen.makeTest().rootScreen('component://mr-boss/screen/Products.xml').render('Products/Product360/BOM/'+path,Object.assign({productId:'DEMO_1_1',productBomId:c.productBomId,expectedRevision:'stale',changeReason:'Stale transition probe'},parameters),'post');out.push(rendered.errorMessages.join(' | '));ec.message.clearErrors()}
 return{out}
 })},then({out}){out.length==2;out.every(e=>e.includes('changed'))},
})
feature('method files and record links keep owner permissions inside generic Commons callbacks',{
 when(){
 const c=as('catalog.method',()=>call(M+'get#MethodContext',{productId:'DEMO_1_1'})),record={recordEntityName:'mantle.product.bom.ProductBom',recordId:c.productBomId}
 const file=as('catalog.method',()=>call('mantle.product.BomServices.create#ProductBomContent',{productBomId:c.productBomId,contentText:'Method evidence',filename:'method.txt'}))
 const reader=as('catalog.method.read',()=>call('ironstone.shared.RecordFilesServices.get#RecordFiles',record)),denied=as('catalog.method.read',()=>invoke('ironstone.shared.RecordFilesServices.upload#RecordFile',Object.assign({},record,{contentFile:[{name:'refused.txt'}]})))
 const link=as('catalog.method',()=>call('ironstone.commons.PaletteServices.get#RecordLink',{recordEntityName:record.recordEntityName,id:c.productBomId})),hidden=as('catalog.admin',()=>call('ironstone.commons.PaletteServices.get#RecordLink',{recordEntityName:record.recordEntityName,id:c.productBomId}))
 return{file,reader,denied,link,hidden}
 },then({file,reader,denied,link,hidden}){file.productBomContentId!=null;reader.canUpload==false;reader.fileCount>=1;denied.error.includes('may not add');link.url.includes('/Product360/BOM?');hidden.url==null},
})

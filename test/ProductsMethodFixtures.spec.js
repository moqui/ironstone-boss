const M='ironstone.products.MethodServices.',N='mantle.product.BomServices.',R='mantle.work.RoutingServices.'
function as(user,fn){login(user);ec.artifactExecution.disableAuthz();try{return fn()}finally{ec.message.clearErrors();login('john.doe')}}
spec({cleanup(){ec.message.clearErrors();ec.artifactExecution.enableAuthz()}})
feature('method fixtures provide approved dated methods and operation standards through owner contracts',{
 expect(){as('catalog.method.walk',()=>{
 const center=call(M+'store#WorkCenter',{productId:'DEMO_1_1',facilityId:'ZIRET_WH',changeReason:'Demonstration work center'});center.workCenter.facilityId=='ZIRET_WH'
 for(const [component,amount]of [['PccLabor',30],['PccMachine',15],['PccOverhead',5]])call(M+'store#WorkCenterRate',{productId:'DEMO_1_1',facilityId:'ZIRET_WH',componentTypeEnumId:component,rateAmount:amount,priceUomId:'USD',approve:true,changeReason:'Demonstration hourly rate'})
 const r=call(M+'store#Routing',{productId:'DEMO_1_1',workEffortName:'Sample assembly routing',changeReason:'Demonstration routing'}),route=r.routing.workEffortId
 const op=call(M+'store#RoutingOperation',{productId:'DEMO_1_1',workEffortId:route,workEffortName:'Assemble and check',estimatedSetupTime:0.25,estimatedWorkTime:0.1,methodMachineRunTime:0.05,methodBatchQuantity:1,methodQuantityUomId:'OTH_ea',methodWorkCenterId:'ZIRET_WH',changeReason:'Demonstration standards'})
 call(M+'release#RoutingDraft',{productId:'DEMO_1_1',workEffortId:route,expectedRevision:op.expectedRevision,changeReason:'Approved sample routing'})
 const imported=call(M+'import#LegacyBom',{productId:'DEMO_1_1',quantityUomId:'OTH_ea',changeReason:'Import manufactured legacy components'}),id=imported.productBom.productBomId
 call(M+'store#Bom',{productId:'DEMO_1_1',productBomId:id,routingWorkEffortId:route,changeReason:'Sample routing selection'})
 const d=call(N+'get#BomDetail',{productBomId:id});call(M+'release#BomDraft',{productId:'DEMO_1_1',productBomId:id,expectedRevision:d.expectedRevision,changeReason:'First approved demonstration method'})
 const line=call(N+'get#BomDetail',{productBomId:id}).bomItemRows[0];call(M+'store#BomItem',{productId:'DEMO_1_1',productBomId:id,bomItemId:line.bomItemId,componentProductId:line.productId,quantity:toDecimal(line.quantity).add(1),changeReason:'Second dated requirement'})
 const next=call(N+'get#BomDetail',{productBomId:id});call(M+'release#BomDraft',{productId:'DEMO_1_1',productBomId:id,expectedRevision:next.expectedRevision,changeReason:'Second approved demonstration method'})
 const c=call(M+'get#MethodContext',{productId:'DEMO_1_1'});c.releaseHistory.length==2;c.methodAccess.edit==true;ec.user.isInGroup('BOSS_MANUFACTURING')==false
 })},
})

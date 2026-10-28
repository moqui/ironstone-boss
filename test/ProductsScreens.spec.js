const root='component://mr-boss/screen/Products.xml'
const tabs=['Summary','Features','Categories','Identifiers','Dimensions','Documents','Associations','Parties','KitComponents','Connections','History','Equipment']
spec({setupSpec(){login('john.doe')},setup(){ec.artifactExecution.disableAuthz()},cleanup(){ec.artifactExecution.enableAuthz()}})
feature('Product360 #tab renders directly in #mode with guarded context',{
 where:tabs.flatMap(tab=>['qvt','html','tui'].map(mode=>({tab,mode}))),
 expect({tab,mode}) {
  const id=tab==='KitComponents'?'DEMO_PA':tab==='Equipment'?'EQUIP_1':'BOSS_PRD_OWN'
  const got=ec.screen.makeTest().rootScreen(root).renderMode(mode).withStaticData().render('Products/Product360/'+tab,{productId:id,lastStandalone:'-2'},null)
  if(got.errorMessages.length || /Error rendering|Exception in render/.test(got.output)) log.warn(tab+' '+mode+': '+got.errorMessages+' '+got.output.substring(0,1800))
  got.output.length>100
  got.status==200
  got.errorMessages.length==0
  !/Error rendering|Exception in render/.test(got.output)
 },
})
feature('hidden owner direct tab URL shows no product or child data',{
 when(){login('catalog.reader');const got=ec.screen.makeTest().rootScreen(root).renderMode('qvt').withStaticData().render('Products/Product360/Identifiers',{productId:'BOSS_PRD_OTHER',lastStandalone:'-2'},null);login('john.doe');return {got}},
 then({got}){got.status==200;!got.output.includes('Retail catalog sample');!got.output.includes('BOSS-OTHER-CODE')},
})

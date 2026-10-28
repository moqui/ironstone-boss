const root='component://mr-boss/screen/Products.xml'
const screens=[['Categories/List',{}],['Categories/NewCategory',{}],['Features/List',{}],['Features/NewFeature',{}],['Features/FeatureInteractions',{}],['Features/FeatureGroups/List',{}],['Features/FeatureGroups/NewGroup',{}],
 ...['Summary','Parents','Products','FeatureDefaults','Identifiers'].map(tab=>['Categories/CategoryDetail/'+tab,{productCategoryId:'BOSS_PRD_CAT'}]),
 ...['Summary','Groups','Products','Interactions'].map(tab=>['Features/FeatureDetail/'+tab,{productFeatureId:'BOSS_PRD_FEATURE'}]),
 ...['Summary','Features','Categories'].map(tab=>['Features/FeatureGroups/FeatureGroupDetail/'+tab,{productFeatureGroupId:'BOSS_PRD_GROUP'}])]
spec({setupSpec(){login('john.doe')},setup(){ec.artifactExecution.disableAuthz()},cleanup(){ec.message.clearErrors();ec.artifactExecution.enableAuthz()}})
feature('taxonomy #path renders directly in #mode',{
 where:screens.flatMap(([path,parameters])=>['qvt','html','tui'].map(mode=>({path,parameters,mode}))),
 expect({path,parameters,mode}){
  const got=ec.screen.makeTest().rootScreen(root).renderMode(mode).withStaticData().render(path,Object.assign({lastStandalone:'-2'},parameters),null)
  if(got.errorMessages.length||/Error rendering|Exception in render/.test(got.output))log.warn(path+' '+mode+': '+got.errorMessages.join(' | ')+' '+got.output.substring(0,1400))
  got.status==200
  got.errorMessages.length==0
  got.output.length>100
  !/Error rendering|Exception in render/.test(got.output)
 },
})
feature('two occurrences and their distinct original parents survive the HTML and terminal tree renders',{
 when(){
  const renders=Object.fromEntries(['html','tui'].map(mode=>[mode,ec.screen.makeTest().rootScreen(root).renderMode(mode).withStaticData().render('Categories/List',{text:'Services catalog',view:'tree',lastStandalone:'-2'},null)]))
  return {html:renders.html,tui:renders.tui,htmlMatches:String(renders.html.output).split('Services catalog').length-1,tuiMatches:String(renders.tui.output).split('Services catalog').length-1}
 },then({html,tui,htmlMatches,tuiMatches}){html.errorMessages.length==0;tui.errorMessages.length==0;htmlMatches>=2;tuiMatches>=2},
})

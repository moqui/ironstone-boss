spec({setupSpec(){login('john.doe');ec.artifactExecution.disableAuthz()},cleanup(){ec.message.clearErrors();ec.artifactExecution.enableAuthz()}})
feature('the stock example is indexed with its real owner and quarantine status',{
 when(){const available=ec.search.isAvailable(),documents=ec.entity.getDataDocuments('MantleInventoryAsset',{productId:'BOSS_PRD_OWN'});if(available)ec.search.indexDocuments(documents);return{available,documents}},then({documents}){documents.length==3;documents.some(r=>r.ownerPartyId==='ORG_ZIZI_RETAIL');documents.some(r=>r.statusId==='AstQuarantine')},
})

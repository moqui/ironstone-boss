// Catalog application operations. Every entry checks the current user; request capabilities and entity names are ignored.
const C = 'ironstone.products.CatalogServices.'
const P = 'mantle.product.'
const call = (name, p, sys = false) => { let c = ec.service.sync().name(name).parameters(p || {}); if (sys) c = c.disableAuthz(); return c.call() || {} }
const find = (n, p) => ec.entity.find(n).condition(p || {}).disableAuthz()
const one = (n, p) => find(n, p).one()
const list = (n, p) => Array.from(find(n, p).list())
const map = row => row.getMap ? row.getMap() : Object.assign({}, row)
const ms = x => { if(x == null || x === '') return null; const n=Number(String(x)); return Number.isFinite(n)?n:Date.parse(String(x)) }
function withDates(row) {
    const data=map(row)
    for(const key of ['fromDate','thruDate','changedDate','lastUpdatedStamp','salesIntroductionDate','salesDiscontinuationDate','supportDiscontinuationDate','estimatedCompletionDate']) if(data[key]!=null) data[key+'Text']=ec.l10n.format(new Date(ms(data[key])),'yyyy-MM-dd HH:mm')
    return data
}
const current = row => (ms(row.fromDate) == null || ms(row.fromDate) <= ms(ec.user.nowTimestamp)) && (ms(row.thruDate) == null || ms(row.thruDate) > ms(ec.user.nowTimestamp))
const access = () => call(C + 'get#CatalogAccess')
function record(id, need = 'read', entity = P + 'Product') {
    const out = call(C + 'get#CatalogRecord', {recordId: id, need, recordEntityName: entity, checkOnly: true})
    if (!out.record) throw new Error('Catalog record ' + id + ' is not available for this action')
    return out.record
}
function visible(id, entity = P + 'Product') { return !!call(C + 'get#CatalogRecord', {recordId: id, recordEntityName: entity, checkOnly: true}).record }
function partyReadable(id,a) {
    const row=one('mantle.party.Party',{partyId:id})
    return !!row && (!row.privateOwnerUserId || row.privateOwnerUserId===ec.user.userId) && (a.capabilities.systemAdmin || a.ownerPartyIds.includes(row.ownerPartyId) || a.organizationPartyIds.includes(row.partyId))
}
const fields = (p, names) => Object.fromEntries(names.split(',').filter(k => Object.keys(p).includes(k)).map(k => [k, p[k] === '' ? null : p[k]]))
const masterFields = 'productName,pseudoId,description,comments,productTypeEnumId,productClassEnumId,assetTypeEnumId,assetClassEnumId,amountUomId,amountFixed,amountRequire,salesAllowed,purchaseAllowed,salesIntroductionDate,salesDiscontinuationDate,salesDiscWhenNotAvail,supportDiscontinuationDate,requireInventory,chargeShipping,taxable,returnable,originGeoId'
const defaults = {defaultProductTypeEnumId: 'PtAsset', defaultAmountUomId: 'OTH_ea', defaultCurrencyUomId: 'USD', requiredFields: ['productName', 'productTypeEnumId', 'amountUomId'], allowCostSelfApproval: false, variantsEnabled: true, packagingEnabled: true, priceListsEnabled: true, idPolicy: 'internal'}
function orgScope(id, need) {
    const a = access()
    if (!a.capabilities[need] || !id || (!a.capabilities.systemAdmin && !a.organizationPartyIds.includes(id))) throw new Error('Organization is not available for this action')
    if (!one('mantle.party.PartyRole', {partyId: id, roleTypeId: 'OrgInternal'})) throw new Error('Choose an internal organization')
    return a
}
const policyFlags = ['allowCostSelfApproval', 'variantsEnabled', 'packagingEnabled', 'priceListsEnabled']
function catalogPolicy(row, id) {
    const out = Object.assign({}, defaults, {defaultOwnerPartyId: id || null})
    if (row) {
        for (const key of Object.keys(defaults)) if (row[key] != null) out[key] = row[key]
        out.requiredFields = String(row.requiredFields || '').split(',').filter(Boolean)
        for (const key of policyFlags) out[key] = row[key] === 'Y'
    }
    return out
}
function settings(p) {
    const a = access(), id = p.organizationPartyId || a.activeOrganizationPartyId || a.organizationPartyIds[0]
    if (!a.capabilities.read) throw new Error('Catalog read access is required')
    if (id && !a.capabilities.systemAdmin && !a.organizationPartyIds.includes(id)) throw new Error('Organization is not available')
    const at = p.asOfDate == null ? ms(ec.user.nowTimestamp) : ms(p.asOfDate)
    if (!Number.isFinite(at)) throw new Error('Choose a valid effective date')
    const all = id ? list(P + 'ProductCatalogSetting', {organizationPartyId: id}).sort((a,b) => ms(b.fromDate)-ms(a.fromDate)) : []
    const row = all.find(r => ms(r.fromDate) <= at && (r.thruDate == null || ms(r.thruDate) > at))
    // Keep the old API names as opaque optimistic tokens: the value is now the effective start, never a sequence.
    return {organizationPartyId: id || null, versionSeqId: ms(row?.fromDate) || 0, fromDate: row?.fromDate || null,
        thruDate: row?.thruDate || null, asOfDate: at, settings: catalogPolicy(row, id),
        history: all.map(r => Object.assign(withDates(r), {requiredFields: String(r.requiredFields || '').split(',').join(', ')}))}
}
function storeSettings(p) {
    const a = orgScope(p.organizationPartyId, 'catalogAdmin')
    find('mantle.party.Party', {partyId: p.organizationPartyId}).forUpdate(true).one()
    const old = settings({organizationPartyId:p.organizationPartyId})
    if (Number(p.expectedVersion || 0) !== Number(old.versionSeqId)) throw new Error('Catalog settings changed; reload before saving')
    const now = ms(ec.user.nowTimestamp), at = p.fromDate == null || p.fromDate === '' ? Math.max(now, (ms(old.fromDate) || 0)+1) : ms(p.fromDate)
    if (!Number.isFinite(at) || at < now) throw new Error('Policy changes must take effect now or later')
    const data = typeof p.settingsJson === 'string' ? JSON.parse(p.settingsJson) : (p.settings || {})
    const saved = Object.assign({}, settings({organizationPartyId:p.organizationPartyId,asOfDate:at}).settings, fields(data, Object.keys(defaults).join(',')))
    for (const key of policyFlags) saved[key] = saved[key] === true || saved[key] === 'Y' || saved[key] === 'true'
    saved.requiredFields = Array.isArray(saved.requiredFields) ? saved.requiredFields : String(saved.requiredFields || '').split(',').map(v => v.trim()).filter(Boolean)
    const requiredAllowed = masterFields.split(',')
    if (saved.requiredFields.some(k => !requiredAllowed.includes(k))) throw new Error('Unknown required catalog field')
    if (!['internal', 'manual'].includes(saved.idPolicy)) throw new Error('Unknown product ID policy')
    if (saved.allowCostSelfApproval && !a.capabilities.costApprove) throw new Error('Cost approval authority is required to enable self approval')
    if (one('moqui.basic.Uom', {uomId:saved.defaultCurrencyUomId})?.uomTypeEnumId!=='UT_CURRENCY_MEASURE') throw new Error('Choose a valid default currency')
    if (one('moqui.basic.Enumeration',{enumId:saved.defaultProductTypeEnumId})?.enumTypeId!=='ProductType') throw new Error('Choose a valid default product type')
    if (!one('moqui.basic.Uom', {uomId: saved.defaultAmountUomId}) || one('moqui.basic.Uom', {uomId:saved.defaultAmountUomId}).uomTypeEnumId==='UT_CURRENCY_MEASURE') throw new Error('Choose a valid default amount unit')
    const all = list(P+'ProductCatalogSetting',{organizationPartyId:p.organizationPartyId}).sort((a,b)=>ms(a.fromDate)-ms(b.fromDate))
    if (all.some(r=>ms(r.fromDate)===at)) throw new Error('A policy already starts at this time; choose a later effective date')
    const before = all.filter(r=>ms(r.fromDate)<at && (r.thruDate==null || ms(r.thruDate)>at)).at(-1), after = all.find(r=>ms(r.fromDate)>at)
    const changeReason = p.changeReason || 'Catalog policy changed', fromDate = new Date(at).toISOString()
    ec.context.putAll(Object.fromEntries(['fromDate','thruDate',...Object.keys(defaults)].map(field=>[field+'_changeReason',changeReason])))
    if (before) call('update#'+P+'ProductCatalogSetting',{organizationPartyId:p.organizationPartyId,fromDate:new Date(ms(before.fromDate)).toISOString(),thruDate:fromDate},true)
    const typed = fields(saved,Object.keys(defaults).join(','))
    for (const key of policyFlags) typed[key] = saved[key] ? 'Y' : 'N'
    typed.requiredFields = [...new Set(saved.requiredFields)].join(',')
    call('create#'+P+'ProductCatalogSetting',Object.assign(typed,{organizationPartyId:p.organizationPartyId,fromDate,thruDate:after?new Date(ms(after.fromDate)).toISOString():null,changeReason}),true)
    return settings({organizationPartyId:p.organizationPartyId,asOfDate:fromDate})
}
function storeProduct(p) {
    const a = access(), oldRow = p.productId ? find(P + 'Product', {productId: p.productId}).forUpdate(true).one() : null, old = oldRow ? map(oldRow) : null
    if (p.createOnly && old) throw new Error('Product ID is already in use')
    if (old && p.expectedLastUpdatedStamp && ms(p.expectedLastUpdatedStamp)!==ms(old.lastUpdatedStamp)) throw new Error('Product changed; reload before saving')
    let owner = old?.ownerPartyId || p.ownerPartyId || a.activeOrganizationPartyId || a.organizationPartyIds[0]
    if (!a.capabilities.catalogEdit || !owner || (owner === '_NA_' ? !a.capabilities.systemAdmin : !a.capabilities.systemAdmin && !a.organizationPartyIds.includes(owner))) throw new Error('Catalog editor authority over the owner is required')
    if (old) record(p.productId, 'catalogEdit')
    if (p.ownerPartyId && old && p.ownerPartyId !== old.ownerPartyId) throw new Error('Changing a product owner requires a separate migration')
    const cfg = owner === '_NA_' ? defaults : settings({organizationPartyId: owner}).settings
    const data = Object.assign({}, old || {productTypeEnumId: cfg.defaultProductTypeEnumId, amountUomId: cfg.defaultAmountUomId}, fields(p, masterFields), {ownerPartyId: owner})
    if(one('moqui.basic.Enumeration',{enumId:data.productTypeEnumId})?.enumTypeId!=='ProductType') throw new Error('Choose a valid product type')
    if(data.amountUomId && one('moqui.basic.Uom',{uomId:data.amountUomId})?.uomTypeEnumId==='UT_CURRENCY_MEASURE') throw new Error('A stock unit cannot be a currency')
    if (!String(data.productName || '').trim()) throw new Error('Product name is required')
    if (p.productId && !/^[A-Za-z0-9_.-]{1,40}$/.test(p.productId)) throw new Error('Product ID must contain 1–40 letters, numbers, dots, dashes or underscores')
    for (const key of ['salesAllowed', 'purchaseAllowed', 'salesDiscWhenNotAvail', 'amountRequire', 'requireInventory', 'chargeShipping', 'taxable', 'returnable'])
        if (data[key] != null && !['Y', 'N'].includes(data[key])) throw new Error('Choose Yes or No for ' + key)
    if (old && ['productTypeEnumId','amountUomId'].some(k => data[k] !== old[k])) {
        if (old.statusId !== 'PrdDraft' || ['mantle.order.OrderItem','mantle.product.asset.Asset','mantle.account.invoice.InvoiceItem'].some(entity => find(entity,{productId:p.productId}).count()>0)) throw new Error('Change type or stock unit only on an unused draft')
    }
    if (!old && cfg.idPolicy === 'manual' && !p.productId) throw new Error('This organization requires a manual product ID')
    const save = fields(data, masterFields)
    Object.assign(save, {ownerPartyId: owner, productId: p.productId})
    if (!old) save.statusId = 'PrdDraft'
    const out = call((old ? 'update#' : 'create#') + P + 'Product', save, true)
    return {productId: old?.productId || out.productId}
}
function transition(p) {
    const product = record(p.productId, 'catalogEdit')
    find('moqui.basic.EnumerationType',{enumTypeId:'ProductFeatureType'}).forUpdate(true).one()
    find(P + 'Product', {productId: p.productId}).forUpdate(true).one()
    const fresh = one(P + 'Product', {productId: p.productId}), before = fresh.statusId || (ms(fresh.salesDiscontinuationDate) != null && ms(fresh.salesDiscontinuationDate) <= ms(ec.user.nowTimestamp) ? 'PrdDiscontinued' : 'PrdActive')
    if (p.expectedStatusId && p.expectedStatusId !== before) throw new Error('Product status changed; reload before moving it')
    const allowed = {PrdDraft: ['PrdActive'], PrdActive: ['PrdDiscontinued'], PrdDiscontinued: ['PrdActive','PrdObsolete'], PrdObsolete: []}
    if (!(allowed[before] || []).includes(p.statusId)) throw new Error('Product status transition ' + before + ' → ' + p.statusId + ' is not allowed')
    if (p.statusId === 'PrdActive') {
        const cfg = fresh.ownerPartyId === '_NA_' ? defaults : settings({organizationPartyId: fresh.ownerPartyId}).settings
        const missing = cfg.requiredFields.filter(k => fresh[k] == null || fresh[k] === '')
        if (missing.length) throw new Error('Cannot activate product; required: ' + missing.join(', '))
        if (fresh.amountUomId && one('moqui.basic.Uom', {uomId: fresh.amountUomId})?.uomTypeEnumId === 'UT_CURRENCY_MEASURE') throw new Error('A stock unit cannot be a currency')
    }
    call('update#' + P + 'Product', {productId: p.productId, statusId: p.statusId}, true)
    return {productId: p.productId, statusId: p.statusId}
}
const kinds = {
    category: {entity: P+'category.ProductCategoryMember', names: 'productCategoryId,fromDate,thruDate,sequenceNum,comments,quantity'},
    feature: {entity: P+'feature.ProductFeatureAppl', names: 'productFeatureId,fromDate,thruDate,applTypeEnumId,amount,recurringAmount,sequenceNum'},
    dimension: {entity: P+'ProductUomDimension', names: 'productUomDimensionId,uomDimensionTypeId,marketSegmentId,value,uomId', id: 'productUomDimensionId'},
    party: {entity: P+'ProductParty', names: 'partyId,roleTypeId,fromDate,thruDate,otherPartyItemId,otherPartyItemName,comments,sequenceNum'},
    association: {entity: P+'ProductAssoc', names: 'toProductId,productAssocTypeEnumId,fromDate,thruDate,quantity,reason,sequenceNum'},
    meter: {entity: P+'maintenance.ProductMeter', names: 'productMeterId,productMeterTypeId,meterUomId,meterName', id: 'productMeterId'},
    maintenance: {entity: P+'maintenance.ProductMaintenance', names: 'productMaintenanceId,maintenanceTypeEnumId,description,comments,templateWorkEffortId,intervalQuantity,intervalProductMeterId,intervalUomId,repeatCount', id: 'productMaintenanceId'}
}
function storeRow(p) {
    const product = record(p.productId, 'catalogEdit')
    if (p.kind === 'identifier' || p.kind === 'otherIdentifier') return call('mantle.product.ProductServices.store#ProductIdentifier', Object.assign(fields(p, 'productId,productIdTypeEnumId,idValue,productOtherIdentId,productStoreId,marketSegmentId'), {other: p.kind === 'otherIdentifier'}), true)
    if (p.kind === 'kit') { record(p.toProductId); return call('mantle.product.ProductServices.store#KitComponent', fields(p, 'productId,toProductId,fromDate,thruDate,quantity,sequenceNum'), true) }
    const spec = Object.prototype.hasOwnProperty.call(kinds,p.kind) ? kinds[p.kind] : null
    if (!spec) throw new Error('Unknown catalog row kind')
    const data = Object.assign(fields(p, spec.names), {productId: p.productId})
    if ('fromDate' in p || spec.names.includes('fromDate')) data.fromDate = p.fromDate || ec.user.nowTimestamp
    if (ms(data.thruDate) != null && ms(data.thruDate) <= ms(data.fromDate)) throw new Error('End must follow start; use End now on an existing row')
    if (spec.id && data[spec.id]) {
        const old = one(spec.entity, {[spec.id]: data[spec.id]})
        if (!old || old.productId !== p.productId) throw new Error('Row is not on this product')
    }
    if (p.kind === 'category') {find('moqui.basic.EnumerationType',{enumTypeId:'ProductFeatureType'}).forUpdate(true).one(); record(data.productCategoryId, 'read', P+'category.ProductCategory')}
    if (p.kind === 'feature') {
        find('moqui.basic.EnumerationType',{enumTypeId:'ProductFeatureType'}).forUpdate(true).one()
        const lockedProduct=find(P+'Product',{productId:p.productId}).forUpdate(true).one()
        record(data.productFeatureId, 'read', P+'feature.ProductFeature')
        const old = one(spec.entity, {productId:p.productId, productFeatureId:data.productFeatureId, fromDate:data.fromDate})
        if ((old?.applTypeEnumId === 'PfatDistinguishing' || data.applTypeEnumId === 'PfatDistinguishing') && (lockedProduct.statusId || 'PrdActive') !== 'PrdDraft') throw new Error('Distinguishing feature identity is fixed on a used or active variant')
    }
    if (p.kind === 'association') {
        if (!['PatEquivalent', 'PatReplacement'].includes(data.productAssocTypeEnumId)) throw new Error('Use the dedicated kit, variant, BOM or packaging editor for this association')
        record(data.toProductId)
        if (data.toProductId === p.productId) throw new Error('A product cannot substitute for itself')
    }
    if (p.kind === 'party') {
        const party = one('mantle.party.Party', {partyId: data.partyId}), a = access()
        if (!party || (party.privateOwnerUserId && party.privateOwnerUserId !== ec.user.userId) || (!a.capabilities.systemAdmin && !a.ownerPartyIds.includes(party.ownerPartyId) && !a.organizationPartyIds.includes(party.partyId))) throw new Error('Party is not available')
        if (!['Customer','Manufacturer','Distributor'].includes(data.roleTypeId)) throw new Error('Choose a catalog party role')
    }
    if (p.kind === 'dimension') {
        const unit = one('moqui.basic.Uom', {uomId:data.uomId}), type = one('moqui.basic.UomDimensionType', {uomDimensionTypeId:data.uomDimensionTypeId})
        const standard = type?.defaultUomId ? one('moqui.basic.Uom', {uomId:type.defaultUomId}) : null
        if (!unit || !type || unit.uomTypeEnumId === 'UT_CURRENCY_MEASURE' || ((type.uomTypeEnumId || standard?.uomTypeEnumId) && unit.uomTypeEnumId !== (type.uomTypeEnumId || standard?.uomTypeEnumId)) || toDecimal(data.value || 0).compare(0) < 0) throw new Error('Dimension value and unit do not match its type')
    }
    if (['meter','maintenance'].includes(p.kind)) {
        if (product.assetTypeEnumId !== 'AstTpEquipment') throw new Error('Equipment templates require an equipment product')
        if (p.kind === 'maintenance' && toDecimal(data.intervalQuantity || 0).compare(0) <= 0) throw new Error('Maintenance interval must be positive')
        if (data.intervalProductMeterId && one(P+'maintenance.ProductMeter', {productMeterId:data.intervalProductMeterId})?.productId !== p.productId) throw new Error('Maintenance meter is not on this product')
    }
    if (p.operation === 'expire') {
        const keys = Object.keys(ec.entity.makeValue(spec.entity).getPrimaryKeys())
        const old = one(spec.entity, fields(data, keys.join(',')))
        if (!old || old.productId !== p.productId || !spec.names.includes('thruDate')) throw new Error('Dated row is not on this product')
        const end = ec.user.nowTimestamp
        if (ms(old.fromDate) >= ms(end)) throw new Error('Future row must be rescheduled rather than end-dated before its start')
        return call('update#'+spec.entity, Object.assign(fields(data, keys.join(',')), {thruDate:end}), true)
    }
    return call((spec.id && !data[spec.id] ? 'create#' : 'store#') + spec.entity, data, true)
}
function detail(p) {
    const product = record(p.productId), a = access()
    const result = {product:withDates(product), capabilities:a.capabilities, canEdit: !!call(C+'get#CatalogRecord', {recordId:p.productId, need:'catalogEdit', checkOnly:true}).record}
    for (const [kind, spec] of Object.entries(kinds)) {
        result[kind+'Rows'] = list(spec.entity, {productId:p.productId}).filter(row => kind !== 'association' || ['PatEquivalent','PatReplacement'].includes(row.productAssocTypeEnumId))
            .filter(row => kind !== 'category' || visible(row.productCategoryId, P+'category.ProductCategory'))
            .filter(row => kind !== 'feature' || visible(row.productFeatureId, P+'feature.ProductFeature'))
            .filter(row => kind !== 'association' || visible(row.toProductId))
            .filter(row => kind !== 'party' || (partyReadable(row.partyId,a) && (row.roleTypeId!=='Supplier' || a.capabilities.supplierPriceRead))).map(withDates)
    }
    result.incomingRows = list(P+'ProductAssoc',{toProductId:p.productId}).filter(row=>['PatEquivalent','PatReplacement'].includes(row.productAssocTypeEnumId) && visible(row.productId)).map(withDates)
    result.tagRows = result.categoryRows.filter(current).filter(row=>record(row.productCategoryId,'read',P+'category.ProductCategory').productCategoryTypeEnumId==='PctTag').map(row=>({productCategoryId:row.productCategoryId,categoryName:record(row.productCategoryId,'read',P+'category.ProductCategory').categoryName}))
    result.identifierRows = list(P+'ProductIdentification', {productId:p.productId}).map(withDates)
    result.otherIdentifierRows = list(P+'ProductOtherIdentification', {productId:p.productId}).map(withDates)
    result.legacyDimensionRows = list(P+'ProductDimension', {productId:p.productId}).map(withDates)
    result.variantRows = list(P+'ProductAssoc', {productId:p.productId, productAssocTypeEnumId:'PatVariant'}).filter(current).filter(row => visible(row.toProductId)).map(row => ({productId:row.toProductId, productName:record(row.toProductId).productName}))
    result.kitRows = product.productTypeEnumId === 'PtPickAssembly' ? list(P+'ProductAssoc', {productId:p.productId, productAssocTypeEnumId:'PatMfgBom'}).filter(row => visible(row.toProductId)).map(withDates) : []
    result.historyRows = list('moqui.entity.EntityAuditLog', {changedEntityName:P+'Product', pkPrimaryValue:p.productId}).sort((a,b) => ms(b.changedDate)-ms(a.changedDate)).map(withDates)
    result.contentRows = list(P+'ProductContent', {productId:p.productId}).map(withDates)
    // Price/cost rows are deliberately not queried by this P2 projection.
    result.effectiveStatusId = product.statusId || (ms(product.salesDiscontinuationDate) != null && ms(product.salesDiscontinuationDate) <= ms(ec.user.nowTimestamp) ? 'PrdDiscontinued' : 'PrdActive')
    result.kitAvailable = null
    if(product.productTypeEnumId==='PtPickAssembly') {
        const facilities=list('mantle.facility.Facility').filter(row=>a.capabilities.systemAdmin || a.organizationPartyIds.includes(row.ownerPartyId))
        result.kitAvailable=facilities.reduce((total,row)=>total.add(call('mantle.product.AssetServices.get#AvailableInventory',{productId:p.productId,facilityId:row.facilityId,ownerPartyIdList:[row.ownerPartyId]},true).availableToPromiseTotal || 0),toDecimal(0))
    }
    result.connectionRows = connections(p.productId)
    return {detail:result}
}
function connections(id) {
    const sources = [['Orders','mantle.order.OrderItem','orderId','mantle.order.OrderHeader'], ['Invoices','mantle.account.invoice.InvoiceItem','invoiceId','mantle.account.invoice.Invoice'],
        ['Shipments','mantle.shipment.ShipmentItem','shipmentId','mantle.shipment.Shipment'], ['Production','mantle.work.effort.WorkEffortProduct','workEffortId','mantle.work.effort.WorkEffort'],
        ['Requests','mantle.request.RequestItem','requestId','mantle.request.Request'], ['Agreements','mantle.party.agreement.AgreementItem','agreementId','mantle.party.agreement.Agreement']]
    const result = []
    for (const [label,entity,key,parent] of sources) {
        ec.message.pushErrors()
        try {
            const ids = new Set()
            // Need explicit entity visibility in addition to parent visibility: a catalog role confers no transaction launcher.
            const groups = label==='Production' ? ['BOSS_MANUFACTURING_READ'] : label==='Shipments' ? ['BOSS_WAREHOUSE_MANAGER'] : ['BOSS_PROJECT_MANAGER']
            if (!ec.user.isInGroup('ADMIN') && !groups.some(group=>ec.user.isInGroup(group))) continue
            if (!ec.artifactExecution.isPermitted(entity, 'AT_ENTITY', 'view')) continue
            for (const row of list(entity, {productId:id})) {
                const check = call('mantle.party.CommunicationServices.get#RecordLinkInfo', {recordEntityName:parent, recordId:row[key], checkOnly:true})
                if (check.recordVisible) ids.add(row[key])
            }
            if (ids.size) result.push({kind:label, count:ids.size, recordIds:Array.from(ids).join(', ')})
        } catch(err) { ec.logger.error(`Product ${id} ${label} connections failed: ${err}`) }
        finally { ec.message.clearErrors(); ec.message.popErrors() }
    }
    return result
}
function deleteProduct(p) {
    const product = record(p.productId, 'catalogEdit')
    find(P+'Product', {productId:p.productId}).forUpdate(true).one()
    if (product.statusId !== 'PrdDraft') throw new Error('Only unused drafts may be deleted')
    for (const entity of ['mantle.order.OrderItem','mantle.account.invoice.InvoiceItem','mantle.shipment.ShipmentItem','mantle.product.asset.Asset','mantle.work.effort.WorkEffortProduct','mantle.request.RequestItem','mantle.party.agreement.AgreementItem'])
        if (find(entity,{productId:p.productId}).count() > 0) throw new Error('Product is used by ' + entity)
    if (find(P+'ProductAssoc', {toProductId:p.productId}).count() || find(P+'ProductAssoc',{productId:p.productId}).count()) throw new Error('Remove product relationships before deleting an unused draft')
    for (const entity of [P+'ProductUomDimension',P+'ProductOtherIdentification',P+'maintenance.ProductMaintenance',P+'maintenance.ProductMeter']) {
        for (const row of list(entity,{productId:p.productId})) {
            const keys=Object.keys(ec.entity.makeValue(entity).getPrimaryKeys())
            call('delete#'+entity,fields(map(row),keys.join(',')),true)
        }
    }
    call('mantle.product.ProductServices.delete#Product', {productId:p.productId}, true)
    if (one(P+'Product', {productId:p.productId})) throw new Error('Product is used and was not deleted')
    return {productId:p.productId}
}
function bulk(p) {
    const ids = [...new Set(Array.isArray(p.productIds) ? p.productIds : String(p.productIds || '').split(',').map(x=>x.trim()).filter(Boolean))]
    if (!ids.length || ids.length > 1000) throw new Error('Select 1–1000 product IDs')
    const results = []
    for (const id of ids) {
        ec.message.pushErrors()
        try {
            const data = Object.assign({},p,{productId:id, kind:p.kind, productIds:null})
            callNew(C+'store#CatalogRow',data)
            if (ec.message.hasError()) throw new Error(ec.message.getErrorsString())
            results.push({productId:id, status:'success'})
        } catch(err) { ec.logger.error(`Bulk catalog product ${id}: ${err}`); results.push({productId:id,status:'error',error:String(err.message||err)}) }
        finally { ec.message.clearErrors(); ec.message.popErrors() }
    }
    return {results, successCount:results.filter(row=>row.status==='success').length, failedCount:results.filter(row=>row.status==='error').length}
}
function callNew(name,p) { return ec.service.sync().name(name).parameters(p).requireNewTransaction(true).call() || {} }
function clone(p) {
    if(p.productId && one(P+'Product',{productId:p.productId})) throw new Error('Clone product ID is already in use')
    const source = record(p.baseProductId), created = storeProduct(Object.assign({}, fields(source,masterFields),{productId:p.productId, pseudoId:null, ownerPartyId:p.ownerPartyId || source.ownerPartyId, productName:p.productName || source.productName+' copy'}))
    const id = created.productId, warnings = [], meterMap = {}
    for (const [flag,kind] of [['copyCategories','category'],['copyFeatures','feature'],['copyDimensions','dimension'],['copyParties','party'],['copyAssociations','association'],['copyEquipment','meter'],['copyEquipment','maintenance']]) {
        if (!(p[flag] === true || p[flag] === 'Y')) continue
        for (const row of list(kinds[kind].entity,{productId:p.baseProductId}).filter(row => !('fromDate' in row) || current(row))) {
            if (kind === 'association' && !['PatEquivalent','PatReplacement'].includes(row.productAssocTypeEnumId)) continue
            const data = Object.assign({},map(row),{productId:id,kind})
            if (kinds[kind].id) delete data[kinds[kind].id]
            if ('fromDate' in data) data.fromDate = ec.user.nowTimestamp
            if (kind === 'maintenance') data.intervalProductMeterId = meterMap[row.intervalProductMeterId] || null
            const copied=storeRow(data)
            if(kind==='meter') meterMap[row.productMeterId]=copied.productMeterId
        }
    }
    if (p.copyIdentifiers === true || p.copyIdentifiers === 'Y') {
        for (const row of list(P+'ProductIdentification',{productId:p.baseProductId})) {
            if (!['PidtSku','PidtOther'].includes(row.productIdTypeEnumId)) { warnings.push('Assign a new '+row.productIdTypeEnumId+' separately'); continue }
            storeRow({productId:id,kind:'identifier',productIdTypeEnumId:row.productIdTypeEnumId,idValue:id+'-'+row.productIdTypeEnumId})
        }
    }
    if (p.copyIdentifiers === true || p.copyIdentifiers === 'Y') {
        for(const row of list(P+'ProductOtherIdentification',{productId:p.baseProductId})) {
            if(!['PidtSku','PidtOther','PidtUrlSlug'].includes(row.productIdTypeEnumId)) { warnings.push('Assign a new '+row.productIdTypeEnumId+' separately'); continue }
            storeRow({productId:id,kind:'otherIdentifier',productIdTypeEnumId:row.productIdTypeEnumId,productStoreId:row.productStoreId,marketSegmentId:row.marketSegmentId,idValue:id+'-'+row.productOtherIdentId})
        }
    }
    if (p.copyContent === true || p.copyContent === 'Y') {
        for (const row of list(P+'ProductContent',{productId:p.baseProductId}).filter(current)) {
            const data = map(row); delete data.productContentId; delete data.lastUpdatedStamp
            data.productId=id
            if (String(data.contentLocation || '').startsWith('dbresource://')) {
                const target='dbresource://ironstone/products/'+id+'/'+Math.floor(Math.random()*1e12)+'/'+String(data.contentLocation).split('/').pop()
                const stream=ec.resource.getLocationReference(data.contentLocation).openStream()
                try { ec.resource.getLocationReference(target).putStream(stream) } finally { if(stream) stream.close() }
                data.contentLocation=target
            }
            call('create#'+P+'ProductContent',data,true)
        }
    }
    return {productId:id,warnings}
}
function findProducts(p) {
    const a=access()
    if (!a.capabilities.read) throw new Error('Catalog read access is required')
    const cf=ec.entity.conditionFactory, conditions=[cf.makeCondition('productId','is-not-null',null)]
    if (!a.capabilities.systemAdmin) conditions.push(cf.makeCondition('ownerPartyId','in',a.ownerPartyIds))
    for (const key of ['ownerPartyId','productTypeEnumId','productClassEnumId','salesAllowed','purchaseAllowed']) if(p[key]) conditions.push(cf.makeCondition(key,'equals',p[key]))
    let searchUnavailable=false, searchMessage=null, matches=null
    if(p.list==='missingPrice') return {productList:[],productListCount:0,pageIndex:0,pageSize:25,searchUnavailable:true,searchMessage:'Price coverage becomes available with Pricing; no coverage count is available yet'}
    if (p.keyword) {
        ec.message.pushErrors()
        try {
            if (!ec.search.isAvailable()) throw new Error('Search backend is unavailable')
            const request={documentType:['MantleProduct'],query:ec.search.parseQuery(String(p.keyword)),limit:10000,offset:0}
            if(!a.capabilities.systemAdmin) request.filter={field:{name:'ownerPartyId',op:'in',values:a.ownerPartyIds}}
            matches=new Set()
            while(true) {
                const page=ec.search.search(request),hits=Array.from(page.hits || [])
                for(const hit of hits) matches.add(String(hit.body?.productId || hit.id))
                if(hits.length<request.limit) break
                request.offset+=hits.length
            }
        } catch(err) {searchUnavailable=true;searchMessage='Search unavailable; matching product IDs and names instead';ec.logger.error('Catalog keyword search: '+err)}
        finally {ec.message.clearErrors();ec.message.popErrors()}
    }
    const needle=String(p.text || (searchUnavailable ? p.keyword : '') || '').toLowerCase()
    const identifierNeedle=String(p.text || (searchUnavailable ? p.keyword : '') || '').toLowerCase()
    const identifierIds=new Set()
    if(identifierNeedle) for(const entity of [P+'ProductIdentification',P+'ProductOtherIdentification']) for(const row of ec.entity.find(entity).condition(cf.makeCondition('idValue','like','%'+identifierNeedle+'%').ignoreCase()).disableAuthz().list()) identifierIds.add(row.productId)
    const partyNeedle=String(p.partyItemId || needle || p.keyword || '').toLowerCase()
    const partyIds=new Set()
    if(partyNeedle) {
        const pcf=cf.makeCondition('otherPartyItemId','like','%'+partyNeedle+'%').ignoreCase()
        for(const row of ec.entity.find(P+'ProductParty').condition(pcf).disableAuthz().list()) if(current(row) && partyReadable(row.partyId,a) && (row.roleTypeId!=='Supplier' || a.capabilities.supplierPriceRead)) partyIds.add(row.productId)
        // Supplier item-code discovery requires supplier-price read; no offer values leave this service.
        if(a.capabilities.supplierPriceRead) for(const row of ec.entity.find(P+'ProductPrice').condition(cf.makeCondition('otherPartyItemId','like','%'+partyNeedle+'%').ignoreCase()).disableAuthz().list()) {
            if(current(row) && row.vendorPartyId && !one('mantle.party.PartyRole',{partyId:row.vendorPartyId,roleTypeId:'OrgInternal'}) && one('mantle.party.PartyRole',{partyId:row.customerPartyId,roleTypeId:'OrgInternal'}) && (a.capabilities.systemAdmin || a.organizationPartyIds.includes(row.customerPartyId))) {
                try {ec.resource.script('component://mr-mantle/service/mantle/product/PricePolicy.js').execute('access',row);partyIds.add(row.productId)} catch(e) { /* Private offer codes are not discovery keys. */ }
            }
        }
    }
    let productRows=Array.from(ec.entity.find(P+'Product').condition(cf.makeCondition(conditions,'and')).disableAuthz().orderBy('productName,productId').list())
    const categoryIds=(Array.isArray(p.categoryIds)?p.categoryIds:[p.categoryIds || '']).flatMap(value=>String(value).split(',')).map(value=>value.trim()).filter(Boolean)
    const tagIds=(Array.isArray(p.tagIds)?p.tagIds:[p.tagIds || '']).flatMap(value=>String(value).split(',')).map(value=>value.trim()).filter(Boolean)
    for(const id of tagIds) if(record(id,'read',P+'category.ProductCategory').productCategoryTypeEnumId!=='PctTag') throw new Error('Choose a tag category')
    const tagSets=tagIds.map(id=>new Set(list(P+'category.ProductCategoryMember',{productCategoryId:id}).filter(current).map(row=>row.productId)))
    for(const id of categoryIds) record(id,'read',P+'category.ProductCategory')
    const categorySets=categoryIds.map(id=>new Set(list(P+'category.ProductCategoryMember',{productCategoryId:id}).filter(current).map(row=>row.productId)))
    const featureIds=p.productFeatureId?new Set(list(P+'feature.ProductFeatureAppl',{productFeatureId:p.productFeatureId}).filter(current).map(row=>row.productId)):null
    if(p.productFeatureId) record(p.productFeatureId,'read',P+'feature.ProductFeature')
    let identified=null
    if(p.idValue) {
        identified=new Set(list(P+'ProductIdentification',{idValue:p.idValue}).concat(list(P+'ProductOtherIdentification',{idValue:p.idValue})).map(row=>row.productId))
    }
    const variantIds=p.list==='variants'?new Set(list(P+'ProductAssoc',{productAssocTypeEnumId:'PatVariant'}).filter(current).map(row=>row.toProductId)):null
    productRows=productRows.filter(row=>{
        const status=row.statusId || (ms(row.salesDiscontinuationDate)!=null && ms(row.salesDiscontinuationDate)<=ms(ec.user.nowTimestamp)?'PrdDiscontinued':'PrdActive')
        if(p.statusId && p.statusId!==status) return false
        if(needle && ![row.productId,row.pseudoId,row.productName].some(x=>String(x || '').toLowerCase().includes(needle)) && !partyIds.has(row.productId) && !identifierIds.has(row.productId)) return false
        if(matches && !matches.has(row.productId) && !partyIds.has(row.productId)) return false
        if(p.partyItemId && !partyIds.has(row.productId)) return false
        if(identified && !identified.has(row.productId)) return false
        if(featureIds && !featureIds.has(row.productId)) return false
        if(tagSets.length && !tagSets.every(set=>set.has(row.productId))) return false
        if(categorySets.length && !(p.categoryOperator==='OR'?categorySets.some(set=>set.has(row.productId)):categorySets.every(set=>set.has(row.productId)))) return false
        if(p.list==='activeSkus' && (status!=='PrdActive' || row.productTypeEnumId==='PtVirtual')) return false
        if(p.list==='virtual' && row.productTypeEnumId!=='PtVirtual') return false
        if(p.list==='services' && row.productTypeEnumId!=='PtService') return false
        if(p.list==='stocked' && row.requireInventory!=='Y') return false
        if(p.list==='discontinued' && status!=='PrdDiscontinued') return false
        if(p.list==='discontinuingSoon' && !(ms(row.salesDiscontinuationDate)>ms(ec.user.nowTimestamp) && ms(row.salesDiscontinuationDate)<=ms(ec.user.nowTimestamp)+30*86400000)) return false
        if(variantIds && !variantIds.has(row.productId)) return false
        return true
    })
    const pageIndex=Math.max(0,Number(p.pageIndex||0)),pageSize=Math.max(1,Math.min(200,Number(p.pageSize||25)))
    if(p.orderByField==='-lastUpdatedStamp') productRows.sort((a,b)=>ms(b.lastUpdatedStamp)-ms(a.lastUpdatedStamp))
    return {productList:productRows.slice(pageIndex*pageSize,(pageIndex+1)*pageSize).map(row=>({productId:row.productId,pseudoId:row.pseudoId,productName:row.productName,
        productTypeEnumId:row.productTypeEnumId,ownerPartyId:row.ownerPartyId,statusId:row.statusId || (ms(row.salesDiscontinuationDate)!=null && ms(row.salesDiscontinuationDate)<=ms(ec.user.nowTimestamp)?'PrdDiscontinued':'PrdActive'),
        shared:row.ownerPartyId==='_NA_',lastUpdatedStamp:row.lastUpdatedStamp,lastUpdatedStampText:row.lastUpdatedStamp?ec.l10n.format(new Date(ms(row.lastUpdatedStamp)),'yyyy-MM-dd HH:mm'):null})),productListCount:productRows.length,pageIndex,pageSize,searchUnavailable,searchMessage}
}
function summary() {
    const found=findProducts({pageSize:10,orderByField:'-lastUpdatedStamp'})
    const all=findProducts({list:'activeSkus',pageSize:1})
    const virtual=findProducts({list:'virtual',pageSize:1}),variants=findProducts({list:'variants',pageSize:1})
    let activityRows=[]
    const party=ec.user.userAccount?.partyId
    if(party) for(const assignment of list('mantle.work.effort.WorkEffortParty',{partyId:party}).filter(current)) {
        if(['WeptDeclined','WeptUnassigned'].includes(assignment.statusId)) continue
        const task=one('mantle.work.effort.WorkEffort',{workEffortId:assignment.workEffortId})
        if(!task || task.workEffortTypeEnumId!=='WetTask' || ['WeComplete','WeClosed','WeCancelled'].includes(task.statusId)) continue
        const links=list('mantle.work.effort.WorkEffortRecord',{workEffortId:task.workEffortId}).filter(link=>[P+'Product',P+'category.ProductCategory',P+'feature.ProductFeature'].includes(link.recordEntityName))
        if(links.some(link=>visible(link.recordId,link.recordEntityName))) activityRows.push({workEffortId:task.workEffortId,workEffortName:task.workEffortName,estimatedCompletionDate:task.estimatedCompletionDate,priority:task.priority})
    }
    const soon=Array.from(find(P+'Product').list()).filter(row=>visible(row.productId) && ms(row.salesDiscontinuationDate)>ms(ec.user.nowTimestamp) && ms(row.salesDiscontinuationDate)<=ms(ec.user.nowTimestamp)+30*86400000).length
    return {summary:{discontinuingSoon:soon,asOf:ec.l10n.format(new Date(ms(ec.user.nowTimestamp)),'yyyy-MM-dd HH:mm'),active:all.productListCount,virtual:virtual.productListCount,variants:variants.productListCount,total:found.productListCount,missingPrice:null,incomplete:null},recentProducts:found.productList,activityRows}
}
function palette(p) {
    const found=findProducts({text:p.text,pageSize:Math.max(1,Math.min(20,Number(p.limit||5)))})
    return {rows:found.productList.map(row=>({title:row.productName || row.productId,subtitle:row.productId+(row.shared?' · Shared':''),icon:'sym_o_inventory_2',url:'/qapps/Products/Products/Product360?productId='+encodeURIComponent(row.productId)}))}
}
function options() {
    const a=access()
    if(!a.capabilities.read) throw new Error('Catalog read access is required')
    const internalIds=new Set(list('mantle.party.PartyRole',{roleTypeId:'OrgInternal'}).map(row=>row.partyId))
    const choices=(entity,key,label,predicate)=>list(entity).filter(predicate || (()=>true)).map(row=>({value:row[key],label:row[label] || row[key]}))
    return {options:{owners:choices('mantle.party.Party','partyId','pseudoId',row=>internalIds.has(row.partyId) && (a.capabilities.systemAdmin || a.organizationPartyIds.includes(row.partyId))).concat(a.capabilities.systemAdmin?[{value:'_NA_',label:'Shared catalog'}]:[]),
        units:choices('moqui.basic.Uom','uomId','description',row=>row.uomTypeEnumId!=='UT_CURRENCY_MEASURE'),
        categories:choices(P+'category.ProductCategory','productCategoryId','categoryName',row=>a.capabilities.systemAdmin || a.ownerPartyIds.includes(row.ownerPartyId)),
        features:choices(P+'feature.ProductFeature','productFeatureId','description',row=>a.capabilities.systemAdmin || a.ownerPartyIds.includes(row.ownerPartyId)),
        products:findProducts({pageSize:200}).productList.map(row=>({value:row.productId,label:row.productName || row.productId})),
        dimensions:choices('moqui.basic.UomDimensionType','uomDimensionTypeId','description'),
        productTypes:choices('moqui.basic.Enumeration','enumId','description',row=>row.enumTypeId==='ProductType'),
        idTypes:choices('moqui.basic.Enumeration','enumId','description',row=>row.enumTypeId==='ProductIdentificationType'),
        parties:choices('mantle.party.Party','partyId','pseudoId',row=>(!row.privateOwnerUserId || row.privateOwnerUserId===ec.user.userId) && (a.capabilities.systemAdmin || a.ownerPartyIds.includes(row.ownerPartyId) || a.organizationPartyIds.includes(row.partyId))),
        featureTypes:choices('moqui.basic.Enumeration','enumId','description',row=>row.enumTypeId==='ProductFeatureType'),
        assetTypes:choices('moqui.basic.Enumeration','enumId','description',row=>row.enumTypeId==='AssetType'),
        maintenanceTypes:choices('moqui.basic.Enumeration','enumId','description',row=>row.enumTypeId==='MaintenanceType'),
        drives:Array.from(call('org.moqui.impl.FileServices.get#UserDrives').driveList || []).map(row=>({value:row.driveId,label:row.driveName || row.driveId})),
        contentTypes:choices('moqui.basic.Enumeration','enumId','description',row=>row.enumTypeId==='ProductContentType'),
        meterTypes:choices(P+'maintenance.ProductMeterType','productMeterTypeId','description')}}
}

function choices(p) {
    if(p.choice==='products') return {rows:findProducts({text:p.term,pageSize:30}).productList.map(row=>({value:row.productId,label:row.productName || row.productId}))}
    const allowed=['owners','units','categories','features','parties','contentTypes']
    if(!allowed.includes(p.choice)) throw new Error('Unknown catalog choice')
    const term=String(p.term || '').toLowerCase()
    return {rows:options().options[p.choice].filter(row=>!term || String(row.value+' '+row.label).toLowerCase().includes(term)).slice(0,50)}
}
function content(p) {
    record(p.productId,'catalogEdit')
    const old=p.productContentId ? one(P+'ProductContent',{productContentId:p.productContentId}) : null
    if(p.productContentId && old?.productId!==p.productId) throw new Error('Content is not on this product')
    if(p.contentLocation) throw new Error('Choose a file through its authorized drive and path')
    const data=fields(p,'productId,productContentId,productContentTypeEnumId,description,locale,fromDate,thruDate,contentText,contentFile')
    if(p.sourceDriveId || p.sourcePath) {
        const source=call('org.moqui.impl.FileServices.get#ResourceInfo',{driveId:p.sourceDriveId,path:p.sourcePath}).resource
        if(!source || source.isDirectory) throw new Error('Source file is not available')
        const target='dbresource://mantle/content/product/'+p.productId+'/linked_'+ms(ec.user.nowTimestamp)+'_'+Math.floor(Math.random()*1e9)+'/'+source.name
        const stream=ec.resource.getLocationReference(source.location).openStream()
        try { ec.resource.getLocationReference(target).putStream(stream) } finally { if(stream) stream.close() }
        data.contentLocation=target
    }
    if(old && p.contentText) {
        const location=String(old.contentLocation || '')
        if(!['dbresource://mantle/content/product/'+p.productId+'/', 'dbresource://ironstone/products/'+p.productId+'/'].some(prefix=>location.startsWith(prefix)) || location.split('/').includes('..')) throw new Error('Replace this document with an uploaded file before editing its text')
    }
    return call('mantle.product.ProductServices.'+(p.productContentId?'update':'create')+'#ProductContent',data,true)
}
function execute(op,p) { return ({settings,storeSettings,storeProduct,transition,storeRow,content,choices,detail,deleteProduct,bulk,clone,findProducts,summary,palette,options})[op](p || {}) }
;({execute})

// Products launcher, capability menus and record routes, with artifact authorization enabled.
const root = 'component://webroot/screen/webroot.xml'
function asProductUser(user, run) {
    login(user)
    const disabled = ec.artifactExecution.authzDisabled()
    if (disabled) ec.artifactExecution.enableAuthz()
    try { return run() } finally {
        ec.message.clearErrors()
        if (disabled) ec.artifactExecution.disableAuthz()
        login('john.doe')
    }
}
function json(path) {
    const rendered = ec.screen.makeTest().rootScreen(root).render(path, {}, null)
    return {status: rendered.status, data: JSON.parse(rendered.output)}
}
feature('the Products menu follows the composed grants', {
    where: [
        {user: 'catalog.reader', extra: []},
        {user: 'catalog.catalog.edit', extra: []},
        {user: 'catalog.price.read', extra: ['Prices']},
        {user: 'catalog.price.edit', extra: ['Prices']},
        {user: 'catalog.supplier.price.read', extra: ['Prices', 'SupplierPrices']},
        {user: 'catalog.supplier.price.edit', extra: ['Prices', 'SupplierPrices']},
        {user: 'catalog.cost.read', extra: ['Prices']},
        {user: 'catalog.cost.estimate', extra: ['Prices']},
        {user: 'catalog.cost.approve', extra: ['Prices']},
        {user: 'catalog.admin', extra: ['Prices', 'SupplierPrices', 'Settings']},
    ],
    when({user}) {
        return asProductUser(user, () => {
            const found = json('menuData/apps/Products/Home')
            const menu = found.data.find(level => level.name === 'Products')
            return {status: found.status, names: menu.subscreens.filter(item => item.menuInclude).map(item => item.name)}
        })
    },
    then({status, names, extra}) {
        status == 200
        names.filter(name => !['Prices', 'SupplierPrices', 'Settings'].includes(name)) == ['Home', 'Products', 'Categories', 'Features', 'Documents', 'Units']
        names.filter(name => ['Prices', 'SupplierPrices', 'Settings'].includes(name)) == extra
    },
})
feature('the reader has Products providers and no other business launcher', {
    when() {
        return asProductUser('catalog.reader', () => {
            const found = json('shellData')
            return {status: found.status, apps: found.data.apps, products: found.data.apps.find(app => app.name === 'Products')}
        })
    },
    then({status, apps, products}) {
        status == 200
        products.providers.paletteTypes == ['MantleProduct']
        products.providers.keymaps[0].scope == 'products'
        products.providers.paletteSources.some(source => source.group === 'Products' && source.prefix === '#')
        !apps.some(app => ['Warehouse', 'Manufacturing', 'Accounting', 'Purchasing', 'Projects'].includes(app.name))
    },
})
feature('owned and shared product routes render for the reader and another owner is refused', {
    when() {
        return asProductUser('catalog.reader', () => {
            const render = productId => {
                const result = ec.screen.makeTest().rootScreen('component://mr-boss/screen/Products.xml').renderMode('qvt').withStaticData()
                    .render('Products/Product360', {productId, lastStandalone: '-2'}, null)
                const value = {status: result.status, errors: result.errorMessages.join(' | '), output: String(result.output)}
                ec.message.clearErrors()
                return value
            }
            return {own: render('BOSS_PRD_OWN'), shared: render('DEMO_SA_1'), other: render('BOSS_PRD_OTHER')}
        })
    },
    then({own, shared, other}) {
        own.status == 200
        own.errors == ''
        own.output.includes('Services catalog sample')
        shared.output.includes('Shared catalog record')
        !other.output.includes('Retail catalog sample')
        other.output.includes('Product not available')
    },
})

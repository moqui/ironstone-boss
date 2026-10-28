feature('a supplier editor maintains an offer and reads the same supply facts from Product360 and Supplier360',{
 expect(){
  const page=browser.newPage({user:'catalog.supplier.price.edit',viewport:{width:1280,height:1100},timeout:30});page.allowProblems(/userPhoto\?userId=/)
  page.goto('/qapps/Products/Suppliers/SupplierPrices?organizationPartyId=ORG_ZIZI_SERVICES&productId=BOSS_PRD_OWN').status==200
  page.waitFor(()=>document.querySelector('.q-page')?.innerText.includes('SERV-CASE-12'))
  page.text().includes('SERV-SUPPLY-01')
  page.getByRole('button',{name:'New supplier offer',exact:true}).click()
  const dialog=page.getByRole('dialog')
  dialog.getByLabel('Supplier',{exact:true}).click();page.getByRole('option',{name:'Services Supply (BOSS_PRD_SUPPLIER)',exact:true}).click()
  dialog.locator('input[name=price]').fill('6.75');dialog.locator('input[name=minQuantity]').fill('125');dialog.locator('input[name=quantityIncrement]').fill('5');dialog.locator('input[name=standardLeadTimeDays]').fill('2');dialog.locator('input[name=otherPartyItemId]').fill('BROWSER-OFFER-125');dialog.locator('input[name=changeReason]').fill('Supplier browser validation')
  dialog.getByRole('button',{name:'Create offer',exact:true}).click()
  page.waitFor(()=>!document.querySelector('[role=dialog]'))
  page.waitFor(()=>document.querySelector('.q-page')?.innerText.includes('BROWSER-OFFER-125'))
  page.screenshot('Supplier-offer-created',{fullPage:true})
  page.goto('/qapps/Products/Products/Product360/Suppliers?productId=BOSS_PRD_OWN&organizationPartyId=ORG_ZIZI_SERVICES').status==200
  page.waitFor(()=>document.querySelector('.q-page')?.innerText.includes('BROWSER-OFFER-125'))
  page.text().includes('SERV-CASE-12')
  page.goto('/qapps/Products/Suppliers/Supplier360?vendorPartyId=BOSS_PRD_SUPPLIER&organizationPartyId=ORG_ZIZI_SERVICES').status==200
  page.waitFor(()=>document.querySelector('.q-page')?.innerText.includes('supply@example.test'))
  !page.text().includes('Maintain contact')
  page.goto('/qapps/Products/Suppliers/Supplier360/Prices?vendorPartyId=BOSS_PRD_SUPPLIER&organizationPartyId=ORG_ZIZI_SERVICES').status==200
  page.waitFor(()=>document.querySelector('.q-page')?.innerText.includes('BROWSER-OFFER-125'))
  page.screenshot('Supplier-offers-embed',{fullPage:true})
 },
})
feature('creating an offer in the second buyer context keeps that internal buyer in the submitted form',{
 expect(){const page=browser.newPage({user:'john.doe',viewport:{width:1280,height:1100},timeout:30});page.allowProblems(/userPhoto\?userId=/);page.goto('/qapps/Products/Suppliers/SupplierPrices?organizationPartyId=ORG_ZIZI_RETAIL&productId=BOSS_PRD_OWN&vendorPartyId=BOSS_PRD_SUPPLIER').status==200;page.waitFor(()=>document.querySelector('.q-page')?.innerText.includes('SERV-RETAIL-01'));page.getByRole('button',{name:'New supplier offer',exact:true}).click();const dialog=page.getByRole('dialog');dialog.locator('input[name=price]').fill('9.25');dialog.locator('input[name=minQuantity]').fill('250');dialog.locator('input[name=otherPartyItemId]').fill('BROWSER-RETAIL-250');dialog.locator('input[name=changeReason]').fill('Retail buyer context validation');dialog.getByRole('button',{name:'Create offer',exact:true}).click();page.waitFor(()=>!document.querySelector('[role=dialog]'));page.waitFor(()=>document.querySelector('.q-page')?.innerText.includes('BROWSER-RETAIL-250'));page.evaluate(()=>new URL(window.location.href).searchParams.get('organizationPartyId'))==='ORG_ZIZI_RETAIL';page.screenshot('Supplier-second-buyer-created',{fullPage:true})},
})

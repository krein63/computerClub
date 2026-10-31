'use strict';
const fs=require('fs'),path=require('path'),http=require('http'),assert=require('assert/strict'),cp=require('child_process');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root=process.env.QA_REPO || path.resolve(__dirname, '..');
const out=process.env.QA_OUTPUT || path.join(__dirname, 'generated-fixed');
fs.mkdirSync(out, { recursive: true });
const report={checks:[],errors:[],runtime:[],at:new Date().toISOString()};
const check=async(name,fn)=>{try{await fn();report.checks.push({name,pass:true});}catch(e){report.checks.push({name,pass:false,error:e.message});report.errors.push(name);}};
const server=http.createServer((req,res)=>{const url=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(url==='/favicon.ico'){res.writeHead(204).end();return;}const f=path.resolve(root,'.'+url);if(!f.startsWith(path.resolve(root)+path.sep)){res.writeHead(403).end();return;}try{res.setHeader('Content-Type',({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.webp':'image/webp'})[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}catch{res.writeHead(404).end();}});
(async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;let browser;
try{
browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH});
const context=await browser.newContext();const page=await context.newPage();page.setDefaultTimeout(8000);
page.on('pageerror',e=>report.runtime.push(e.message));page.on('console',m=>{if(m.type()==='error')report.runtime.push(m.text());});page.on('response',r=>{if(r.status()>=400)report.runtime.push(r.status()+' '+r.url());});
const go=async f=>{await page.goto(base+'/'+f);await page.waitForTimeout(300);};
await check('All seven pages, navigation, scripts, images and 3 responsive widths',async()=>{
 for(const f of ['index.html','about.html','booking.html','computers.html','games.html','prices.html','rules.html']){
 await go(f);for(const width of [375,768,1440]){await page.setViewportSize({width,height:900});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),f+' overflow '+width);}
 const links=await page.locator('a[href]').evaluateAll(es=>es.map(e=>e.getAttribute('href')).filter(x=>x&&!/^(https?:|tel:|mailto:|#)/.test(x)));
 for(const link of links){const target=link.split(/[?#]/)[0];assert(fs.existsSync(path.join(root,target)),f+' missing '+target);}
 const broken=await page.locator('img').evaluateAll(async es=>{await Promise.all(es.map(e=>{e.loading='eager';return e.decode().catch(()=>{});}));return es.filter(e=>!e.closest('template')&&e.getAttribute('src')&&e.naturalWidth===0).map(e=>e.src);});
 assert.deepEqual(broken,[],f+' images');
 if(['about.html','booking.html','computers.html'].includes(f)) assert.equal(await page.evaluate(()=>jQuery.fn.jquery),'3.7.1');
 await page.screenshot({path:path.join(out,f.replace('.html','')+'-1440.png'),fullPage:true});
 }
});
await check('Catalogue filters, restore, checkbox state, dynamically delegated comparison removal',async()=>{
 await go('computers.html');assert.match(await page.locator('#equipment-result-count').innerText(),/3 из 3/);
 await page.locator('#compare-main').check();assert.equal(await page.locator('#equipment-compare-result h3').count(),1);
 await page.locator('#equipment-search').fill('notfound');assert.match(await page.locator('#equipment-result-count').innerText(),/0 из 3/);
 await page.locator('#equipment-filter-reset').click();assert(await page.locator('#compare-main').isChecked());
 await page.locator('#compare-duo').check();assert.equal(await page.locator('#equipment-compare-result h3').count(),2);
 await page.locator('[data-remove-zone="main"]').click();assert(!(await page.locator('#compare-main').isChecked()));
 await page.locator('#equipment-private').selectOption('private');assert.match(await page.locator('#equipment-result-count').innerText(),/1 из 3/);
 await page.locator('#equipment-filter-reset').click();await page.locator('#equipment-refresh').selectOption('380');assert.match(await page.locator('#equipment-result-count').innerText(),/2 из 3/);
 await page.locator('#equipment-compare-clear').click();assert(await page.locator('#equipment-compare-clear').isDisabled());
});
await check('Review validation, safe text, filter, persistence, delegated deletion and effect callback',async()=>{
 await go('about.html');await page.locator('#review-form [type=submit]').click();assert.equal(await page.locator('#review-form [aria-invalid=true]').count(),3);
 await page.locator('#review-name').fill('  <b>Test</b>  ');await page.locator('#review-rating').selectOption('5');await page.locator('#review-text').fill('  Отличный клуб, удобные компьютеры и хороший сервис!  ');
 assert.equal(await page.locator('#review-form [aria-invalid=true]').count(),0);await page.locator('#review-form [type=submit]').click();
 assert.equal(await page.locator('#review-name').inputValue(),'');assert.equal(await page.locator('#review-list b').count(),0);assert.match(await page.locator('#review-list').innerText(),/<b>Test<\/b>/);
 await page.locator('#review-rating-filter').selectOption('1');assert.equal(await page.locator('[data-review]').count(),0);await page.locator('#review-filter-reset').click();await page.reload();await page.waitForTimeout(200);
 assert.equal(await page.locator('[data-review]').count(),1);await page.locator('[data-remove-review]').click();await page.waitForTimeout(400);assert.equal(await page.locator('[data-review]').count(),0);assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('topgame-demo-reviews')).length),0);
});
await check('Fixed booking: validation, correction, prices, selected PCs, demo confirmation and reset',async()=>{
 await go('booking.html');await page.locator('#booking-submit').click();assert.equal(await page.locator('#customer-name').getAttribute('aria-invalid'),'true');
 await page.locator('#customer-name').fill('  Тестовый игрок  ');await page.locator('#customer-phone').fill('wrong');await page.locator('#customer-email').fill('bad');
 await page.locator('#booking-submit').click();assert.equal(await page.locator('#customer-email').getAttribute('aria-invalid'),'true');
 await page.locator('#customer-phone').fill('+7 700 123 45 67');await page.locator('#customer-email').fill('test@example.com');assert.equal(await page.locator('#customer-email').getAttribute('aria-invalid'),'false');
 await page.locator('#booking-date').fill('2030-06-16');await page.locator('#booking-time').fill('14:00');await page.locator('#player-count').fill('1');await page.locator('#booking-tariff').selectOption('hour');await page.locator('#zone-main').check();await page.locator('#booking-duration').fill('2');await page.locator('#booking-agreement').check();await page.locator('#seat-1').click();
 assert.match(await page.locator('#booking-total').innerText(),/2\s*400/);await page.locator('#booking-submit').click();assert(await page.locator('#booking-success').isVisible());assert.match(await page.locator('#booking-success').innerText(),/демо|Демо/);assert.equal(await page.locator('#customer-name').inputValue(),'');assert.equal(await page.locator('[data-cancel-booking]').count(),1);
 await page.locator('#booking-submit').click();assert.equal(await page.locator('[data-cancel-booking]').count(),1);
 await page.locator('[data-cancel-booking]').click();assert.equal(await page.locator('[data-cancel-booking]').count(),0);
 await page.locator('#booking-date').fill('2020-01-01');await page.locator('#booking-submit').click();assert.equal(await page.locator('#booking-date').getAttribute('aria-invalid'),'true');
});
await check('Fixed food: filters, delegated quantity controls, prices and independent checkout',async()=>{
 await go('booking.html');await page.locator('#food-search').fill('zzzz');assert.equal(await page.locator('[data-food-id]').count(),0);await page.locator('#food-reset').click();assert.equal(await page.locator('[data-food-id]').count(),8);
 const add=page.locator('[data-add-food]').first();const id=await add.getAttribute('data-add-food');await add.click();const before=await page.locator('#food-cart-total').innerText();assert(before.match(/\d/));
 await page.locator('[data-cart-action="increase"]').first().click();const after=await page.locator('#food-cart-total').innerText();assert.notEqual(before,after);
 await page.locator('[data-cart-action="decrease"]').first().click();assert.equal(await page.locator('#food-cart-total').innerText(),before);
 await page.locator('#food-name').fill('Тестовый игрок');await page.locator('#food-email').fill('qa@example.com');await page.locator('#food-phone').fill('+7 700 123 45 67');await page.locator('#food-delivery').selectOption('bar');await page.locator('#food-agreement').check();await page.locator('#food-checkout').click();assert(await page.locator('#food-order-success').isVisible());
});
await check('Archived implementations not loaded; existing AI Log untouched',async()=>{
 const git=(...args)=>cp.execFileSync('git',['-c','safe.directory='+root.replaceAll('\\','/'),'-C',root,...args],{encoding:'utf8'});
 assert.equal(git('diff','--','AI-log.txt'),'');

 for(const f of fs.readdirSync(root).filter(x=>x.endsWith('.html')))assert(!fs.readFileSync(path.join(root,f),'utf8').includes('old-js-version.js'));
});
await check('No JavaScript console or resource errors',async()=>assert.deepEqual(report.runtime,[]));
}finally{if(browser)await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync(path.join(out,'assignment6-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));process.exitCode=report.errors.length?1:0;}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

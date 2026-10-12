'use strict';
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || 'playwright');
(async()=> {
  const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH || (process.platform === 'darwin' ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' : undefined)});
  const context=await browser.newContext({timezoneId:'Asia/Almaty',viewport:{width:1440,height:1000}});
  const a=await context.newPage(), b=await context.newPage();
  const results=[]; const errors=[];
  const record=(name,ok,details)=>{results.push({name,ok:Boolean(ok),details});if(!ok)errors.push(name);};
  for(const page of [a,b]) { page.on('pageerror',e=>errors.push(e.message)); await page.goto('http://127.0.0.1:8765/booking.html'); }
  const date=await a.evaluate(()=>{const d=new Date();d.setDate(d.getDate()+3);return new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Almaty',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);});
  for(const page of [a,b]) {
    await page.locator('#customer-name').fill('QA Browser'); await page.locator('#customer-email').fill('qa@example.com'); await page.locator('#customer-phone').fill('+7 700 123 45 67');
    await page.locator('#booking-date').fill(date); await page.locator('#booking-time').fill('14:00'); await page.locator('#booking-tariff').selectOption('hour'); await page.locator('#booking-duration').fill('2'); await page.locator('#booking-agreement').check();
  }
  await a.locator('#seat-1').click(); await a.locator('#booking-submit').click();
  await b.waitForFunction(()=>document.querySelector('#seat-1').disabled);
  record('HTTP cross-tab new booking synchronizes occupancy',await b.locator('#seat-1').isDisabled() && await b.locator('[data-cancel-booking]').count()===1);
  await b.locator('[data-cancel-booking]').click(); await a.waitForFunction(()=>!document.querySelector('#seat-1').disabled);
  record('HTTP cross-tab cancel synchronizes release',!await a.locator('#seat-1').isDisabled() && await a.locator('[data-cancel-booking]').count()===0);
  await a.locator('[data-add-food="burger"]').click(); await a.locator('#food-name').fill('QA Browser');await a.locator('#food-email').fill('qa@example.com');await a.locator('#food-phone').fill('+7 700 123 45 67');await a.locator('#food-delivery').selectOption('bar');await a.locator('#food-agreement').check();await a.locator('#food-checkout').click();await a.reload();
  record('HTTP food order survives reload',await a.evaluate(()=>JSON.parse(localStorage.getItem('topgame-orders')||'[]').length===1));
  await a.goto('http://127.0.0.1:8765/games.html');await a.locator('[data-game="dota2"]').click();await a.locator('#visitor-name').fill('QA Browser');await a.locator('#visitor-email').fill('qa@example.com');await a.locator('#visitor-phone').fill('+7 700 123 45 67');await a.locator('#visit-date').fill(date);await a.locator('#players').fill('2');await a.locator('#team-yes').check();await a.locator('#game-agreement').check();await a.locator('#game-request-submit').click();await a.reload();
  record('HTTP game request survives reload without contacts',await a.evaluate(()=>{const r=JSON.parse(localStorage.getItem('topgame-game-request')||'null'); return r && r.title==='Dota 2' && !('name' in r) && !('phone' in r) && !('email' in r);}));
  const fs=require('node:fs');const output=process.env.QA_OUTPUT || __dirname+'/generated';fs.mkdirSync(output,{recursive:true});fs.writeFileSync(output+'/http-storage-report.json',JSON.stringify({results,errors},null,2));console.log(JSON.stringify({results,errors},null,2));await browser.close();process.exitCode=errors.length?1:0;
})().catch(error=>{console.error(error);process.exitCode=1;});

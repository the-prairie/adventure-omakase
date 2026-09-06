"""Standalone example checks. set_content plus test-only Storage adapter; no native file:// or device validation."""
import asyncio,json,os
from pathlib import Path
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];report=[]
def check(n,b):
 report.append({'name':n,'pass':bool(b)})
 if not b:raise AssertionError(n)
async def click(p,s):await p.locator(s).first.click();await p.wait_for_timeout(100)
async def close(p):
 if await p.locator('#dialog').evaluate('(d)=>d.open'):await click(p,'[data-action=close]')
async def main():
 async with async_playwright() as pw:
  b=await pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else pw.chromium.executable_path),headless=True,args=['--no-sandbox']);p=await b.new_page(viewport={'width':1440,'height':1050});errors=[];p.on('pageerror',lambda e:errors.append(str(e)))
  await p.evaluate("() => {for(const name of ['localStorage','sessionStorage']){const m=new Map();Object.defineProperty(window,name,{value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()},configurable:true});}}")
  await p.set_content((ROOT/'Adventure_Omakase_Cloudflare_Preview.html').read_text(),wait_until='domcontentloaded');await p.wait_for_selector('.invitation');await p.wait_for_timeout(250)
  check('Preview is prominently fictional and local','FICTIONAL PEOPLE' in await p.locator('.tagbar').inner_text());check('All 300 original discoveries remain',await p.evaluate('OMAKASE.catalogue.length')==300)
  await p.screenshot(path=str(ROOT/'evidence/example-desktop.png'),full_page=True)
  await p.set_viewport_size({'width':390,'height':844});await p.wait_for_timeout(400);await p.screenshot(path=str(ROOT/'evidence/example-mobile.png'),full_page=True)
  await click(p,'[data-action=plan-detail][data-id=example-lanes]');await p.locator('[name=choice][value=lunch]').check();await click(p,'#rsvp-form [value=joined]');check('Example lets you join just lunch',await p.evaluate("OmakaseDemo.snap().plans.find(p=>p.id==='example-lanes').rsvps.some(r=>r.memberId==='example-you'&&r.choice==='lunch')"));await close(p)
  await click(p,'[data-nav=story]:visible');await click(p,'[data-action=moment-new]');check('Standalone memories also default to shared',await p.locator('[name=visibility]').input_value()=='group');await close(p)
  await click(p,'[data-nav=discover]:visible');await p.locator('#search').fill('Sayamaike');await p.wait_for_timeout(100);check('Search works in the downloadable file',await p.locator('[data-action=discovery]').count()==1);await click(p,'[data-action=discovery]');await click(p,'[data-action=save-detail]');check('Save is functional',await p.evaluate("OmakaseDemo.snap().picks.some(p=>p.catalogueId==='osaka-005'&&p.memberId==='example-you')"));await close(p)
  await click(p,'[data-action=find-new]');await p.locator('#f-title').fill('A friend’s own find');await p.locator('#f-area').fill('Tokyo');await p.locator('[name=why]').fill('Test example, not a real recommendation');await click(p,'#find-form [type=submit]');check('Friends can add beyond the original list in the example',await p.evaluate("OmakaseDemo.snap().discoveries.some(d=>d.title==='A friend’s own find')"));await close(p)
  await click(p,'[data-action=legacy]');check('Original independent fieldbook remains embedded for offline preview',await p.locator('[data-action=legacy-download]').count()==1);await close(p)
  for width in [320,768,1440]:
   await p.set_viewport_size({'width':width,'height':950});check('Discovery layout fits '+str(width)+'px',await p.evaluate('document.documentElement.scrollWidth<=innerWidth'))
  check('No uncaught preview JavaScript errors',not errors)
  await b.close()
result={'scope':__doc__}
try:asyncio.run(main())
except Exception as e:result['error']=str(e);raise
finally:
 result.update(total=len(report),passed=sum(r['pass'] for r in report),checks=report);(ROOT/'evidence/preview-checks.json').write_text(json.dumps(result,indent=2));print(result.get('passed'),result.get('total'))

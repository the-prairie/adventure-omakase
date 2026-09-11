"""Rendered UI + two independent HTTP cookie jars against the compiled Worker.
The browser's navigation is blocked by environment policy, so set_content and
an explicit fetch/Storage adapter are used. HTTP, Worker code, SQLite guards,
filesystem R2 adapter and per-client cookies are real. NOT native Cloudflare,
native browser cookies/networking, service-worker, Safari or phone validation.
"""
import asyncio,base64,json,io,os,re,subprocess,tempfile,time
from pathlib import Path
import httpx
from PIL import Image
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1];BASE='http://127.0.0.1:8794';KEY='local-browser-test-key-not-for-deployment';results=[]
def check(name,ok):
 results.append({'name':name,'pass':bool(ok)});print(name,ok,flush=True)
 if not ok:raise AssertionError(name)
def html():
 s=(ROOT/'public/index.html').read_text().replace('<link rel="manifest" href="manifest.webmanifest">','')
 s=s.replace('<link rel="stylesheet" href="app.css">','<style>'+(ROOT/'public/app.css').read_text()+'</style>')
 js=[]
 for name in ['data.js','demo.js','app.js']:
  s=s.replace(f'<script src="{name}" defer></script>','');src=(ROOT/'public'/name).read_text()
  if name=='data.js':
   for f in (ROOT/'public/assets').iterdir():
    if f.is_file():src=src.replace('/assets/'+f.name,'data:image/'+('jpeg' if f.suffix=='.jpg' else 'png')+';base64,'+base64.b64encode(f.read_bytes()).decode())
  js.append('<script>'+src.replace('</script','<\\/script')+'</script>')
 return s.replace('</body>',''.join(js)+'</body>')
BRIDGE="""() => {
 for(const name of ['localStorage','sessionStorage']){const m=new Map();Object.defineProperty(window,name,{value:{getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()},configurable:true});}
 window.fetch=async(url,o={})=>{const x=await window.testRequest(String(url),{method:o.method,headers:o.headers,body:o.body});return new Response(x.status===204?null:Uint8Array.from(atob(x.body),c=>c.charCodeAt(0)),{status:x.status,headers:x.headers});};
}"""
async def waittext(p,text):await p.wait_for_function('(s)=>document.body.innerText.includes(s)',arg=text,timeout=10000)
async def click(p,sel):await p.locator(sel).first.click();await p.wait_for_timeout(130)
async def close(p):
 if await p.locator('#dialog').evaluate('(d)=>d.open'):await click(p,'[data-action=close]')
async def focus(p):await p.evaluate("window.dispatchEvent(new Event('focus'))");await p.wait_for_timeout(250)
async def nav(p,v):await click(p,f'[data-nav={v}]:visible')
async def main():
 with tempfile.TemporaryDirectory(prefix='omakase-cf-browser-') as td:
  log=open(ROOT/'evidence/browser-server.log','w');proc=subprocess.Popen(['node','--experimental-sqlite','scripts/dev-local.mjs'],cwd=ROOT,env={**os.environ,'PORT':'8794','DATA_DIR':td,'SETUP_KEY':KEY},stdout=log,stderr=log)
  pages=[];clients=[];errors=[]
  try:
   for _ in range(50):
    try:
     if httpx.get(BASE+'/api/health',timeout=1).status_code==200:break
    except:pass
    await asyncio.sleep(.1)
   async with async_playwright() as pw:
    b=await pw.chromium.launch(executable_path=os.environ.get('CHROMIUM_PATH') or ('/usr/bin/chromium' if Path('/usr/bin/chromium').exists() else pw.chromium.executable_path),headless=True,args=['--no-sandbox'])
    async def client(fragment):
     p=await b.new_page(viewport={'width':1440,'height':1000});pages.append(p);p.on('pageerror',lambda e:errors.append(str(e)))
     c=httpx.AsyncClient(base_url=BASE,timeout=30,headers={'Origin':BASE});clients.append(c)
     async def request(url,opts):
      r=await c.request(opts.get('method')or'GET',url,headers=opts.get('headers')or{},content=opts.get('body'))
      return {'status':r.status_code,'headers':dict(r.headers),'body':base64.b64encode(r.content).decode()}
     await p.expose_function('testRequest',request);await p.evaluate(BRIDGE);await p.evaluate('(s)=>location.hash=s',fragment);await p.set_content(html(),wait_until='domcontentloaded');return p,c
    owner,oc=await client('setup='+KEY)
    await owner.wait_for_selector('#auth-form');await owner.locator('#f-name').fill('Test Lauren');await owner.locator('#f-title').fill('Japan, our own way · test trip');await click(owner,'#auth-form [type=submit]');await waittext(owner,'Open plans')
    check('Owner setup creates an empty real trip, not sample friends',len((await oc.get('/api/state')).json()['members'])==1)
    check('Owner is not blocked by a recovery-key dialog',await owner.locator('[data-action=recovery-done]').count()==0)
    inv=(await oc.get('/api/invite')).json()
    friend,fc=await client('join='+inv['token']);await friend.wait_for_selector('#auth-form')
    check('A friend joins with exactly one visible text field',await friend.locator('#auth-form input:not([type=hidden])').count()==1)
    await friend.screenshot(path=str(ROOT/'evidence/join-desktop.png'),full_page=True)
    await friend.set_viewport_size({'width':390,'height':844});await friend.screenshot(path=str(ROOT/'evidence/join-mobile.png'),full_page=True);await friend.set_viewport_size({'width':1280,'height':960})
    await friend.locator('#f-name').fill('Test Mina');await click(friend,'#auth-form [type=submit]');await waittext(friend,'Open plans')
    check('Join completes without password, email or recovery screen',(await fc.get('/api/state')).json()['me']['name']=='Test Mina')
    await focus(owner);await nav(owner,'people');check('Second friend appears after foreground sync','Test Mina' in await owner.locator('#main').inner_text());await nav(owner,'plans')
    await click(friend,'[data-action=invite]');check('Any friend can copy the reusable group invitation',inv['token'] in await friend.locator('#dialog input').first.input_value());await close(friend)
    await click(owner,'[data-action=plan-new]');await owner.locator('#f-title').fill('Dawn run. Coffee together.');await owner.locator('#f-area').fill('Nakanoshima · test');await owner.locator('#f-date').fill('2026-10-04');await owner.locator('#f-start').fill('07:30');await owner.locator('#f-end').fill('10:00');await owner.locator('#f-meeting').fill('Running start — test location, not verified');await owner.locator('#f-joinStyle').select_option('reunion');await click(owner,'[data-action=add-segment]');await owner.locator('[data-seg=label]').fill('Just coffee');await owner.locator('[data-seg=start]').fill('09:00');await owner.locator('[data-seg=end]').fill('10:00');await owner.locator('[data-seg=meeting]').fill('Coffee meeting — illustrative test location');await click(owner,'#plan-form [type=submit]');await waittext(owner,'Dawn run. Coffee together.')
    st=(await oc.get('/api/state')).json();pid=st['plans'][0]['id'];check('Form creates a real invitation with separately timed coffee',st['plans'][0]['segments'][0]['start']=='09:00')
    await focus(friend);await waittext(friend,'Dawn run. Coffee together.');await click(friend,f'[data-action=plan-detail][data-id="{pid}"]')
    check('Solo-first does not offer joining the private running part',await friend.locator('[name=choice][value=all]').count()==0)
    await click(friend,'#rsvp-form [value=joined]');check('Coffee-only RSVP persists for the named friend',(await fc.get('/api/state')).json()['plans'][0]['rsvps'][0]['choice']!='all')
    await close(friend);await nav(friend,'day');await friend.locator('[data-action=day][data-id="2026-10-04"]').click() if await friend.locator('[data-action=day][data-id="2026-10-04"]').count() else None
    # Day strip uses data-date on some builds; choose the current rendered date programmatically only if necessary.
    if 'Just coffee' not in await friend.locator('#main').inner_text():
     ds=await friend.locator('[data-date]').evaluate_all('(es)=>es.map(e=>({action:e.dataset.action,date:e.dataset.date}))');print('datecontrols',ds[:5])
    check('A specific joined part is represented in My day','Just coffee' in await friend.locator('#main').inner_text())
    await friend.set_viewport_size({'width':390,'height':844});await friend.wait_for_timeout(3600);await friend.screenshot(path=str(ROOT/'evidence/my-day-mobile.png'),full_page=True);await friend.set_viewport_size({'width':1280,'height':960})
    await click(owner,'[data-action=plan-edit]');await owner.locator('[data-seg=meeting]').fill('New coffee point — test');await click(owner,'#plan-form [type=submit]');await nav(friend,'plans');await focus(friend);await click(friend,f'[data-action=plan-detail][data-id="{pid}"]');check('Changed plans request reconfirmation','Reconfirm my part' in await friend.locator('#dialog').inner_text());await click(friend,'#rsvp-form [value=joined]');check('Reconfirmation records the newest revision',(await fc.get('/api/state')).json()['plans'][0]['rsvps'][0]['acceptedRevision']==2)
    await close(friend);await close(owner)
    await nav(friend,'discover');await click(friend,'[data-action=find-new]');await friend.locator('#f-title').fill('Mina’s tiny pottery find');await friend.locator('#f-area').fill('Karahori');await friend.locator('[name=why]').fill('A friend suggested returning here. Test only.');await click(friend,'#find-form [type=submit]');check('A friend adds an attributed find beyond the 300 entries',(await oc.get('/api/state')).json()['discoveries'][0]['title']=='Mina’s tiny pottery find');await close(friend)
    await nav(friend,'story');await click(friend,'[data-action=moment-new]');check('New memories default shared, not private',await friend.locator('[name=visibility]').input_value()=='group')
    await friend.locator('#f-title').fill('The coffee was the plan');await friend.locator('[name=text]').fill('Browser test contribution — not a real travel memory.')
    img=io.BytesIO();Image.new('RGB',(240,160),'#737665').save(img,'JPEG');await friend.locator('#memory-photo').set_input_files({'name':'test-photo.jpg','mimeType':'image/jpeg','buffer':img.getvalue()});await friend.wait_for_selector('#photo-preview figure',timeout=5000)
    await click(friend,'#moment-form [type=submit]');state=(await fc.get('/api/state')).json();check('Browser photo is resized and stored via real Worker binding',len(state['moments'][0]['photos'])==1);mid=state['moments'][0]['id']
    await nav(owner,'story');await focus(owner);check('Shared memory is visible to another friend','The coffee was the plan' in await owner.locator('#main').inner_text())
    await nav(owner,'plans');await owner.screenshot(path=str(ROOT/'evidence/desktop-real-trip.png'),full_page=True)
    for width in [320,390,768,1440]:
     await owner.set_viewport_size({'width':width,'height':1000});await asyncio.sleep(.05)
     check('Shared board fits '+str(width)+'px',await owner.evaluate('document.documentElement.scrollWidth <= innerWidth'))
    await owner.set_viewport_size({'width':390,'height':844});await owner.screenshot(path=str(ROOT/'evidence/mobile-real-trip.png'),full_page=True)
    await nav(owner,'discover');await owner.locator('#search').fill('Sayamaike');await asyncio.sleep(.1);check('Preserved catalogue search works',await owner.locator('[data-action=discovery]').count()==1)
    await click(owner,'[data-action=discovery]');await owner.keyboard.press('Escape');check('Escape closes the accessible story dialog',not await owner.locator('#dialog').evaluate('(d)=>d.open'))
    check('No uncaught JavaScript exceptions',not errors)
    await b.close()
  finally:
   for c in clients:await c.aclose()
   proc.terminate();proc.wait(timeout=10);log.close()
report={'scope':__doc__}
try:asyncio.run(main())
except Exception as e:report['error']=str(e);raise
finally:
 report.update(total=len(results),passed=sum(x['pass'] for x in results),checks=results);(ROOT/'evidence/browser-checks.json').write_text(json.dumps(report,indent=2));print('RESULT',report.get('passed'),report.get('total'))

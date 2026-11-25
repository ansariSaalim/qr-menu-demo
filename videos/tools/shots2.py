from playwright.sync_api import sync_playwright
import json
APP="file:///home/claude/qr-menu-demo/app/index.html"
react=open('/tmp/rbuild/react-umd.js').read(); htm=open('/tmp/rbuild/htm-mini.js').read(); mock=open('/tmp/vid2/mock3.js').read()
FONTCSS="*{font-family:Inter,'Noto Color Emoji',FreeSans,FreeSerif,sans-serif!important} .toasts,#install-bn,#sound-hint,.live-bn{display:none!important}"
def handler(r):
    u=r.request.url
    if "react.production" in u: return r.fulfill(body=react, content_type="application/javascript")
    if "react-dom" in u: return r.fulfill(body="", content_type="application/javascript")
    if "htm.umd" in u: return r.fulfill(body=htm, content_type="application/javascript")
    if "qrcode" in u: return r.fulfill(body="window.qrcode=function(){return {addData(){},make(){},getModuleCount(){return 25},isDark(r,c){return ((r*7+c*13)%5)<2 || (r<7&&c<7) || (r<7&&c>17) || (r>17&&c<7)}}};", content_type="application/javascript")
    if u.startswith("file://"): return r.continue_()
    return r.abort()
SESS="localStorage.setItem('zestro-session', JSON.stringify({token:'00000000-0000-0000-0000-000000000000',rid:'demo-kitchen',role:'Owner',name:'Saalim',restaurant:{id:'demo-kitchen',name:'Demo Kitchen',plan:'pro'}}));"
def new(b, vp, dpr, init=''):
    c=b.new_context(viewport={'width':vp[0],'height':vp[1]}, device_scale_factor=dpr, geolocation={'latitude':23.0402,'longitude':72.5868}, permissions=['geolocation'])
    c.route("**/*",handler); c.add_init_script("localStorage.setItem('mm-theme','light');"+init); c.add_init_script(mock); return c
def go(c, url):
    pg=c.new_page(); e=[]; pg.on("pageerror",lambda x:e.append(str(x))); pg.goto(APP+url); pg.wait_for_timeout(1800); pg.add_style_tag(content=FONTCSS); pg.wait_for_timeout(200); return pg,e
O='/tmp/vid2/'
with sync_playwright() as p:
    b=p.chromium.launch()
    for lang in ['en','hi','gu','ta']:
        c=new(b,(390,800),3,"localStorage.setItem('zo-demo-kitchen', JSON.stringify({lang:'%s'}));"%lang); pg,e=go(c,"#o=demo-kitchen")
        pg.screenshot(path=O+f'p_{lang}.png')
        if lang=='gu': pg.evaluate("scrollTo(0,520)"); pg.wait_for_timeout(500); pg.screenshot(path=O+'p_gu2.png')
        if lang=='en':
            pg.locator("#ol-lang").click(); pg.wait_for_timeout(300); pg.screenshot(path=O+'p_langs.png'); pg.locator("#ol-lang").click(); pg.wait_for_timeout(200)
            pg.evaluate("scrollTo(0,330)"); pg.wait_for_timeout(300)
            for i in [0,4]: pg.locator(".ol-add").nth(i).click(); pg.wait_for_timeout(120)
            pg.locator(".ol-item", has_text="Butter Naan").locator(".ol-add").click(); pg.wait_for_timeout(100)
            pg.locator(".ol-item", has_text="Butter Naan").locator(".ol-q button").nth(1).click(); pg.locator(".ol-item", has_text="Butter Naan").locator(".ol-q button").nth(1).click()
            pg.wait_for_timeout(400); pg.screenshot(path=O+'p_added.png')
            pg.locator("#ol-cartbar").click(); pg.wait_for_timeout(600); pg.screenshot(path=O+'p_cart.png')
            pg.fill("#ol-name","Neha Shah"); pg.fill("#ol-phone","9824011223"); pg.fill("#ol-addr","B-12, Shanti Park, near Lal Darwaja")
            pg.locator("#ol-loc").click(); pg.wait_for_timeout(900)
            pg.evaluate("const sh=document.getElementById('ol-sheet'); sh.scrollTop=document.getElementById('ol-near').offsetTop-330"); pg.wait_for_timeout(300); pg.screenshot(path=O+'p_cart2.png')
            pg.evaluate("const sh=document.getElementById('ol-sheet'); sh.scrollTop=document.getElementById('ol-upibox').offsetTop-140"); pg.wait_for_timeout(300); pg.screenshot(path=O+'p_upi.png')
            pg.locator("#ol-paid").check(); pg.locator("#ol-place").click(); pg.wait_for_timeout(1200); pg.screenshot(path=O+'p_done.png')
        print(lang, e); c.close()
    c=new(b,(1280,900),2,SESS+"localStorage.setItem('zestro-open-tab', JSON.stringify('orders'));"); pg,e=go(c,"#app"); pg.wait_for_timeout(400); pg.screenshot(path=O+'d_web.png'); print('desk',e); c.close()
    c=new(b,(390,800),3,SESS+"localStorage.setItem('zestro-open-tab', JSON.stringify('orders'));"); pg,e=go(c,"#app"); pg.evaluate("const h=document.querySelector('.otop').getBoundingClientRect().height; const el=document.querySelector('.colswitch'); scrollTo(0, el.getBoundingClientRect().top + scrollY - h - 10)"); pg.wait_for_timeout(300); pg.screenshot(path=O+'m_web.png'); print('mob',e); c.close()
    b.close()

from playwright.sync_api import sync_playwright
import json
APP="file:///home/claude/qr-menu-demo/app/index.html"
react=open('/tmp/rbuild/react-umd.js').read(); htm=open('/tmp/rbuild/htm-mini.js').read(); mock=open('/tmp/vid/mock2.js').read()
FONTCSS="@font-face{font-family:'Google Sans Flex';src:local('Inter');}"
def handler(r):
    u=r.request.url
    if "react.production" in u: return r.fulfill(body=react, content_type="application/javascript")
    if "react-dom" in u: return r.fulfill(body="", content_type="application/javascript")
    if "htm.umd" in u: return r.fulfill(body=htm, content_type="application/javascript")
    if "qrcode" in u: return r.fulfill(body="window.qrcode=function(){return {addData(){},make(){},createSvgTag(){return '<svg></svg>'},createDataURL(){return ''},getModuleCount(){return 21},isDark(){return false}}};", content_type="application/javascript")
    if u.startswith("file://"): return r.continue_()
    return r.abort()
SESS="localStorage.setItem('zestro-session', JSON.stringify({token:'00000000-0000-0000-0000-000000000000',rid:'demo-kitchen',role:'Owner',name:'Saalim',restaurant:{id:'demo-kitchen',name:'Demo Kitchen'}}));"
THEME={"brand":"#c8102e","accent":"#ffd60a","tagline":"Crunch you can hear. Taste you'll remember."}
def shot(b, name, vp, dpr, init, url, prep=None):
    c=b.new_context(viewport={'width':vp[0],'height':vp[1]}, device_scale_factor=dpr); c.route("**/*",handler)
    c.add_init_script("localStorage.setItem('mm-theme','light');"+init); c.add_init_script(mock)
    pg=c.new_page(); e=[]; pg.on("pageerror",lambda x:e.append(str(x)))
    pg.goto(APP+url); pg.wait_for_timeout(2200)
    pg.add_style_tag(content="*{font-family:Inter,system-ui,sans-serif!important} .tour,.toast,#toasts,.live-bn{display:none!important}")
    if prep: prep(pg)
    pg.wait_for_timeout(500); pg.screenshot(path=f"/tmp/vid/{name}.png"); print(name, "errors:", e); c.close()
def look(pg):
    pg.locator(".theme-sw", has_text="Crimson").click(); pg.wait_for_timeout(200)
    pg.locator("#menu-look input[maxlength='60']").fill(THEME["tagline"]); pg.wait_for_timeout(300)
    pg.evaluate("document.getElementById('menu-look').scrollIntoView({block:'start'}); window.scrollBy(0,-90)")
def lookm(pg):
    look(pg); pg.evaluate("window.scrollBy(0,40)")
with sync_playwright() as p:
    b=p.chromium.launch()
    th="localStorage.setItem('__theme',"+json.dumps(json.dumps(THEME))+");"
    # desktop
    shot(b,"d_orders",(1280,900),2,SESS+"localStorage.setItem('zestro-open-tab', JSON.stringify('orders'));","#app")
    shot(b,"d_look",(1280,900),2,SESS+"localStorage.setItem('zestro-open-tab', JSON.stringify('settings'));","#app",look)
    shot(b,"d_menu",(1280,900),2,th,"#t=demo-kitchen-5")
    # mobile
    shot(b,"m_orders",(390,800),3,SESS+"localStorage.setItem('zestro-open-tab', JSON.stringify('orders'));","#app")
    shot(b,"m_look",(390,800),3,SESS+"localStorage.setItem('zestro-open-tab', JSON.stringify('settings'));","#app",lookm)
    shot(b,"m_menu",(390,800),3,th,"#t=demo-kitchen-5")
    COOK="localStorage.setItem('zestro-session', JSON.stringify({token:'00000000-0000-0000-0000-000000000000',rid:'demo-kitchen',role:'Kitchen',name:'Ravi',staff_id:'st4',restaurant:{id:'demo-kitchen',name:'Demo Kitchen'}}));"
    SET=SESS+"localStorage.setItem('zestro-open-tab', JSON.stringify('settings'));"
    safe=lambda pg: pg.evaluate("document.getElementById('qr-safety').scrollIntoView({block:'start'}); window.scrollBy(0,-120)")
    safe2=lambda pg: pg.evaluate("document.getElementById('qr-safety').scrollIntoView({block:'start'}); window.scrollBy(0,330)")
    shot(b,"d_station",(1280,900),2,COOK,"#app")
    shot(b,"m_station",(390,800),3,COOK,"#app")
    shot(b,"d_safety",(1280,900),2,SET,"#app",safe)
    shot(b,"m_safety",(390,800),3,SET,"#app",lambda pg: pg.evaluate("document.getElementById('qr-safety').scrollIntoView({block:'start'}); window.scrollBy(0,-70)"))
    shot(b,"m_safety2",(390,800),3,SET,"#app",lambda pg: pg.evaluate("document.getElementById('qr-safety').scrollIntoView({block:'start'}); window.scrollBy(0,420)"))
    b.close()

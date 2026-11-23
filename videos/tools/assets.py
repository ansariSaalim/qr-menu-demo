import sys; sys.path.insert(0,'/tmp/vid')
from cap import render_caption
from endcard import end_html
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
A='/tmp/vid/assets/'
DCFG=dict(ls=17.5,lsp=0.08,gap=42,ts=41,tsp=-0.03,tlh=41,tm=12,bs=20.5,blh=29.2,bm=24)
MCFG=dict(ls=19,lsp=0.06,gap=36,ts=43.4,tsp=-0.03,tlh=46,tm=10,bs=21.6,blh=30.5,bm=26)
caps={
 's05':('STEP 05 / 28','THE DINER',['One code, first order','only'],['One code, first order only'],"The first order from a table needs a 4-digit code on WhatsApp, so a photo of the QR can’t send fake orders."),
 's11':('STEP 11 / 28','THE RESTAURANT',['Your menu, your','colours'],['Your menu, your colours'],"Pick a colour theme, add your logo, cover photo and a tagline. Diners see your brand the moment they scan the QR."),
}
NEW_END=dict(days=7,basic='₹6,999',pro='₹8,999',pro_desc='adds stock, profit, partners &amp; loyalty',
  setup_line='No hardware &nbsp;·&nbsp; no commission &nbsp;·&nbsp; on-site setup ₹999', url='ansarisaalim.github.io/qr-menu-demo')
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':1280,'height':720})
    for k,(lab,sec,td,tm,body) in caps.items():
        render_caption(pg,A+f'cap_{k}_d.png',lab,sec,td,body,top=177,x=63,body_w=400,cfg=DCFG)
    pg.close(); pg=b.new_page(viewport={'width':720,'height':1280})
    for k,(lab,sec,td,tm,body) in caps.items():
        render_caption(pg,A+f'cap_{k}_m.png',lab,sec,tm,body,W=720,H=1280,x=43,top=80,body_w=645,cfg=MCFG)
    pg.close()
    for o in ('d','m'):
        h,W,H=end_html(o,**NEW_END)
        pg=b.new_page(viewport={'width':W,'height':H}); pg.set_content(h); pg.wait_for_timeout(150); pg.screenshot(path=A+f'end_{o}.png',omit_background=True); pg.close()
    b.close()

# ---------- screen content crops ----------
TEAL=(20,180,145,255)
def rr_mask(w,h,r_bottom):
    m=Image.new('L',(w,h),0); d=ImageDraw.Draw(m)
    d.rounded_rectangle((0,-r_bottom-2,w-1,h-1),radius=r_bottom,fill=255); return m
def dcrop(name, css_box, hl=None):
    im=Image.open(f'/tmp/vid/{name}.png').convert('RGBA')
    x0,y0,x1,y1=[v*2 for v in css_box]
    c=im.crop((x0,y0,x1,y1)).resize((704,491),Image.LANCZOS)
    if hl:
        d=ImageDraw.Draw(c); sx=704/((x1-x0)/2)
        for (a,b_,c_,d_) in hl: d.rounded_rectangle(((a-css_box[0])*sx,(b_-css_box[1])*sx,(c_-css_box[0])*sx,(d_-css_box[1])*sx),radius=10,outline=TEAL,width=3)
    c.putalpha(rr_mask(704,491,12)); return c
def mcrop(name, hl=None):
    im=Image.open(f'/tmp/vid/{name}.png').convert('RGBA')
    W=432; s=W/1170; H=802
    c=im.resize((W,round(2400*s)),Image.LANCZOS).crop((0,0,W,H))
    if hl:
        d=ImageDraw.Draw(c); k=W/390
        for (a,b_,c_,d_) in hl: d.rounded_rectangle((a*k,b_*k,c_*k,d_*k),radius=12,outline=TEAL,width=3)
    c.putalpha(rr_mask(W,H,40)); return c
D={'s09a':dcrop('d_orders',(0,0,1280,893)),'s09b':dcrop('d_orders',(150,55,790,502)),
   's11a':dcrop('d_look',(175,40,815,487),hl=[(296,152,1225,272)][:0] or None),'s11b':dcrop('d_menu',(30,40,1030,738)),
   's23a':dcrop('d_station',(0,0,1280,893)),'s23b':dcrop('d_station',(130,40,770,487)),
   's28a':dcrop('d_safety',(0,0,1280,893)),'s28b':dcrop('d_safety',(280,60,1240,730))}
M={'s09':mcrop('m_orders'),'s11a':mcrop('m_look'),'s11b':mcrop('m_menu'),'s23':mcrop('m_station'),'s28a':mcrop('m_safety'),'s28b':mcrop('m_safety2')}
for k,v in D.items(): v.save(A+f'scr_{k}_d.png')
for k,v in M.items(): v.save(A+f'scr_{k}_m.png')
print('ok')

import sys; sys.path.insert(0,'/tmp/vid'); sys.path.insert(0,'/tmp/vid2')
from cap import render_caption
from endcard2 import end_html
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFilter
A='/tmp/vid2/assets/'; import os; os.makedirs(A, exist_ok=True)
DCFG=dict(ls=17.5,lsp=0.08,gap=42,ts=41,tsp=-0.03,tlh=41,tm=12,bs=20.5,blh=29.2,bm=24)
MCFG=dict(ls=19,lsp=0.06,gap=36,ts=43.4,tsp=-0.03,tlh=46,tm=10,bs=21.6,blh=30.5,bm=26)
caps={
 's26':('STEP 26 / 28','THE RESTAURANT',['Online orders,','no commission'],['Online orders, no commission'],"Your own link for delivery and pickup. Distance checked on a map, UPI or cash. Orders ring on the kitchen screen."),
 's27':('STEP 27 / 28','THE RESTAURANT',['Your menu in','their language'],['Your menu in their language'],"Hindi, Gujarati, Tamil and 6 more. One tap switches the whole ordering page, dish names too."),
}
PLANS=[('Order Link','₹6,499 first year, then ₹1,499','small outlets: online orders, menu set up by us'),
       ('Basic','₹6,999 a year','cafés: billing, tables, QR ordering, kitchen screen'),
       ('Pro','₹8,999 a year','family restaurants: + online orders, stock, profit')]
END=dict(days=7, plans=PLANS, setup_line='No hardware &nbsp;·&nbsp; no commission &nbsp;·&nbsp; on-site setup ₹999', url='ansarisaalim.github.io/qr-menu-demo')
with sync_playwright() as p:
    b=p.chromium.launch()
    pg=b.new_page(viewport={'width':1280,'height':720})
    for k,(lab,sec,td,tm,body) in caps.items(): render_caption(pg,A+f'cap_{k}_d.png',lab,sec,td,body,top=177,x=63,body_w=400,cfg=DCFG)
    pg.close(); pg=b.new_page(viewport={'width':720,'height':1280})
    for k,(lab,sec,td,tm,body) in caps.items(): render_caption(pg,A+f'cap_{k}_m.png',lab,sec,tm,body,W=720,H=1280,x=43,top=80,body_w=645,cfg=MCFG)
    pg.close()
    for o in ('d','m'):
        h,W,H=end_html(o,**END)
        pg=b.new_page(viewport={'width':W,'height':H}); pg.set_content(h); pg.wait_for_timeout(150); pg.screenshot(path=A+f'end_{o}.png',omit_background=True); pg.close()
    b.close()
def rr_mask(w,h,r_bottom):
    m=Image.new('L',(w,h),0); d=ImageDraw.Draw(m); d.rounded_rectangle((0,-r_bottom-2,w-1,h-1),radius=r_bottom,fill=255); return m
def dcrop(path, css_box):
    im=Image.open(path).convert('RGBA'); x0,y0,x1,y1=[v*2 for v in css_box]
    c=im.crop((x0,y0,x1,y1)).resize((704,491),Image.LANCZOS); c.putalpha(rr_mask(704,491,12)); return c
def mcrop(path):
    im=Image.open(path).convert('RGBA'); W=432; s=W/1170; H=802
    c=im.resize((W,round(2400*s)),Image.LANCZOS).crop((0,0,W,H)); c.putalpha(rr_mask(W,H,40)); return c
def phone(path, h):
    sc=Image.open(path).convert('RGB'); w=round(h*390/800)
    sc=sc.resize((w,h),Image.LANCZOS)
    bez=7; R=26; W2,H2=w+2*bez,h+2*bez
    f=Image.new('RGBA',(W2,H2),(0,0,0,0)); d=ImageDraw.Draw(f); d.rounded_rectangle((0,0,W2-1,H2-1),radius=R+bez,fill=(18,18,20,255))
    m=Image.new('L',(w,h),0); ImageDraw.Draw(m).rounded_rectangle((0,0,w-1,h-1),radius=R,fill=255)
    f.paste(sc,(bez,bez),m)
    d.rounded_rectangle((W2//2-34,bez+7,W2//2+34,bez+21),radius=7,fill=(18,18,20,255))
    return f
def duo(paths):
    can=Image.new('RGBA',(704,491),(243,244,241,255)); d=ImageDraw.Draw(can)
    for y in range(491): d.line([(0,y),(703,y)],fill=(int(246-6*y/491),int(247-5*y/491),int(244-6*y/491),255))
    ph=[phone(p_,452) for p_ in paths]; gap=46; tot=sum(x.width for x in ph)+gap*(len(ph)-1); x=(704-tot)//2; y=(491-ph[0].height)//2+2
    for f in ph:
        sh=Image.new('RGBA',(704,491),(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((x+4,y+10,x+f.width+4,y+f.height+10),radius=34,fill=(0,0,0,70)); sh=sh.filter(ImageFilter.GaussianBlur(10))
        can=Image.alpha_composite(can,sh); can.alpha_composite(f,(x,y)); x+=f.width+gap
    can.putalpha(rr_mask(704,491,12)); return can
P='/tmp/vid2/'
D={'s26a':duo([P+'p_cart2.png',P+'p_done.png']),'s26b':dcrop(P+'d_web.png',(255,410,935,884)),'s27a':duo([P+'p_en.png',P+'p_hi.png']),'s27b':duo([P+'p_gu2.png',P+'p_ta.png'])}
M={'s26a':mcrop(P+'p_cart2.png'),'s26b':mcrop(P+'m_web.png'),'s27a':mcrop(P+'p_langs.png'),'s27b':mcrop(P+'p_hi.png')}
for k,v in D.items(): v.save(A+f'scr_{k}_d.png')
for k,v in M.items(): v.save(A+f'scr_{k}_m.png')
print('ok')

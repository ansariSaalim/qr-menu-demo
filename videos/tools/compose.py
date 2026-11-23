import cv2, numpy as np, subprocess, sys
from PIL import Image
O=sys.argv[1]  # 'd' or 'm'
SRC=f"/home/claude/qr-menu-demo/videos/demo-{'desktop' if O=='d' else 'mobile'}.mp4"
OUT=f"/tmp/vid/out_{O}.mp4"
A='/tmp/vid/assets/'
def rgba(p):
    a=np.array(Image.open(p).convert('RGBA')).astype(np.float32); return a[:,:,[2,1,0]], a[:,:,3:4]/255.0
cap_s05=rgba(A+f'cap_s05_{O}.png'); cap_s11=rgba(A+f'cap_s11_{O}.png'); endp=rgba(A+f'end_{O}.png')
scr={k:rgba(A+f'scr_{k}_{O}.png') for k in (['s09a','s09b','s11a','s11b','s23a','s23b','s28a','s28b'] if O=='d' else ['s09','s11a','s11b','s23','s28a','s28b'])}
if O=='d':
    CAP=(40,168,505,445); SCR=(512,112); END=(95,236,848,706); BGPT=(20,160)
    TPL_SRC=('/tmp/vf/d_s05.png',(817,551,914,568)); WA_R=52; PER=(90,95); SEARCH=(700,380,1060,700)
    ev_scr=[('s09a',60.0,62.25),('s09b',62.05,65.95),('s11a',72.02,75.1),('s11b',74.9,77.95),('s23a',144.02,146.0),('s23b',145.8,149.95),('s28a',174.02,176.0),('s28b',175.8,179.95)]
else:
    CAP=(25,70,705,300); SCR=(144,408); END=(28,452,702,950); BGPT=(15,60)
    TPL_SRC=('/tmp/vf/m_36.png',(262,1054,404,1074)); WA_R=76; PER=(133,139); SEARCH=(140,700,580,1215)
    ev_scr=[('s09',60.0,65.95),('s11a',72.02,75.1),('s11b',74.9,77.95),('s23',144.02,149.95),('s28a',174.02,177.0),('s28b',176.8,179.95)]
ev_cap=[(cap_s05,33.02,38.95),(cap_s11,72.02,77.95)]
tpl=cv2.cvtColor(cv2.imread(TPL_SRC[0])[TPL_SRC[1][1]:TPL_SRC[1][3],TPL_SRC[1][0]:TPL_SRC[1][2]],cv2.COLOR_BGR2GRAY)
th,tw=tpl.shape
def ramp(t,t0,t1,r=0.1):
    if t<t0 or t>t1: return 0.0
    return min(1.0,(t-t0)/r,(t1-t)/r)
def over(fr,img,a,x,y,alpha):
    h,w=img.shape[:2]; reg=fr[y:y+h,x:x+w]
    k=a*alpha; reg[:]=reg*(1-k)+img*k
cap=cv2.VideoCapture(SRC); fps=cap.get(5); W=int(cap.get(3)); H=int(cap.get(4))
enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r','30','-i','-','-i',SRC,
    '-map','0:v','-map','1:a','-c:v','libx264','-preset','medium','-crf','24','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart','-shortest',OUT],stdin=subprocess.PIPE)
i=0; notes=0
while True:
    ok,fr=cap.read()
    if not ok: break
    t=i/30.0; f=fr.astype(np.float32)
    # step 5 phone note: "WhatsApp or SMS." -> "WhatsApp."
    if 33.0<=t<=39.6:
        x0,y0,x1,y1=SEARCH; g=cv2.cvtColor(fr[y0:y1,x0:x1],cv2.COLOR_BGR2GRAY)
        res=cv2.matchTemplate(g,tpl,cv2.TM_CCOEFF_NORMED); _,mx,_,ml=cv2.minMaxLoc(res)
        if mx>0.8:
            mxp,myp=x0+ml[0],y0+ml[1]; notes+=1
            per=f[myp:myp+th,mxp+PER[0]:mxp+PER[1]].copy()
            col=np.median(f[myp+2:myp+th-2,mxp+tw+4:mxp+tw+10].reshape(-1,3),axis=0)
            f[myp:myp+th,mxp+WA_R+1:mxp+tw+3]=col
            f[myp:myp+th,mxp+WA_R+1:mxp+WA_R+1+per.shape[1]]=per
    # captions
    for (img,a),t0,t1 in ev_cap:
        al=ramp(t,t0,t1)
        if al>0:
            bx=f[BGPT[1]-3:BGPT[1]+3,BGPT[0]-3:BGPT[0]+3].reshape(-1,3).mean(0)
            x0,y0,x1,y1=CAP; f[y0:y1,x0:x1]=f[y0:y1,x0:x1]*(1-al)+bx*al
            over(f,img,a,0,0,al)
    # screens
    for k,t0,t1 in ev_scr:
        al=ramp(t,t0,t1)
        if al>0: img,a=scr[k]; over(f,img,a,SCR[0],SCR[1],al)
    # end card
    if t>=180.0:
        bx=f[BGPT[1]-3:BGPT[1]+3,BGPT[0]-3:BGPT[0]+3].reshape(-1,3).mean(0)
        x0,y0,x1,y1=END; f[y0:y1,x0:x1]=bx
        img,a=endp; over(f,img,a,0,0,min(1.0,max(0.0,(t-180.3)/0.6)))
    enc.stdin.write(np.clip(f,0,255).astype(np.uint8).tobytes()); i+=1
enc.stdin.close(); enc.wait(); print(O,'frames',i,'note patches',notes)

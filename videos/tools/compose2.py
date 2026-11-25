# Patches steps 26-27 (online orders, languages) and the end card (three plans) onto the current demo videos.
import cv2, numpy as np, subprocess, sys
from PIL import Image
O=sys.argv[1]  # 'd' or 'm'
# Patch the videos as they were before this update (git show 1699159:videos/demo-desktop.mp4 > /tmp/vid2/src_d.mp4),
# so a re-run never encodes the same scenes twice
SRC=f"/tmp/vid2/src_{O}.mp4"
OUT=f"/tmp/vid2/out_{O}.mp4"
A='/tmp/vid2/assets/'
def rgba(p):
    a=np.array(Image.open(p).convert('RGBA')).astype(np.float32); return a[:,:,[2,1,0]], a[:,:,3:4]/255.0
caps={k:rgba(A+f'cap_{k}_{O}.png') for k in ('s26','s27')}
scr={k:rgba(A+f'scr_{k}_{O}.png') for k in ('s26a','s26b','s27a','s27b')}
endp=rgba(A+f'end_{O}.png')
if O=='d': CAP=(40,168,505,445); SCR=(512,112); END=(95,206,848,706); BGPT=(20,160)
else:      CAP=(25,70,705,300); SCR=(144,408); END=(28,452,702,1010); BGPT=(15,60)
T26,T27,T28,TE=161.75,167.72,173.72,179.75
ev_cap=[('s26',T26,T27+0.03),('s27',T27,T28)]
ev_scr=[('s26a',T26,T26+3.0),('s26b',T26+2.85,T27+0.03),('s27a',T27,T27+3.0),('s27b',T27+2.85,T28)]
def ramp(t,t0,t1,r=0.12):
    if t<t0 or t>t1: return 0.0
    return min(1.0,(t-t0)/r,(t1-t)/r)
def over(fr,img,a,x,y,alpha):
    h,w=img.shape[:2]; reg=fr[y:y+h,x:x+w]; k=a*alpha; reg[:]=reg*(1-k)+img*k
cap=cv2.VideoCapture(SRC); W=int(cap.get(3)); H=int(cap.get(4))
enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','bgr24','-s',f'{W}x{H}','-r','30','-i','-','-i',SRC,
    '-map','0:v','-map','1:a','-c:v','libx264','-preset','medium','-crf','21','-pix_fmt','yuv420p','-c:a','copy','-movflags','+faststart','-shortest',OUT],stdin=subprocess.PIPE)
i=0
while True:
    ok,fr=cap.read()
    if not ok: break
    t=i/30.0
    if t>=T26-0.2:
        f=fr.astype(np.float32)
        for k,t0,t1 in ev_cap:
            al=ramp(t,t0,t1)
            if al>0:
                bx=f[BGPT[1]-3:BGPT[1]+3,BGPT[0]-3:BGPT[0]+3].reshape(-1,3).mean(0)
                x0,y0,x1,y1=CAP; f[y0:y1,x0:x1]=f[y0:y1,x0:x1]*(1-al)+bx*al
                img,a=caps[k]; over(f,img,a,0,0,al)
        for k,t0,t1 in ev_scr:
            al=ramp(t,t0,t1)
            if al>0:
                if O=='d':   # hide a 4px strip of the old screen peeking above the new one
                    col=f[104:106,690:710].reshape(-1,3).mean(0); f[106:112,528:1205]=f[106:112,528:1205]*(1-al)+col*al
                img,a=scr[k]; over(f,img,a,SCR[0],SCR[1],al)
        if t>=TE:
            bx=f[BGPT[1]-3:BGPT[1]+3,BGPT[0]-3:BGPT[0]+3].reshape(-1,3).mean(0)
            al=min(1.0,(t-TE)/0.25); x0,y0,x1,y1=END; f[y0:y1,x0:x1]=f[y0:y1,x0:x1]*(1-al)+bx*al
            img,a=endp; over(f,img,a,0,0,min(1.0,max(0.0,(t-TE-0.2)/0.5)))
        fr=np.clip(f,0,255).astype(np.uint8)
    enc.stdin.write(fr.tobytes()); i+=1
enc.stdin.close(); enc.wait(); print(O,'frames',i)

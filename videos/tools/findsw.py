import cv2, pytesseract, sys
f=sys.argv[1]; cap=cv2.VideoCapture(f)
hits=[]
for t in range(0,186):
    cap.set(cv2.CAP_PROP_POS_MSEC,(t+0.3)*1000); ok,fr=cap.read()
    if not ok: break
    big=cv2.resize(fr,None,fx=2,fy=2)
    txt=pytesseract.image_to_string(big)
    w=[k for k in ('Swiggy','Zomato','SMS','15 days','4,999','7,999') if k.lower() in txt.lower()]
    if w: hits.append((t,w))
print(sys.argv[1].split('/')[-1], hits)

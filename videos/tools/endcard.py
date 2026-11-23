def end_html(o, days, basic, pro, pro_desc, setup_line, url):
    m = o=='m'
    W,H = (720,1280) if m else (1280,720)
    c = dict(top=473 if m else 251, x=43 if m else 104, hs=70 if m else 79, hlh=67 if m else 74,
             bw=635 if m else 716, bh=78 if m else 62, gap=12 if m else 11, btop=655 if m else 448)
    box = lambda name, price, desc: (f"<div class=box><div class=r1><b>{name}</b><span class=pr>{price} a year</span></div><div class=ds>{desc}</div></div>" if m else
                                     f"<div class=box><b>{name}</b><span class=pr>{price} a year</span><span class=ds>{desc}</span></div>")
    return f"""<html><head><style>
    html,body{{margin:0;width:{W}px;height:{H}px;background:transparent;font-family:Inter}}
    .h{{position:absolute;left:{c['x']-3}px;top:{c['top']-int(c['hs']*0.2)}px;font:800 {c['hs']}px/{c['hlh']}px 'Inter Display';letter-spacing:-0.045em;color:#0b0b0b}}
    .h .g{{background:linear-gradient(90deg,#06714f,#0d8562 60%,#12906b);-webkit-background-clip:text;color:transparent}}
    .boxes{{position:absolute;left:{c['x']}px;top:{c['btop']}px;width:{c['bw']}px}}
    .box{{height:{c['bh']}px;box-sizing:border-box;background:#fff;border:1px solid #e3e7e4;border-radius:12px;margin-bottom:{c['gap']}px;
          display:flex;{'flex-direction:column;justify-content:center;padding:0 18px;gap:4px' if m else 'align-items:center;padding:0 18px'};box-shadow:0 1px 2px rgba(0,0,0,.03)}}
    .box b{{font:700 {25 if m else 25}px Inter;letter-spacing:-0.02em;color:#0b0b0b;{'width:88px;display:inline-block' if m else 'width:88px'}}}
    .pr{{font:700 {23 if m else 23}px Inter;letter-spacing:-0.01em;color:#167a5e;{'' if m else 'margin-right:16px;white-space:nowrap'}}}
    .ds{{font:400 {17 if m else 17}px Inter;color:#5f6461}}
    .r1{{display:flex;align-items:baseline}}
    .line{{position:absolute;left:{c['x']+1}px;top:{(832 if m else 594)}px;font:400 {20 if m else 20}px Inter;color:#6a6f6c;letter-spacing:0.005em}}
    .pill{{position:absolute;left:{c['x']}px;top:{(882 if m else 643)}px;background:#fff;border-radius:22px;padding:9px 18px 9px 16px;font:600 {19 if m else 19.5}px Inter;color:#0b0b0b;
           box-shadow:0 4px 14px rgba(16,24,40,.09)}}
    .pill i{{display:inline-block;width:10px;height:10px;border-radius:50%;background:#14b88a;margin-right:10px;vertical-align:1px}}
    </style></head><body>
    <div class=h>Try it free<br><span class=g>for {days} days.</span></div>
    <div class=boxes>{box('Basic',basic,'billing, tables, QR ordering, kitchen screen')}{box('Pro',pro,pro_desc)}</div>
    <div class=line>{setup_line}</div>
    <div class=pill><i></i>{url}</div>
    </body></html>""", W, H

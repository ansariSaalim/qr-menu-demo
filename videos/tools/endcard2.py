def end_html(o, days, plans, setup_line, url):
    m = o=='m'
    W,H = (720,1280) if m else (1280,720)
    c = dict(top=473 if m else 236, x=43 if m else 104, hs=70 if m else 72, hlh=67 if m else 68,
             bw=635 if m else 716, bh=74 if m else 60, gap=10 if m else 8, btop=640 if m else 400)
    box = lambda name, price, desc: f"<div class=box><div class=r1><b>{name}</b><span class=pr>{price}</span></div><div class=ds>{desc}</div></div>"
    n = len(plans)
    after = c['btop'] + n*c['bh'] + (n-1)*c['gap']
    return f"""<html><head><style>
    html,body{{margin:0;width:{W}px;height:{H}px;background:transparent;font-family:Inter}}
    .h{{position:absolute;left:{c['x']-3}px;top:{c['top']-int(c['hs']*0.2)}px;font:800 {c['hs']}px/{c['hlh']}px 'Inter Display';letter-spacing:-0.045em;color:#0b0b0b}}
    .h .g{{background:linear-gradient(90deg,#06714f,#0d8562 60%,#12906b);-webkit-background-clip:text;color:transparent}}
    .boxes{{position:absolute;left:{c['x']}px;top:{c['btop']}px;width:{c['bw']}px}}
    .box{{height:{c['bh']}px;box-sizing:border-box;background:#fff;border:1px solid #e3e7e4;border-radius:12px;margin-bottom:{c['gap']}px;
          display:flex;flex-direction:column;justify-content:center;padding:0 18px;gap:3px;box-shadow:0 1px 2px rgba(0,0,0,.03)}}
    .box b{{font:700 {23 if m else 21}px Inter;letter-spacing:-0.02em;color:#0b0b0b;width:{150 if m else 128}px;display:inline-block}}
    .pr{{font:700 {21 if m else 20}px Inter;letter-spacing:-0.01em;color:#167a5e}}
    .ds{{font:400 {16 if m else 15.5}px Inter;color:#5f6461;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}}
    .r1{{display:flex;align-items:baseline}}
    .line{{position:absolute;left:{c['x']+1}px;top:{after+ (16 if m else 12)}px;font:400 {19 if m else 17}px Inter;color:#6a6f6c;letter-spacing:0.005em}}
    .pill{{position:absolute;left:{c['x']}px;top:{after+(62 if m else 48)}px;background:#fff;border-radius:22px;padding:9px 18px 9px 16px;font:600 {19 if m else 18}px Inter;color:#0b0b0b;
           box-shadow:0 4px 14px rgba(16,24,40,.09)}}
    .pill i{{display:inline-block;width:10px;height:10px;border-radius:50%;background:#14b88a;margin-right:10px;vertical-align:1px}}
    </style></head><body>
    <div class=h>Try it free<br><span class=g>for {days} days.</span></div>
    <div class=boxes>{''.join(box(*p) for p in plans)}</div>
    <div class=line>{setup_line}</div>
    <div class=pill><i></i>{url}</div>
    </body></html>""", W, H

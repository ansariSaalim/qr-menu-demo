from playwright.sync_api import sync_playwright
import sys, json
def render_caption(pg, out, label, section, title_lines, body, W=1280, H=720, x=64, top=0, body_w=440, cfg=None):
    c = cfg or {}
    html=f"""<html><head><style>
    html,body{{margin:0;background:transparent;width:{W}px;height:{H}px}}
    .w{{position:absolute;left:{x}px;top:{top}px;width:{body_w}px}}
    .lab{{font:600 {c.get('ls',17)}px 'Inter';letter-spacing:{c.get('lsp',0.1)}em;color:#076049;white-space:nowrap}}
    .lab span{{color:#6f7672;margin-left:{c.get('gap',36)}px}}
    .t{{font:700 {c.get('ts',40)}px 'Inter Display';letter-spacing:{c.get('tsp',-0.035)}em;line-height:{c.get('tlh',41)}px;color:#000;margin-top:{c.get('tm',12)}px}}
    .b{{font:400 {c.get('bs',20)}px 'Inter';line-height:{c.get('blh',29.5)}px;color:#5b5e5a;margin-top:{c.get('bm',22)}px;letter-spacing:{c.get('bsp',0)}em}}
    </style></head><body><div class=w><div class=lab>{label}<span>{section}</span></div>
    <div class=t>{'<br>'.join(title_lines)}</div><div class=b>{body}</div></div></body></html>"""
    pg.set_content(html); pg.wait_for_timeout(100)
    pg.screenshot(path=out, omit_background=True)

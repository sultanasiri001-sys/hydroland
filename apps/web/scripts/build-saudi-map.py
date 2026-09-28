"""Build the geographic artwork; input: geoBoundaries SAU ADM1 simplified GeoJSON.
Source and ODbL attribution: docs/PUBLIC_VISUAL_ASSETS.md.
Usage: python scripts/build-saudi-map.py /path/to/regions.geojson /path/to/natural-earth.json
"""
import json, math, sys
from pathlib import Path
from xml.sax.saxutils import escape
features=json.load(open(sys.argv[1]))['features']
ne=json.load(open(sys.argv[2]))['features']
def merc(y): return math.log(math.tan(math.pi/4+y*math.pi/360))
scale=200/(merc(34)-merc(14))
def project(pt):
 x,y=pt
 return (150+(x-44)*math.pi/180*scale,(merc(34)-merc(y))*scale)
def simplify(points,epsilon=.09):
 if len(points)<3:return points
 ax,ay=points[0];bx,by=points[-1];dx,dy=bx-ax,by-ay
 def distance(p):
  t=max(0,min(1,((p[0]-ax)*dx+(p[1]-ay)*dy)/(dx*dx+dy*dy))) if dx or dy else 0
  return math.hypot(p[0]-ax-t*dx,p[1]-ay-t*dy)
 index=max(range(1,len(points)-1),key=lambda i:distance(points[i]))
 if distance(points[index])<=epsilon:return [points[0],points[-1]]
 return simplify(points[:index+1],epsilon)[:-1]+simplify(points[index:],epsilon)
def paths(g):
 polys=g['coordinates'] if g['type']=='MultiPolygon' else [g['coordinates']]
 result=[]
 for poly in polys:
  for ring in poly:
   pts=[]
   for pt in ring:
    x,y=project(pt);p=(round(x,2),round(y,2))
    if not pts or p!=pts[-1]:pts.append(p)
   pts=simplify(pts) if len(pts)>3 else pts
   result.append('M'+'L'.join(f'{x},{y}' for x,y in pts)+'Z')
 return ' '.join(result)
regions=''.join(f'<path d="{paths(f["geometry"])}"><title>{escape(f["properties"]["shapeName"])}</title></path>' for f in features)
sa=next(f for f in ne if f['properties']['ADMIN']=='Saudi Arabia');outline=paths(sa['geometry'])
labels=[('الشرقية',50,24),('نجران',46,18.4),('الحدود الشمالية',43,30),('حائل',41.5,27.3),('الرياض',45,23.5),('عسير',43,19.4),('مكة المكرمة',41,21.8),('تبوك',37.6,28),('المدينة المنورة',39.6,25),('القصيم',43.5,26),('الباحة',41.8,20.2),('جازان',43,17.2),('الجوف',39.5,30.3)]
texts=''
for name,lon,lat in labels:
 x,y=project((lon,lat));texts+=f'<text x="{x:.2f}" y="{y:.2f}">{name}</text>'
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><title>المملكة العربية السعودية — المناطق الإدارية والمراكز المخططة</title><desc>Geographic overview. Regional boundaries: geoBoundaries, OpenStreetMap contributors, ODbL 1.0, 2017 data. Coastline: Natural Earth public domain. Not a navigation chart.</desc>
<defs><radialGradient id="sea"><stop stop-color="#073f52"/><stop offset="1" stop-color="#020c18"/></radialGradient><linearGradient id="land" x2="1" y2="1"><stop stop-color="#163744"/><stop offset=".5" stop-color="#082733"/><stop offset="1" stop-color="#0d4b51"/></linearGradient><pattern id="hex" width="26" height="30" patternUnits="userSpaceOnUse"><path d="M0 7.5L13 0L26 7.5V22.5L13 30L0 22.5Z" fill="none" stroke="#31a5bd" stroke-width=".3" opacity=".18"/></pattern><filter id="cyan" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.7"/></filter><filter id="gold"><feGaussianBlur stdDeviation=".65"/></filter></defs>
<rect width="300" height="200" fill="url(#sea)"/><rect width="300" height="200" fill="url(#hex)"/>
<path d="{outline}" transform="translate(0 3)" fill="#041b28" stroke="#168b9e" stroke-width="1"/>
<path d="{outline}" fill="none" stroke="#19e9f2" stroke-width="5" filter="url(#cyan)" opacity=".75"/>
<path d="{outline}" fill="url(#land)" stroke="#8effff" stroke-width=".7"/>
<g fill="none" stroke="#ffe994" stroke-width="1" opacity=".75" filter="url(#gold)">{regions}</g>
<g fill="url(#land)" fill-opacity=".4" stroke="#ffe9a1" stroke-width=".38">{regions}</g>
<g fill="#fff4cb" font-family="Tahoma,Arial,sans-serif" font-size="4" font-weight="bold" text-anchor="middle" stroke="#072332" stroke-width=".9" paint-order="stroke">{texts}</g>
<text x="68" y="121" fill="#70f5ff" font-family="Tahoma,Arial,sans-serif" font-size="5" transform="rotate(55 68 121)">البحر الأحمر</text>
<text x="240" y="76" fill="#70f5ff" font-family="Tahoma,Arial,sans-serif" font-size="4">الخليج العربي</text>
<g fill="none" stroke="#35c9dc" stroke-width=".35" opacity=".3"><path d="M48 105Q58 142 96 178T160 191"/><path d="M43 105Q53 146 91 182T160 196"/><path d="M38 105Q48 150 86 186T155 199"/></g>
<text x="5" y="197" fill="#91b9c7" font-family="Arial,sans-serif" font-size="2.7">© OpenStreetMap contributors · geoBoundaries · ODbL | Natural Earth</text></svg>'''
Path(__file__).resolve().parents[1].joinpath('public/assets/saudi-marine-overview.svg').write_text(svg)

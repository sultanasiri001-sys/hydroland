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
symbols = """
<linearGradient id="sand" x2="1" y2="1"><stop stop-color="#fff1b1"/><stop offset=".5" stop-color="#c59346"/><stop offset="1" stop-color="#77522c"/></linearGradient>
<linearGradient id="aqua" x2="0" y2="1"><stop stop-color="#b5ffff"/><stop offset=".5" stop-color="#30dbe8"/><stop offset="1" stop-color="#087990"/></linearGradient>
<symbol id="fort" viewBox="0 0 24 20"><path d="M3 18L5 3H9V5H15V3H19L21 18Z" fill="url(#sand)" stroke="#fff1b3" stroke-width=".4"/><path d="M3 18H21L23 20H1Z" fill="#966b36"/><path d="M10 18V12Q12 9 14 12V18" fill="#493e2c"/><path d="M7 8H9M15 8H17M7 11H9M15 11H17" stroke="#6c5532"/></symbol>
<symbol id="palm" viewBox="0 0 24 20"><path d="M12 19L13 8" stroke="#bcaf72" stroke-width="2"/><path d="M13 8Q5 0 1 7Q7 5 13 8Q18 0 23 5Q18 5 13 8Q22 5 24 12Q19 9 13 8Q6 6 2 14Q7 10 13 8Q10 1 14 0" fill="#8cd39e" stroke="#daf0b3" stroke-width=".4"/></symbol>
<symbol id="mountain" viewBox="0 0 24 20"><path d="M0 19L9 2L15 11L18 6L24 19Z" fill="url(#sand)" stroke="#ffe4a7" stroke-width=".4"/><path d="M9 2L7 14L10 10L15 19M18 6L16 14L19 12" fill="none" stroke="#775b38" stroke-width="1"/></symbol>
<symbol id="skyline" viewBox="0 0 24 20"><g fill="url(#aqua)" stroke="#a5f9ff" stroke-width=".4"><path d="M1 19V10H5V19M7 19V4H12V19M14 19V8H18V19M19 19V1H23V19"/></g><path d="M9 5V17M21 3V17M3 12V17M16 10V17" stroke="#075a75" stroke-width=".7"/></symbol>
<symbol id="mosque" viewBox="0 0 24 20"><path d="M6 18V10H19V18Z" fill="#9fcbb4"/><path d="M7 10Q7 3 12 2Q18 3 18 10Z" fill="#54b996" stroke="#d6ffe8" stroke-width=".4"/><path d="M2 18V4H4V18M21 18V4H23V18" fill="#e3d5aa"/><path d="M2 4L3 0L4 4M21 4L22 0L23 4" fill="#b1fae2"/><path d="M9 18V13M13 18V13M17 18V13" stroke="#235f69" stroke-width="1.5"/></symbol>
<symbol id="kaaba" viewBox="0 0 24 20"><path d="M1 5L12 1L23 5L12 9Z" fill="#e4d7ab"/><path d="M1 5L12 9V20L1 15Z" fill="#3d3e39"/><path d="M12 9L23 5V15L12 20Z" fill="#111f29"/><path d="M1 8L12 12L23 8V10L12 14L1 10Z" fill="#ead497"/></symbol>
<symbol id="fish" viewBox="0 0 24 12"><path d="M3 6Q12-3 21 6Q12 15 3 6L0 1V11Z" fill="url(#aqua)"/><path d="M10 2L13 0L15 3M10 10L13 12L15 9" fill="#4bd8e7"/><circle cx="18" cy="5" r=".8" fill="#013748"/><path d="M15 3Q12 6 15 9" fill="none" stroke="#dcffff" stroke-width=".5"/></symbol>
<symbol id="coral" viewBox="0 0 24 24"><g fill="none" stroke-linecap="round"><path d="M12 23V11M12 17L5 10V3M12 13L18 7V1M5 10L1 7V4M18 8L23 4M12 11L9 7V1M12 20L20 15V10" stroke="#35d5e3" stroke-width="2"/><path d="M12 23V11M12 17L5 10V3M12 13L18 7V1M5 10L1 7V4M18 8L23 4M12 11L9 7V1M12 20L20 15V10" stroke="#d4ffff" stroke-width=".6"/></g></symbol>
<symbol id="diver" viewBox="0 0 30 20"><circle cx="22" cy="5" r="2.8" fill="#a1f5ff"/><path d="M19 8L13 11L8 9M15 10L9 15L3 14M18 9L23 12L28 11" fill="none" stroke="#61cfe6" stroke-width="2.5" stroke-linecap="round"/><path d="M2 12L6 14L1 16M7 7L10 9L5 10" fill="#63dcf0"/><rect x="13" y="5" width="7" height="3" rx="1.5" fill="#e0ca89" transform="rotate(-25 13 5)"/></symbol>
"""
icons=['skyline','fort','mountain','mountain','fort','fort','kaaba','mountain','mosque','palm','mountain','palm','fort']
landmarks=''
for (name,lon,lat),icon in zip(labels,icons):
 x,y=project((lon,lat));size=8 if name not in ['الباحة','جازان','عسير'] else 5
 landmarks+=f'<use href="#{icon}" x="{x-size/2:.2f}" y="{y-size-1:.2f}" width="{size}" height="{size}"/>'
marine=''
for icon,x,y,size,angle in [('coral',29,133,13,-12),('coral',38,144,9,14),('coral',176,177,12,-10),('coral',245,110,11,5),('coral',215,60,10,0),('fish',25,79,13,-12),('fish',33,87,8,-12),('fish',221,40,10,0),('fish',233,45,7,0),('diver',150,176,18,-12)]:
 marine+=f'<use href="#{icon}" x="{x}" y="{y}" width="{size}" height="{size}" transform="rotate({angle} {x} {y})" opacity=".9"/>'
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><title>المملكة العربية السعودية — المناطق الإدارية والمراكز المخططة</title><desc>Geographic overview. Regional boundaries: geoBoundaries, OpenStreetMap contributors, ODbL 1.0, 2017 data. Coastline: Natural Earth public domain. Not a navigation chart.</desc>
<defs>{symbols}<radialGradient id="sea"><stop stop-color="#073f52"/><stop offset="1" stop-color="#020c18"/></radialGradient><linearGradient id="land" x2="1" y2="1"><stop stop-color="#163744"/><stop offset=".5" stop-color="#082733"/><stop offset="1" stop-color="#0d4b51"/></linearGradient><pattern id="hex" width="26" height="30" patternUnits="userSpaceOnUse"><path d="M0 7.5L13 0L26 7.5V22.5L13 30L0 22.5Z" fill="none" stroke="#31a5bd" stroke-width=".3" opacity=".18"/></pattern><filter id="cyan" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.7"/></filter><filter id="gold"><feGaussianBlur stdDeviation=".65"/></filter></defs>
<rect width="300" height="200" fill="url(#sea)"/><rect width="300" height="200" fill="url(#hex)"/>
<path d="{outline}" transform="translate(0 6)" fill="#041b28" stroke="#168b9e" stroke-width="1"/>
<path d="{outline}" fill="none" stroke="#19e9f2" stroke-width="7" filter="url(#cyan)" opacity=".8"/>
<path d="{outline}" fill="url(#land)" stroke="#8effff" stroke-width=".7"/>
<g fill="none" stroke="#ffe994" stroke-width="1" opacity=".75" filter="url(#gold)">{regions}</g>
<g fill="url(#land)" fill-opacity=".4" stroke="#ffe9a1" stroke-width=".38">{regions}</g>
{landmarks}<g fill="#fff4cb" font-family="Tahoma,Arial,sans-serif" font-size="4" font-weight="bold" text-anchor="middle" stroke="#072332" stroke-width=".9" paint-order="stroke">{texts}</g>
<text x="68" y="121" fill="#70f5ff" font-family="Tahoma,Arial,sans-serif" font-size="5" transform="rotate(55 68 121)">البحر الأحمر</text>
<text x="240" y="76" fill="#70f5ff" font-family="Tahoma,Arial,sans-serif" font-size="4">الخليج العربي</text>
<g fill="none" stroke="#35c9dc" stroke-width=".35" opacity=".3"><path d="M48 105Q58 142 96 178T160 191"/><path d="M43 105Q53 146 91 182T160 196"/><path d="M38 105Q48 150 86 186T155 199"/></g>
{marine}<text x="5" y="197" fill="#91b9c7" font-family="Arial,sans-serif" font-size="2.7">© OpenStreetMap contributors · geoBoundaries · ODbL | Natural Earth</text></svg>'''
Path(__file__).resolve().parents[1].joinpath('public/assets/saudi-marine-overview.svg').write_text(svg)

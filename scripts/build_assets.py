"""
Ameil's Desk v0.3 — Blender-authored scene assets.

Run headless:  python3 -I scripts/build_assets.py
Requires the `bpy` wheel (Blender 5.x as a Python module).

Coordinates are authored in Blender space (X right, Y away from viewer, Z up, metres)
and exported to glTF Y-up. Materials here are named placeholders: the web app replaces
them with its own material library by name (src/experience/materials.ts), so geometry
and look-dev stay decoupled.

Node names the app relies on:
  Laptop, LaptopLid, LaptopScreen, Phone, PhoneScreen, Tumbler, Notebook, Bulb_*
"""
import math
import os
import bpy
import bmesh
from mathutils import Matrix, Vector

OUT = os.environ.get("DESK_GLB_OUT") or os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "public", "models", "desk.glb")

bpy.ops.wm.read_factory_settings(use_empty=True)
SCENE = bpy.context.scene

# ---------------------------------------------------------------- materials
_MATS = {}


def mat(name, rgb=(0.8, 0.8, 0.8)):
    if name in _MATS:
        return _MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    bsdf = m.node_tree.nodes.get("Principled BSDF")
    # tiny unique offset so glTF optimisers never deduplicate named materials
    eps = len(_MATS) * 0.0013
    bsdf.inputs["Base Color"].default_value = (min(1.0, rgb[0] + eps), rgb[1], rgb[2], 1.0)
    _MATS[name] = m
    return m


# ---------------------------------------------------------------- helpers
def empty(name, loc=(0, 0, 0), rot=(0, 0, 0), parent=None):
    ob = bpy.data.objects.new(name, None)
    SCENE.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = [math.radians(a) for a in rot]
    if parent:
        ob.parent = parent
    return ob


def to_object(name, bm, material, loc=(0, 0, 0), rot=(0, 0, 0), parent=None, sharp_deg=32, smooth=True):
    bm.normal_update()
    if not bm.loops.layers.uv:
        uv_box(bm, 1.0)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    if material is not None:
        me.materials.append(material)
    if smooth:
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(sharp_deg))
    ob = bpy.data.objects.new(name, me)
    SCENE.collection.objects.link(ob)
    ob.location = loc
    ob.rotation_euler = [math.radians(a) for a in rot]
    if parent:
        ob.parent = parent
    return ob


def slab(w, d, h, r=0.0, er=0.0, seg=8, eseg=3, bm=None, offset=(0, 0, 0)):
    """Rounded box: r rounds the plan-view corners, er rounds the top/bottom outline."""
    bm = bm or bmesh.new()
    res = bmesh.ops.create_cube(bm, size=1.0)
    vs = res["verts"]
    bmesh.ops.scale(bm, vec=(w, d, h), verts=vs)
    vset = set(vs)
    if r > 0:
        edges = {e for v in vs for e in v.link_edges}
        vert_edges = [e for e in edges if abs((e.verts[0].co - e.verts[1].co).normalized().z) > 0.99]
        r = min(r, w / 2 - 1e-5, d / 2 - 1e-5)
        out = bmesh.ops.bevel(bm, geom=vert_edges, offset=r, segments=seg, profile=0.5,
                              affect="EDGES", clamp_overlap=True)
        vset |= set(out["verts"])
    if er > 0:
        bm.normal_update()
        hz = h / 2
        edges = {e for v in vset if v.is_valid for e in v.link_edges}
        outline = [e for e in edges
                   if all(abs(abs(v.co.z) - hz) < 1e-7 for v in e.verts)
                   and any(abs(f.normal.z) < 0.5 for f in e.link_faces)]
        out = bmesh.ops.bevel(bm, geom=outline, offset=min(er, h / 2 - 1e-5), segments=eseg, profile=0.5,
                              affect="EDGES", clamp_overlap=True)
        vset |= set(out["verts"])
    verts = [v for v in vset if v.is_valid]
    bmesh.ops.translate(bm, vec=Vector(offset), verts=verts)
    return bm


def uv_box(bm, s=1.0):
    """Box-projected UVs in metres (texture density is set in the app)."""
    uv = bm.loops.layers.uv.verify()
    bm.normal_update()
    for f in bm.faces:
        n = f.normal
        ax = max(range(3), key=lambda i: abs(n[i]))
        for lp in f.loops:
            c = lp.vert.co
            if ax == 2:
                lp[uv].uv = (c.x * s, c.y * s)
            elif ax == 1:
                lp[uv].uv = (c.x * s, c.z * s)
            else:
                lp[uv].uv = (c.y * s, c.z * s)
    return bm


def rrect(w, h, r, seg=6, vertical=False):
    """Rounded-rectangle face with 0..1 UVs. vertical=True faces -Y (towards viewer)."""
    bm = bmesh.new()
    pts = []
    for cx, cy, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90),
                       (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for i in range(seg + 1):
            a = math.radians(a0 + 90 * i / seg)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    verts = [bm.verts.new((x, y, 0)) for x, y in pts]
    f = bm.faces.new(verts)
    uv = bm.loops.layers.uv.verify()
    for lp in f.loops:
        lp[uv].uv = (lp.vert.co.x / w + 0.5, lp.vert.co.y / h + 0.5)
    if vertical:
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(90), 3, "X"))
    return bm


def lathe(profile, seg=48, bm=None):
    """Revolve (radius, z) profile around Z."""
    bm = bm or bmesh.new()
    before = set(bm.verts)
    vs = [bm.verts.new((max(r, 0.0), 0, z)) for r, z in profile]
    es = [bm.edges.new((vs[i], vs[i + 1])) for i in range(len(vs) - 1)]
    bmesh.ops.spin(bm, geom=vs + es, cent=(0, 0, 0), axis=(0, 0, 1), angle=2 * math.pi, steps=seg,
                   use_merge=True)
    new = [v for v in bm.verts if v not in before]
    bmesh.ops.remove_doubles(bm, verts=new, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def transform(bm, loc=(0, 0, 0), rot=(0, 0, 0), scale=(1, 1, 1), verts=None):
    verts = verts if verts is not None else bm.verts
    bmesh.ops.scale(bm, vec=scale, verts=verts)
    for ax, a in zip("XYZ", rot):
        if a:
            bmesh.ops.rotate(bm, verts=verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(a), 3, ax))
    bmesh.ops.translate(bm, vec=Vector(loc), verts=verts)


def cylinder(r, h, seg=24, bm=None):
    return lathe([(0, 0), (r, 0), (r, h), (0, h)], seg=seg, bm=bm)


# ---------------------------------------------------------------- palette (preview only)
WOOD = mat("Wood", (0.42, 0.23, 0.12))
ALU = mat("Aluminium", (0.2, 0.2, 0.22))
ALU_DARK = mat("AluminiumDark", (0.08, 0.08, 0.09))
KEYS = mat("Keys", (0.05, 0.05, 0.055))
PAD = mat("Trackpad", (0.16, 0.16, 0.17))
BEZEL = mat("Bezel", (0.01, 0.01, 0.01))
LSCREEN = mat("LaptopScreen", (0.9, 0.9, 0.9))
PFRAME = mat("PhoneFrame", (0.06, 0.06, 0.065))
PSCREEN = mat("PhoneScreen", (0.9, 0.9, 0.9))
LENS = mat("Lens", (0.01, 0.01, 0.015))
TUMBLER = mat("TumblerBody", (0.55, 0.6, 0.5))
TLID = mat("TumblerLid", (0.12, 0.11, 0.1))
METAL = mat("Metal", (0.7, 0.7, 0.7))
CORK = mat("Cork", (0.6, 0.45, 0.3))
COVER = mat("NotebookCover", (0.55, 0.25, 0.16))
PAPER = mat("Paper", (0.92, 0.9, 0.84))
ELASTIC = mat("Elastic", (0.1, 0.1, 0.1))
PEN = mat("PenBody", (0.1, 0.12, 0.2))
STICKY = mat("StickyNote", (0.88, 0.68, 0.36))
CERAMIC = mat("Ceramic", (0.9, 0.87, 0.8))
CERAMIC_T = mat("CeramicTerracotta", (0.66, 0.36, 0.25))
SOIL = mat("Soil", (0.12, 0.08, 0.05))
LEAF = mat("Leaf", (0.25, 0.4, 0.2))
PLASTER = mat("Plaster", (0.6, 0.48, 0.38))
WALLWOOD = mat("WallWood", (0.3, 0.17, 0.09))
SHELF = mat("ShelfWood", (0.35, 0.2, 0.1))
FLOOR = mat("Floor", (0.18, 0.1, 0.06))
BRASS = mat("Brass", (0.7, 0.5, 0.25))
BULB = mat("Bulb", (1.0, 0.8, 0.5))
CORD = mat("Cord", (0.05, 0.05, 0.05))
WFRAME = mat("WindowFrame", (0.12, 0.08, 0.05))
WINDOW = mat("NightWindow", (0.1, 0.12, 0.2))
DARKMETAL = mat("DarkMetal", (0.05, 0.05, 0.05))
CHAIR = mat("ChairWood", (0.32, 0.18, 0.1))
FABRIC = mat("Fabric", (0.45, 0.3, 0.22))
BOOKS = [mat("BookA", (0.52, 0.32, 0.3)), mat("BookB", (0.75, 0.6, 0.42)), mat("BookC", (0.25, 0.3, 0.32))]

TOP = 0.75  # table surface height

# ---------------------------------------------------------------- table
table = to_object("Table", uv_box(slab(1.6, 0.9, 0.045, r=0.03, er=0.008, eseg=4)), WOOD,
                  loc=(0, 0.2, TOP - 0.0225))
# apron + pedestal so the table reads as furniture at frame edges
to_object("TableApron", uv_box(slab(1.45, 0.75, 0.07, r=0.02)), WOOD, loc=(0, 0.2, TOP - 0.08))

# ---------------------------------------------------------------- laptop
laptop = empty("Laptop", loc=(0, 0.13, TOP))
BASE_H = 0.014
to_object("LaptopBase", slab(0.304, 0.214, BASE_H, r=0.011, er=0.0035), ALU,
          loc=(0, 0, BASE_H / 2), parent=laptop)

kb = bmesh.new()
rows = [
    ([1] * 14, 0.6),
    ([1] * 13 + [1.5], 1),
    ([1.5] + [1] * 13, 1),
    ([1.8] + [1] * 11 + [1.7], 1),
    ([2.3] + [1] * 10 + [2.2], 1),
    ([1, 1, 1, 1.25, 5.25, 1.25, 1, 1, 1, 1], 1),
]
UNIT = 0.246 / 14.5
GAP = 0.0032
y = 0.093
for keys, hfac in rows:
    kh = UNIT * hfac - GAP
    total = sum(keys) * UNIT
    x = -total / 2
    for wu in keys:
        kw = wu * UNIT - GAP
        slab(kw, kh, 0.0014, r=0.0017, seg=3, bm=kb, offset=(x + wu * UNIT / 2, y - kh / 2, BASE_H + 0.0003))
        x += wu * UNIT
    y -= UNIT * hfac
to_object("LaptopKeys", kb, KEYS, parent=laptop)
to_object("LaptopTrackpad", slab(0.118, 0.072, 0.0004, r=0.006, seg=6), PAD,
          loc=(0, -0.066, BASE_H + 0.0001), parent=laptop)
hinge = cylinder(0.0045, 0.25, seg=20)
transform(hinge, rot=(0, 90, 0), loc=(-0.125, 0, 0))
to_object("LaptopHinge", hinge, ALU_DARK, loc=(0, 0.1035, BASE_H), parent=laptop, sharp_deg=60)

lid = empty("LaptopLid", loc=(0, 0.1035, BASE_H + 0.001), rot=(-17, 0, 0), parent=laptop)
shell = slab(0.304, 0.212, 0.0055, r=0.011, er=0.0022)
transform(shell, rot=(90, 0, 0), loc=(0, 0.0035, 0.108))
to_object("LaptopLidShell", shell, ALU, parent=lid)
to_object("LaptopBezel", rrect(0.297, 0.206, 0.0095, vertical=True), BEZEL, loc=(0, 0.0006, 0.108),
          parent=lid, smooth=False)
to_object("LaptopScreen", rrect(0.283, 0.177, 0.0018, vertical=True), LSCREEN, loc=(0, 0.0002, 0.1135),
          parent=lid, smooth=False)

# ---------------------------------------------------------------- phone
PW, PL, PH = 0.0716, 0.1476, 0.0082
phone = empty("Phone", loc=(0.3, 0.0, TOP + 0.0015 + PH / 2), rot=(0, 0, 9))
to_object("PhoneBody", slab(PW, PL, PH, r=0.0108, er=0.0026, seg=10), PFRAME, parent=phone)
to_object("PhoneScreen", rrect(PW - 0.0036, PL - 0.0036, 0.0094, seg=8), PSCREEN,
          loc=(0, 0, PH / 2 + 0.00012), parent=phone, smooth=False)
btn = bmesh.new()
slab(0.0018, 0.022, 0.0026, r=0.0008, seg=3, bm=btn, offset=(PW / 2 + 0.0003, 0.028, 0))
slab(0.0018, 0.012, 0.0026, r=0.0008, seg=3, bm=btn, offset=(-PW / 2 - 0.0003, 0.036, 0))
slab(0.0018, 0.012, 0.0026, r=0.0008, seg=3, bm=btn, offset=(-PW / 2 - 0.0003, 0.020, 0))
to_object("PhoneButtons", btn, PFRAME, parent=phone)
bump = slab(0.031, 0.031, 0.0015, r=0.007, er=0.0005, seg=6)
to_object("PhoneCameraBump", bump, PFRAME, loc=(-0.0165, 0.052, -PH / 2 - 0.0007), parent=phone)
lens = bmesh.new()
for lx, ly in ((-0.0225, 0.058), (-0.0105, 0.046)):
    before = set(lens.verts)
    lathe([(0, 0), (0.0052, 0), (0.0052, 0.0012), (0, 0.0012)], seg=20, bm=lens)
    new = [v for v in lens.verts if v not in before]
    transform(lens, rot=(180, 0, 0), loc=(lx, ly, -PH / 2 - 0.0013), verts=new)
to_object("PhoneLenses", lens, LENS, parent=phone, sharp_deg=50)

# ---------------------------------------------------------------- coaster + tumbler
cup_root = empty("Tumbler", loc=(-0.43, 0.24, TOP))
to_object("Coaster", lathe([(0, 0), (0.051, 0), (0.052, 0.002), (0.051, 0.0042), (0, 0.0042)], seg=48), CORK,
          parent=cup_root)
to_object("TumblerBody", lathe([(0, 0.0042), (0.035, 0.0042), (0.0372, 0.007), (0.0384, 0.018),
                                 (0.0408, 0.15), (0.0408, 0.158), (0, 0.158)], seg=56), TUMBLER,
          parent=cup_root, sharp_deg=50)
to_object("TumblerBand", lathe([(0, 0.157), (0.0412, 0.157), (0.0414, 0.159), (0.0414, 0.164),
                                 (0.0411, 0.166), (0, 0.166)], seg=56), METAL, parent=cup_root, sharp_deg=50)
to_object("TumblerLid", lathe([(0, 0.166), (0.0411, 0.166), (0.0413, 0.169), (0.0398, 0.178),
                                (0.034, 0.185), (0.0, 0.1862)], seg=56), TLID, parent=cup_root, sharp_deg=50)
to_object("TumblerSlider", slab(0.016, 0.012, 0.0025, r=0.004, er=0.0008), TLID,
          loc=(0, -0.022, 0.1862), parent=cup_root)

# ---------------------------------------------------------------- notebook + pen
nb = empty("Notebook", loc=(-0.37, -0.03, TOP), rot=(0, 0, -9))
to_object("NotebookBack", slab(0.148, 0.21, 0.0016, r=0.007, er=0.0005), COVER, loc=(0, 0, 0.0008), parent=nb)
to_object("NotebookPages", slab(0.142, 0.204, 0.0095, r=0.005, er=0.0008), PAPER, loc=(0, 0, 0.0063),
          parent=nb)
to_object("NotebookCover", slab(0.148, 0.21, 0.0016, r=0.007, er=0.0005), COVER, loc=(0, 0, 0.0119),
          parent=nb)
to_object("NotebookElastic", slab(0.0055, 0.2125, 0.0007, r=0.0), ELASTIC, loc=(0.058, 0, 0.0131), parent=nb)
to_object("NotebookRibbon", slab(0.004, 0.03, 0.0005), BOOKS[0], loc=(0.02, -0.115, 0.004), parent=nb)
pen = lathe([(0, 0), (0.0007, 0.001), (0.0022, 0.012), (0.0042, 0.02), (0.0042, 0.128), (0.0038, 0.136),
             (0.0, 0.1385)], seg=24)
pen_tip = lathe([(0, -0.0001), (0.0006, 0.0), (0.0024, 0.014), (0, 0.014)], seg=20)
to_object("PenBody", pen, PEN, loc=(-0.25, -0.095, TOP + 0.0042), rot=(-90, 0, 22), sharp_deg=50)
to_object("PenTip", pen_tip, METAL, loc=(-0.25, -0.095, TOP + 0.0042), rot=(-90, 0, 22), sharp_deg=50)

# ---------------------------------------------------------------- sticky notes + plant
to_object("StickyNotes", slab(0.076, 0.076, 0.009, r=0.002, er=0.0008), STICKY, loc=(0.24, 0.3, TOP + 0.0045),
          rot=(0, 0, -6))
plant = empty("Plant", loc=(0.53, 0.42, TOP))
to_object("PlantPot", lathe([(0, 0), (0.036, 0), (0.038, 0.004), (0.045, 0.068), (0.046, 0.072),
                              (0.041, 0.072), (0.04, 0.062), (0, 0.062)], seg=48), CERAMIC_T, parent=plant,
          sharp_deg=55)
to_object("PlantSoil", cylinder(0.0405, 0.002, seg=32), SOIL, loc=(0, 0, 0.06), parent=plant)
leaves = bmesh.new()
import random

random.seed(7)
for i in range(11):
    before = set(leaves.verts)
    bmesh.ops.create_uvsphere(leaves, u_segments=14, v_segments=9, radius=1.0)
    new = [v for v in leaves.verts if v not in before]
    length = random.uniform(0.032, 0.052)
    ang = i * 137.5
    tilt = random.uniform(25, 55)
    transform(leaves, scale=(0.013, length, 0.0035), verts=new)
    transform(leaves, loc=(0, length * 0.95, 0), verts=new)
    transform(leaves, rot=(tilt, 0, ang), loc=(0, 0, 0.064), verts=new)
to_object("PlantLeaves", leaves, LEAF, parent=plant, sharp_deg=80)

# ---------------------------------------------------------------- cozy props
lamp = empty("TableLamp", loc=(-0.76, 0.66, TOP))
lamp.scale = (0.78, 0.78, 0.78)
to_object("TableLampBase", lathe([(0, 0), (0.065, 0), (0.066, 0.006), (0.05, 0.022), (0, 0.024)], seg=40), BRASS,
          parent=lamp, sharp_deg=55)
to_object("TableLampStem", cylinder(0.0065, 0.29, seg=16), BRASS, loc=(0, 0, 0.02), parent=lamp)
to_object("TableLampShade", lathe([(0.0, 0.26), (0.11, 0.26), (0.108, 0.262), (0.072, 0.4), (0.07, 0.398),
                                   (0.105, 0.264)], seg=48), mat("LampShade", (0.95, 0.85, 0.7)), parent=lamp,
          sharp_deg=60, smooth=True)
b = bmesh.new()
bmesh.ops.create_uvsphere(b, u_segments=16, v_segments=10, radius=0.026)
to_object("Bulb_TableLamp", b, BULB, loc=(0, 0, 0.3), parent=lamp)

candle = empty("Candle", loc=(-0.27, 0.47, TOP))
to_object("CandleJar", lathe([(0, 0), (0.036, 0), (0.038, 0.004), (0.038, 0.085), (0.035, 0.085),
                              (0.034, 0.006), (0, 0.006)], seg=40), mat("Glass", (0.85, 0.75, 0.6)), parent=candle,
          sharp_deg=60)
to_object("CandleWax", cylinder(0.032, 0.046, seg=36), mat("Wax", (0.95, 0.9, 0.8)), loc=(0, 0, 0.006),
          parent=candle)
fl = bmesh.new()
bmesh.ops.create_uvsphere(fl, u_segments=14, v_segments=10, radius=1.0)
transform(fl, scale=(0.0055, 0.0055, 0.014))
to_object("CandleFlame", fl, mat("Flame", (1.0, 0.7, 0.3)), loc=(0, 0, 0.066), parent=candle)

latte = empty("Latte", loc=(0.5, 0.2, TOP))
to_object("LatteSaucer", lathe([(0, 0), (0.05, 0), (0.07, 0.006), (0.072, 0.01), (0.068, 0.011), (0.045, 0.006),
                                (0, 0.006)], seg=48), CERAMIC, parent=latte, sharp_deg=60)
to_object("LatteCup", lathe([(0, 0.006), (0.028, 0.006), (0.032, 0.012), (0.046, 0.058), (0.047, 0.062),
                             (0.043, 0.062), (0.041, 0.056), (0.027, 0.016), (0, 0.016)], seg=48), CERAMIC,
          parent=latte, sharp_deg=60)
to_object("LatteCoffee", cylinder(0.0425, 0.002, seg=40), mat("Coffee", (0.6, 0.4, 0.25)), loc=(0, 0, 0.052),
          parent=latte)
handle = bmesh.new()
for i in range(10):
    a0 = math.radians(-90 + i * 18)
    slab(0.006, 0.006, 0.006, bm=handle, offset=(0.05 + 0.014 * math.cos(a0), 0, 0.035 + 0.014 * math.sin(a0)))
to_object("LatteHandle", handle, CERAMIC, parent=latte)


def planter(name, x, y, z):
    root = empty(name, loc=(x, y, z))
    to_object(name + "_Cord", cylinder(0.003, 3.4 - z, seg=6), CORD, loc=(0, 0, 0.1), parent=root)
    to_object(name + "_Pot", lathe([(0, 0), (0.07, 0.0), (0.09, 0.11), (0, 0.11)], seg=32), CERAMIC, parent=root,
              sharp_deg=55)
    trail = bmesh.new()
    rnd = random.Random(len(name) * 7 + int(x * 10))
    for k in range(26):
        before = set(trail.verts)
        bmesh.ops.create_uvsphere(trail, u_segments=8, v_segments=6, radius=1.0)
        new = [v for v in trail.verts if v not in before]
        transform(trail, scale=(0.022, 0.012, 0.006), verts=new)
        a = rnd.uniform(0, math.tau)
        drop = rnd.uniform(0.0, 0.55)
        rr = 0.085 + drop * 0.12
        transform(trail, rot=(rnd.uniform(0, 90), rnd.uniform(0, 90), math.degrees(a)),
                  loc=(math.cos(a) * rr, math.sin(a) * rr, 0.1 - drop), verts=new)
    to_object(name + "_Leaves", trail, LEAF, parent=root, sharp_deg=80)


planter("PlanterA", 0.55, 2.35, 2.3)
planter("PlanterB", -0.95, 2.9, 2.35)

# ---------------------------------------------------------------- café room
to_object("Floor", uv_box(slab(12, 12, 0.02)), FLOOR, loc=(0, 2, -0.01), smooth=False)
WX0, WX1, WZ0, WZ1 = 0.15, 2.75, 0.78, 2.62  # street window opening
to_object("BackWallL", uv_box(slab(WX0 + 4.5, 0.06, 3.4)), PLASTER, loc=((WX0 - 4.5) / 2, 3.8, 1.7), smooth=False)
to_object("BackWallR", uv_box(slab(4.5 - WX1, 0.06, 3.4)), PLASTER, loc=((WX1 + 4.5) / 2, 3.8, 1.7), smooth=False)
to_object("BackWallTop", uv_box(slab(WX1 - WX0, 0.06, 3.4 - WZ1)), PLASTER, loc=((WX0 + WX1) / 2, 3.8, (WZ1 + 3.4) / 2), smooth=False)
to_object("BackWallLow", uv_box(slab(WX1 - WX0, 0.06, WZ0)), PLASTER, loc=((WX0 + WX1) / 2, 3.8, WZ0 / 2), smooth=False)
to_object("LeftWall", uv_box(slab(0.06, 8, 3.4)), PLASTER, loc=(-3.6, 1.5, 1.7), smooth=False)
to_object("RightWall", uv_box(slab(0.06, 8, 3.4)), PLASTER, loc=(3.6, 1.5, 1.7), smooth=False)
to_object("WainscotL", uv_box(slab(WX0 + 4.5, 0.05, 1.05, er=0.004)), WALLWOOD, loc=((WX0 - 4.5) / 2, 3.75, 0.525))
to_object("WainscotR", uv_box(slab(4.5 - WX1, 0.05, 1.05, er=0.004)), WALLWOOD, loc=((WX1 + 4.5) / 2, 3.75, 0.525))
to_object("WainscotLow", uv_box(slab(WX1 - WX0, 0.05, WZ0, er=0.004)), WALLWOOD, loc=((WX0 + WX1) / 2, 3.75, WZ0 / 2))
to_object("WainscotLeft", uv_box(slab(0.05, 8, 1.05)), WALLWOOD, loc=(-3.56, 1.5, 0.525))
to_object("WainscotCapL", uv_box(slab(WX0 + 4.5, 0.09, 0.035, er=0.006)), SHELF, loc=((WX0 - 4.5) / 2, 3.73, 1.07))
to_object("WainscotCapR", uv_box(slab(4.5 - WX1, 0.09, 0.035, er=0.006)), SHELF, loc=((WX1 + 4.5) / 2, 3.73, 1.07))

# shelves with crockery and books
for z in (1.48, 1.88):
    to_object(f"Shelf_{z}", uv_box(slab(1.9, 0.22, 0.035, er=0.006)), SHELF, loc=(-1.5, 3.66, z))
crock = bmesh.new()
crock_t = bmesh.new()
books = [bmesh.new() for _ in BOOKS]
random.seed(3)
for z in (1.48, 1.88):
    x = -2.35
    while x < -0.65:
        kind = random.random()
        if kind < 0.45:
            r = random.uniform(0.035, 0.055)
            hgt = random.uniform(0.08, 0.16)
            target = crock if random.random() < 0.6 else crock_t
            before = set(target.verts)
            lathe([(0, 0), (r * 0.8, 0), (r, hgt * 0.15), (r, hgt * 0.85), (r * 0.7, hgt), (0, hgt)], seg=24,
                  bm=target)
            new = [v for v in target.verts if v not in before]
            transform(target, loc=(x + r, 3.64, z + 0.0175), verts=new)
            x += r * 2 + 0.04
        else:
            n = random.randint(3, 6)
            for b in range(n):
                bw = random.uniform(0.022, 0.035)
                bh = random.uniform(0.17, 0.24)
                target = random.choice(books)
                slab(bw, 0.15, bh, er=0.002, bm=target, offset=(x + bw / 2, 3.66, z + 0.0175 + bh / 2))
                x += bw + 0.002
            x += 0.05
to_object("ShelfCrockery", crock, CERAMIC, sharp_deg=50)
to_object("ShelfCrockeryTerracotta", crock_t, CERAMIC_T, sharp_deg=50)
for i, (bm_, m_) in enumerate(zip(books, BOOKS)):
    to_object(f"ShelfBooks{i}", bm_, m_)

# storefront window with mullions and a deep sill (the street outside is built in the app)
wx, wz, ww, wh = (WX0 + WX1) / 2, (WZ0 + WZ1) / 2, WX1 - WX0, WZ1 - WZ0
to_object("WindowGlass", rrect(ww, wh, 0.001, seg=1, vertical=True), mat("WindowGlass", (0.6, 0.65, 0.7)),
          loc=(wx, 3.795, wz), smooth=False)
frame = bmesh.new()
for i in range(5):
    dx = -ww / 2 + i * ww / 4
    slab(0.07 if i in (0, 4) else 0.045, 0.09, wh + 0.07, bm=frame, offset=(wx + dx, 3.79, wz))
for dz, t in ((-wh / 2, 0.07), (wh / 2 - 0.42, 0.04), (wh / 2, 0.07)):
    slab(ww + 0.07, 0.09, t, bm=frame, offset=(wx, 3.79, wz + dz))
to_object("WindowFrame", uv_box(frame), WFRAME)
to_object("WindowSill", uv_box(slab(ww + 0.2, 0.26, 0.045, er=0.008)), SHELF, loc=(wx, 3.68, WZ0 - 0.005))
sill = bmesh.new()
sill_leaf = bmesh.new()
random.seed(21)
for sx in (wx - 0.95, wx - 0.2, wx + 0.85):
    before = set(sill.verts)
    lathe([(0, 0), (0.05, 0), (0.06, 0.1), (0.055, 0.1), (0.05, 0.09), (0, 0.09)], seg=28, bm=sill)
    transform(sill, loc=(sx, 3.66, WZ0 + 0.018), verts=[v for v in sill.verts if v not in before])
    for i in range(9):
        before = set(sill_leaf.verts)
        bmesh.ops.create_uvsphere(sill_leaf, u_segments=10, v_segments=7, radius=1.0)
        new = [v for v in sill_leaf.verts if v not in before]
        ln = random.uniform(0.04, 0.08)
        transform(sill_leaf, scale=(0.016, ln, 0.004), verts=new)
        transform(sill_leaf, loc=(0, ln * 0.9, 0), verts=new)
        transform(sill_leaf, rot=(random.uniform(20, 65), 0, i * 140 + sx * 50), loc=(sx, 3.66, WZ0 + 0.11), verts=new)
to_object("SillPots", sill, CERAMIC_T, sharp_deg=55)
to_object("SillLeaves", sill_leaf, LEAF, sharp_deg=80)


def pendant(name, x, y, drop_z):
    root = empty(name, loc=(x, y, drop_z))
    to_object(name + "_Cord", cylinder(0.004, 3.4 - drop_z, seg=8), CORD, loc=(0, 0, 0.11), parent=root)
    to_object(name + "_Shade", lathe([(0.0, 0.12), (0.022, 0.12), (0.03, 0.09), (0.085, 0.015), (0.12, 0.0),
                                      (0.118, -0.004), (0.08, 0.008), (0.026, 0.086), (0.0, 0.112)], seg=48),
              BRASS, parent=root, sharp_deg=60)
    b = bmesh.new()
    bmesh.ops.create_uvsphere(b, u_segments=20, v_segments=14, radius=0.034)
    to_object("Bulb_" + name, b, BULB, loc=(0, 0, 0.03), parent=root)
    return root


pendant("PendantA", -1.75, 2.9, 1.72)
pendant("PendantB", 1.85, 3.05, 1.82)
pendant("PendantC", -0.15, 1.15, 2.05)


def sconce(name, x):
    root = empty(name, loc=(x, 3.72, 1.62))
    to_object(name + "_Plate", slab(0.08, 0.02, 0.14, r=0.01), BRASS, parent=root)
    hood = lathe([(0, 0), (0.05, 0), (0.06, 0.09), (0, 0.09)], seg=32)
    to_object(name + "_Hood", hood, FABRIC, loc=(0, -0.08, -0.02), parent=root, sharp_deg=60)
    b = bmesh.new()
    bmesh.ops.create_uvsphere(b, u_segments=16, v_segments=10, radius=0.022)
    to_object("Bulb_" + name, b, BULB, loc=(0, -0.08, 0.02), parent=root)


sconce("SconceL", -2.75)
sconce("SconceR", 3.15)
sconce("SconceM", -0.35)


def chair(name, x, y, rot, parent=None):
    root = empty(name, loc=(x, y, 0), rot=(0, 0, rot), parent=parent)
    to_object(name + "_Seat", slab(0.42, 0.4, 0.035, r=0.03, er=0.008), CHAIR, loc=(0, 0, 0.45), parent=root)
    to_object(name + "_Back", slab(0.4, 0.03, 0.2, r=0.0, er=0.008), CHAIR, loc=(0, 0.19, 0.78), parent=root)
    legs = bmesh.new()
    for lx in (-0.18, 0.18):
        for ly in (-0.17, 0.17):
            slab(0.03, 0.03, 0.45 if ly < 0 else 0.86, r=0.008, bm=legs,
                 offset=(lx, ly, (0.45 if ly < 0 else 0.86) / 2))
    to_object(name + "_Legs", legs, CHAIR, parent=root)


def bistro(name, x, y):
    root = empty(name, loc=(x, y, 0))
    to_object(name + "_Top", lathe([(0, 0.72), (0.36, 0.72), (0.365, 0.735), (0.36, 0.75), (0, 0.75)], seg=48),
              WOOD, parent=root, sharp_deg=50)
    to_object(name + "_Stem", cylinder(0.03, 0.72, seg=16), DARKMETAL, parent=root)
    to_object(name + "_Foot", lathe([(0, 0), (0.24, 0), (0.24, 0.015), (0.05, 0.04), (0, 0.04)], seg=32),
              DARKMETAL, parent=root)
    cup = lathe([(0, 0.75), (0.03, 0.75), (0.042, 0.84), (0, 0.84)], seg=24)
    to_object(name + "_Cup", cup, CERAMIC, loc=(0.1, -0.05, 0), parent=root, sharp_deg=60)
    chair(name + "_ChairA", 0, 0.6, 180, parent=root)
    chair(name + "_ChairB", 0.62, -0.1, 100, parent=root)


bistro("BistroA", -1.75, 2.9)
bistro("BistroB", 1.85, 3.05)

# floor plant in the corner
def floor_plant(name, x, y, seed):
    fp = empty(name, loc=(x, y, 0))
    to_object(name + "Pot", lathe([(0, 0), (0.17, 0), (0.2, 0.42), (0, 0.42)], seg=40), CERAMIC, parent=fp,
              sharp_deg=55)
    fl = bmesh.new()
    random.seed(seed)
    for i in range(24):
        before = set(fl.verts)
        bmesh.ops.create_uvsphere(fl, u_segments=12, v_segments=8, radius=1.0)
        new = [v for v in fl.verts if v not in before]
        length = random.uniform(0.18, 0.32)
        transform(fl, scale=(0.06, length, 0.012), verts=new)
        transform(fl, loc=(0, length * 0.9, 0), verts=new)
        transform(fl, rot=(random.uniform(20, 70), 0, i * 137.5), loc=(0, 0, 0.45 + random.uniform(0, 0.5)),
                  verts=new)
    to_object(name + "Leaves", fl, LEAF, parent=fp, sharp_deg=80)


floor_plant("FloorPlant", -2.95, 3.25, 11)
floor_plant("FloorPlantR", 3.1, 3.3, 12)

# ---------------------------------------------------------------- export
os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT,
    export_format="GLB",
    export_yup=True,
    export_apply=True,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)
print("exported", OUT, round(os.path.getsize(OUT) / 1024), "KB")

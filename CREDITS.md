# الغروب الأحمر — Red Sunset v1 — CREDITS / الحقوق والمصادر

لعبة أصلية — القصة والشخصيات والحوارات من تأليف محمد سامي حماية وفريق التطوير.
اللعبة أوفلاين بالكامل، غير تجارية، بلا إعلانات وبلا مشتريات. المحرك: Three.js r168 (MIT).

## الأصول ثلاثية الأبعاد

### Quaternius — CC0 (ملكية عامة، بلا اشتراط نسبة)
- `horse-quaternius.glb` — حصان متحرك (13 مقطعًا: Walk, Gallop, Idle…). المصدر: Quaternius عبر Poly Pizza.
- `donkey-quaternius.glb` — حمار (13 مقطعًا). Quaternius / Poly Pizza.
- `deer-quaternius.glb` — غزال (13 مقطعًا). Quaternius / Poly Pizza.
- `adventurer-quaternius.glb` — شخصية المغامر (سليم / أعضاء العصابة) — 24 حركة منها Gun_Shoot.
- `farmer-quaternius.glb` — الفلاح (مرزوق / رجال العصابة) — 24 حركة.
- `worker-quaternius.glb` — العامل (عمران) — 24 حركة.
- `casual-character-quaternius.glb` — شخصية مدنية (رمضان / الطفل) — 24 حركة.
- `base-character-quaternius.glb` — شخصية أساسية (الحاج منصور، 45 مقطعًا) — أُعيد تلوين خاماتها داخل اللعبة.
- `ual-godot.glb` — مكتبة الأنيميشن العالمية Universal Animation Library (46 مقطعًا) — تُستخدم مقاطعها احتياطيًا للحركات التي تفتقدها موديلات الشخصيات.
- `adobe-house.glb` — بيت طيني (tevy) — CC0.

### vinish.dev — CC-BY 4.0 (يُشترط ذكر المؤلف)
- `camel-vinish.glb` — جمل وحيد السنام (Idle/Walk/Run).
- `casual-man.glb` / `casual-woman.glb` — مدنيون (Idle/Walk/Run).
- `soldier.glb` — جندي (أُعيد تلوينه للهجانة/الشرطة).
- `desert-mesa.glb` / `cliff-wall.glb` — تضاريس جبلية.

### Sketchfab — CC-BY (يُشترط ذكر المؤلف)
- `dromedary.glb` — جمل وحيد السنام، المؤلف: planeta-elefante — CC-BY.
- `low-poly_winchester_1866_yellow_boy.glb` (winchester-1866.glb) — بندقية وينشستر 1866، المؤلف: TastyTony — CC-BY.
- `low_poly_colt_peacemaker.glb` (colt-peacemaker.glb) — مسدس كولت، المؤلف: BlenderFace — CC-BY.
- `lowpoly_simple_weapons_pack.glb` (weapons-pack.glb) — حزمة أسلحة احتياطية، المؤلف: BetelgeuseMan — CC-BY.
- `old_west_fort_asset_pack.glb` (fort-pack.glb) — خيام وبرج مراقبة وصناديق المخيم، المؤلف: Jen S Abbott — CC-BY.

### SimplePolygon — مجاني مع ذكر المصدر (بدون إعادة توزيع/بيع)
- `free_desert_environment.glb` (desert-environment.glb) — صخور وعظام وصبار للصحراء.

### Kenney — CC0 (ملكية عامة)
- `assets/kenney/*.glb` — 22 موديلًا منقاة من Kenney Nature Kit: نخيل (tree_palmTall/Short/Bend/Detailed)، صخور (rock_large/small)، صبار، عشب، خيام، نار مخيم (campfire_stones/logs/bricks)، منحدرات صخرية.
- ملاحظة: ملف `kenney-nature-kit.zip` الكامل (10.5 ميجا) موجود في المجلد للمرجعية فقط ولا يُحمَّل أثناء اللعب.

## ما تم تعديله على الأصول
- إعادة تلوين خامات الشخصيات داخل اللعبة (tint) لتمييز الشخصيات (منصور، فؤاد، الهجانة) دون تعديل الملفات الأصلية.
- لا تعديل على هندسة الموديلات؛ كل التحجيم والتموضع يتم داخل اللعبة.
- نخيل Kenney الإجرائية في المشهد مبنية من هندسات بسيطة بألوان مطابقة، وليست نسخًا من ملفات Kenney.

## المحرك والمكتبات
- Three.js r168 — MIT License — ملف `lib/three.module.min.js` مضمّن محليًا.
- GLTFLoader (من أمثلة Three.js) — MIT — `lib/loaders/GLTFLoader.js`.

## الصوت
- لا ملفات صوتية خارجية. كل الأصوات مولّدة إجرائيًا عبر WebAudio (رياح، حوافر، طلقات، موال بسيط بأوسيلاتور).

## الخطوط
- خطوط نظام فقط (Segoe UI / Tahoma / Arial) — لا خطوط خارجية ولا CDN.

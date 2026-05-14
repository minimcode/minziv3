/**
 * Build HSK character data from canonical sources:
 *  - hsk30.csv         (HSK 3.0 vocabulary, 11k entries, levels 1..7-9)
 *  - hsk30-chars.csv   (3000 individual characters, ranked by frequency)
 *  - hsk30-grammar.csv (grammar patterns by level)
 *  - cedict_ts.u8      (CC-CEDICT — English meanings, fallback)
 *  - hanzi-writer-data (per-character stroke JSON; we only check existence)
 *
 * + a small hand-curated Russian translation table for HSK1's most common
 *   characters so the demo is fully usable in Russian without an external API.
 *
 * Output:
 *  - src/data/characters.json    (all HSK chars w/ level, pinyin, meanings)
 *  - src/data/lessons.json       (HSK1 grouped into 5-character lessons)
 *  - src/data/grammar.json       (grammar notes for HSK1)
 *
 * Usage: pnpm/npm run build:data
 */

import * as fs from "node:fs";
import * as path from "node:path";

const DATA_ROOT = "/home/ubuntu/data";
const HSK_DIR = path.join(DATA_ROOT, "hsk30");
const HW_DATA_DIR = path.join(DATA_ROOT, "hanzi-writer-data", "data");
const CEDICT_PATH = path.join(DATA_ROOT, "cedict_ts.u8");

const SRC_DATA_DIR = path.resolve(__dirname, "..", "src", "data");

// Hand-curated Russian primary meanings for HSK1 characters. We lean on
// concise, single-clause translations so they fit nicely in option buttons
// and in the dictionary list. Where missing we fall back to CEDICT English.
const RU: Record<string, string> = {
  // Pronouns
  我: "я",
  你: "ты",
  您: "Вы (вежл.)",
  他: "он",
  她: "она",
  们: "(множ. число)",
  自: "сам / свой",
  己: "сам / себя",
  // Greetings / common verbs of being
  好: "хороший / привет",
  是: "быть",
  不: "не",
  没: "не (быть/иметь)",
  有: "иметь",
  在: "находиться",
  // Particles
  的: "(притяж. частица)",
  了: "(маркер действия)",
  吗: "(вопр. частица)",
  呢: "(вопр. частица)",
  吧: "(частица предложения)",
  也: "тоже",
  都: "все / уже",
  把: "(маркер объекта)",
  被: "(пассивный маркер)",
  着: "(длит. действие)",
  过: "(маркер опыта)",
  // Numerals
  一: "один",
  二: "два",
  三: "три",
  四: "четыре",
  五: "пять",
  六: "шесть",
  七: "семь",
  八: "восемь",
  九: "девять",
  十: "десять",
  零: "ноль",
  百: "сто",
  千: "тысяча",
  万: "десять тысяч",
  两: "два / пара",
  半: "половина",
  // Demonstratives & question words
  这: "этот",
  那: "тот",
  哪: "какой / где",
  什: "(в «什么»)",
  么: "(в «什么»)",
  怎: "как",
  谁: "кто",
  几: "сколько (мало)",
  多: "много",
  少: "мало",
  // Family
  人: "человек",
  男: "мужчина",
  女: "женщина",
  孩: "ребёнок",
  儿: "сын / ребёнок",
  子: "сын / суффикс",
  爸: "папа",
  妈: "мама",
  爷: "дедушка",
  奶: "бабушка / молоко",
  哥: "старший брат",
  姐: "старшая сестра",
  弟: "младший брат",
  妹: "младшая сестра",
  朋: "друг (компонент)",
  友: "друг",
  // Time
  天: "небо / день",
  日: "солнце / день",
  月: "луна / месяц",
  年: "год",
  时: "время / час",
  分: "минута / доля",
  秒: "секунда",
  早: "рано / утро",
  晚: "поздно / вечер",
  上: "верх / прошл.",
  下: "низ / след.",
  今: "сегодня",
  明: "ясный / завтра",
  昨: "вчера",
  现: "сейчас",
  星: "звезда",
  期: "период / неделя",
  点: "точка / час",
  // Position
  里: "внутри",
  外: "снаружи",
  前: "перед",
  后: "после",
  左: "слева",
  右: "справа",
  中: "середина",
  东: "восток",
  西: "запад / вещь",
  南: "юг",
  北: "север",
  边: "сторона",
  面: "лицо / сторона",
  旁: "рядом",
  间: "промежуток",
  方: "сторона / квадр.",
  // Verbs of motion / common
  来: "приходить",
  去: "идти / уходить",
  到: "доходить / до",
  走: "идти пешком",
  跑: "бегать",
  飞: "летать",
  开: "открывать / вести",
  关: "закрывать",
  回: "возвращаться",
  进: "входить",
  出: "выходить",
  起: "вставать",
  坐: "сидеть",
  站: "стоять",
  住: "жить",
  // Verbs of communication
  说: "говорить",
  话: "речь / слова",
  讲: "рассказывать",
  问: "спрашивать",
  请: "пожалуйста / просить",
  谢: "благодарить",
  叫: "звать / называться",
  名: "имя",
  // Verbs of perception / cognition
  看: "смотреть",
  见: "видеть",
  听: "слушать",
  读: "читать",
  写: "писать",
  字: "иероглиф",
  书: "книга",
  学: "учить(ся)",
  习: "практиковать",
  教: "преподавать",
  懂: "понимать",
  知: "знать (компон.)",
  道: "дорога / путь",
  认: "узнавать",
  识: "узнавать",
  记: "помнить",
  忘: "забывать",
  // Mental verbs
  想: "думать / хотеть",
  要: "хотеть / надо",
  喜: "радость",
  欢: "радоваться",
  爱: "любить",
  会: "уметь",
  能: "мочь",
  可: "можно",
  应: "должен",
  该: "должен",
  // Doing
  做: "делать",
  作: "делать / труд",
  打: "бить / делать",
  让: "позволять",
  给: "давать / для",
  // Eating / drinking
  吃: "есть (пищу)",
  喝: "пить",
  饭: "еда / рис",
  菜: "блюдо / овощи",
  茶: "чай",
  水: "вода",
  果: "плод",
  鱼: "рыба",
  肉: "мясо",
  鸡: "курица",
  蛋: "яйцо",
  米: "рис / метр",
  包: "хлеб / сумка",
  // Body parts
  口: "рот",
  心: "сердце",
  手: "рука",
  目: "глаз",
  眼: "глаз",
  耳: "ухо",
  头: "голова",
  脸: "лицо",
  身: "тело",
  脚: "нога",
  // Objects / household
  车: "машина",
  机: "машина / шанс",
  船: "корабль",
  路: "дорога",
  桌: "стол",
  椅: "стул",
  床: "кровать",
  门: "дверь",
  窗: "окно",
  房: "комната",
  楼: "этаж",
  家: "семья / дом",
  店: "магазин",
  馆: "учреждение",
  校: "школа",
  院: "двор / институт",
  // Money / shopping
  钱: "деньги",
  买: "покупать",
  卖: "продавать",
  贵: "дорогой",
  // Weather / nature
  火: "огонь",
  山: "гора",
  风: "ветер",
  雨: "дождь",
  雪: "снег",
  云: "облако",
  // Adjectives
  大: "большой",
  小: "маленький",
  长: "длинный",
  短: "короткий",
  高: "высокий",
  矮: "низкий",
  快: "быстрый",
  慢: "медленный",
  新: "новый",
  老: "старый",
  坏: "плохой",
  对: "правильный",
  错: "неправильный",
  忙: "занятой",
  累: "усталый",
  渴: "жаждущий",
  饿: "голодный",
  冷: "холодный",
  热: "горячий",
  // Colors
  白: "белый",
  黑: "чёрный",
  红: "красный",
  绿: "зелёный",
  // Adverbs / connectors
  和: "и / с",
  跟: "с / следовать",
  从: "из / от",
  比: "сравнивать",
  最: "самый",
  更: "ещё / более",
  还: "ещё / всё ещё",
  就: "тогда / именно",
  才: "только тогда",
  已: "уже",
  经: "проходить / класс",
  很: "очень",
  太: "слишком",
  真: "действительно",
  正: "именно / прямой",
  非: "не / очень",
  // Country / language
  国: "страна",
  汉: "ханьский",
  英: "английский (англо-)",
  俄: "русский",
  美: "красивый / Америка",
  京: "столица",
  // School / occupations
  生: "рождаться / жизнь",
  师: "учитель",
  事: "дело",
  同: "одинаковый",
  工: "работа / труд",
  // Other common chars in HSK1
  本: "корень / том",
  号: "номер",
  电: "электричество",
  脑: "мозг",
  视: "смотреть",
  影: "тень / фильм",
  语: "язык",
  网: "сеть",
  绍: "рекомендовать",
  介: "вводить",
  绍介: "представлять",
  班: "класс / смена",
  帮: "помогать",
  备: "готовить",
  杯: "стакан",
  常: "часто",
  场: "место / поле",
  唱: "петь",
  穿: "носить (одежду)",
  次: "раз / порядок",
  答: "отвечать",
  得: "получать",
  地: "земля / суффикс",
  动: "двигаться",
  服: "одежда / служить",
  干: "делать / сухой",
  告: "сообщать",
  歌: "песня",
  个: "(счётное слово)",
  花: "цветок",
  候: "ждать",
  假: "ложный / отпуск",
  觉: "чувствовать",
  净: "чистый",
  考: "проверять",
  客: "гость",
  课: "урок",
  块: "кусок / юань",
  毛: "шерсть / 0.1 ¥",
  票: "билет",
  汽: "пар / газ",
  气: "воздух / настр.",
  球: "мяч / шар",
  树: "дерево",
  睡: "спать",
  送: "отправлять",
  诉: "жаловаться",
  岁: "лет (возраст)",
  体: "тело",
  条: "полоса / счёт.",
  图: "схема / карта",
  玩: "играть",
  文: "письменность",
  样: "вид / образец",
  叶: "лист",
  衣: "одежда",
  医: "медицина",
  用: "использовать",
  元: "юань / эпоха",
  远: "далёкий",
  找: "искать",
  // Components / radicals (used in graphemes panel)
  亻: "человек (рад.)",
  扌: "рука (рад.)",
  氵: "вода (рад.)",
  忄: "сердце (рад.)",
  钅: "металл (рад.)",
  纟: "нить (рад.)",
  讠: "речь (рад.)",
  辶: "ходить (рад.)",
  阝: "холм/город (рад.)",
  冂: "коробка (рад.)",
  冖: "крыша (рад.)",
  宀: "крыша (рад.)",
  亠: "верх (рад.)",
  匕: "ложка (рад.)",
  卩: "печать (рад.)",
  厶: "частный (рад.)",
  又: "правая рука",
  乂: "косая линия",
  乙: "крюк (2-я ст.)",
  丿: "косая черта (рад.)",
  丶: "точка (рад.)",
  亅: "крюк (рад.)",
  廾: "две руки",
  弓: "лук (стрельба)",
  彳: "идти (рад.)",
  彡: "линии",
  攵: "удар (рад.)",
  斤: "топор / 0.5 кг",
  曰: "говорить",
  欠: "недоставать",
  止: "остановиться",
  歹: "смерть (рад.)",
  毋: "не (запрет)",
  父: "отец",
  片: "кусок / пластина",
  爫: "коготь (рад.)",
  爪: "коготь",
  牛: "корова / бык",
  犬: "собака",
  豕: "свинья",
  豸: "хищник (рад.)",
  虫: "насекомое",
  示: "показывать",
  禾: "колос",
  穴: "пещера",
  立: "стоять",
  竹: "бамбук",
  糸: "нить",
  耒: "плуг",
  舌: "язык (орган)",
  舟: "лодка",
  色: "цвет",
  虍: "тигр (рад.)",
  血: "кровь",
  行: "идти / ряд",
  覀: "крышка (рад.)",
  足: "нога",
  辛: "острый",
  辰: "время / 5-я ветвь",
  邑: "город",
  酉: "вино / 10-я ветвь",
  采: "собирать",
  阜: "холм",
  隶: "подчиняться",
  隹: "птица (рад.)",
  青: "сине-зелёный",
  韭: "лук-порей",
  音: "звук",
  食: "пища",
  首: "голова",
  香: "ароматный",
  马: "лошадь",
  骨: "кость",
  髟: "длинные волосы",
  鬲: "котёл",
  鬼: "дух",
  鸟: "птица",
  鹿: "олень",
  麦: "пшеница",
  麻: "конопля",
  黄: "жёлтый",
  黍: "просо",
  鼓: "барабан",
  鼠: "мышь",
  鼻: "нос",
  齐: "ровный / Ци",
  齿: "зуб",
  龙: "дракон",
  龟: "черепаха",
  // Remaining HSK1 chars without RU yet
  别: "другой / не надо",
  病: "болезнь",
  差: "различаться / плохой",
  等: "ждать / класс",
  第: "(порядк. префикс)",
  放: "класть / отпускать",
  拿: "брать",
  难: "трудный",
  商: "торговля",
  试: "пробовать",
  午: "полдень",
  息: "дыхание / отдых",
  洗: "мыть",
  系: "связь / семестр",
  先: "сперва",
  笑: "смеяться / улыбаться",
  些: "немного / несколько",
  兴: "интерес / подъём",
  休: "отдыхать",
  页: "страница",
  再: "снова",
  重: "тяжёлый / снова",
  准: "точный / разрешать",
  // Bonus translations to keep dictionary clean
  跳: "прыгать",
  舞: "танцевать",
  画: "рисовать",
  画儿: "рисунок",
  // Components referenced in HSK1 decomp that ARE in the HSK pool but
  // get noisy English translations from CEDICT — override here.
  尔: "ты (арх.) / так",
  甫: "только / мужчина",
  斿: "флаг (компонент)",
  廴: "длинный шаг (рад.)",
  扁: "плоский",
  歺: "кость (рад.)",
};

// ─────────────────────────────────────────────────────────────────────────────

interface CedictEntry {
  trad: string;
  simp: string;
  pinyin: string;
  defs: string[];
}

function parseCedict(): Map<string, CedictEntry> {
  const txt = fs.readFileSync(CEDICT_PATH, "utf8");
  const map = new Map<string, CedictEntry>();
  for (const rawLine of txt.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line || line.startsWith("#")) continue;
    // Format: TRAD SIMP [pinyin] /def1/def2/.../
    const m = line.match(/^(\S+) (\S+) \[([^\]]+)\] \/(.+)\/$/);
    if (!m) continue;
    const [, trad, simp, pinyin, defs] = m;
    const existing = map.get(simp);
    if (existing && existing.defs.length >= defs.split("/").length) continue;
    map.set(simp, {
      trad,
      simp,
      pinyin,
      defs: defs.split("/").filter(Boolean),
    });
  }
  return map;
}

// Pinyin tone marks
const TONES: Record<string, string[]> = {
  a: ["ā", "á", "ǎ", "à"],
  e: ["ē", "é", "ě", "è"],
  i: ["ī", "í", "ǐ", "ì"],
  o: ["ō", "ó", "ǒ", "ò"],
  u: ["ū", "ú", "ǔ", "ù"],
  "u:": ["ǖ", "ǘ", "ǚ", "ǜ"],
  v: ["ǖ", "ǘ", "ǚ", "ǜ"],
  A: ["Ā", "Á", "Ǎ", "À"],
  E: ["Ē", "É", "Ě", "È"],
  I: ["Ī", "Í", "Ǐ", "Ì"],
  O: ["Ō", "Ó", "Ǒ", "Ò"],
  U: ["Ū", "Ú", "Ǔ", "Ù"],
};

function numericToPinyin(numeric: string): string {
  // "ni3 hao3" -> "nǐ hǎo"
  return numeric
    .split(/\s+/)
    .map((syl) => {
      const m = syl.match(/^([a-zA-Z:]+?)([1-5])$/);
      if (!m) return syl;
      const [, baseRaw, toneStr] = m;
      let base = baseRaw;
      const tone = parseInt(toneStr, 10);
      if (tone === 5 || tone === 0) return base.replace("u:", "ü").replace("v", "ü");
      base = base.replace("u:", "ü").replace("v", "ü");
      // Pinyin tone-placement rules: a > e > o-of-"ou" > last vowel (so "iu"
      // is marked on u and "ui" is marked on i).
      const lower = base.toLowerCase();
      let target = -1;
      const idxA = lower.indexOf("a");
      const idxE = lower.indexOf("e");
      const idxOu = lower.indexOf("ou");
      if (idxA >= 0) target = idxA;
      else if (idxE >= 0) target = idxE;
      else if (idxOu >= 0) target = idxOu; // mark the 'o'
      else {
        // mark the last vowel
        for (let i = base.length - 1; i >= 0; i -= 1) {
          if ("aeiouü".includes(lower[i])) {
            target = i;
            break;
          }
        }
      }
      if (target < 0) return base;
      const ch = base[target];
      const lookup = TONES[ch] || TONES[ch.toLowerCase()];
      const replaced = lookup ? lookup[tone - 1] : ch;
      return base.slice(0, target) + replaced + base.slice(target + 1);
    })
    .join(" ");
}

interface CharRecord {
  hanzi: string;
  pinyin: string;
  level: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  freq: number;
  meaningPrimary: string;
  meaningsRu: string[];
  meaningsEn: string[];
  hasStrokes: boolean;
  /** Decomposition string from MakeMeAHanzi, e.g. "⿱爫友" for 爱. */
  decomposition?: string;
  /** Visible component characters extracted from the decomposition. */
  components?: string[];
  /** Primary radical, when known. */
  radical?: string;
  /** Free-text etymology hint (when MakeMeAHanzi has one). */
  etymology?: string;
  /**
   * Stroke→component mapping. `strokeToComponent[i]` is the index into
   * `components` that the i-th stroke belongs to, or -1 for unknown.
   * Lets the UI highlight strokes that match a clicked grapheme.
   */
  strokeToComponent?: number[];
}

interface MmahEntry {
  character: string;
  decomposition?: string;
  radical?: string;
  etymology?: { type?: string; hint?: string; phonetic?: string; semantic?: string };
  /** Per-stroke path-of-indices through the decomposition tree. */
  matches?: (number[] | null)[];
}

function parseMmahDictionary(): Map<string, MmahEntry> {
  const map = new Map<string, MmahEntry>();
  const p = path.join(DATA_ROOT, "makemeahanzi", "dictionary.txt");
  if (!fs.existsSync(p)) return map;
  for (const rawLine of fs.readFileSync(p, "utf8").split("\n")) {
    const line = rawLine.replace(/\r$/, "").trim();
    if (!line) continue;
    try {
      const entry = JSON.parse(line) as MmahEntry;
      if (entry.character) map.set(entry.character, entry);
    } catch {
      // skip malformed lines
    }
  }
  return map;
}

/**
 * Parse a MakeMeAHanzi decomposition string into a flat list of visible
 * CJK components and a mapping from each component's "path" (the list of
 * branch indices in the IDS tree) to its flat index. Unknown leaves ("?"
 * / "？") consume a path slot but do not contribute a component.
 *
 * Example for 爱 with decomp "⿱⿱爫冖友":
 *   components = ["爫", "冖", "友"]
 *   pathToFlat = { "0.0" → 0, "0.1" → 1, "1" → 2 }
 */
function parseDecomposition(decomp: string): {
  components: string[];
  pathToFlat: Map<string, number>;
} {
  const components: string[] = [];
  const pathToFlat = new Map<string, number>();
  const chars = Array.from(decomp);
  let i = 0;

  const isIds = (code: number) => code >= 0x2ff0 && code <= 0x2fff;
  const isCjk = (code: number) =>
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0x20000 && code <= 0x2ffff) ||
    (code >= 0x2e80 && code <= 0x2eff) ||
    (code >= 0x2f00 && code <= 0x2fdf);

  function walk(path: number[]) {
    if (i >= chars.length) return;
    const ch = chars[i++];
    const code = ch.codePointAt(0) ?? 0;
    if (isIds(code)) {
      // U+2FF2 (left-mid-right) and U+2FF3 (top-mid-bottom) take 3 children;
      // every other IDS operator takes 2.
      const arity = code === 0x2ff2 || code === 0x2ff3 ? 3 : 2;
      for (let j = 0; j < arity; j++) walk([...path, j]);
    } else if (ch === "?" || ch === "？") {
      // unknown leaf — no component, no path entry
    } else if (isCjk(code)) {
      const flatIdx = components.length;
      components.push(ch);
      pathToFlat.set(path.join("."), flatIdx);
    } else {
      // skip unrecognised (e.g. Latin glyphs in dictionary noise)
    }
  }
  walk([]);
  return { components, pathToFlat };
}

/** Pull just the visible CJK components — back-compat for the legacy path. */
function extractComponents(decomp: string | undefined): string[] {
  if (!decomp) return [];
  return parseDecomposition(decomp).components;
}

/** Compute, for each stroke, the flat index of the component it belongs to. */
function computeStrokeToComponent(
  decomp: string | undefined,
  matches: (number[] | null)[] | undefined
): number[] | undefined {
  if (!decomp || !matches || matches.length === 0) return undefined;
  const { pathToFlat } = parseDecomposition(decomp);
  return matches.map((m) => {
    if (!m || m.length === 0) return -1;
    // Try the full path first, then progressively shorter prefixes — some
    // matches descend deeper than the visible components do.
    for (let k = m.length; k > 0; k--) {
      const key = m.slice(0, k).join(".");
      if (pathToFlat.has(key)) return pathToFlat.get(key)!;
    }
    return -1;
  });
}

function buildCharacters(): CharRecord[] {
  const charsCsv = fs.readFileSync(path.join(HSK_DIR, "hsk30-chars.csv"), "utf8");
  const lines = charsCsv.trim().split("\n");
  lines.shift(); // header

  const cedict = parseCedict();
  const mmah = parseMmahDictionary();
  const chars: CharRecord[] = [];

  for (const line of lines) {
    // Hanzi,Level,WritingLevel,Traditional,Freq,Examples
    const cells = line.split(",");
    const hanzi = cells[0]?.trim();
    if (!hanzi || hanzi.length !== 1) continue;
    const levelStr = cells[1]?.trim() ?? "1";
    const freq = parseInt(cells[4] ?? "0", 10) || 0;
    const cedictEntry = cedict.get(hanzi);
    const meaningsEn = cedictEntry?.defs ?? [];
    const ru = RU[hanzi];
    const meaningsRu = ru ? [ru] : [];
    const meaningPrimary = ru ?? meaningsEn[0] ?? "";
    const pinyin = cedictEntry ? numericToPinyin(cedictEntry.pinyin) : "";

    // Map "7-9" → 7
    let level: number = 1;
    if (levelStr === "7-9") level = 7;
    else level = parseInt(levelStr, 10) || 1;

    // hasStrokes: check the hanzi-writer-data dir for a JSON file
    let hasStrokes = false;
    try {
      hasStrokes = fs.existsSync(path.join(HW_DATA_DIR, `${hanzi}.json`));
    } catch {
      hasStrokes = false;
    }

    const mm = mmah.get(hanzi);
    const decomposition = mm?.decomposition;
    const allComponents = extractComponents(decomposition);
    const components = allComponents.filter((c) => c !== hanzi);
    const radical = mm?.radical && mm.radical !== "?" ? mm.radical : undefined;
    const etymology = mm?.etymology?.hint;
    // Stroke→component mapping uses the full (unfiltered) component list so
    // indices line up with MakeMeAHanzi's `matches` paths. If the visible
    // `components` array drops self-references (c === hanzi), we re-map
    // those entries to -1 since they don't correspond to a clickable card.
    const fullStc = computeStrokeToComponent(decomposition, mm?.matches);
    let strokeToComponent: number[] | undefined;
    if (fullStc) {
      // Build remap: full-component-index → visible-component-index (or -1).
      const remap = new Map<number, number>();
      let visibleIdx = 0;
      for (let k = 0; k < allComponents.length; k++) {
        if (allComponents[k] === hanzi) {
          remap.set(k, -1);
        } else {
          remap.set(k, visibleIdx);
          visibleIdx += 1;
        }
      }
      strokeToComponent = fullStc.map((v) =>
        v < 0 ? -1 : remap.get(v) ?? -1
      );
    }

    chars.push({
      hanzi,
      pinyin,
      level: level as CharRecord["level"],
      freq,
      meaningPrimary,
      meaningsRu,
      meaningsEn,
      hasStrokes,
      ...(decomposition ? { decomposition } : {}),
      ...(components.length ? { components } : {}),
      ...(radical ? { radical } : {}),
      ...(etymology ? { etymology } : {}),
      ...(strokeToComponent && strokeToComponent.some((x) => x >= 0)
        ? { strokeToComponent }
        : {}),
    });
  }
  return chars;
}

interface Lesson {
  id: string;
  level: number;
  index: number;
  characters: string[];
  /** Curated lesson title shown on the lesson tile, e.g. «Мини-диалог». */
  title?: string;
  /** Theme/chapter grouping for the curriculum, e.g. «Основы общения». */
  theme?: string;
  grammarNote?: { title: string; body: string; examples?: { hanzi: string; pinyin: string; ru: string }[] };
}

const HSK1_GRAMMAR_BITS: Lesson["grammarNote"][] = [
  {
    title: "Вопросы с 吗",
    body: "Утверждение + 吗 = вопрос «да/нет».",
    examples: [
      { hanzi: "你好吗？", pinyin: "nǐ hǎo ma?", ru: "Как ты?" },
      { hanzi: "他是学生吗？", pinyin: "tā shì xuésheng ma?", ru: "Он студент?" },
    ],
  },
  {
    title: "Личные местоимения",
    body: "我 я · 你 ты · 他/她 он/она · 们 — суффикс множественного числа.",
    examples: [
      { hanzi: "我们", pinyin: "wǒmen", ru: "мы" },
      { hanzi: "你们", pinyin: "nǐmen", ru: "вы" },
      { hanzi: "他们", pinyin: "tāmen", ru: "они" },
    ],
  },
  {
    title: "Связка 是",
    body: "A 是 B — «A есть B». Используется для определений и тождеств.",
    examples: [
      { hanzi: "我是学生。", pinyin: "wǒ shì xuésheng.", ru: "Я студент." },
      { hanzi: "他是老师。", pinyin: "tā shì lǎoshī.", ru: "Он учитель." },
    ],
  },
  {
    title: "Отрицание 不",
    body: "Ставится перед глаголом или прилагательным.",
    examples: [
      { hanzi: "我不去。", pinyin: "wǒ bù qù.", ru: "Я не пойду." },
      { hanzi: "不好。", pinyin: "bù hǎo.", ru: "Не хорошо." },
    ],
  },
  {
    title: "Притяжательное 的",
    body: "X 的 Y = «Y, принадлежащий X».",
    examples: [
      { hanzi: "我的书", pinyin: "wǒ de shū", ru: "моя книга" },
      { hanzi: "他的家", pinyin: "tā de jiā", ru: "его дом" },
    ],
  },
  {
    title: "Числа",
    body: "一二三四五六七八九十 — 1..10. 11 = 十一, 20 = 二十.",
  },
  {
    title: "Указательные 这 / 那",
    body: "这 — это (близкое), 那 — то (далёкое).",
    examples: [
      { hanzi: "这是我的书。", pinyin: "zhè shì wǒ de shū.", ru: "Это моя книга." },
    ],
  },
];

/**
 * Hand-curated HSK1 curriculum: each entry is a 5-character lesson grouped
 * by topic. Earlier lessons cover the highest-utility vocabulary so a
 * complete beginner can hold a tiny conversation after just a few lessons.
 * Characters listed here are pulled to the top of the lesson list; the
 * remaining HSK1 chars fill in afterwards in CSV order.
 */
interface CuratedLesson {
  chars: string[];
  title: string;
  theme: string;
}

const HSK1_CURATED: CuratedLesson[] = [
  { chars: ["你", "好", "我", "是", "不"], title: "Знакомство", theme: "Основы общения" },
  { chars: ["他", "她", "们", "的", "吗"], title: "Местоимения", theme: "Основы общения" },
  { chars: ["有", "没", "也", "都", "和"], title: "Связки и наличие", theme: "Основы общения" },
  { chars: ["一", "二", "三", "四", "五"], title: "Числа 1–5", theme: "Числа и счёт" },
  { chars: ["六", "七", "八", "九", "十"], title: "Числа 6–10", theme: "Числа и счёт" },
  { chars: ["人", "大", "小", "男", "女"], title: "Люди и размер", theme: "Люди и семья" },
  { chars: ["爸", "妈", "哥", "姐", "弟"], title: "Семья", theme: "Люди и семья" },
  { chars: ["天", "年", "月", "日", "时"], title: "Время", theme: "Время и место" },
  { chars: ["上", "下", "里", "中", "外"], title: "Позиция", theme: "Время и место" },
  { chars: ["这", "那", "哪", "谁", "几"], title: "Это, то, какой", theme: "Время и место" },
  { chars: ["来", "去", "到", "回", "走"], title: "Движение", theme: "Действия" },
  { chars: ["看", "听", "说", "学", "写"], title: "Учиться", theme: "Действия" },
  { chars: ["吃", "喝", "饭", "茶", "水"], title: "Еда и питьё", theme: "Быт" },
  { chars: ["想", "要", "喜", "欢", "爱"], title: "Желания и чувства", theme: "Быт" },
  { chars: ["很", "多", "少", "太", "最"], title: "Степень", theme: "Описание" },
  { chars: ["开", "关", "买", "卖", "做"], title: "Повседневные дела", theme: "Действия" },
  { chars: ["问", "请", "谢", "再", "见"], title: "Вежливость", theme: "Основы общения" },
  { chars: ["前", "后", "左", "右", "对"], title: "Направления", theme: "Время и место" },
  { chars: ["东", "南", "西", "北", "国"], title: "Стороны света", theme: "Время и место" },
];

function buildLessons(chars: CharRecord[]): Lesson[] {
  // Only HSK1 chars that have an animatable stroke set.
  const hsk1Pool = chars.filter((c) => c.level === 1 && c.hasStrokes);
  const byHanzi = new Map(hsk1Pool.map((c) => [c.hanzi, c]));

  // Pull curated chars first (in curriculum order), skipping any we can't
  // animate. Each curated entry produces one lesson with its hand-picked
  // title and theme; the remaining HSK1 chars fill in afterwards in 5-char
  // chunks under a generic «Закрепление» theme so nothing is lost.
  const seen = new Set<string>();
  const lessons: Lesson[] = [];
  let lessonIdx = 0;
  for (const curated of HSK1_CURATED) {
    const slice: CharRecord[] = [];
    for (const h of curated.chars) {
      if (seen.has(h)) continue;
      const c = byHanzi.get(h);
      if (!c) continue;
      slice.push(c);
      seen.add(h);
    }
    if (slice.length === 0) continue;
    lessons.push({
      id: `hsk1-l${String(lessonIdx + 1).padStart(2, "0")}`,
      level: 1,
      index: lessonIdx,
      characters: slice.map((c) => c.hanzi),
      title: curated.title,
      theme: curated.theme,
      grammarNote: HSK1_GRAMMAR_BITS[lessonIdx] ?? undefined,
    });
    lessonIdx += 1;
  }

  const remaining: CharRecord[] = [];
  for (const c of hsk1Pool) {
    if (!seen.has(c.hanzi)) {
      remaining.push(c);
      seen.add(c.hanzi);
    }
  }
  for (let i = 0; i < remaining.length; i += 5) {
    const slice = remaining.slice(i, i + 5);
    if (slice.length < 5) break;
    lessons.push({
      id: `hsk1-l${String(lessonIdx + 1).padStart(2, "0")}`,
      level: 1,
      index: lessonIdx,
      characters: slice.map((c) => c.hanzi),
      title: `Закрепление ${lessonIdx - HSK1_CURATED.length + 1}`,
      theme: "Закрепление лексики",
      grammarNote: HSK1_GRAMMAR_BITS[lessonIdx] ?? undefined,
    });
    lessonIdx += 1;
  }
  return lessons;
}

/**
 * For every component that's referenced in HSK1 decompositions but isn't
 * itself part of the HSK 3.0 character set (radicals like 爫 / 冖 / 亻),
 * synthesize a placeholder CharRecord so the UI can resolve its Russian
 * name when displaying the graphemes panel.
 */
function appendComponentPlaceholders(chars: CharRecord[]): CharRecord[] {
  const haveHanzi = new Set(chars.map((c) => c.hanzi));
  const referenced = new Set<string>();
  for (const c of chars) {
    if (c.level !== 1) continue;
    for (const comp of c.components ?? []) referenced.add(comp);
    if (c.radical) referenced.add(c.radical);
  }
  const extras: CharRecord[] = [];
  for (const g of referenced) {
    if (haveHanzi.has(g)) continue;
    const ru = RU[g];
    if (!ru) continue;
    extras.push({
      hanzi: g,
      pinyin: "",
      level: 7,
      freq: 99999,
      meaningPrimary: ru,
      meaningsRu: [ru],
      meaningsEn: [],
      hasStrokes: false,
    });
  }
  return [...chars, ...extras];
}

function main() {
  fs.mkdirSync(SRC_DATA_DIR, { recursive: true });
  console.log("Parsing CC-CEDICT…");
  let chars = buildCharacters();
  console.log(`  ${chars.length} characters`);
  console.log("Adding component placeholders…");
  chars = appendComponentPlaceholders(chars);
  console.log(`  ${chars.length} characters (with components)`);
  console.log("Building lessons…");
  const lessons = buildLessons(chars);
  console.log(`  ${lessons.length} HSK1 lessons`);

  fs.writeFileSync(path.join(SRC_DATA_DIR, "characters.json"), JSON.stringify(chars));
  fs.writeFileSync(path.join(SRC_DATA_DIR, "lessons.json"), JSON.stringify(lessons));
  fs.writeFileSync(
    path.join(SRC_DATA_DIR, "grammar.json"),
    JSON.stringify(HSK1_GRAMMAR_BITS.filter(Boolean))
  );

  // Also produce a tiny "showcase" subset to cap landing-page bundle size
  const showcase = chars
    .filter((c) => c.level === 1 && c.hasStrokes && c.meaningPrimary)
    .slice(0, 20);
  fs.writeFileSync(path.join(SRC_DATA_DIR, "showcase.json"), JSON.stringify(showcase));

  console.log("Done.");
}

main();

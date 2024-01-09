#!/usr/bin/env -S deno run -A --unstable --watch

import {
  dirname,
  extname,
  fromFileUrl,
  join,
} from "https://deno.land/std@0.211.0/path/mod.ts";
import { contentType } from "https://deno.land/std@0.211.0/media_types/content_type.ts";
import { bundle } from "https://deno.land/x/emit@0.32.0/mod.ts";
import { createCache } from "https://deno.land/x/deno_cache@0.6.2/mod.ts";
import * as Zip from "https://deno.land/x/zipjs@v2.7.32/index.js";
import { serveFile } from "https://deno.land/std@0.211.0/http/file_server.ts";
import { DbUser, DbUserDoc, ResInfo } from "./shared.ts";

const __dirname = dirname(fromFileUrl(import.meta.url));

const user_docs = new Map<string, string[]>();
const zip_files = new Map<string, () => Promise<Uint8Array>>();
async function zipFile(path: string) {
  const reader = new Zip.Uint8ArrayReader(Deno.readFileSync(path));
  const zip = new Zip.ZipReader(reader, { useWebWorkers: false });
  const files = await zip.getEntries();
  for (const file of files) {
    if (file.directory) continue;
    if (file.filename.startsWith("__MACOSX/")) continue;
    if (file.filename.endsWith(".DS_Store")) continue;
    if (!file.filenameUTF8) {
      file.filenameUTF8 = true;
      file.filename = new TextDecoder().decode(file.rawFilename);
    }
    const m = file.filename.match(/uploads_(\d+)\/([^/]+)$/)!;
    let docs = user_docs.get(m[1]);
    if (docs === undefined) user_docs.set(m[1], docs = []);
    docs.push(m[2]), docs.sort();
    let lazy: Promise<Uint8Array> = null!;
    zip_files.set(m[0], () => {
      return lazy ??= file.getData!(new Zip.Uint8ArrayWriter());
    });
  }
}
await zipFile(join(__dirname, "../1519_en_applications.zip"));
await zipFile(join(__dirname, "../1519_ru_applications.zip"));

const names: Record<string, string> = {
  "5766501276112149498": "Евгений Бобкунов",
  "5771678610614418486": "Кориненко Матвей",
  "5776989222421948352": "Александра Егорова",
  "5783921820616461147": "Данила Корнеенко",
  "5784662127611145108": "Георгий Будник",
  "5785863660619353208": "Гареев Ремаль",
  "5787843858617327406": "Adela Krylova",
  "5790475916427658747": "Глеб Бугаев",
  "5790850001876392706": "Макаров Роман",
  "5790854486023844080": "Хачиков Давид",
  "5794824982302832150": "Искандер Шамсутдинов",
  "5794840119712555686": "Ivan Murzin",
  "5794845891224139207": "Anna Belyakova",
  "5794924745391830514": "Смирнов Елисей",
  "5795014235719528079": "Dinar Yakupov",
  "5795112180618315102": "Ezekiel John Gadzama",
  "5795114781719067022": "НИКИТА ТЮРЬКОВ",
  "5795163770616426621": "Yazan Alnakri",
  "5795677969123794621": "Mariia Shmakova",
  "5795916882658524876": "Efim Puzhalov",
  "5795958358226985284": "NURSULTAN ABDULLAEV",
  "5796496520015947442": "Vladimir Kalabukhov",
  "5796565046737515370": "Said Nurullin",
  "5796571950121344775": "Sharipov Bulat",
  "5796605449346130995": "Vladislav Grigorev",
  "5796643732565410438": "Saleem Asekrea",
  "5796647750612400825": "Damir Nurtdinov",
  "5796664608217584991": "Никита Богданков",
  "5796671328923765633": "Anton Nekhav",
  "5796884571515008568": "Batraz Dzesov",
  "5796953281977438805": "Ahmad Alhussin",
  "5796975845718516047": "Dinar Yakupov",
  "5797316590611823020": "Suleiman eddin",
  "5797391642793596293": "DMITRY BERESNEV",
  "5797485031192696740": "Arthur Popov",
  "5797499678613595190": "Ruslan Kudinov",
  "5797550421233764729": "Nikolay Nechaev",
  "5797574632424049165": "ARTEMII MIASOEDOV",
  "5797576592428348795": "ARTEMII MIASOEDOV",
  "5797585962211193423": "Viacheslav Sinii",
  "5797661031511471168": "SOFIA GAMERSHMIDT",
  "5797692706615680731": "Amine Trabelsi",
  "5797697722023901696": "Adilia Saifetdiarova",
  "5797733539658085772": "KARIM GALLIAMOV",
  "5797905262912412690": "Кузьмич Александра",
  "5797945346375680151": "Bogdan Shah",
  "5797956999304929021": "Ершов Иван",
  "5798120960017480417": "Yusuf Abdughafforzoda",
  "5798137980619189902": "Ghadeer Akleh",
  "5798168454379242496": "Файзуллин Салават",
  "5798192350795806182": "Арсений Русин",
  "5798204755396660096": "Смирнов Елисей",
  "5798206916423705017": "Большаков Владислав",
  "5798212273527356379": "Лищенко Иван",
  "5798214721617035519": "Марк Захаров",
  "5798295419429628019": "Dmitrii Kuzmin",
  "5798299330217652276": "Ivan Domrachev",
  "5798307793329647446": "Konstantin Smirnov",
  "5798310014812659142": "Ekaterina Akimenko",
  "5798319785489901036": "Ahmed Abid",
  "5798357867115554259": "ЛИАНА МАРДАНОВА",
  "5798360189024360380": "Лаврова Марина",
  "5798408203715948455": "Наиль Миннемуллин",
  "5798415450614486157": "Mohamad Nour Shahin",
  "5798427859918836528": "Yakupova Diana Ildarovna",
  "5798436630886239414": "Максимова Алёна Сергеевна",
  "5798437755512692189": "Арина Гончарова",
  "5798455492911903159": "Куликов Владислав",
  "5798471550614659719": "Ayhem Bouabid",
  "5798481151852255011": "Hadi Salloum",
  "5798481726758809549": "Леон Пареко",
  "5798481883523169678": "Daniel Vakhrushev",
  "5798482063312734973": "Шулепина Cофья",
  "5798482063314583855": "Данила Шулепин",
  "5798484889414254360": "Оконешников Дмитрий",
  "5798496400616820593": "Yehia Sobeh",
  "5798511470029631880": "Иванов Лев",
  "5798532420617571926": "Хадиев Ильнур",
  "5798537775201536633": "Петров Марк",
  "5798540764528165551": "Andrei Markov",
  "5798543767229720005": "Ivan Savelev",
  "5798543911915632580": "Kira Strelnikova",
  "5798546971919950468": "Alisher Kabardiyadi",
  "5798557171233194106": "Roman Voronov",
  "5798608751232991319": "Artem Voronov",
  "5798611480613877595": "Laith Nayal",
  "5798611589186410049": "Karam Khaddour",
  "5798614440659460088": "Artem Matevosian",
  "5798643887335151819": "Ablaeva Alie",
  "5798644540134083260": "Mariam Abuelfotouh",
  "5798652959421897859": "Yaroslava Bryukhanova",
  "5798655650298536134": "Bakina Sofia",
  "5798656155141068016": "Vladislav Deryabkin",
  "5798657074759050083": "Исмагил Искаков",
};

const db = await Deno.openKv(join(__dirname, "../db"));
function dbUserDocDefault(): DbUserDoc {
  return { seen: false, comment: "" };
}
function dbUserDefault(): DbUser {
  return { rate: 0, comment: "", docs: {} };
}
async function dbUserList() {
  return new Map(
    await Array.fromAsync(
      db.list({ prefix: ["user"] }),
      (x) => [x.key[1] as string, x.value as DbUser],
    ),
  );
}
async function dbUserUpdate(user_id: string, f: (x: DbUser) => void) {
  const key = ["user", user_id];
  const user = (await db.get(key)).value as DbUser ??
    dbUserDefault();
  f(user);
  await db.set(key, user);
}

async function indexHtml() {
  const cache = createCache();
  const js = (await bundle(import.meta.resolve("./index.tsx"), {
    async load(specifier) {
      if (specifier.startsWith("https://esm.sh/")) {
        return { specifier, content: null!, kind: "external" };
      }
      return await cache.load(specifier);
    },
  })).code;
  return `<!DOCTYPE html>
<html>
  <head>
    <meta charSet="UTF-8" />
    <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/index.css" />
    <title>1519</title>
  </head>
  <body>
    <div preact></div>
    <script type="module">
${js}
    </script>
  </body>
</html>
`;
}

await Deno.serve({ port: 8080 }, async (req) => {
  const url = new URL(req.url);
  const mime = (t = contentType(extname(url.pathname))!) =>
    ["Content-Type", t] as [string, string];
  if (url.pathname === "/info.json") {
    const db = await dbUserList();
    const res: ResInfo = {};
    for (const [user_id, docs] of user_docs) {
      const user = { ...db.get(user_id) ?? dbUserDefault() };
      for (const doc_id of docs) user.docs[doc_id] ??= dbUserDocDefault();
      res[user_id] = { ...user, name: names[user_id] ?? null };
    }
    return Response.json(res);
  }
  if (url.pathname === "/user") {
    if (req.method !== "PUT") {
      return new Response(null, { status: 405 });
    }
    const [user_id, { rate, comment }] = await req.json();
    await dbUserUpdate(
      user_id,
      (user) => Object.assign(user, { rate, comment }),
    );
    return new Response();
  }
  if (url.pathname === "/user/doc") {
    if (req.method !== "PUT") {
      return new Response(null, { status: 405 });
    }
    const [user_id, doc_id, { seen, comment }] = await req.json();
    await dbUserUpdate(
      user_id,
      (user) => user.docs[doc_id] = { seen, comment },
    );
    return new Response();
  }
  if (url.pathname === "/") {
    return new Response(await indexHtml(), { headers: [mime("text/html")] });
  }
  if (url.pathname === "/index.css") {
    return serveFile(req, join(__dirname, url.pathname));
  }
  const zip = zip_files.get(decodeURI(url.pathname.slice(1)));
  if (zip) return new Response(await zip(), { headers: [mime()] });
  return new Response(null, { status: 404 });
}).finished;

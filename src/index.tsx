import * as React from "https://esm.sh/preact@10.19.3";
import { useEffect, useState } from "https://esm.sh/preact@10.19.3/hooks";
import * as Xls from "https://esm.sh/xlsx@0.18.5";
import { DbUserDoc, DbUserName, ResInfo } from "./shared.ts";

function useHash() {
  const [hash, setHash] = useState<string>(location.hash);
  useEffect(() => {
    const f = () => setHash(location.hash);
    self.addEventListener("hashchange", f);
    return () => self.removeEventListener("hashchange", f);
  }, [setHash]);
  return hash;
}

function adjustTextarea(e: HTMLTextAreaElement) {
  const border = 1;
  e.style.height = "0px";
  // https://stackoverflow.com/a/48460773
  e.style.height = `${e.scrollHeight + 2 * border}px`;
}

function Excel({ src }: { src: string }) {
  const [xls, setXls] = useState<any>(null!);
  useEffect(() => {
    setXls(null!);
    (async () => {
      const res = await fetch(src);
      const xls = Xls.read(await res.arrayBuffer());
      const tables = xls.SheetNames.map((x) => xls.Sheets[x]).map((sheet) => {
        const max: Xls.CellAddress = { r: -1, c: -1 };
        for (const k of Object.keys(sheet)) {
          if (k.startsWith("!")) continue;
          const x = Xls.utils.decode_cell(k);
          max.r = Math.max(max.r, x.r);
          max.c = Math.max(max.c, x.c);
        }
        if (max.r === -1) return;
        sheet["!ref"] = Xls.utils.encode_range({ r: 0, c: 0 }, max);
        return Xls.utils.sheet_to_html(sheet, { header: "", footer: "" });
      }).filter((x) => x);
      setXls(tables);
    })();
  }, [src, setXls]);
  if (!xls) return <div>loading...</div>;
  return (
    <div excel>
      {xls.map((table) => (
        <div dangerouslySetInnerHTML={{ __html: table }}></div>
      ))}
    </div>
  );
}

self.addEventListener(
  "beforeunload",
  (e) => {
    const input = document.activeElement;
    if (!(input instanceof HTMLTextAreaElement)) return;
    if (input.value === input.dataset.value) return;
    input.blur();
    e.preventDefault();
  },
);

function App() {
  const hash = useHash();
  let hash_user_id: string = null!;
  if (!/^#?$/.test(hash)) {
    const m = hash.match(/^#uploads_(\d+)$/)!;
    if (!m) location.hash = "";
    if (m) hash_user_id = m[1];
  }

  const [info, setInfo] = useState<ResInfo>(null!);
  useEffect(() => {
    fetch("/info.json").then((r) => r.json()).then(setInfo);
  }, [setInfo]);
  if (!info) return <div>loading...</div>;
  const hash_user = info[hash_user_id];
  if (!hash_user) location.hash = "";
  const list = Array.from(Object.keys(info)).sort()
    .map((x) => [x, Object.keys(info[x].docs).sort()] as [string, string[]]);
  const hash_user_docs = list.find((x) => x[0] === hash_user_id)?.[1]!;

  const filter = useState([true, true, true]);

  const active_doc = useState<[string, string]>(null!);
  if (active_doc[0]?.[0] !== hash_user_id) active_doc[1](null!);
  const active_doc_url = active_doc[0] &&
    `/uploads_${active_doc[0][0]}/${active_doc[0][1]}`;

  function updateUser(user: DbUserName) {
    setInfo({ ...info, [hash_user_id]: user });
    const { rate, comment } = user;
    fetch("/user", {
      method: "PUT",
      body: JSON.stringify([hash_user_id, { rate, comment }]),
    });
  }
  function updateUserDoc(doc_id: string, doc: DbUserDoc) {
    setInfo({
      ...info,
      [hash_user_id]: {
        ...hash_user,
        docs: { ...hash_user.docs, [doc_id]: doc },
      },
    });
    const { seen, comment } = doc;
    fetch("/user/doc", {
      method: "PUT",
      body: JSON.stringify([hash_user_id, doc_id, { seen, comment }]),
    });
  }

  return (
    <div split>
      <div left>
        <div filter>
          {[-1, 0, 1].map((rate, i) => (
            <div rate={rate}>
              <input
                type="checkbox"
                checked={filter[0][i]}
                onChange={(e) =>
                  filter[1](filter[0].with(i, e.currentTarget.checked))}
              />
              {"x?v"[1 + rate]}
            </div>
          ))}
        </div>
        <div list>
          {list.filter((x) =>
            x[0] === hash_user_id || filter[0][1 + info[x[0]].rate]
          ).map((x) => (
            <a
              href={`#uploads_${x[0]}`}
              active={x[0] === hash_user_id}
              rate={info[x[0]].rate}
            >
              {list.findIndex((y) => y[0] === x[0])}{" "}
              {info[x[0]].name ?? "??? ???"}
            </a>
          ))}
        </div>
      </div>
      <div left2>
        {hash_user
          ? (
            <>
              <div filter>
                {[-1, 0, 1].map((rate, i) => (
                  <div rate={rate}>
                    <input
                      type="radio"
                      checked={rate === hash_user.rate}
                      onChange={(e) => updateUser({ ...hash_user, rate })}
                    />
                  </div>
                ))}
                {hash_user.name ?? "??? ???"}
              </div>
              <textarea
                value={hash_user.comment}
                data-value={hash_user.comment}
                onInput={(e) => adjustTextarea(e.currentTarget)}
                onChange={(e) =>
                  updateUser({ ...hash_user, comment: e.currentTarget.value })}
                ref={(e) => e && adjustTextarea(e)}
                placeholder="User comment"
              />
              {hash_user_docs.map((doc_id) => {
                const doc = hash_user.docs[doc_id];
                return (
                  <div doc>
                    <div>
                      <input
                        type="checkbox"
                        checked={doc.seen}
                        onChange={(e) =>
                          updateUserDoc(doc_id, {
                            ...doc,
                            seen: e.currentTarget.checked,
                          })}
                      />
                      <a
                        href={`/uploads_${hash_user_id}/${doc_id}`}
                        target="_blank"
                      >
                        link
                      </a>{" "}
                      <span
                        onClick={() => active_doc[1]([hash_user_id, doc_id])}
                        active={doc_id === active_doc[0]?.[1]}
                      >
                        {doc_id}
                      </span>
                    </div>
                    <textarea
                      value={doc.comment}
                      data-value={doc.comment}
                      onInput={(e) => adjustTextarea(e.currentTarget)}
                      onChange={(e) =>
                        updateUserDoc(doc_id, {
                          ...doc,
                          comment: e.currentTarget.value,
                        })}
                      ref={(e) => e && adjustTextarea(e)}
                      placeholder="Document comment"
                    />
                  </div>
                );
              })}
            </>
          )
          : null}
      </div>
      <div right>
        {active_doc[0]
          ? active_doc_url.endsWith(".pdf")
            ? <iframe src={active_doc_url} />
            : /\.xlsx?$/.test(active_doc_url)
            ? <Excel src={active_doc_url} />
            : <pre>TODO: {active_doc_url}</pre>
          : null}
      </div>
    </div>
  );
}

React.render(<App />, document.querySelector("[preact]")!);

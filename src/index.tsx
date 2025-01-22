import * as React from "https://esm.sh/preact@10.19.3";
import { useEffect, useState } from "https://esm.sh/preact@10.19.3/hooks";
import * as Xls from "https://esm.sh/xlsx@0.18.5";
import { DbUserDoc, DbUserName, ResInfo } from "./shared.ts";
import { RankingPage } from "./RankingPage.tsx";

function useHash() {
  const [hash, setHash] = useState<string>(location.hash);
  useEffect(() => {
    const f = () => setHash(location.hash);
    self.addEventListener("hashchange", f);
    return () => self.removeEventListener("hashchange", f);
  }, [setHash]);
  return hash;
}

function allDocumentsSeen(docs: Record<string, DbUserDoc>): boolean {
    return Object.values(docs).every((doc) => doc.seen);
}

function adjustTextarea(e: HTMLTextAreaElement) {
  const border = 1;
  e.style.height = "0px";
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
    let user_id: string = null!;
    if (!/^#?$/.test(hash)) {
        const decodedHash = decodeURIComponent(hash);
        const m = decodedHash.match(/^#uploads_([\wа-яА-Я_]+)$/)!;
        if (!m) location.hash = "";
        if (m) user_id = m[1];
    }

    const [info, setInfo] = useState<ResInfo>(null!);
    const [selectedDoc, setSelectedDoc] = useState<string | null>(null);

    useEffect(() => {
        fetch("/info.json")
            .then((r) => r.json())
            .then((data) => {
                for (const user_id in data) {
                    const user = data[user_id];
                    user.docs = {
                        cv: { seen: user.docs?.cv?.seen || false, comment: user.docs?.cv?.comment || "", paths: user.cv ? user.cv.split(", ") : [] },
                        motivationalLetter: { seen: user.docs?.motivationalLetter?.seen || false, comment: user.docs?.motivationalLetter?.comment || "", paths: user.motivationalLetter ? user.motivationalLetter.split(", ") : [] },
                        recommendationLetter: { seen: user.docs?.recommendationLetter?.seen || false, comment: user.docs?.recommendationLetter?.comment || "", paths: user.recommendationLetter ? user.recommendationLetter.split(", ") : [] },
                        transcript: { seen: user.docs?.transcript?.seen || false, comment: user.docs?.transcript?.comment || "", paths: user.transcript ? user.transcript.split(", ") : [] },
                        almostAStudent: { seen: user.docs?.almostAStudent?.seen || false, comment: user.docs?.almostAStudent?.comment || "", paths: user.almostAStudent ? user.almostAStudent.split(", ") : [] },
                    };
                }
                setInfo(data);
            });
    }, [setInfo]);

    if (!info) return <div>loading...</div>;

    // Handle routing to the ranking page
    if (location.pathname === "/ranking") {
        return <RankingPage info={info} />;
    }

    const selected_user = info[user_id];
    if (!selected_user) {
        console.log("No user found for user_id:", user_id);
        location.hash = "";
    }

    const user_docs = selected_user?.docs ? Object.keys(selected_user.docs) : [];

    const filter = useState([true, true, true]);

    function updateUser(user: DbUserName) {
        setInfo({ ...info, [user_id]: user });
        const { rate, comment } = user;
        fetch("/user", {
            method: "PUT",
            body: JSON.stringify([user_id, { rate, comment }]),
        });
    }

    function updateUserDoc(doc_id: string, doc: DbUserDoc) {
        setInfo({
            ...info,
            [user_id]: {
                ...selected_user,
                docs: { ...selected_user.docs, [doc_id]: doc },
            },
        });
        const { seen, comment } = doc;
        fetch("/user/doc", {
            method: "PUT",
            body: JSON.stringify([user_id, doc_id, { seen, comment }]),
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
                    {Object.keys(info).filter((id) =>
                        id === user_id || filter[0][1 + info[id].rate]
                    ).map((id, index) => {
                        const student = info[id];
                        const allSeen = allDocumentsSeen(student.docs);
                        return (
                            <a
                                href={`#uploads_${encodeURIComponent(id)}`}
                                active={id === user_id}
                                rate={student.rate}
                                onClick={(e) => {
                                    e.preventDefault();
                                    console.log("Student clicked:", id);
                                    location.hash = `uploads_${encodeURIComponent(id)}`;
                                }}
                                style={{
                                    textDecoration: allSeen ? "line-through" : "none",
                                    opacity: allSeen ? 0.7 : 1,
                                }}
                            >
                                {`${index + 1}. ${student.name ?? "??? ???"}`}
                            </a>
                        );
                    })}
                </div>
                <button
                    onClick={() => (window.location.pathname = "/ranking")}
                    style={{
                        marginTop: "16px",
                        padding: "8px 16px",
                        backgroundColor: "#2ecc71",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer",
                        width: "100%",
                    }}
                >
                    Rank Students
                </button>
            </div>
            <div left2>
                {selected_user
                    ? (
                        <>
                            <div filter>
                                {[-1, 0, 1].map((rate, i) => (
                                    <div rate={rate}>
                                        <input
                                            type="radio"
                                            checked={rate === selected_user.rate}
                                            onChange={(e) => updateUser({ ...selected_user, rate })}
                                        />
                                    </div>
                                ))}
                                {selected_user.name ?? "??? ???"}
                            </div>
                            <textarea
                                value={selected_user.comment}
                                data-value={selected_user.comment}
                                onInput={(e) => adjustTextarea(e.currentTarget)}
                                onChange={(e) =>
                                    updateUser({ ...selected_user, comment: e.currentTarget.value })}
                                ref={(e) => e && adjustTextarea(e)}
                                placeholder="User comment"
                            />
                            {user_docs.map((doc_id) => {
                                const doc = selected_user.docs[doc_id];
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
                                            {doc.paths.map((path, index) => (
                                                <a
                                                    href={`/${path}`}
                                                    target="_blank"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        setSelectedDoc(path);
                                                    }}
                                                >
                                                    {index === 0 ? doc_id : `${doc_id}_${index}`}
                                                </a>
                                            ))}
                                            {doc.paths.length === 0 && <span>{doc_id} (Not provided)</span>}
                                        </div>
                                        {doc.paths.length > 0 && (
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
                                        )}
                                    </div>
                                );
                            })}
                        </>
                    )
                    : null}
            </div>
            <div right>
                {selectedDoc ? (
                    <>
                        <div className="preview-header">
                            <span>Preview: {selectedDoc.split("/").pop()}</span>
                            <button onClick={() => setSelectedDoc(null)}>Close Preview</button>
                        </div>
                        <iframe
                            src={`/${selectedDoc}`}
                            style={{ width: "100%", height: "100%", border: "none" }}
                        />
                    </>
                ) : (
                    <div>No document selected for preview.</div>
                )}
            </div>
        </div>
    );
}

React.render(<App />, document.querySelector("[preact]")!);
import * as React from "https://esm.sh/preact@10.19.3";
import { useEffect, useState } from "https://esm.sh/preact@10.19.3/hooks";

export function RankingPage({ info }: { info: ResInfo }) {
    const [rankedStudents, setRankedStudents] = useState<string[]>([]);

    // Initialize rankedStudents with green-rated students
    useEffect(() => {
        const greenStudents = Object.keys(info).filter((id) => info[id].rate === 1);
        setRankedStudents(greenStudents);
    }, [info]);

    // Handle drag-and-drop reordering
    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData("index", index.toString());
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        const sourceIndex = Number(e.dataTransfer.getData("index"));
        const newRankedStudents = [...rankedStudents];
        const [movedStudent] = newRankedStudents.splice(sourceIndex, 1);
        newRankedStudents.splice(targetIndex, 0, movedStudent);
        setRankedStudents(newRankedStudents);
    };

    // Export ranking to CSV
    const exportToCSV = () => {
        const csvData = rankedStudents.map((id, index) => ({
            Rank: index + 1,
            Name: info[id].name,
            Email: info[id].email,
        }));

        const csv = Papa.unparse(csvData, { header: true });
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "student_ranking.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div ranking-page>
            <h1>Rank Green-Rated Students</h1>
            <div student-list>
                {rankedStudents.map((id, index) => (
                    <div
                        key={id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, index)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, index)}
                    >
                        {`${index + 1}. ${info[id].name}`}
                    </div>
                ))}
                {rankedStudents.length === 0 && <div>No green-rated students found.</div>}
                {rankedStudents.length > 0 && <div>End of list</div>}
            </div>
            <button onClick={exportToCSV}>Export Ranking to CSV</button>
            {/* Fixed Back button */}
            <button
                onClick={() => (window.location.pathname = "/")}
                style={{ marginTop: "16px" }}
            >
                Back to Main Page
            </button>
        </div>
    );
}
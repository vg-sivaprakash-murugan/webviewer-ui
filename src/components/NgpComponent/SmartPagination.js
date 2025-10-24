import React, { useState } from "react";

const SmartPagination = ({
    totalPages,
    currentPage,
    onPageChange,
}) => {
    const [inputPage, setInputPage] = useState("");
    const getPageNumbers = () => {
        const pages = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
        } else {
            const showLeftDots = currentPage > 3;
            const showRightDots = currentPage < totalPages - 2;

            // Always show first page
            pages.push(1);

            if (showLeftDots) pages.push("...");

            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);

            for (let i = start; i <= end; i++) {
                if (!pages.includes(i)) pages.push(i);
            }

            if (showRightDots) pages.push("...");

            // Always show last page
            if (!pages.includes(totalPages)) pages.push(totalPages);
        }

        return pages;
    };

    const pages = getPageNumbers();
    const handleGoClick = () => {
        const pageNum = Number(inputPage);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
            onPageChange(pageNum);
            setInputPage("");
        }
    };

    return (
        <div style={{ padding: "10px 0 10px 0" }}>
            <div
                style={{
                    display: "flex",
                    gap: "1px",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "5px",
                    flexWrap: "wrap",
                }}
            >
                {/* Back Button */}
                <button
                    onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        background: currentPage === 1 ? "#f5f5f5" : "#fff",
                        cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    }}
                >
                    &lt;
                </button>

                {/* Page Numbers */}
                {pages.map((p, idx) =>
                    p === "..." ? (
                        <span key={`dots-${idx}`} style={{ padding: "6px 10px", color: "#888" }}>
                            ...
                        </span>
                    ) : (
                        <button
                            key={`page-${p}`}
                            onClick={() => onPageChange(p)}
                            style={{
                                padding: "6px 12px",
                                borderRadius: "6px",
                                border: "1px solid #ccc",
                                background: p === currentPage ? "#000" : "#fff",
                                color: p === currentPage ? "#fff" : "#000",
                                fontWeight: p === currentPage ? 600 : 400,
                                cursor: "pointer",
                            }}
                        >
                            {p}
                        </button>
                    )
                )}

                {/* Next Button */}
                <button
                    onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                        padding: "6px 12px",
                        borderRadius: "6px",
                        border: "1px solid #ccc",
                        background: currentPage === totalPages ? "#f5f5f5" : "#fff",
                        cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    }}
                >
                    &gt;
                </button>

            </div>
            <div
                style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                }}
            >
                <label style={{ fontSize: "14px" }}>Page</label>
                <input
                    type="number"
                    value={inputPage}
                    onChange={(e) => setInputPage(e.target.value)}
                    placeholder={`${currentPage}`}
                    min={1}
                    max={totalPages}
                    style={{
                        width: "60px",
                        padding: "4px 6px",
                        borderRadius: "4px",
                        border: "1px solid #ccc",
                        textAlign: "center",
                    }}
                />
                <button
                    onClick={handleGoClick}
                    style={{
                        padding: "5px 10px",
                        borderRadius: "4px",
                        border: "1px solid #000",
                        background: "#fff",
                        fontWeight: 600,
                        cursor: "pointer",
                    }}
                >
                    Go
                </button>
            </div>
        </div>
    );
};

export default SmartPagination;
